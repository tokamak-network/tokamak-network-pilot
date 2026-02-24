#!/usr/bin/env node
/**
 * Example: Public API health check.
 * GET /public/health — no scope required.
 *
 * Usage:
 *   TOKAMAK_PILOT_API_URL=http://localhost:4000/api/v1 TOKAMAK_PILOT_API_KEY=tk_xxx node examples/node-health.mjs
 */

const baseUrl = process.env.TOKAMAK_PILOT_API_URL || 'http://localhost:4000/api/v1';
const apiKey = process.env.TOKAMAK_PILOT_API_KEY;

if (!apiKey) {
  console.error('Set TOKAMAK_PILOT_API_KEY');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/public/health`, {
  headers: { 'X-API-Key': apiKey },
});

const data = await res.json().catch(() => ({}));
console.log('Status:', res.status);
console.log('Body:', JSON.stringify(data, null, 2));

if (!res.ok) process.exit(1);
