# Frontend (Web App) Deep Dive

[← Back to Index](./README.md)

---

**Location:** `apps/web/`
**Framework:** Next.js 15 with App Router
**Port:** 3000

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Main chat interface — ask questions, view conversations |
| `/login` | OTP email login |
| `/dashboard` | Analytics and status overview |
| `/projects` | List and manage projects |
| `/projects/[slug]` | Project detail — sources, team, settings |
| `/projects/[slug]/public` | Public-facing project page (no auth required) |
| `/projects/[slug]/roadmap` | Project roadmap management |
| `/sources` | List all knowledge sources |
| `/sources/[id]` | Source detail — documents, sync status |
| `/content` | Curated content entries |
| `/news` | News articles per project |
| `/social-posts` | AI-generated social media posts |
| `/snippets` | Code snippet library |
| `/settings` | User settings and API keys |

## Key Frontend Patterns

- **State management:** Jotai atoms in `src/store/` (auth, projects, sources, conversations, UI)
- **API calls:** All go through `src/lib/api.ts` — a typed fetch wrapper that handles JWT and error states
- **UI components:** shadcn/ui in `src/components/ui/` — never hand-code basic components
- **Icons:** Lucide React exclusively
- **Styling:** Tailwind CSS 4 with CSS variables for theming (forest/nature theme with cream + sage green)
- **Auth guard:** `AppShell` component wraps all pages, redirects unauthenticated users to `/login`
- **Streaming:** SSE-based streaming for chat answers with real-time token display

## Theme

The app has a warm "forest" theme with:
- Light mode: cream backgrounds, sage green accents
- Dark mode: dark backgrounds with warm tones
- Public project pages support additional themes: ocean, sunset, midnight, lavender, slate
