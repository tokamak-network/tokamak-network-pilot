/**
 * 06 — Projects Tests
 *
 * Tests project CRUD, members, and source assignment.
 * Mix of public (read) and JWT (write) endpoints.
 *
 *   GET    /api/v1/projects
 *   POST   /api/v1/projects
 *   GET    /api/v1/projects/:idOrSlug
 *   GET    /api/v1/projects/:slug/public
 *   GET    /api/v1/projects/:idOrSlug/dashboard
 *   PUT    /api/v1/projects/:id
 *   GET    /api/v1/projects/:id/members
 *   POST   /api/v1/projects/:id/members
 *   PUT    /api/v1/projects/:id/members/:userId
 *   DELETE /api/v1/projects/:id/members/:userId
 *   GET    /api/v1/projects/:id/sources
 *   DELETE /api/v1/projects/:id
 */

import { get, post, put, del, login, getToken } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, info, skip, warn, summary } from './utils/logger.mjs';

let createdProjectId = null;
let createdProjectSlug = null;

export async function run() {
  header('06 — Projects');

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

  // ── List projects (public) ─────────────────────────────────────
  section('List Projects (Public)');

  await test('GET /projects returns list', async () => {
    const res = await get('/projects');
    assertOk(res, 'GET /projects');
    return 'ok';
  });

  // ── Create project ─────────────────────────────────────────────
  section('Create Project');

  const slug = `test-project-${Date.now()}`;
  await test('POST /projects creates a new project', async () => {
    const res = await post('/projects', {
      name: 'Test Project — API Tester',
      slug,
      description: 'A test project created by the automated API tester',
      isPublic: true,
      links: [
        { label: 'Website', url: 'https://tokamak.network' },
      ],
    });
    assertOk(res, 'POST /projects');
    assert(res.data.id, 'Expected project ID');
    createdProjectId = res.data.id;
    createdProjectSlug = res.data.slug || slug;
    info(`Created project: ${createdProjectId} (slug: ${createdProjectSlug})`);
    return `id: ${createdProjectId}`;
  });

  if (!createdProjectId) {
    section('Skipping project detail tests (create failed)');
    skip('GET /projects/:id', 'project creation failed — see server logs');
    skip('GET /projects/:slug', 'project creation failed');
    skip('GET /projects/:slug/public', 'project creation failed');
    skip('GET /projects/:id/dashboard', 'project creation failed');
    skip('PUT /projects/:id', 'project creation failed');
    skip('GET /projects/:id/members', 'project creation failed');
    skip('POST /projects/:id/members', 'project creation failed');
    skip('GET /projects/:id/sources', 'project creation failed');
    skip('DELETE /projects/:id', 'project creation failed');
    warn('Hint: This is likely caused by JWT strategy returning "sub" instead of "id"');
  } else {
    // ── Get project by ID ──────────────────────────────────────────
    section('Get Project Details');

    await test('GET /projects/:id returns the created project', async () => {
      const res = await get(`/projects/${createdProjectId}`);
      assertOk(res, 'GET /projects/:id');
      assert(res.data.name.includes('API Tester'), 'Name mismatch');
      return `name: ${res.data.name}`;
    });

    await test('GET /projects/:slug returns project by slug', async () => {
      const res = await get(`/projects/${createdProjectSlug}`);
      assertOk(res, 'GET /projects/:slug');
      return `name: ${res.data.name}`;
    });

    // ── Public project overview ────────────────────────────────────
    section('Public Project Overview');

    await test('GET /projects/:slug/public returns public overview', async () => {
      const res = await get(`/projects/${createdProjectSlug}/public`);
      assertOk(res, 'GET /projects/:slug/public');
      return 'ok';
    });

    // ── Project dashboard ──────────────────────────────────────────
    section('Project Dashboard');

    await test('GET /projects/:id/dashboard returns stats', async () => {
      const res = await get(`/projects/${createdProjectId}/dashboard`);
      assertOk(res, 'GET /projects/:id/dashboard');
      return 'ok';
    });

    // ── Update project ─────────────────────────────────────────────
    section('Update Project');

    await test('PUT /projects/:id updates project name', async () => {
      const res = await put(`/projects/${createdProjectId}`, {
        name: 'Test Project — Updated by API Tester',
        description: 'Updated description for testing',
      });
      assertOk(res, 'PUT /projects/:id');
      return 'updated';
    });

    // ── Project Members ────────────────────────────────────────────
    section('Project Members');

    await test('GET /projects/:id/members returns list', async () => {
      const res = await get(`/projects/${createdProjectId}/members`);
      assertOk(res, 'GET /projects/:id/members');
      const count = Array.isArray(res.data) ? res.data.length : res.data.data?.length ?? 0;
      return `${count} members`;
    });

    await test('POST /projects/:id/members adds current user as contributor', async () => {
      // Use the tester email — this user exists because we logged in
      const res = await post(`/projects/${createdProjectId}/members`, {
        email: 'tester@tokamak.network',
        role: 'contributor',
      });
      // May return 2xx or 409 (conflict) if already a member (creator is auto-added as lead)
      assert(res.ok || res.status === 409, `Expected 2xx or 409, got ${res.status}: ${JSON.stringify(res.data)}`);
      return res.status === 409 ? 'already a member (expected)' : 'member added';
    });

    // ── Project Sources ────────────────────────────────────────────
    section('Project Sources');

    await test('GET /projects/:id/sources returns list', async () => {
      const res = await get(`/projects/${createdProjectId}/sources`);
      assertOk(res, 'GET /projects/:id/sources');
      return 'ok';
    });

    // ── Delete project (cleanup) ───────────────────────────────────
    section('Delete Project (cleanup)');

    await test('DELETE /projects/:id removes the test project', async () => {
      const res = await del(`/projects/${createdProjectId}`);
      assertOk(res, 'DELETE /projects/:id');
      return 'deleted';
    });
  }

  return summary();
}

const isMain = process.argv[1]?.endsWith('06-projects.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
