# Repository Structure

[← Back to Index](./README.md)

---

```
tokamak-network-pilot/
├── apps/
│   ├── api/                  # NestJS backend — REST API, RAG, auth (port 4000)
│   ├── web/                  # Next.js frontend — chat UI, admin dashboard (port 3000)
│   └── landing-page/         # Next.js landing page — marketing site (port 3002)
├── packages/
│   ├── shared/               # Shared TypeScript types & constants
│   ├── sdk/                  # Public TypeScript SDK (@tokamak-pilot/sdk)
│   ├── mcp-server/           # MCP server for Cursor/Claude Desktop
│   └── eslint-config/        # Shared ESLint config
├── examples/
│   ├── nextjs-chat/          # Full Next.js chat example using SDK
│   ├── widget-embed/         # Embeddable chat widget demos
│   └── node-*.mjs            # Simple Node.js script examples
├── docs/                     # Developer documentation
│   ├── DEVELOPER_GUIDE.md
│   ├── API_REFERENCE_PUBLIC.md
│   ├── EXAMPLES.md
│   ├── WEBSITE_CRAWL.md
│   └── MCP.md
├── docker-compose.yml        # Local dev infrastructure (Postgres, Qdrant, Redis)
├── turbo.json                # Turborepo task config
├── pnpm-workspace.yaml       # Workspace definition
├── .env.example              # Environment variable template
├── MARKETING.md              # Brand & marketing guide
└── README.md                 # Main project README
```

Each app has its own `Dockerfile` for production deployment.
