# How to Run Locally

[← Back to Index](./README.md)

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (install: `npm i -g pnpm`)
- **Docker** (for Postgres, Qdrant, Redis)

## Step-by-Step

```bash
# 1. Clone the repo
git clone https://github.com/tokamak-network/tokamak-network-pilot.git
cd tokamak-network-pilot

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (Postgres, Qdrant, Redis)
docker compose up -d

# 4. Set up environment
cp .env.example .env
# Edit .env — at minimum you need OPENAI_API_KEY

# 5. Start everything
pnpm dev
```

This starts:
- **API** → http://localhost:4000 (Swagger docs at http://localhost:4000/docs)
- **Web App** → http://localhost:3000
- **Landing Page** → http://localhost:3002

## First Login

The web app requires a `@tokamak.network` email to log in. In dev mode (without `RESEND_API_KEY` set), any email is accepted and the OTP code is always `123456`.
