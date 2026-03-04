# Key Files to Know

[← Back to Index](./README.md)

---

If you're getting started, these are the files to read first:

| File | Why It Matters |
|------|---------------|
| `apps/api/src/app.module.ts` | See all backend modules at a glance |
| `apps/api/src/main.ts` | API bootstrap, CORS, Swagger setup |
| `apps/api/src/modules/rag/rag.service.ts` | The core RAG pipeline logic |
| `apps/api/src/modules/ingestion/` | How knowledge gets into the system |
| `apps/api/src/modules/auth/` | Authentication flow |
| `apps/api/src/entities/` | All database entity definitions |
| `apps/web/src/app/page.tsx` | Main chat UI |
| `apps/web/src/lib/api.ts` | Frontend API client |
| `apps/web/src/store/` | All Jotai state atoms |
| `apps/web/src/components/app-shell.tsx` | Auth guard + layout |
| `packages/shared/src/types.ts` | All shared TypeScript types |
| `packages/sdk/src/` | Public SDK implementation |
| `.env.example` | All environment variables documented |
| `docker-compose.yml` | Local infrastructure setup |
