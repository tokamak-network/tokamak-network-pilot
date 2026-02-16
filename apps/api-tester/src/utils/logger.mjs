/**
 * Simple colorful console logger for test scripts.
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

// ── Counters ────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
let _skipped = 0;

export function resetCounters() {
  _passed = 0;
  _failed = 0;
  _skipped = 0;
}

export function getCounters() {
  return { passed: _passed, failed: _failed, skipped: _skipped };
}

// ── Logging helpers ─────────────────────────────────────────────────

export function header(title) {
  console.log();
  console.log(c('bold', c('cyan', `${'═'.repeat(60)}`)));
  console.log(c('bold', c('cyan', `  ${title}`)));
  console.log(c('bold', c('cyan', `${'═'.repeat(60)}`)));
  console.log();
}

export function section(title) {
  console.log();
  console.log(c('bold', c('magenta', `── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`)));
}

export function pass(description, detail = '') {
  _passed++;
  const detailStr = detail ? c('dim', ` (${detail})`) : '';
  console.log(`  ${c('green', 'PASS')}  ${description}${detailStr}`);
}

export function fail(description, error = '') {
  _failed++;
  const errorStr = error ? `\n        ${c('red', error)}` : '';
  console.log(`  ${c('red', 'FAIL')}  ${description}${errorStr}`);
}

export function skip(description, reason = '') {
  _skipped++;
  const reasonStr = reason ? c('dim', ` — ${reason}`) : '';
  console.log(`  ${c('yellow', 'SKIP')}  ${description}${reasonStr}`);
}

export function info(message) {
  console.log(`  ${c('blue', 'INFO')}  ${message}`);
}

export function warn(message) {
  console.log(`  ${c('yellow', 'WARN')}  ${message}`);
}

export function summary() {
  console.log();
  console.log(c('bold', '─'.repeat(60)));
  const parts = [];
  parts.push(c('green', `${_passed} passed`));
  if (_failed > 0) parts.push(c('red', `${_failed} failed`));
  if (_skipped > 0) parts.push(c('yellow', `${_skipped} skipped`));
  console.log(`  Results: ${parts.join(c('dim', ' | '))}`);
  console.log(c('bold', '─'.repeat(60)));
  console.log();
  return { passed: _passed, failed: _failed, skipped: _skipped };
}

// ── Test runner helper ──────────────────────────────────────────────

/**
 * Run a test case: calls `fn`, marks pass/fail automatically.
 *
 * @param {string} description - What this test checks
 * @param {() => Promise<string|void>} fn - Async test function. Return a string for detail text.
 */
export async function test(description, fn) {
  try {
    const detail = await fn();
    pass(description, typeof detail === 'string' ? detail : '');
  } catch (err) {
    fail(description, err.message || String(err));
  }
}

/**
 * Assert a condition, throw if false.
 */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

/**
 * Assert an HTTP response is OK (2xx).
 */
export function assertOk(res, context = '') {
  if (!res.ok) {
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    throw new Error(`${context} — expected 2xx, got ${res.status}: ${body}`);
  }
}

/**
 * Assert an HTTP response has a specific status code.
 */
export function assertStatus(res, expected, context = '') {
  if (res.status !== expected) {
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    throw new Error(`${context} — expected ${expected}, got ${res.status}: ${body}`);
  }
}

export default {
  header,
  section,
  pass,
  fail,
  skip,
  info,
  warn,
  summary,
  test,
  assert,
  assertOk,
  assertStatus,
  resetCounters,
  getCounters,
};
