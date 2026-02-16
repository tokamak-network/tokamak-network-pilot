/**
 * 08 — Public API Tests (API Key Auth)
 *
 * Tests the public API endpoints that use X-API-Key header.
 * Creates an API key first, then tests all public endpoints.
 *
 *   GET  /api/v1/public/health
 *   POST /api/v1/public/ask
 *   GET  /api/v1/public/search?q=...
 *   GET  /api/v1/public/sources
 *   GET  /api/v1/public/sources/:id
 *   GET  /api/v1/public/content
 *   GET  /api/v1/public/content/:id
 */

import { get, post, del, login, getToken, getApiKey, setApiKey } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, assertStatus, info, skip, summary } from './utils/logger.mjs';

let tempKeyId = null;

export async function run() {
  header('08 — Public API (API Key Auth)');

  // ── Login & Create temp API key ────────────────────────────────
  section('Setup — Login & Create API Key');

  if (!getToken()) {
    await test('Login with OTP', async () => {
      const { user } = await login();
      return `as ${user.email}`;
    });
  } else {
    info('Already authenticated, skipping login');
  }

  if (!getApiKey()) {
    await test('Create temporary API key for public API tests', async () => {
      const res = await post('/api-keys', {
        name: 'Public API Test Key — Temp',
        scopes: ['ask', 'search', 'sources:read', 'content:read'],
      });
      assertOk(res, 'POST /api-keys');
      tempKeyId = res.data.id;
      const key = res.data.key || res.data.plaintext || res.data.secret;
      assert(key, 'Expected plaintext key in response');
      setApiKey(key);
      info(`Temp API key created: ${key.substring(0, 12)}...`);
      return `id: ${tempKeyId}`;
    });
  } else {
    info('Already have an API key, skipping creation');
  }

  // ── Public Health ──────────────────────────────────────────────
  section('Public Health');

  await test('GET /public/health with API key', async () => {
    const res = await get('/public/health', { useApiKey: true });
    assertOk(res, 'GET /public/health');
    assert(res.data.status === 'ok', `Expected status "ok", got "${res.data.status}"`);
    return `tier: ${res.data.tier || 'n/a'}, rateLimit: ${res.data.rateLimit || 'n/a'}`;
  });

  await test('GET /public/health without API key returns 401', async () => {
    const savedKey = getApiKey();
    setApiKey(null);
    const res = await get('/public/health', { useApiKey: true });
    assertStatus(res, 401, 'GET /public/health without key');
    setApiKey(savedKey);
    return 'correctly returned 401';
  });

  // ── Public Ask ─────────────────────────────────────────────────
  section('Public Ask');

  await test('POST /public/ask with API key', async () => {
    const res = await post('/public/ask', { question: 'What is Tokamak Network?' }, { useApiKey: true });
    assertOk(res, 'POST /public/ask');
    const answer = res.data.answer || res.data.response || '';
    return `answer: ${answer.substring(0, 60)}...`;
  });

  // ── Public Search ──────────────────────────────────────────────
  section('Public Search');

  await test('GET /public/search?q=staking with API key', async () => {
    const res = await get('/public/search?q=staking&limit=3', { useApiKey: true });
    assertOk(res, 'GET /public/search');
    return 'ok';
  });

  // ── Public Sources ─────────────────────────────────────────────
  section('Public Sources');

  let firstSourceId = null;

  await test('GET /public/sources with API key', async () => {
    const res = await get('/public/sources', { useApiKey: true });
    assertOk(res, 'GET /public/sources');
    const items = Array.isArray(res.data) ? res.data : res.data.data || [];
    if (items.length > 0) firstSourceId = items[0].id;
    return `${items.length} sources`;
  });

  if (firstSourceId) {
    await test('GET /public/sources/:id with API key', async () => {
      const res = await get(`/public/sources/${firstSourceId}`, { useApiKey: true });
      assertOk(res, 'GET /public/sources/:id');
      return `name: ${res.data.name}`;
    });
  } else {
    skip('GET /public/sources/:id', 'no sources available');
  }

  // ── Public Content ─────────────────────────────────────────────
  section('Public Content');

  let firstContentId = null;

  await test('GET /public/content with API key', async () => {
    const res = await get('/public/content', { useApiKey: true });
    assertOk(res, 'GET /public/content');
    const items = Array.isArray(res.data) ? res.data : res.data.data || [];
    if (items.length > 0) firstContentId = items[0].id;
    return `${items.length} entries`;
  });

  if (firstContentId) {
    await test('GET /public/content/:id with API key', async () => {
      const res = await get(`/public/content/${firstContentId}`, { useApiKey: true });
      assertOk(res, 'GET /public/content/:id');
      return `title: ${res.data.title}`;
    });
  } else {
    skip('GET /public/content/:id', 'no content available');
  }

  // ── Cleanup temp API key ───────────────────────────────────────
  section('Cleanup');

  if (tempKeyId) {
    await test('DELETE temp API key', async () => {
      const res = await del(`/api-keys/${tempKeyId}`);
      assertOk(res, 'DELETE temp API key');
      setApiKey(null);
      return 'revoked';
    });
  }

  return summary();
}

const isMain = process.argv[1]?.endsWith('08-public-api.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
