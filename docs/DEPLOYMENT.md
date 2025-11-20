# 🚀 Remote HTTP Deployment Guide

Complete guide to deploying your MCP server for remote access over HTTP/SSE.

---

## 📋 Table of Contents

1. [Quick Start (Local Network)](#quick-start-local-network)
2. [Production Deployment Options](#production-deployment-options)
3. [Security Considerations](#security-considerations)
4. [Platform-Specific Guides](#platform-specific-guides)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🏠 Quick Start (Local Network)

### Option 1: Direct Port Exposure (Development Only!)

```bash
# Start server on all network interfaces
MCP_TRANSPORT=http MCP_PORT=3000 pnpm start

# Your MCP server is now accessible at:
# http://YOUR_LOCAL_IP:3000
```

**Find your local IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use hostname
hostname -I
```

**Test from another device:**
```bash
curl http://192.168.1.100:3000/health
```

⚠️ **Warning**: This exposes your server to anyone on your local network with NO authentication!

---

## 🌐 Production Deployment Options

### Option 1: Cloud Run (Google Cloud) - Recommended for Simplicity

**Why**: Serverless, auto-scaling, HTTPS included, free tier available

#### Step 1: Create Dockerfile

```dockerfile
# Dockerfile
FROM node:23-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Set environment variables
ENV MCP_TRANSPORT=http
ENV MCP_PORT=8080
ENV NODE_ENV=production

# Start server
CMD ["node", "--experimental-strip-types", "src/index.ts"]
```

#### Step 2: Create .dockerignore

```
node_modules
.env
.git
tests
*.md
.vscode
```

#### Step 3: Deploy to Cloud Run

```bash
# Install Google Cloud CLI
brew install google-cloud-sdk  # macOS
# or download from: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy mcp-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi

# Get your URL
# https://mcp-server-XXXXX-uc.a.run.app
```

**Cost**: Free tier includes 2 million requests/month

---

### Option 2: AWS Lambda + API Gateway

**Why**: Pay per use, scales automatically, integrates with AWS ecosystem

#### Step 1: Create Lambda Handler

```typescript
// lambda.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { startHTTPServer } from './src/transports/http-sse-transport.ts';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { autoLoadModules } from './src/registry/auto-loader.ts';

const server = new McpServer({
  name: 'mcp-lambda',
  version: '1.0.0',
});

// Initialize once (cold start)
let app: any = null;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (!app) {
    await autoLoadModules(server, './tools');
    app = await startHTTPServer(server, { port: 3000 });
  }

  // Handle HTTP requests
  // ... implement request routing
};
```

#### Step 2: Deploy with Serverless Framework

```yaml
# serverless.yml
service: mcp-server

provider:
  name: aws
  runtime: nodejs23.x
  region: us-east-1

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
```

```bash
# Deploy
npx serverless deploy
```

**Cost**: Free tier includes 1 million requests/month

---

### Option 3: Railway.app - Easiest Setup

**Why**: One-click deploy, automatic HTTPS, simple pricing

#### Step 1: Connect GitHub Repository

```bash
# Push your code to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mcp-server.git
git push -u origin main
```

#### Step 2: Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables:
   - `MCP_TRANSPORT`: http
   - `MCP_PORT`: 3000 (Railway auto-maps this)
5. Click "Deploy"

**URL**: `https://your-project.up.railway.app`

**Cost**: $5/month for 512MB RAM

---

### Option 4: Fly.io - Global Edge Network

**Why**: Deploy to 30+ regions, automatic SSL, low latency worldwide

#### Step 1: Install Fly CLI

```bash
brew install flyctl  # macOS
# or: curl -L https://fly.io/install.sh | sh
```

#### Step 2: Create fly.toml

```toml
# fly.toml
app = "your-mcp-server"
primary_region = "sjc"  # San Jose

[build]
  dockerfile = "Dockerfile"

[env]
  MCP_TRANSPORT = "http"
  MCP_PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["http", "tls"]
```

#### Step 3: Deploy

```bash
# Login
fly auth login

# Launch (creates app)
fly launch --no-deploy

# Deploy
fly deploy

# Your URL
fly open
```

**Cost**: Free tier includes 3 shared-cpu VMs

---

### Option 5: Traditional VPS (DigitalOcean, Linode, etc.)

**Why**: Full control, predictable pricing, good for high traffic

#### Step 1: Create Droplet/VM

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Install Node.js 23
curl -fsSL https://deb.nodesource.com/setup_23.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm
```

#### Step 2: Setup Application

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/mcp-server.git
cd mcp-server

# Install dependencies
pnpm install

# Test run
MCP_TRANSPORT=http pnpm start
```

#### Step 3: Setup PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: 'src/index.ts',
    interpreter: 'node',
    interpreter_args: '--experimental-strip-types',
    env: {
      MCP_TRANSPORT: 'http',
      MCP_PORT: '3000',
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

#### Step 4: Setup Nginx Reverse Proxy

```bash
# Install Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/mcp << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/mcp /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

**Cost**: $6-12/month for basic VPS

---

## 🔒 Security Considerations

### 1. Authentication & Authorization

#### Option A: API Key Authentication

Add to [src/transports/http-sse-transport.ts:66](src/transports/http-sse-transport.ts#L66):

```typescript
// Add before other middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

Set environment variable:
```bash
export API_KEY="your-secret-key-here"
```

Client usage:
```typescript
const client = new SSEClientTransport(
  new URL('https://your-server.com/sse'),
  {
    headers: {
      'X-API-Key': 'your-secret-key-here'
    }
  }
);
```

#### Option B: JWT Authentication

```bash
pnpm add jsonwebtoken
```

```typescript
import jwt from 'jsonwebtoken';

app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (req.path === '/health') return next();

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

### 2. Rate Limiting

```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/sse', limiter);
app.use('/messages', limiter);
```

### 3. CORS Configuration

Update [src/transports/http-sse-transport.ts:67](src/transports/http-sse-transport.ts#L67):

```typescript
// Replace the simple CORS middleware with:
import cors from 'cors';

app.use(cors({
  origin: [
    'https://your-app.com',
    'https://app.your-domain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));
```

### 4. Environment Variables

**Never commit secrets!** Use a `.env` file:

```bash
# .env
API_KEY=your-secret-api-key
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

Add to `.gitignore`:
```
.env
.env.local
.env.production
```

---

## 📊 Monitoring & Maintenance

### Health Checks

Your server already has a health endpoint:

```bash
curl https://your-server.com/health
```

Returns:
```json
{
  "status": "ok",
  "mode": "http-sse",
  "timestamp": "2025-11-19T12:00:00.000Z",
  "uptime": 86400.5
}
```

### Logging

Add structured logging:

```bash
pnpm add pino pino-pretty
```

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Use throughout app
logger.info('Server started');
logger.error({ err }, 'Request failed');
```

### Uptime Monitoring

Use services like:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://pingdom.com
- **StatusCake**: https://statuscake.com

Configure to ping `/health` every 5 minutes.

---

## 🎯 Quick Deployment Comparison

| Platform | Setup Time | Cost | SSL | Scaling | Best For |
|----------|------------|------|-----|---------|----------|
| **Cloud Run** | 10 min | Free tier | Auto | Auto | Production |
| **Railway** | 5 min | $5/mo | Auto | Manual | Prototypes |
| **Fly.io** | 15 min | Free tier | Auto | Auto | Global apps |
| **AWS Lambda** | 30 min | Free tier | Manual | Auto | AWS ecosystem |
| **VPS** | 60 min | $6-12/mo | Manual | Manual | Full control |

---

## 🚦 Next Steps

1. **Choose a platform** based on your needs
2. **Add authentication** (API key or JWT)
3. **Set up monitoring** (health checks, logging)
4. **Configure rate limiting** to prevent abuse
5. **Test with the example client**:

```bash
# Update URL in tests/examples/http-sse-client.ts
const SERVER_URL = 'https://your-deployed-server.com';

# Test connection
pnpm example:http
```

---

## 📚 Additional Resources

- [MCP Protocol Docs](https://modelcontextprotocol.io/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Last Updated:** November 19, 2025
**Questions?** Open an issue at [github.com/ramene/mcp-ts-quickstart](https://github.com/ramene/mcp-ts-quickstart)
