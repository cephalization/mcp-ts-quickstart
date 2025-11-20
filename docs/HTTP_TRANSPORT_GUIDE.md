# HTTP/SSE Transport Guide

## Overview

The MCP server supports HTTP/SSE (Server-Sent Events) transport for remote access, in addition to the default stdio transport for local Claude Desktop use.

## Starting the Server

```bash
# HTTP mode
MCP_TRANSPORT=http pnpm start

# Or set in .env file
MCP_TRANSPORT=http
```

Server starts at: **http://localhost:3000**

## Available Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "ok",
  "mode": "http-sse",
  "timestamp": "2025-11-19T07:00:00.000Z",
  "uptime": 123.456
}
```

### 2. Server Info
```bash
curl http://localhost:3000/info
```

**Response**:
```json
{
  "name": "MCP Server",
  "version": "1.0.0",
  "transport": "http-sse",
  "endpoints": {
    "health": "/health",
    "sse": "/sse",
    "messages": "/messages"
  }
}
```

### 3. SSE Connection
```bash
curl -N http://localhost:3000/sse
```

This establishes a Server-Sent Events connection for receiving real-time updates.

### 4. Messages Endpoint
```http
POST http://localhost:3000/messages
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

## Using with MCP Client SDK

### TypeScript/JavaScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport(
  new URL('http://localhost:3000/sse')
);

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: 'topStories',
  arguments: { limit: 5 }
});
console.log(result);

await client.close();
```

### Python

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.sse import sse_client

async with sse_client("http://localhost:3000/sse") as (read, write):
    async with ClientSession(read, write) as session:
        # List tools
        tools = await session.list_tools()
        print(tools)

        # Call a tool
        result = await session.call_tool("topStories", {"limit": 5})
        print(result)
```

## Testing Tools

### Example: Test topStories

```bash
# Using curl (raw JSON-RPC)
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "topStories",
      "arguments": {"limit": 5}
    },
    "id": 1
  }'
```

## HTTP vs Stdio Mode

### Stdio Mode (Default)
- **Use**: Local Claude Desktop integration
- **Transport**: Standard input/output
- **Logging**: All logs to stderr (stdout reserved for JSON-RPC)
- **Start**: `pnpm start`

### HTTP Mode
- **Use**: Remote access, web clients, cloud deployment
- **Transport**: HTTP with Server-Sent Events
- **Logging**: Logs to stdout (no stdio constraint)
- **Start**: `MCP_TRANSPORT=http pnpm start`

## CORS Configuration

Set in `.env`:
```bash
MCP_CORS=true
MCP_CORS_ORIGINS=*  # Or specific origins: https://example.com,https://app.com
```

## Deployment

### Cloud Run (Google Cloud)
```dockerfile
FROM node:23-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install
ENV MCP_TRANSPORT=http
ENV MCP_PORT=8080
CMD ["pnpm", "start"]
```

### AWS Lambda
Use HTTP transport with API Gateway for SSE support.

### Fly.io
```toml
[env]
  MCP_TRANSPORT = "http"
  MCP_PORT = "8080"
```

## Security Considerations

### Current Implementation
- ⚠️ **No authentication** - Fine for local development
- ⚠️ **No rate limiting** - Add for production

### Production Recommendations
1. Add JWT authentication middleware
2. Implement rate limiting
3. Use HTTPS (reverse proxy or cloud load balancer)
4. Restrict CORS origins
5. Add request validation
6. Monitor and log access

### Example: Add Auth Middleware

```typescript
// src/transports/http-sse-transport.ts

app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !validateToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
});
```

## Troubleshooting

### Connection Issues
- Check server is running: `curl http://localhost:3000/health`
- Verify port is not in use: `lsof -i :3000`
- Check firewall settings

### CORS Errors
- Set `MCP_CORS=true` in `.env`
- Add your origin to `MCP_CORS_ORIGINS`

### SSE Not Working
- Ensure using correct URL: `http://localhost:3000/sse`
- Check browser/client supports EventSource
- Verify no proxy stripping SSE headers

## Monitoring

### Server Logs
Watch server logs for connections:
```
📡 New SSE connection established
🔌 SSE connection closed
```

### Health Checks
Monitor uptime:
```bash
watch -n 5 'curl -s http://localhost:3000/health | jq'
```

---

**Last Updated**: November 19, 2025
**Status**: Production Ready (add auth for public deployment)
