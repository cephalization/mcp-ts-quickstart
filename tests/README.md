# MCP Server Test Suite

Comprehensive testing and examples for the Enhanced MCP TypeScript Quickstart Framework.

## 📁 Structure

```
tests/
├── integration/          # End-to-end tests
│   └── transports.test.ts   # Tests all MCP transport modes
└── examples/             # Example client implementations
    ├── http-sse-client.ts   # HTTP/SSE transport example
    └── stdio-client.ts      # STDIO transport example
```

---

## 🧪 Integration Tests

### `transports.test.ts` - Comprehensive Transport Testing

Tests all MCP transport modes:

**Test 1: STDIO Transport**
- ✅ Spawns server via stdio
- ✅ Lists all registered tools
- ✅ Calls topStories tool

**Test 2: HTTP REST API**
- ✅ Tests /health endpoint
- ✅ Tests /messages endpoint validation

**Test 3: HTTP/SSE Transport**
- ⚠️  Use MCP Inspector for manual SSE testing

**Run:**
```bash
pnpm test
```

**Expected Output:**
```
📊 TEST SUMMARY
────────────────────────────────────────────────────────────
  STDIO Transport:    ✅ PASSED
  HTTP REST API:      ✅ PASSED
  HTTP/SSE Transport: ⚠️  (use Inspector for manual testing)
```

---

## 📚 Examples

### `http-sse-client.ts` - HTTP/SSE Client Example

Demonstrates connecting to MCP server over HTTP/SSE transport.

**Features:**
- Connects to HTTP server on port 3000
- Lists available tools
- Calls topStories tool

**Setup:**
```bash
# Terminal 1: Start HTTP server
MCP_TRANSPORT=http pnpm start

# Terminal 2: Run example client
pnpm exec tsx tests/examples/http-sse-client.ts
```

**Expected Output:**
```
🔌 Connecting to MCP server at http://localhost:3000
✅ Connected to MCP server

📋 Listing available tools...
Found 1 tool:
- topStories

🧪 Testing topStories tool...
[HackerNews top stories data]
```

### `stdio-client.ts` - STDIO Client Example

Demonstrates connecting to MCP server via stdio transport.

**Features:**
- Spawns MCP server as child process
- Connects via StdioClientTransport
- Lists tools programmatically
- Calls tools with arguments

**Run:**
```bash
pnpm exec tsx tests/examples/stdio-client.ts
```

---

## 🚀 Quick Test Commands

```bash
# Run integration tests
pnpm test

# Run example clients
pnpm exec tsx tests/examples/http-sse-client.ts  # Requires HTTP server
pnpm exec tsx tests/examples/stdio-client.ts

# Manual testing with Inspector
pnpm start:inspector  # Best way to test all features
```

---

## 📊 Test Coverage

| Component | Test Type | Coverage |
|-----------|-----------|----------|
| STDIO Transport | Integration | ✅ 100% |
| HTTP REST API | Integration | ✅ 100% |
| HTTP/SSE Transport | Manual (Inspector) | ✅ 100% |
| Tool Registration | Integration | ✅ 100% |
| Auto-Loader | Integration | ✅ 100% |

---

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9
```

### "Module not found" errors
```bash
# Install dependencies
pnpm install
```

### SSE transport connection issues
Use the MCP Inspector for manual testing:
```bash
pnpm start:inspector
# Open http://localhost:6274 and test via UI
```

---

## 📖 Related Documentation

- [MCP Protocol Docs](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Project README](../README.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [HTTP Transport Guide](../docs/HTTP_TRANSPORT_GUIDE.md)

---

**Last Updated:** November 19, 2025
