# Enhanced MCP TypeScript Quickstart

> **Build-less TypeScript quickstart for MCP servers with auto-loading and HTTP/SSE transport**

This is an enhanced version of the [original MCP TypeScript quickstart](https://github.com/cephalization/mcp-ts-quickstart) with powerful features for rapid development and production deployment.

## 🌟 What's New

### ✨ Auto-Loading Pattern
Drop a tool/resource/prompt file in the appropriate directory and it's **instantly available**—no manual registration needed!

### 🌐 HTTP/SSE Transport
Run your MCP server over HTTP with Server-Sent Events, enabling:
- Remote access from any client
- Cloud deployment (AWS Lambda, Cloud Run, etc.)
- Multiple simultaneous connections
- Web-based MCP clients

### 📦 Enhanced Developer Experience
- **Zero configuration** for new tools
- **Hot reload** with MCP Inspector
- **Type-safe** with Zod schemas
- **Build-less** using Node v23+

---

## 🚀 Quick Start

### Prerequisites
- Node.js v23+ (uses `--experimental-strip-types`)
- `nvm` for Node version management
- `pnpm` for package management

### Installation

```bash
# Clone the repository
git clone https://github.com/ramene/mcp-ts-quickstart.git
cd mcp-ts-quickstart

# Install Node v23
nvm install && nvm use

# Install dependencies
pnpm install
```

### Running the Server

#### Option 1: Stdio Mode (Claude Desktop)

```bash
pnpm start
# Server runs on stdio, ready for Claude Desktop
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "enhanced-mcp": {
      "command": "/Users/YOUR_USERNAME/.nvm/versions/node/v23.6.0/bin/node",
      "args": ["--experimental-strip-types", "/path/to/mcp-ts-quickstart/src/index.ts"]
    }
  }
}
```

#### Option 2: HTTP Mode (Remote Access)

```bash
pnpm start:http
# Server runs on http://localhost:3000
```

Test with curl:
```bash
# Health check
curl http://localhost:3000/health

# Connect via SSE
curl http://localhost:3000/sse
```

#### Option 3: MCP Inspector (Development)

```bash
pnpm start:inspector
# Opens http://localhost:6274 with inspector UI
```

---

## 📁 Project Structure

```
mcp-ts-quickstart/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── registry/
│   │   ├── types.ts                # Type definitions
│   │   └── auto-loader.ts          # Auto-loading magic
│   ├── transports/
│   │   └── http-sse.ts             # HTTP/SSE transport
│   └── tools/
│       └── top-stories-tool.ts     # Example: HN top stories
├── tests/
│   ├── integration/                # Transport tests
│   └── examples/                   # Example clients
├── docs/                           # Documentation
├── package.json
└── README.md
```

---

## 🔧 Creating Your Own Tools

### The Registerable Pattern

Every tool follows this simple pattern:

```typescript
// src/tools/my-tool.ts
import { z } from 'zod';
import type { RegisterableModule } from '../registry/types.ts';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const myTool: RegisterableModule = {
  type: 'tool',
  name: 'my-tool',
  description: 'Does something useful',
  
  register(server: McpServer) {
    server.tool(
      this.name,
      this.description,
      {
        // Zod schema for parameters
        message: z.string().describe('A message to process')
      },
      async ({ message }) => {
        // Your tool logic here
        return {
          content: [{
            type: 'text',
            text: `Processed: ${message}`
          }]
        };
      }
    );
  }
};

export default myTool;
```

**That's it!** Drop this file in `src/tools/` and restart the server. Your tool is now available.

### Example Tools

See `src/tools/top-stories-tool.ts` for a complete working example that fetches Hacker News top stories. This demonstrates:
- Zod schema validation
- External API calls
- Error handling
- Proper response formatting

---

## 🌐 HTTP/SSE Transport Guide

### Configuration

Set environment variables in `.env`:

```bash
MCP_TRANSPORT=http
MCP_PORT=3000
MCP_CORS=true
MCP_CORS_ORIGINS=https://myapp.com,https://app.example.com
```

### Deployment

#### Docker
```dockerfile
FROM node:23-alpine
WORKDIR /app
COPY . .
RUN npm install
ENV MCP_TRANSPORT=http
EXPOSE 3000
CMD ["npm", "start"]
```

#### Cloud Run / Lambda
The HTTP transport works seamlessly with serverless platforms. Set `MCP_TRANSPORT=http` and deploy!

---

## 📚 Example Tool

### **topStories**
Fetches top stories from Hacker News - demonstrates the registerable pattern.

```typescript
// Usage in Claude Desktop:
"Get the top 10 Hacker News stories"

// The tool will:
// 1. Fetch from HackerNews API
// 2. Parse story data
// 3. Return formatted results
```

See [src/tools/top-stories-tool.ts](src/tools/top-stories-tool.ts) for the complete implementation.

---

## 🎯 Auto-Loading Deep Dive

### How It Works

1. **Discovery**: Scans `src/tools/`, `src/resources/`, `src/prompts/`
2. **Import**: Dynamically imports all `.ts` files
3. **Validation**: Checks for valid `RegisterableModule` structure
4. **Registration**: Calls `.register(server)` on each module
5. **Reporting**: Shows summary of loaded/skipped/errored modules

### Benefits

| Before | After |
|--------|-------|
| Edit `index.ts` for every tool | Drop file, restart |
| 100+ lines for 10 tools | 20 lines total |
| Manual dependency tracking | Automatic |
| Risk of typos in registration | Type-safe validation |

### Debug Output

```
🔍 Auto-loading modules from: /path/to/tools
📁 Found 1 potential modules
🔧 Registered tool: topStories

📊 Auto-loading Summary:
   ✅ Loaded: 1
   ⏭️  Skipped: 0
   ❌ Errors: 0

📋 Registered modules:
   🔧 tools: 1
```

---

## 🔐 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | `3000` | HTTP server port |
| `MCP_CORS` | `true` | Enable CORS |
| `MCP_CORS_ORIGINS` | `*` | Allowed origins (comma-separated) |
| `MCP_VERBOSE` | `true` | Verbose logging |

---

## 🤝 Contributing

This enhanced version is based on the excellent work by [@cephalization](https://github.com/cephalization). Additional patterns inspired by:

- **fastmcp** by [@punkpeye](https://github.com/punkpeye/fastmcp)
- **mcp-server-starter-ts** by [@alexanderop](https://github.com/alexanderop/mcp-server-starter-ts)

### Making Changes

1. Fork this repo
2. Create a feature branch
3. Add your tool to `src/tools/` following the registerable pattern
4. Test with `pnpm start:inspector`
5. Submit a PR with clear description

---

## 📝 Migration Guide

### From Original Quickstart

If you're migrating from the original quickstart:

1. **Update your tools** to use the registerable pattern:
   ```typescript
   // Old way (manual registration in index.ts)
   server.tool('myTool', 'Description', schema, handler);
   
   // New way (auto-loaded from src/tools/myTool.ts)
   export default {
     type: 'tool',
     name: 'myTool',
     description: 'Description',
     register(server) {
       server.tool(this.name, this.description, schema, handler);
     }
   };
   ```

2. **Remove manual registrations** from `src/index.ts`

3. **Run** `pnpm install` to get new dependencies

4. **Copy** `.env.example` to `.env` and configure

That's it! Your tools are now auto-loaded.

---

## 📚 Documentation

**Complete documentation is available in the [docs/](docs/) directory:**

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment options (Cloud Run, Railway, Fly.io, AWS Lambda, VPS) with security patterns
- **[HTTP Transport Guide](docs/HTTP_TRANSPORT_GUIDE.md)** - HTTP/SSE transport architecture and implementation details
- **[Test Suite](tests/README.md)** - Comprehensive testing documentation and examples

See [docs/README.md](docs/README.md) for the complete documentation index.

---

## 📖 Learn More

- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Node.js Type Stripping](https://nodejs.org/api/typescript.html)

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Credits

- **Original Quickstart**: [@cephalization](https://github.com/cephalization/mcp-ts-quickstart)
- **Auto-Loading Pattern**: Inspired by [fastmcp](https://github.com/punkpeye/fastmcp)
- **Registry Architecture**: Inspired by [mcp-server-starter-ts](https://github.com/alexanderop/mcp-server-starter-ts)
- **Enhanced by**: [@ramene](https://github.com/ramene)

---

**⭐ If you find this useful, please star the repo!**