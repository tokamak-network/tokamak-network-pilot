/**
 * 01 — Health Check & Public Endpoint Tests
 *
 * Tests endpoints that require NO authentication:
 *   GET /api/v1/health
 *   GET /api/v1/projects        (public list)
 *   GET /api/v1/changelog
 *   GET /api/v1/changelog/latest
 *   GET /llms.txt
 *   GET /llms-full.txt
 *   GET /widget.js
 */

import { get } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, summary } from './utils/logger.mjs';

export async function run() {
  header('01 — Health Check & Public Endpoints');

  // ── Health ──────────────────────────────────────────────────────
  section('Health Check');

  await test('GET /health returns 200 with status "ok"', async () => {
    const res = await get('/health');
    assertOk(res, 'GET /health');
    assert(res.data.status === 'ok', `Expected status "ok", got "${res.data.status}"`);
    return `service: ${res.data.service}, version: ${res.data.version}`;
  });

  // ── Projects (public) ──────────────────────────────────────────
  section('Projects (Public)');

  await test('GET /projects returns 200', async () => {
    const res = await get('/projects');
    assertOk(res, 'GET /projects');
    const items = Array.isArray(res.data) ? res.data
      : res.data.projects ? res.data.projects
      : res.data.data ? res.data.data
      : null;
    assert(items !== null, 'Expected projects list in response');
    return `${items.length} projects (total: ${res.data.total ?? items.length})`;
  });

  // ── Changelog ──────────────────────────────────────────────────
  section('Changelog');

  await test('GET /changelog returns 200', async () => {
    const res = await get('/changelog');
    assertOk(res, 'GET /changelog');
    return `${Array.isArray(res.data) ? res.data.length : '?'} entries`;
  });

  await test('GET /changelog/latest returns 200', async () => {
    const res = await get('/changelog/latest');
    assertOk(res, 'GET /changelog/latest');
    return res.data.version ? `version ${res.data.version}` : 'ok';
  });

  // ── LLMs.txt ───────────────────────────────────────────────────
  section('LLMs.txt');

  await test('GET /llms.txt returns plain text', async () => {
    const res = await get('/llms.txt', { raw: true });
    assertOk(res, 'GET /llms.txt');
    assert(typeof res.data === 'string', 'Expected text response');
    return `${res.data.length} chars`;
  });

  await test('GET /llms-full.txt returns plain text', async () => {
    const res = await get('/llms-full.txt', { raw: true });
    assertOk(res, 'GET /llms-full.txt');
    assert(typeof res.data === 'string', 'Expected text response');
    return `${res.data.length} chars`;
  });

  // ── Widget ─────────────────────────────────────────────────────
  section('Widget');

  await test('GET /widget.js returns JavaScript', async () => {
    const res = await get('/widget.js', { raw: true });
    assertOk(res, 'GET /widget.js');
    assert(typeof res.data === 'string', 'Expected script response');
    return `${res.data.length} chars`;
  });

  return summary();
}

// Allow running standalone: node src/01-health.mjs
const isMain = process.argv[1]?.endsWith('01-health.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
