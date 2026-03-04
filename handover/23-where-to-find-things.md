# Where to Find Things

[← Back to Index](./README.md)

---

| "I need to..." | Look here |
|----------------|-----------|
| Add a new API endpoint | `apps/api/src/modules/<feature>/` — create controller, service, DTOs, module |
| Add a new page to the web app | `apps/web/src/app/<route>/page.tsx` |
| Add a new shared type | `packages/shared/src/types.ts` |
| Add a new UI component | `npx shadcn@latest add <name>` from `apps/web/` |
| Change the database schema | Edit the entity in `apps/api/src/entities/` |
| Add a new knowledge source type | `apps/api/src/modules/ingestion/` + `apps/api/src/modules/sources/` |
| Change the LLM provider | Set `LLM_PROVIDER` in `.env` (`openai` or `anthropic`) |
| Understand the RAG logic | `apps/api/src/modules/rag/rag.service.ts` |
| See API docs | Run the API and visit http://localhost:4000/docs |
| Check brand guidelines | `MARKETING.md` |
| Read developer docs | `docs/` directory |
| See example integrations | `examples/` directory |
