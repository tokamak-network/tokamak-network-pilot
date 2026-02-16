/**
 * Shared API client for Tokamak Pilot API testing.
 *
 * Wraps native fetch with base URL, auth headers, JSON handling,
 * and a login helper that uses the dev OTP code (123456).
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const API_PREFIX = '/api/v1';

let _jwtToken = null;
let _apiKey = null;

// ── Auth state ──────────────────────────────────────────────────────

export function setToken(token) {
  _jwtToken = token;
}

export function getToken() {
  return _jwtToken;
}

export function setApiKey(key) {
  _apiKey = key;
}

export function getApiKey() {
  return _apiKey;
}

// ── Core request helper ─────────────────────────────────────────────

/**
 * Make an HTTP request to the API.
 *
 * @param {string} path - Endpoint path (e.g. '/auth/request-otp')
 * @param {object} options
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} options.method
 * @param {object} [options.body] - JSON body
 * @param {object} [options.headers] - Extra headers
 * @param {boolean} [options.raw] - If true, skip /api/v1 prefix (for /llms.txt, /widget.js)
 * @param {boolean} [options.useApiKey] - Use X-API-Key instead of JWT
 * @param {boolean} [options.isFormData] - If true, body is FormData (skip JSON serialization)
 * @returns {Promise<{ status: number, ok: boolean, data: any, headers: Headers }>}
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    raw = false,
    useApiKey = false,
    isFormData = false,
  } = options;

  const url = raw ? `${BASE_URL}${path}` : `${BASE_URL}${API_PREFIX}${path}`;

  const headers = { ...extraHeaders };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (useApiKey && _apiKey) {
    headers['X-API-Key'] = _apiKey;
  } else if (_jwtToken) {
    headers['Authorization'] = `Bearer ${_jwtToken}`;
  }

  const fetchOptions = { method, headers };

  if (body) {
    fetchOptions.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);

  let data;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

// ── Convenience methods ─────────────────────────────────────────────

export const get = (path, opts) => request(path, { ...opts, method: 'GET' });
export const post = (path, body, opts) => request(path, { ...opts, method: 'POST', body });
export const put = (path, body, opts) => request(path, { ...opts, method: 'PUT', body });
export const patch = (path, body, opts) => request(path, { ...opts, method: 'PATCH', body });
export const del = (path, opts) => request(path, { ...opts, method: 'DELETE' });

// ── Login helper ────────────────────────────────────────────────────

const DEFAULT_EMAIL = 'tester@tokamak.network';
const DEV_OTP_CODE = '123456';

/**
 * Full login flow: request OTP -> verify OTP -> store JWT token.
 * Uses the dev OTP code (123456) that works on localhost.
 *
 * @param {string} [email] - Email to use (default: tester@tokamak.network)
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function login(email = DEFAULT_EMAIL) {
  // Step 1: Request OTP
  const otpRes = await post('/auth/request-otp', { email });
  if (!otpRes.ok) {
    throw new Error(`Failed to request OTP: ${otpRes.status} — ${JSON.stringify(otpRes.data)}`);
  }

  // Step 2: Verify OTP with dev code
  const verifyRes = await post('/auth/verify-otp', { email, code: DEV_OTP_CODE });
  if (!verifyRes.ok) {
    throw new Error(`Failed to verify OTP: ${verifyRes.status} — ${JSON.stringify(verifyRes.data)}`);
  }

  const { token, user } = verifyRes.data;
  setToken(token);

  return { token, user };
}

// ── Export everything as a namespace too ─────────────────────────────

export default {
  request,
  get,
  post,
  put,
  patch,
  del,
  login,
  setToken,
  getToken,
  setApiKey,
  getApiKey,
  BASE_URL,
  API_PREFIX,
};
