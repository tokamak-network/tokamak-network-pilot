#!/usr/bin/env node
/**
 * Example: List sources and list content.
 * GET /public/sources (scope: sources:read), GET /public/content (scope: content:read)
 *
 * Usage:
 *   TOKAMAK_PILOT_API_URL=... TOKAMAK_PILOT_API_KEY=... node examples/node-sources-content.mjs
 */

const baseUrl = process.env.TOKAMAK_PILOT_API_URL || 'http://localhost:4000/api/v1';
const apiKey = process.env.TOKAMAK_PILOT_API_KEY;

if (!apiKey) {
  console.error('Set TOKAMAK_PILOT_API_KEY');
  process.exit(1);
}

// List sources
const sourcesRes = await fetch(`${baseUrl}/public/sources`, {
  headers: { 'X-API-Key': apiKey },
});
const sourcesData = await sourcesRes.json().catch(() => ({}));

console.log('--- Sources ---');
if (!sourcesRes.ok) {
  console.error('Sources error:', sourcesData.message || sourcesRes.statusText);
} else {
  console.log('Total:', sourcesData.total);
  (sourcesData.sources || []).slice(0, 5).forEach((s) => {
    console.log(`  - ${s.name} (${s.type}) ${s.status} — ${s.id}`);
  });
  if ((sourcesData.sources || []).length > 5) console.log('  ...');
}

// List content (optional: ?project=...&category=...)
const contentRes = await fetch(`${baseUrl}/public/content`, {
  headers: { 'X-API-Key': apiKey },
});
const contentData = await contentRes.json().catch(() => ({}));

console.log('\n--- Content ---');
if (!contentRes.ok) {
  console.error('Content error:', contentData.message || contentRes.statusText);
} else {
  const list = contentData.data || [];
  console.log('Total:', contentData.total ?? list.length);
  list.slice(0, 5).forEach((c) => {
    console.log(`  - ${c.title} (${c.id})`);
  });
  if (list.length > 5) console.log('  ...');
}
