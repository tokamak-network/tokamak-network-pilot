#!/usr/bin/env node
/**
 * Example: Ask a question (RAG).
 * POST /public/ask — scope: ask
 *
 * Usage:
 *   TOKAMAK_PILOT_API_URL=... TOKAMAK_PILOT_API_KEY=... node examples/node-ask.mjs
 *   node examples/node-ask.mjs "How does TON staking work?"
 */

const baseUrl = process.env.TOKAMAK_PILOT_API_URL || 'http://localhost:4000/api/v1';
const apiKey = process.env.TOKAMAK_PILOT_API_KEY;
const question = process.argv[2] || 'What is Tokamak Network?';

if (!apiKey) {
  console.error('Set TOKAMAK_PILOT_API_KEY');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/public/ask`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  },
  body: JSON.stringify({ question }),
});

const data = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error('Error:', data.message || res.statusText);
  process.exit(1);
}

console.log('Question:', data.question);
console.log('Confidence:', data.confidence);
console.log('Answer:\n', data.answer);
console.log('\nSources:');
(data.sources || []).forEach((s, i) => console.log(`  ${i + 1}. ${s.title} (${s.score}) — ${s.url}`));
