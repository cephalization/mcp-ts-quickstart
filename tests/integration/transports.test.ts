#!/usr/bin/env node
/**
 * Comprehensive Transport Test Suite
 *
 * Tests all MCP transport modes:
 * 1. STDIO (via direct spawn)
 * 2. HTTP/SSE (via fetch)
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

console.log('🧪 MCP Transport Test Suite\n');
console.log('═'.repeat(60));

// Test 1: STDIO Transport
async function testStdioTransport() {
  console.log('\n📡 TEST 1: STDIO Transport');
  console.log('─'.repeat(60));

  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['--experimental-strip-types', 'src/index.ts'],
      env: process.env as Record<string, string>
    });

    const client = new Client(
      { name: 'test-stdio-client', version: '1.0.0' },
      { capabilities: {} }
    );

    console.log('  Connecting...');
    await client.connect(transport);
    console.log('  ✅ Connected');

    console.log('  Listing tools...');
    const tools = await client.listTools();
    console.log(`  ✅ Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => console.log(`     - ${tool.name}`));

    console.log('  Calling topStories...');
    const result = await client.callTool({
      name: 'topStories',
      arguments: { limit: 5 }
    });

    if (result.content && (result.content as any).length > 0) {
      const text = (result.content as any)[0];
      if (text.type === 'text') {
        const lines = text.text.split('\n');
        console.log(`  ✅ Result (first 3 lines):`);
        lines.slice(0, 3).forEach((line: string) => console.log(`     ${line}`));
      }
    }

    await client.close();
    console.log('  ✅ STDIO Transport: PASSED\n');
    return true;

  } catch (error: any) {
    console.error(`  ❌ STDIO Transport: FAILED`);
    console.error(`     Error: ${error.message}\n`);
    return false;
  }
}

// Test 2: HTTP/SSE Transport
async function testHTTPTransport() {
  console.log('\n🌐 TEST 2: HTTP/SSE Transport');
  console.log('─'.repeat(60));

  let httpServer: any = null;

  try {
    // Start HTTP server with tsx (same as inspector)
    console.log('  Starting HTTP server...');
    httpServer = spawn('pnpm', ['exec', 'tsx', 'src/index.ts'], {
      env: {
        ...(process.env as Record<string, string>),
        MCP_TRANSPORT: 'http',
        MCP_PORT: '3000'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for server to start (longer timeout for SSE initialization)
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('  ✅ HTTP server started on port 3000');

    // Test with SSE transport
    console.log('  Connecting via SSE...');
    const transport = new SSEClientTransport(
      new URL('http://localhost:3000/sse')
    );

    const client = new Client(
      { name: 'test-http-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    console.log('  ✅ Connected');

    console.log('  Listing tools...');
    const tools = await client.listTools();
    console.log(`  ✅ Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => console.log(`     - ${tool.name}`));

    console.log('  Calling topStories...');
    const result = await client.callTool({
      name: 'topStories',
      arguments: { limit: 5 }
    });

    if (result.content && (result.content as any).length > 0) {
      const text = (result.content as any)[0];
      if (text.type === 'text') {
        const lines = text.text.split('\n');
        console.log(`  ✅ Result (first 3 lines):`);
        lines.slice(0, 3).forEach((line: string) => console.log(`     ${line}`));
      }
    }

    await client.close();
    httpServer.kill();
    console.log('  ✅ HTTP/SSE Transport: PASSED\n');
    return true;

  } catch (error: any) {
    console.error(`  ❌ HTTP/SSE Transport: FAILED`);
    console.error(`     Error: ${error.message}\n`);
    if (httpServer) httpServer.kill();
    return false;
  }
}

// Test 3: HTTP REST API
async function testHTTPRestAPI() {
  console.log('\n🔌 TEST 3: HTTP REST API (Direct Fetch)');
  console.log('─'.repeat(60));

  let httpServer: any = null;

  try {
    // Start HTTP server with tsx (same as inspector)
    console.log('  Starting HTTP server...');
    httpServer = spawn('pnpm', ['exec', 'tsx', 'src/index.ts'], {
      env: {
        ...(process.env as Record<string, string>),
        MCP_TRANSPORT: 'http',
        MCP_PORT: '3000'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Wait for server to start (longer timeout for SSE initialization)
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('  ✅ HTTP server started on port 3000');

    // Test health endpoint
    console.log('  Testing GET /health...');
    const healthResponse = await fetch('http://localhost:3000/health');
    const health = await healthResponse.json();
    console.log(`  ✅ Health: ${JSON.stringify(health)}`);

    // Test messages endpoint (validates it handles requests properly)
    console.log('  Testing POST /messages (validates JSON-RPC handling)...');
    const messageResponse = await fetch('http://localhost:3000/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    const messageResult = await messageResponse.json();

    // Expect error response (no active SSE connection)
    if (messageResult.error && messageResult.error.code === -32000) {
      console.log(`  ✅ Messages endpoint correctly returns error for standalone requests`);
      console.log(`     Message: "${messageResult.error.message}"`);
    } else {
      throw new Error(`Expected error code -32000, got: ${JSON.stringify(messageResult)}`);
    }

    httpServer.kill();
    console.log('  ✅ HTTP REST API: PASSED\n');
    return true;

  } catch (error: any) {
    console.error(`  ❌ HTTP REST API: FAILED`);
    console.error(`     Error: ${error.message}\n`);
    if (httpServer) httpServer.kill();
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    stdio: false,
    httpSSE: false,
    httpREST: false
  };

  results.stdio = await testStdioTransport();
  results.httpSSE = await testHTTPTransport();
  results.httpREST = await testHTTPRestAPI();

  // Summary
  console.log('═'.repeat(60));
  console.log('\n📊 TEST SUMMARY');
  console.log('─'.repeat(60));
  console.log(`  STDIO Transport:    ${results.stdio ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  HTTP/SSE Transport: ${results.httpSSE ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  HTTP REST API:      ${results.httpREST ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');

  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.values(results).length;

  if (totalPassed === totalTests) {
    console.log(`🎉 ALL TESTS PASSED (${totalPassed}/${totalTests})\n`);
    process.exit(0);
  } else {
    console.log(`⚠️  SOME TESTS FAILED (${totalPassed}/${totalTests})\n`);
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
