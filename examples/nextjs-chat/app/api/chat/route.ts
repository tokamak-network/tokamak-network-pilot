import { NextRequest } from 'next/server';

const API_URL =
  process.env.TOKAMAK_PILOT_API_URL || 'https://api.tokamakforest.com/api/v1';
const API_KEY = process.env.TOKAMAK_PILOT_API_KEY || '';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return Response.json(
      { error: 'TOKAMAK_PILOT_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  const { question, conversationHistory, projectSlug } = await req.json();

  if (!question?.trim()) {
    return Response.json({ error: 'Question is required.' }, { status: 400 });
  }

  const body: Record<string, unknown> = { question };

  if (conversationHistory?.length) {
    body.conversationHistory = conversationHistory.slice(-10);
  }
  if (projectSlug) {
    body.projectSlug = projectSlug;
  }

  const upstream = await fetch(`${API_URL}/public/ask/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    return Response.json(
      { error: err.message || upstream.statusText },
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
