# Tech Stack

[← Back to Index](./README.md)

---

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, Jotai |
| **Landing Page** | Next.js 16, Framer Motion, Tailwind CSS 4 |
| **Backend** | NestJS 11 (TypeScript), Swagger/OpenAPI |
| **Database** | PostgreSQL 16 (via TypeORM, no Prisma) |
| **Vector Database** | Qdrant (also supports Pinecone/pgvector) |
| **Queue/Cache** | Redis 7 (via BullMQ) |
| **LLM Providers** | OpenAI (default) or Anthropic |
| **Embeddings** | OpenAI `text-embedding-3-small` (1536 dimensions) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **Deployment** | Railway (Docker containers) |
| **Email** | Resend (for OTP codes) |
