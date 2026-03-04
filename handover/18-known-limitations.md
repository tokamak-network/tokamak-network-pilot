# Known Limitations & Tech Debt

[← Back to Index](./README.md)

---

1. **No migrations.** TypeORM `synchronize: true` handles schema in dev. There are no migration files. For production schema changes, you need to be careful — either write manual SQL or generate TypeORM migrations.

2. **No CI/CD.** Deployments are manual via Railway CLI. No automated tests run on push.

3. **No test coverage.** Jest is configured but there are minimal tests. E2E test infrastructure exists but isn't populated.

4. **`synchronize: true` in dev.** This can cause data loss if entity definitions change. Fine for development, dangerous for production.

5. **Email restriction is hardcoded.** Only `@tokamak.network` emails can log in. This is enforced in the auth service, not configurable via env.

6. **API keys stored as hashes.** The full key is only shown once at creation time. If lost, the user must rotate the key.

7. **Vector DB is single-collection.** All documents go into one Qdrant collection (`tokamak_knowledge`). Project isolation is done via metadata filters, not separate collections.

8. **No rate limiting on internal API.** Rate limiting only applies to the public API (API key tiers). The internal JWT-authenticated API has no rate limits.

9. **Landing page port mismatch.** The cursor rules say port 3001, but the actual config uses port 3002. Minor inconsistency.
