# Authentication & Authorization

[← Back to Index](./README.md)

---

## Internal Auth (Web App)

1. User enters their email on the login page
2. API sends a 6-digit OTP code via email (Resend)
3. User enters the code → API returns a JWT
4. JWT is stored in `localStorage` as `tokamak_token`
5. All subsequent API calls include `Authorization: Bearer <token>`

**Dev shortcut:** If `RESEND_API_KEY` is not set, OTP `123456` is always accepted.

**Email restriction:** Only `@tokamak.network` emails are allowed (enforced in the auth service).

## Public API Auth

External consumers authenticate via API keys:
- Header: `X-API-Key: tk_...`
- Keys have **scopes** (`ask`, `search`, `sources:read`, `content:read`, `projects:read`)
- Keys have **tiers** with rate limits: free (30/min), standard (120/min), premium (600/min)
- Usage is logged per request (endpoint, status, latency)

## Roles

- **User roles:** `admin`, `project_lead`, `member`, `viewer`
- **Project roles:** `lead`, `contributor`
- Protected with `@Roles()` decorator and `RolesGuard`
