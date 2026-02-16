/**
 * 09 — Export Endpoint Tests
 *
 * Tests export endpoints (no auth required).
 * Creates temporary content to export, then cleans up.
 *
 *   GET  /api/v1/export/content/:id?format=json
 *   GET  /api/v1/export/content/:id?format=markdown
 *   GET  /api/v1/export/project/:idOrSlug?format=json
 *   POST /api/v1/export/answer
 *   POST /api/v1/export/prompt
 */

import { get, post, del, login, getToken } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, info, skip, summary } from './utils/logger.mjs';

let tempContentId = null;
let tempProjectId = null;

export async function run() {
  header('09 — Export');

  // ── Login & create temp data ───────────────────────────────────
  section('Setup — Create temp data for export');

  if (!getToken()) {
    await test('Login with OTP', async () => {
      const { user } = await login();
      return `as ${user.email}`;
    });
  } else {
    info('Already authenticated, skipping login');
  }

  // Create temporary content to export
  await test('Create temp content for export tests', async () => {
    const res = await post('/content', {
      title: 'Export Test Content',
      body: 'This content is used to test the export endpoints.',
      category: 'test',
      tags: ['export', 'test'],
    });
    assertOk(res, 'POST /content');
    tempContentId = res.data.id;
    return `id: ${tempContentId}`;
  });

  // Try to find an existing project, or create one
  await test('Find or create temp project for export tests', async () => {
    const listRes = await get('/projects');
    assertOk(listRes, 'GET /projects');
    const projects = Array.isArray(listRes.data) ? listRes.data : listRes.data.data || [];

    if (projects.length > 0) {
      tempProjectId = projects[0].id || projects[0].slug;
      return `using existing: ${tempProjectId}`;
    }

    const createRes = await post('/projects', {
      name: 'Export Test Project',
      slug: `export-test-${Date.now()}`,
      description: 'Temp project for export tests',
    });
    assertOk(createRes, 'POST /projects');
    tempProjectId = createRes.data.id;
    return `created: ${tempProjectId}`;
  });

  // ── Export Content ─────────────────────────────────────────────
  section('Export Content');

  if (tempContentId) {
    await test('GET /export/content/:id as JSON', async () => {
      const res = await get(`/export/content/${tempContentId}?format=json`);
      assertOk(res, 'GET /export/content/:id?format=json');
      return typeof res.data === 'object' ? 'valid JSON' : 'ok';
    });

    await test('GET /export/content/:id as Markdown', async () => {
      const res = await get(`/export/content/${tempContentId}?format=markdown`);
      assertOk(res, 'GET /export/content/:id?format=markdown');
      return typeof res.data === 'string' ? `${res.data.length} chars` : 'ok';
    });
  } else {
    skip('Export content tests', 'no content ID available');
  }

  // ── Export Project ─────────────────────────────────────────────
  section('Export Project');

  if (tempProjectId) {
    await test('GET /export/project/:idOrSlug as JSON', async () => {
      const res = await get(`/export/project/${tempProjectId}?format=json`);
      assertOk(res, 'GET /export/project/:idOrSlug?format=json');
      return 'ok';
    });

    await test('GET /export/project/:idOrSlug as Markdown', async () => {
      const res = await get(`/export/project/${tempProjectId}?format=markdown`);
      assertOk(res, 'GET /export/project/:idOrSlug?format=markdown');
      return 'ok';
    });
  } else {
    skip('Export project tests', 'no project available');
  }

  // ── Export Answer ──────────────────────────────────────────────
  section('Export Answer');

  await test('POST /export/answer as JSON', async () => {
    const res = await post('/export/answer', {
      question: 'What is Tokamak?',
      answer: 'Tokamak Network is a Layer 2 protocol built on Ethereum.',
      sources: [
        { title: 'Tokamak Docs', url: 'https://docs.tokamak.network', score: 0.95 },
      ],
      confidence: 0.92,
    });
    assertOk(res, 'POST /export/answer');
    return 'ok';
  });

  await test('POST /export/answer?format=markdown as Markdown', async () => {
    const res = await post('/export/answer?format=markdown', {
      question: 'What is Tokamak?',
      answer: 'Tokamak Network is a Layer 2 protocol built on Ethereum.',
      sources: [
        { title: 'Tokamak Docs', url: 'https://docs.tokamak.network', score: 0.95 },
      ],
      confidence: 0.92,
    });
    assertOk(res, 'POST /export/answer?format=markdown');
    return typeof res.data === 'string' ? `${res.data.length} chars` : 'ok';
  });

  // ── Export Prompt ──────────────────────────────────────────────
  section('Export Prompt');

  await test('POST /export/prompt formats as AI-ready prompt', async () => {
    const res = await post('/export/prompt', {
      type: 'answer',
      title: 'Tokamak Overview',
      body: 'Tokamak Network is a Layer 2 solution providing optimistic rollups on Ethereum.',
      sources: [
        { title: 'Tokamak Docs', url: 'https://docs.tokamak.network' },
      ],
      metadata: { generatedBy: 'api-tester' },
    });
    assertOk(res, 'POST /export/prompt');
    return typeof res.data === 'string' ? `${res.data.length} chars` : 'ok';
  });

  await test('POST /export/prompt with type "content"', async () => {
    const res = await post('/export/prompt', {
      type: 'content',
      body: 'Guide to staking on Tokamak Network.',
    });
    assertOk(res, 'POST /export/prompt (content)');
    return 'ok';
  });

  await test('POST /export/prompt with type "project"', async () => {
    const res = await post('/export/prompt', {
      type: 'project',
      title: 'Titan',
      body: 'Titan is the flagship L2 rollup by Tokamak Network.',
    });
    assertOk(res, 'POST /export/prompt (project)');
    return 'ok';
  });

  // ── Cleanup ────────────────────────────────────────────────────
  section('Cleanup');

  if (tempContentId) {
    await test('Delete temp content', async () => {
      const res = await del(`/content/${tempContentId}`);
      assertOk(res, 'DELETE temp content');
      return 'deleted';
    });
  }

  return summary();
}

const isMain = process.argv[1]?.endsWith('09-export.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
