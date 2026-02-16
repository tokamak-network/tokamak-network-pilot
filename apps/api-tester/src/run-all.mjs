#!/usr/bin/env node

/**
 * Run All API Tests — Orchestrator
 *
 * Executes all test suites in order, passing the auth token
 * through so login only happens once.
 *
 * Usage:
 *   node src/run-all.mjs                  # run all tests
 *   node src/run-all.mjs --skip=05,08     # skip specific suites
 *   node src/run-all.mjs --only=01,02,03  # run only specific suites
 *
 * Environment:
 *   API_BASE_URL  — defaults to http://localhost:4000
 */

import { login, getToken, setToken, setApiKey, getApiKey } from './utils/api-client.mjs';
import { resetCounters, getCounters } from './utils/logger.mjs';

import { run as run01 } from './01-health.mjs';
import { run as run02 } from './02-auth.mjs';
import { run as run03 } from './03-sources.mjs';
import { run as run04 } from './04-content.mjs';
import { run as run05 } from './05-conversations.mjs';
import { run as run06 } from './06-projects.mjs';
import { run as run07 } from './07-api-keys.mjs';
import { run as run08 } from './08-public-api.mjs';
import { run as run09 } from './09-export.mjs';
import { run as run10 } from './10-changelog.mjs';

const SUITES = [
  { id: '01', name: 'Health & Public Endpoints', run: run01 },
  { id: '02', name: 'Authentication Flow', run: run02 },
  { id: '03', name: 'Knowledge Sources', run: run03 },
  { id: '04', name: 'Content Management', run: run04 },
  { id: '05', name: 'Conversations & RAG', run: run05 },
  { id: '06', name: 'Projects', run: run06 },
  { id: '07', name: 'API Keys', run: run07 },
  { id: '08', name: 'Public API (API Key)', run: run08 },
  { id: '09', name: 'Export', run: run09 },
  { id: '10', name: 'Changelog & Misc', run: run10 },
];

// ── CLI args ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { skip: new Set(), only: null };

  for (const arg of args) {
    if (arg.startsWith('--skip=')) {
      arg.replace('--skip=', '').split(',').forEach((id) => opts.skip.add(id.trim().padStart(2, '0')));
    }
    if (arg.startsWith('--only=')) {
      opts.only = new Set(arg.replace('--only=', '').split(',').map((id) => id.trim().padStart(2, '0')));
    }
  }

  return opts;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    dim: '\x1b[2m',
  };

  const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

  console.log();
  console.log(c('bold', c('cyan', '╔══════════════════════════════════════════════════════════╗')));
  console.log(c('bold', c('cyan', '║       Tokamak Pilot — API Test Suite                    ║')));
  console.log(c('bold', c('cyan', '╚══════════════════════════════════════════════════════════╝')));
  console.log();
  console.log(`  ${c('dim', 'Base URL:')} ${process.env.API_BASE_URL || 'http://localhost:4000'}`);
  console.log(`  ${c('dim', 'Time:')}     ${new Date().toISOString()}`);
  console.log();

  const totalResults = { passed: 0, failed: 0, skipped: 0 };
  const suiteResults = [];

  for (const suite of SUITES) {
    if (opts.skip.has(suite.id)) {
      console.log(c('yellow', `  SKIPPING suite ${suite.id}: ${suite.name}`));
      suiteResults.push({ ...suite, status: 'skipped' });
      continue;
    }
    if (opts.only && !opts.only.has(suite.id)) {
      continue;
    }

    resetCounters();

    try {
      await suite.run();
      const counts = getCounters();
      totalResults.passed += counts.passed;
      totalResults.failed += counts.failed;
      totalResults.skipped += counts.skipped;
      suiteResults.push({ ...suite, status: counts.failed > 0 ? 'failed' : 'passed', ...counts });
    } catch (err) {
      console.error(c('red', `\n  Suite ${suite.id} crashed: ${err.message}`));
      if (err.cause?.code === 'ECONNREFUSED') {
        console.error(c('red', '\n  Is the API server running? Start it with: pnpm --filter @tokamak-pilot/api dev\n'));
        process.exit(1);
      }
      totalResults.failed += 1;
      suiteResults.push({ ...suite, status: 'crashed', error: err.message });
    }
  }

  // ── Final Summary ─────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log();
  console.log(c('bold', c('cyan', '╔══════════════════════════════════════════════════════════╗')));
  console.log(c('bold', c('cyan', '║       Final Results                                     ║')));
  console.log(c('bold', c('cyan', '╚══════════════════════════════════════════════════════════╝')));
  console.log();

  for (const sr of suiteResults) {
    const icon = sr.status === 'passed' ? c('green', 'PASS')
      : sr.status === 'failed' ? c('red', 'FAIL')
      : sr.status === 'crashed' ? c('red', 'CRASH')
      : c('yellow', 'SKIP');
    const detail = sr.passed !== undefined
      ? c('dim', ` (${sr.passed} passed, ${sr.failed} failed, ${sr.skipped} skipped)`)
      : '';
    console.log(`  ${icon}  ${sr.id} — ${sr.name}${detail}`);
  }

  console.log();
  console.log(c('bold', '─'.repeat(60)));
  const parts = [];
  parts.push(c('green', `${totalResults.passed} passed`));
  if (totalResults.failed > 0) parts.push(c('red', `${totalResults.failed} failed`));
  if (totalResults.skipped > 0) parts.push(c('yellow', `${totalResults.skipped} skipped`));
  console.log(`  Total: ${parts.join(c('dim', ' | '))}  ${c('dim', `(${elapsed}s)`)}`);
  console.log(c('bold', '─'.repeat(60)));
  console.log();

  process.exit(totalResults.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
