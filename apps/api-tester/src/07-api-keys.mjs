/**
 * 07 — API Keys Tests
 *
 * Tests API key lifecycle: create, list, get, update, rotate, usage, revoke.
 * Requires authentication (runs login first).
 *
 *   POST   /api/v1/api-keys
 *   GET    /api/v1/api-keys
 *   GET    /api/v1/api-keys/:id
 *   PATCH  /api/v1/api-keys/:id
 *   POST   /api/v1/api-keys/:id/rotate
 *   GET    /api/v1/api-keys/:id/usage
 *   DELETE /api/v1/api-keys/:id
 */

import { get, post, patch, del, login, getToken, setApiKey } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, info, summary } from './utils/logger.mjs';

let createdKeyId = null;
let plaintextKey = null;

export async function run() {
  header('07 — API Keys');

  // ── Login ──────────────────────────────────────────────────────
  section('Setup — Login');

  if (!getToken()) {
    await test('Login with OTP', async () => {
      const { user } = await login();
      return `as ${user.email}`;
    });
  } else {
    info('Already authenticated, skipping login');
  }

  // ── Create API Key ─────────────────────────────────────────────
  section('Create API Key');

  await test('POST /api-keys creates a new key', async () => {
    const res = await post('/api-keys', {
      name: 'Test Key — API Tester',
      scopes: ['ask', 'search', 'sources:read', 'content:read'],
    });
    assertOk(res, 'POST /api-keys');
    assert(res.data.id, 'Expected key ID');
    createdKeyId = res.data.id;
    // The plaintext key is only returned once
    plaintextKey = res.data.key || res.data.plaintext || res.data.secret;
    info(`Created API key: ${createdKeyId}`);
    if (plaintextKey) {
      info(`Plaintext key (saved for public API tests): ${plaintextKey.substring(0, 12)}...`);
      setApiKey(plaintextKey);
    }
    return `id: ${createdKeyId}`;
  });

  // ── List API Keys ──────────────────────────────────────────────
  section('List API Keys');

  await test('GET /api-keys returns list (secrets hidden)', async () => {
    const res = await get('/api-keys');
    assertOk(res, 'GET /api-keys');
    const items = Array.isArray(res.data) ? res.data : res.data.data || [];
    return `${items.length} keys`;
  });

  // ── Get API Key ────────────────────────────────────────────────
  section('Get API Key Details');

  await test('GET /api-keys/:id returns key details', async () => {
    assert(createdKeyId, 'No key ID');
    const res = await get(`/api-keys/${createdKeyId}`);
    assertOk(res, 'GET /api-keys/:id');
    return `name: ${res.data.name}`;
  });

  // ── Update API Key ─────────────────────────────────────────────
  section('Update API Key');

  await test('PATCH /api-keys/:id updates key name', async () => {
    assert(createdKeyId, 'No key ID');
    const res = await patch(`/api-keys/${createdKeyId}`, {
      name: 'Test Key — Updated by API Tester',
    });
    assertOk(res, 'PATCH /api-keys/:id');
    return 'name updated';
  });

  // ── Rotate API Key ─────────────────────────────────────────────
  section('Rotate API Key');

  await test('POST /api-keys/:id/rotate generates new secret', async () => {
    assert(createdKeyId, 'No key ID');
    const res = await post(`/api-keys/${createdKeyId}/rotate`);
    assertOk(res, 'POST /api-keys/:id/rotate');
    const newKey = res.data.key || res.data.plaintext || res.data.secret;
    if (newKey) {
      plaintextKey = newKey;
      setApiKey(newKey);
      info(`New key after rotation: ${newKey.substring(0, 12)}...`);
    }
    return 'rotated';
  });

  // ── Usage ──────────────────────────────────────────────────────
  section('API Key Usage');

  await test('GET /api-keys/:id/usage returns usage history', async () => {
    assert(createdKeyId, 'No key ID');
    const res = await get(`/api-keys/${createdKeyId}/usage`);
    assertOk(res, 'GET /api-keys/:id/usage');
    return 'ok';
  });

  // ── Revoke API Key (cleanup) ───────────────────────────────────
  section('Revoke API Key (cleanup)');

  await test('DELETE /api-keys/:id revokes the test key', async () => {
    assert(createdKeyId, 'No key ID');
    const res = await del(`/api-keys/${createdKeyId}`);
    assertOk(res, 'DELETE /api-keys/:id');
    setApiKey(null);
    return 'revoked';
  });

  return summary();
}

export { createdKeyId, plaintextKey };

const isMain = process.argv[1]?.endsWith('07-api-keys.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
