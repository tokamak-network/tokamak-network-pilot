/**
 * 02 — Authentication Flow Tests
 *
 * Tests the full OTP login flow:
 *   POST /api/v1/auth/request-otp
 *   POST /api/v1/auth/verify-otp
 *   GET  /api/v1/auth/me
 *
 * Uses the dev OTP code: 123456
 */

import { post, get, login, setToken, getToken } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, assertStatus, info, summary } from './utils/logger.mjs';

const TEST_EMAIL = 'tester@tokamak.network';

export async function run() {
  header('02 — Authentication Flow');

  // ── Request OTP ────────────────────────────────────────────────
  section('Request OTP');

  await test('POST /auth/request-otp with valid email', async () => {
    const res = await post('/auth/request-otp', { email: TEST_EMAIL });
    assertOk(res, 'request-otp');
    return res.data.message || 'OTP requested';
  });

  await test('POST /auth/request-otp rejects invalid domain', async () => {
    const res = await post('/auth/request-otp', { email: 'bad@gmail.com' });
    assert(!res.ok, 'Expected rejection for non-tokamak.network email');
    return `status ${res.status}`;
  });

  await test('POST /auth/request-otp rejects empty body', async () => {
    const res = await post('/auth/request-otp', {});
    assert(!res.ok, 'Expected rejection for empty body');
    return `status ${res.status}`;
  });

  // ── Verify OTP ─────────────────────────────────────────────────
  section('Verify OTP');

  await test('POST /auth/verify-otp with dev code 123456', async () => {
    const res = await post('/auth/verify-otp', { email: TEST_EMAIL, code: '123456' });
    assertOk(res, 'verify-otp');
    assert(res.data.token, 'Expected token in response');
    assert(res.data.user, 'Expected user in response');
    setToken(res.data.token);
    info(`Logged in as: ${res.data.user.email} (role: ${res.data.user.role})`);
    return `token length: ${res.data.token.length}`;
  });

  await test('POST /auth/verify-otp rejects wrong code', async () => {
    const res = await post('/auth/verify-otp', { email: TEST_EMAIL, code: '000000' });
    assert(!res.ok, 'Expected rejection for wrong OTP code');
    return `status ${res.status}`;
  });

  // ── Get Profile ────────────────────────────────────────────────
  section('Get Profile');

  await test('GET /auth/me returns current user profile', async () => {
    assert(getToken(), 'No token — login must succeed first');
    const res = await get('/auth/me');
    assertOk(res, 'GET /auth/me');
    assert(res.data.email === TEST_EMAIL, `Expected email ${TEST_EMAIL}, got ${res.data.email}`);
    return `id: ${res.data.id}, role: ${res.data.role}`;
  });

  await test('GET /auth/me rejects without token', async () => {
    const savedToken = getToken();
    setToken(null);
    const res = await get('/auth/me');
    assertStatus(res, 401, 'GET /auth/me without token');
    setToken(savedToken);
    return 'correctly returned 401';
  });

  return summary();
}

const isMain = process.argv[1]?.endsWith('02-auth.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
