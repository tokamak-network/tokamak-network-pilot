/**
 * 04 — Content Management Tests
 *
 * Tests CRUD on content entries.
 * Requires authentication (runs login first).
 *
 *   GET    /api/v1/content
 *   POST   /api/v1/content
 *   GET    /api/v1/content/:id
 *   PUT    /api/v1/content/:id
 *   DELETE /api/v1/content/:id
 */

import { get, post, put, del, login, getToken } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, assertStatus, info, summary } from './utils/logger.mjs';

let createdContentId = null;

export async function run() {
  header('04 — Content Management');

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

  // ── List content ───────────────────────────────────────────────
  section('List Content');

  await test('GET /content returns list', async () => {
    const res = await get('/content');
    assertOk(res, 'GET /content');
    return 'ok';
  });

  await test('GET /content with pagination', async () => {
    const res = await get('/content?page=1&limit=5');
    assertOk(res, 'GET /content?page=1&limit=5');
    return 'ok';
  });

  // ── Create content ─────────────────────────────────────────────
  section('Create Content');

  await test('POST /content creates a new entry', async () => {
    const res = await post('/content', {
      title: 'Test Content — API Tester',
      body: 'This is a test content entry created by the automated API tester. It covers the basics of Tokamak Network testing.',
      project: 'tokamak',
      category: 'guide',
      tags: ['test', 'api-tester', 'automated'],
    });
    assertOk(res, 'POST /content');
    assert(res.data.id, 'Expected content ID in response');
    createdContentId = res.data.id;
    info(`Created content: ${createdContentId}`);
    return `id: ${createdContentId}`;
  });

  await test('POST /content rejects missing title', async () => {
    const res = await post('/content', { body: 'no title' });
    assert(!res.ok, 'Expected rejection for missing title');
    return `status ${res.status}`;
  });

  await test('POST /content rejects missing body', async () => {
    const res = await post('/content', { title: 'no body' });
    assert(!res.ok, 'Expected rejection for missing body');
    return `status ${res.status}`;
  });

  // ── Get single content ─────────────────────────────────────────
  section('Get Content Details');

  await test('GET /content/:id returns the created entry', async () => {
    assert(createdContentId, 'No content ID — create must succeed first');
    const res = await get(`/content/${createdContentId}`);
    assertOk(res, 'GET /content/:id');
    assert(res.data.title.includes('API Tester'), 'Title mismatch');
    return `title: ${res.data.title}`;
  });

  // ── Update content ─────────────────────────────────────────────
  section('Update Content');

  await test('PUT /content/:id updates title and body', async () => {
    assert(createdContentId, 'No content ID');
    const res = await put(`/content/${createdContentId}`, {
      title: 'Test Content — Updated by API Tester',
      body: 'Updated body content with more details about Tokamak Network testing.',
    });
    assertOk(res, 'PUT /content/:id');
    return 'updated';
  });

  await test('PUT /content/:id can mark as outdated', async () => {
    assert(createdContentId, 'No content ID');
    const res = await put(`/content/${createdContentId}`, {
      isOutdated: true,
    });
    assertOk(res, 'PUT /content/:id isOutdated');
    return 'marked outdated';
  });

  // ── Delete content ─────────────────────────────────────────────
  section('Delete Content (cleanup)');

  await test('DELETE /content/:id removes the test entry', async () => {
    assert(createdContentId, 'No content ID');
    const res = await del(`/content/${createdContentId}`);
    assertOk(res, 'DELETE /content/:id');
    return 'deleted';
  });

  await test('GET /content/:id returns 404 after deletion', async () => {
    assert(createdContentId, 'No content ID');
    const res = await get(`/content/${createdContentId}`);
    assertStatus(res, 404, 'GET deleted content');
    return 'correctly 404';
  });

  return summary();
}

const isMain = process.argv[1]?.endsWith('04-content.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
