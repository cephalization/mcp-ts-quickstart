#!/usr/bin/env node
/**
 * Direct MCP Client Test
 *
 * Tests the topStories tool by directly spawning the MCP server
 * and calling it via stdio transport (exactly like the inspector does).
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

console.log('🧪 MCP Client Test - Direct Tool Call\n');
console.log('═'.repeat(50));

async function testTopStories() {
  console.log('\n📡 Spawning MCP server...');

  // Spawn the MCP server with environment variables
  const serverProcess = spawn(
    'node',
    ['--experimental-strip-types', 'src/index.ts'],
    {
      env: process.env as Record<string, string>,
      cwd: process.cwd(),
    }
  );

  // Log any errors from the server
  serverProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    // Only show non-debug output
    if (!output.includes('[DEBUG]')) {
      console.error('Server:', output.trim());
    }
  });

  // Create stdio transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['--experimental-strip-types', 'src/index.ts'],
    env: process.env as Record<string, string>
  });

  console.log('✅ Server spawned');
  console.log('\n🔌 Connecting client...');

  // Create MCP client
  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Connect to server
  await client.connect(transport);
  console.log('✅ Client connected');

  // List available tools
  console.log('\n📋 Listing available tools...');
  const toolsResult = await client.listTools();
  console.log(`✅ Found ${toolsResult.tools.length} tools:`);
  toolsResult.tools.forEach((tool, i) => {
    console.log(`   ${i + 1}. ${tool.name} - ${tool.description}`);
  });

  // Call topStories tool
  console.log('\n🚀 Calling topStories tool...\n');
  console.log('═'.repeat(50));

  try {
    const result = await client.callTool({
      name: 'topStories',
      arguments: { limit: 5 }
    });

    console.log('\n✅ Tool call successful!\n');

    if (result.content && (result.content as any).length > 0) {
      const content = (result.content as any)[0];
      if (content.type === 'text') {
        console.log(content.text);
      }
    }

    console.log('\n═'.repeat(50));
    console.log('✅ TEST PASSED - Tool works with environment variables!\n');

  } catch (error: any) {
    console.error('\n❌ Tool call failed:');
    console.error(error.message);
    console.error('\n💡 Check that the topStories tool is properly registered');
    console.log('\n═'.repeat(50));
    console.log('❌ TEST FAILED\n');
    process.exit(1);
  }

  // Cleanup
  await client.close();
  serverProcess.kill();
  process.exit(0);
}

// Run test
testTopStories().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
