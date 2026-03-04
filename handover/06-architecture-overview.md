# Architecture Overview

[← Back to Index](./README.md)

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Users / Clients                       │
├──────────┬──────────────┬──────────────┬────────────────────┤
│  Web App │ Landing Page │  SDK / API   │  Widget / MCP      │
│  :3000   │   :3002      │  Consumers   │  Embeds            │
└────┬─────┴──────┬───────┴──────┬───────┴────────┬───────────┘
     │            │              │                │
     └────────────┴──────────────┴────────────────┘
                          │
                   ┌──────┴──────┐
                   │   NestJS    │
                   │   API :4000 │
                   └──┬───┬───┬──┘
                      │   │   │
            ┌─────────┘   │   └──────────┐
            │             │              │
     ┌──────┴──────┐ ┌───┴────┐  ┌──────┴──────┐
     │ PostgreSQL  │ │ Qdrant │  │    Redis     │
     │  (data)     │ │(vectors)│  │ (queues)    │
     └─────────────┘ └────────┘  └─────────────┘
                          │
                   ┌──────┴──────┐
                   │   OpenAI /  │
                   │  Anthropic  │
                   │  (LLM + embed)│
                   └─────────────┘
```

## Data Flow for a Question

1. User asks a question in the web app (or via API/SDK)
2. API classifies the query (project-specific vs general)
3. Question is embedded using OpenAI
4. Vector search runs against Qdrant to find relevant document chunks
5. Results are re-ranked (recency, feedback signals)
6. Context + question is sent to the LLM (OpenAI or Anthropic)
7. LLM generates an answer with source citations
8. Answer is streamed back to the user via SSE
