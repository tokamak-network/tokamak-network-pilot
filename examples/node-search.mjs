#!/usr/bin/env node
/**
 * Example: Semantic search.
 * GET /public/search — scope: search
 *
 * Usage:
 *   TOKAMAK_PILOT_API_URL=... TOKAMAK_PILOT_API_KEY=... node examples/node-search.mjs
 *   node examples/node-search.mjs "staking rewards"
 */

const baseUrl = process.env.TOKAMAK_PILOT_API_URL || 'http://localhost:4000/api/v1';
const apiKey = process.env.TOKAMAK_PILOT_API_KEY;
const query = process.argv[2] || 'Tokamak Network';
const limit = process.argv[3] || 5;

if (!apiKey) {
  console.error('Set TOKAMAK_PILOT_API_KEY');
  process.exit(1);
}

const url = new URL(`${baseUrl}/public/search`);
url.searchParams.set('q', query);
url.searchParams.set('limit', String(limit));

const res = await fetch(url, {
  headers: { 'X-API-Key': apiKey },
});

const data = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error('Error:', data.message || res.statusText);
  process.exit(1);
}

console.log(`Search: "${data.query}" — ${data.total} result(s)\n`);
(data.results || []).forEach((r, i) => {
  console.log(`${i + 1}. [${r.source}] (score: ${r.score})`);
  console.log(r.content);
  console.log('---');
});
