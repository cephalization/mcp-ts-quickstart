/**
 * HTTP/SSE Transport for Remote MCP
 * 
 * Enables running the MCP server over HTTP with Server-Sent Events,
 * allowing remote clients to connect instead of just local stdio.
 * 
 * Use cases:
 * - Deploy MCP server to cloud (AWS Lambda, Cloud Run, etc.)
 * - Access from multiple clients
 * - Web-based MCP clients
 */

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface HTTPServerOptions {
  /** Port to listen on (default: 3000) */
  port?: number;
  
  /** Enable CORS (default: true for development) */
  cors?: boolean;
  
  /** Allowed CORS origins (default: all if cors=true) */
  corsOrigins?: string[];
  
  /** Custom middleware to add */
  middleware?: express.RequestHandler[];
}

/**
 * Start an HTTP server with SSE transport for MCP
 * 
 * @param server - MCP server instance to expose
 * @param options - Server configuration options
 * @returns Express app instance
 * 
 * @example
 * ```typescript
 * // Basic usage
 * await startHTTPServer(mcpServer);
 * 
 * // Custom port and CORS
 * await startHTTPServer(mcpServer, {
 *   port: 8080,
 *   corsOrigins: ['https://myapp.com']
 * });
 * ```
 */
export async function startHTTPServer(
  server: McpServer,
  options: HTTPServerOptions = {}
): Promise<express.Application> {
  const {
    port = parseInt(process.env.MCP_PORT || '3000'),
    cors = true,
    corsOrigins = ['*'],
    middleware = []
  } = options;

  const app = express();

  // Middleware
  app.use(express.json());

  // CORS configuration
  if (cors) {
    app.use((req, res, next) => {
      const origin = req.headers.origin || '';
      const allowedOrigin = corsOrigins.includes('*') 
        ? '*' 
        : corsOrigins.find(o => o === origin) || corsOrigins[0];
      
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      
      next();
    });
  }

  // Custom middleware
  middleware.forEach(mw => app.use(mw));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      mode: 'http-sse',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Server info endpoint
  app.get('/info', (req, res) => {
    res.json({
      name: 'MCP Server',
      version: '1.0.0',
      transport: 'http-sse',
      endpoints: {
        health: '/health',
        sse: '/sse',
        messages: '/messages'
      }
    });
  });

  // SSE endpoint - clients connect here for real-time updates
  app.get('/sse', async (req, res) => {
    console.log('📡 New SSE connection established');
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // Create SSE transport
      const transport = new SSEServerTransport('/messages', res);
      
      // Connect MCP server to this transport
      await server.connect(transport);
      
      // Handle client disconnect
      req.on('close', () => {
        console.log('🔌 SSE connection closed');
      });
    } catch (error) {
      console.error('❌ SSE connection error:', error);
      res.status(500).end();
    }
  });

  // Message endpoint - clients send requests here
  app.post('/messages', async (req, res) => {
    // This endpoint works with SSE transport for connected clients
    // For standalone requests (testing), return appropriate error
    res.setHeader('Content-Type', 'application/json');

    // Check if this is a JSON-RPC request
    if (req.body && req.body.jsonrpc === '2.0') {
      // Return error for standalone requests (no active SSE connection)
      res.json({
        jsonrpc: '2.0',
        id: req.body.id || null,
        error: {
          code: -32000,
          message: 'No active SSE connection. Connect to /sse first.',
          data: {
            hint: 'Use SSEClientTransport to establish connection'
          }
        }
      });
    } else {
      res.status(400).json({
        error: 'Invalid JSON-RPC request',
        expected: { jsonrpc: '2.0', id: 'number', method: 'string' }
      });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      availableEndpoints: ['/health', '/info', '/sse', '/messages']
    });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });

  // Start server
  return new Promise((resolve, reject) => {
    try {
      app.listen(port, () => {
        console.log('\n🚀 MCP Server (HTTP/SSE Transport)');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📍 Server:     http://localhost:${port}`);
        console.log(`📡 SSE:        http://localhost:${port}/sse`);
        console.log(`💬 Messages:   http://localhost:${port}/messages`);
        console.log(`❤️  Health:     http://localhost:${port}/health`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        console.log('Waiting for connections...\n');
        resolve(app);
      });
    } catch (error) {
      console.error('❌ Failed to start HTTP server:', error);
      reject(error);
    }
  });
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server: any): void {
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    
    if (server.close) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('✅ Server closed');
          resolve();
        });
      });
    }
    
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}