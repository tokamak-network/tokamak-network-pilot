# Database Schema

[← Back to Index](./README.md)

---

PostgreSQL via TypeORM. Key entities and their relationships:

## Entity Relationships

```
User
 ├── has many → ApiKey
 ├── has many → Conversation → has many → Message → has one → Feedback
 ├── has many → ContentEntry
 ├── has many → Snippet
 └── member of → Project (via ProjectMember)

Project
 ├── has many → ProjectMember (links to User)
 ├── has many → ProjectSource (links to Source)
 ├── has many → ProjectInvitation
 ├── has many → ProjectFeedback
 ├── has many → ProjectNews → has many → GeneratedPost
 ├── has many → RoadmapItem → has many → RoadmapTaskPrompt
 └── has many → Snippet

Source
 ├── has many → Document
 └── linked to → Project (via ProjectSource)

ApiKey
 └── has many → ApiKeyUsageLog
```

## Notable Entity Details

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **Source** | `type` (github_repo, github_org, website, file_upload), `status`, `config` (JSON) | Tracks ingestion state |
| **Document** | `content`, `qdrantPointId`, `chunkIndex` | Each chunk is one document row |
| **User** | `email`, `role` (admin, project_lead, member, viewer) | Only `@tokamak.network` emails in production |
| **ApiKey** | `keyHash`, `scopes`, `tier` (free/standard/premium), `rateLimit` | Hashed, never stored in plain text |
| **Project** | `slug`, `isPublic`, `showOnLandingPage`, `publicTheme` | Supports public-facing pages |
| **RoadmapItem** | `aiConfidence`, `aiRationale`, `sourceFeedbackIds` | AI-generated from user feedback |

**Important:** TypeORM `synchronize` is enabled in development. In production, set `DB_SYNC=false` and manage schema changes carefully.
