#!/usr/bin/env node
/**
 * Example: Stream an answer (SSE).
 * POST /public/ask/stream — scope: ask
 *
 * Usage:
 *   TOKAMAK_PILOT_API_URL=... TOKAMAK_PILOT_API_KEY=... node examples/node-stream.mjs
 *   node examples/node-stream.mjs "Explain TON staking in 2 sentences."
 */

const baseUrl = process.env.TOKAMAK_PILOT_API_URL || 'http://localhost:4000/api/v1';
const apiKey = process.env.TOKAMAK_PILOT_API_KEY;
const question = process.argv[2] || 'What is Tokamak Network?';

if (!apiKey) {
  console.error('Set TOKAMAK_PILOT_API_KEY');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/public/ask/stream`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  },
  body: JSON.stringify({ question }),
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  console.error('Error:', err.message || res.statusText);
  process.exit(1);
}

const reader = res.body?.getReader();
if (!reader) {
  console.error('No body');
  process.exit(1);
}

const decoder = new TextDecoder();
let buffer = '';
let currentEvent = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
    else if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (currentEvent === 'metadata') {
          console.error('Sources:', data.sources?.length, '| Confidence:', data.confidence);
        } else if (currentEvent === 'chunk') {
          process.stdout.write(data.text || '');
        } else if (currentEvent === 'done') {
          process.stdout.write('\n');
        } else if (currentEvent === 'error') {
          console.error('\nStream error:', data.message);
        }
      } catch (_) {}
      currentEvent = '';
    }
  }
}
