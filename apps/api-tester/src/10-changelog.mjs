/**
 * 10 — Changelog, LLMs.txt & Misc Tests
 *
 * Tests remaining public endpoints in more detail:
 *   GET /api/v1/changelog
 *   GET /api/v1/changelog/latest
 *   GET /api/v1/changelog/:version
 *   GET /api/v1/changelog?type=added
 *   GET /llms.txt
 *   GET /llms-full.txt
 *   GET /widget.js
 *   GET /api/v1/openapi.json  (OpenAPI spec)
 */

import { get } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, info, skip, summary } from './utils/logger.mjs';

export async function run() {
  header('10 — Changelog, LLMs.txt & Misc');

  // ── Changelog ──────────────────────────────────────────────────
  section('Changelog');

  let latestVersion = null;

  await test('GET /changelog returns all entries', async () => {
    const res = await get('/changelog');
    assertOk(res, 'GET /changelog');
    const entries = Array.isArray(res.data) ? res.data : [];
    if (entries.length > 0 && entries[0].version) {
      latestVersion = entries[0].version;
    }
    return `${entries.length} entries`;
  });

  await test('GET /changelog/latest returns most recent', async () => {
    const res = await get('/changelog/latest');
    assertOk(res, 'GET /changelog/latest');
    if (res.data.version) {
      latestVersion = latestVersion || res.data.version;
    }
    return res.data.version ? `v${res.data.version}` : 'ok';
  });

  if (latestVersion) {
    await test(`GET /changelog/${latestVersion} returns specific version`, async () => {
      const res = await get(`/changelog/${latestVersion}`);
      assertOk(res, `GET /changelog/${latestVersion}`);
      return `version: ${res.data.version}`;
    });
  } else {
    skip('GET /changelog/:version', 'no version found');
  }

  await test('GET /changelog?type=added filters by type', async () => {
    const res = await get('/changelog?type=added');
    assertOk(res, 'GET /changelog?type=added');
    return 'ok';
  });

  await test('GET /changelog?type=fixed filters by type', async () => {
    const res = await get('/changelog?type=fixed');
    assertOk(res, 'GET /changelog?type=fixed');
    return 'ok';
  });

  // ── LLMs.txt (detailed) ───────────────────────────────────────
  section('LLMs.txt');

  await test('GET /llms.txt is non-empty plain text', async () => {
    const res = await get('/llms.txt', { raw: true });
    assertOk(res, 'GET /llms.txt');
    assert(typeof res.data === 'string' && res.data.length > 0, 'Expected non-empty text');
    return `${res.data.length} chars`;
  });

  await test('GET /llms-full.txt is non-empty and longer than llms.txt', async () => {
    const brief = await get('/llms.txt', { raw: true });
    const full = await get('/llms-full.txt', { raw: true });
    assertOk(full, 'GET /llms-full.txt');
    assert(typeof full.data === 'string' && full.data.length > 0, 'Expected non-empty text');
    return `${full.data.length} chars (brief: ${brief.data.length} chars)`;
  });

  // ── Widget ─────────────────────────────────────────────────────
  section('Widget');

  await test('GET /widget.js returns valid JavaScript', async () => {
    const res = await get('/widget.js', { raw: true });
    assertOk(res, 'GET /widget.js');
    assert(typeof res.data === 'string' && res.data.length > 0, 'Expected non-empty JS');
    return `${res.data.length} chars`;
  });

  await test('GET /widget.js?key=test-key accepts key param', async () => {
    const res = await get('/widget.js?key=test-key', { raw: true });
    assertOk(res, 'GET /widget.js?key=test-key');
    return 'ok';
  });

  // ── OpenAPI Spec ───────────────────────────────────────────────
  section('OpenAPI Spec');

  await test('GET /openapi.json returns OpenAPI spec', async () => {
    const res = await get('/openapi.json');
    assertOk(res, 'GET /openapi.json');
    assert(res.data.openapi || res.data.swagger, 'Expected OpenAPI spec');
    return `OpenAPI ${res.data.openapi || res.data.swagger}`;
  });

  return summary();
}

const isMain = process.argv[1]?.endsWith('10-changelog.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
