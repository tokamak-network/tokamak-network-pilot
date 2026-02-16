/**
 * 03 — Knowledge Sources Tests
 *
 * Tests CRUD + sync operations on knowledge sources.
 * Requires authentication (runs login first).
 *
 *   GET    /api/v1/sources
 *   GET    /api/v1/sources/status
 *   POST   /api/v1/sources
 *   GET    /api/v1/sources/:id
 *   GET    /api/v1/sources/:id/documents
 *   PUT    /api/v1/sources/:id
 *   POST   /api/v1/sources/:id/sync
 *   DELETE /api/v1/sources/:id
 *   GET    /api/v1/sources/upload/supported-formats
 */

import { get, post, put, del, login, getToken } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, assertStatus, info, skip, summary } from './utils/logger.mjs';

let createdSourceId = null;

export async function run() {
  header('03 — Knowledge Sources');

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

  // ── List sources ───────────────────────────────────────────────
  section('List Sources');

  await test('GET /sources returns list', async () => {
    const res = await get('/sources');
    assertOk(res, 'GET /sources');
    const items = Array.isArray(res.data) ? res.data : res.data.data || [];
    return `${items.length} sources`;
  });

  await test('GET /sources/status returns ingestion status', async () => {
    const res = await get('/sources/status');
    assertOk(res, 'GET /sources/status');
    return 'ok';
  });

  // ── Supported formats ──────────────────────────────────────────
  section('File Upload Formats');

  await test('GET /sources/upload/supported-formats', async () => {
    const res = await get('/sources/upload/supported-formats');
    assertOk(res, 'GET /sources/upload/supported-formats');
    return JSON.stringify(res.data).substring(0, 80);
  });

  // ── Create source ──────────────────────────────────────────────
  section('Create Source');

  await test('POST /sources creates a new GitHub source', async () => {
    const res = await post('/sources', {
      name: 'Test Source — API Tester',
      type: 'github_repo',
      config: {
        repoUrl: 'https://github.com/tokamak-network/tokamak-network.github.io',
      },
    });
    assertOk(res, 'POST /sources');
    assert(res.data.id, 'Expected source ID in response');
    createdSourceId = res.data.id;
    info(`Created source: ${createdSourceId}`);
    return `id: ${createdSourceId}`;
  });

  // ── Get single source ──────────────────────────────────────────
  section('Get Source Details');

  await test('GET /sources/:id returns the created source', async () => {
    assert(createdSourceId, 'No source ID — create must succeed first');
    const res = await get(`/sources/${createdSourceId}`);
    assertOk(res, 'GET /sources/:id');
    assert(res.data.name.includes('API Tester'), 'Name mismatch');
    return `name: ${res.data.name}`;
  });

  // ── Get documents ──────────────────────────────────────────────
  section('Source Documents');

  await test('GET /sources/:id/documents returns list', async () => {
    assert(createdSourceId, 'No source ID');
    const res = await get(`/sources/${createdSourceId}/documents`);
    assertOk(res, 'GET /sources/:id/documents');
    return 'ok';
  });

  // ── Update source ──────────────────────────────────────────────
  section('Update Source');

  await test('PUT /sources/:id updates the source name', async () => {
    assert(createdSourceId, 'No source ID');
    const res = await put(`/sources/${createdSourceId}`, {
      name: 'Test Source — Updated by API Tester',
    });
    assertOk(res, 'PUT /sources/:id');
    return 'name updated';
  });

  // ── Sync source ────────────────────────────────────────────────
  section('Sync Source');

  await test('POST /sources/:id/sync triggers light re-index', async () => {
    assert(createdSourceId, 'No source ID');
    const res = await post(`/sources/${createdSourceId}/sync`);
    // Sync may return 200 or 202 depending on implementation
    assert(res.ok || res.status === 202, `Expected 2xx, got ${res.status}`);
    return `status ${res.status}`;
  });

  // ── Delete source ──────────────────────────────────────────────
  section('Delete Source (cleanup)');

  await test('DELETE /sources/:id removes the test source', async () => {
    assert(createdSourceId, 'No source ID');
    const res = await del(`/sources/${createdSourceId}`);
    assertOk(res, 'DELETE /sources/:id');
    return 'deleted';
  });

  await test('GET /sources/:id returns 404 after deletion', async () => {
    assert(createdSourceId, 'No source ID');
    const res = await get(`/sources/${createdSourceId}`);
    assertStatus(res, 404, 'GET deleted source');
    return 'correctly 404';
  });

  return summary();
}

export { createdSourceId };

const isMain = process.argv[1]?.endsWith('03-sources.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
