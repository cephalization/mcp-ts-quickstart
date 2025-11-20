/**
 * Test HTTP/SSE Client for MCP Server
 *
 * Demonstrates how to interact with the MCP server over HTTP transport
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const SERVER_URL = 'http://localhost:3000';

async function main() {
  console.log('🔌 Connecting to MCP server at', SERVER_URL);

  // Create SSE transport
  const transport = new SSEClientTransport(
    new URL(`${SERVER_URL}/sse`)
  );

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

  try {
    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // List available tools
    console.log('📋 Listing available tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:\n`);

    tools.tools.forEach((tool, i) => {
      console.log(`${i + 1}. ${tool.name}`);
      console.log(`   ${tool.description}`);
      console.log();
    });

    // Test topStories tool (doesn't need GitHub token)
    console.log('🧪 Testing topStories tool...');
    const result = await client.callTool({
      name: 'topStories',
      arguments: { limit: 5 }
    });

    console.log('Result:', (result.content as any)[0]);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test topStories with custom limit
    console.log('🧪 Testing topStories tool with limit...');
    try {
      const storiesResult = await client.callTool({
        name: 'topStories',
        arguments: { limit: 5 }
      });

      console.log('Top Stories:', (storiesResult.content as any)[0]);
    } catch (error) {
      console.error('❌ Error testing topStories:', error);
    }

    // Close connection
    await client.close();
    console.log('\n✅ Connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
