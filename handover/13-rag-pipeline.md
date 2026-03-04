# RAG Pipeline (The Core Feature)

[← Back to Index](./README.md)

---

This is the heart of the product. When a user asks a question, here's what happens:

## Step 1: Query Classification

The question is classified as:
- `project_list` — asking about available projects
- `project_specific` — asking about a specific project
- `general` — general Tokamak question

Classification uses regex patterns first, then falls back to LLM classification.

## Step 2: Context Building

- For project queries: structured project data is fetched from PostgreSQL
- For general queries: project list summary is included as context

## Step 3: Embedding

The question text is embedded using OpenAI's `text-embedding-3-small` model (1536 dimensions).

## Step 4: Vector Search

The embedding is searched against Qdrant's `tokamak_knowledge` collection. Filters exclude archived/disabled sources. If the question is project-specific, results are filtered to that project's sources.

## Step 5: Re-Ranking

Results are re-ranked based on:
- Recency (newer documents score higher)
- Feedback signals (positive feedback boosts relevance)

## Step 6: LLM Completion

The context (relevant chunks + project info) and the question are sent to the LLM (OpenAI `gpt-4.1-mini` by default, or Anthropic `claude-sonnet-4-5`). The system prompt instructs the LLM to cite sources.

## Step 7: Response

The answer is returned (or streamed via SSE) with:
- The answer text (markdown)
- Source citations (linked to original documents)
- Confidence score
- Token usage
