/**
 * 05 — Conversations & RAG Tests
 *
 * Tests conversation lifecycle and RAG ask/search.
 * Requires authentication (runs login first).
 *
 *   POST   /api/v1/ask
 *   GET    /api/v1/ask/search?q=...
 *   POST   /api/v1/conversations
 *   GET    /api/v1/conversations
 *   POST   /api/v1/conversations/quick-ask
 *   GET    /api/v1/conversations/:id
 *   PUT    /api/v1/conversations/:id
 *   POST   /api/v1/conversations/:id/ask
 *   DELETE /api/v1/conversations/:id
 */

import { get, post, put, del, login, getToken } from './utils/api-client.mjs';
import { header, section, test, assert, assertOk, info, summary } from './utils/logger.mjs';

let conversationId = null;
let quickAskConversationId = null;

export async function run() {
  header('05 — Conversations & RAG');

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

  // ── RAG Ask ────────────────────────────────────────────────────
  section('RAG Ask');

  await test('POST /ask with a question', async () => {
    const res = await post('/ask', {
      question: 'What is Tokamak Network?',
    });
    assertOk(res, 'POST /ask');
    assert(res.data.answer || res.data.response, 'Expected an answer in response');
    const answer = res.data.answer || res.data.response || '';
    return `answer: ${answer.substring(0, 80)}...`;
  });

  // ── RAG Search ─────────────────────────────────────────────────
  section('RAG Search');

  await test('GET /ask/search?q=staking returns results', async () => {
    const res = await get('/ask/search?q=staking&limit=3');
    assertOk(res, 'GET /ask/search');
    return 'ok';
  });

  // ── Create Conversation ────────────────────────────────────────
  section('Create Conversation');

  await test('POST /conversations creates a new conversation', async () => {
    const res = await post('/conversations', {
      title: 'Test Conversation — API Tester',
    });
    assertOk(res, 'POST /conversations');
    assert(res.data.id, 'Expected conversation ID');
    conversationId = res.data.id;
    info(`Created conversation: ${conversationId}`);
    return `id: ${conversationId}`;
  });

  // ── List Conversations ─────────────────────────────────────────
  section('List Conversations');

  await test('GET /conversations returns list', async () => {
    const res = await get('/conversations?page=1&limit=10');
    assertOk(res, 'GET /conversations');
    return 'ok';
  });

  // ── Ask in Conversation ────────────────────────────────────────
  section('Ask in Conversation');

  await test('POST /conversations/:id/ask sends a question', async () => {
    assert(conversationId, 'No conversation ID');
    const res = await post(`/conversations/${conversationId}/ask`, {
      question: 'How does Tokamak staking work?',
    });
    assertOk(res, 'POST /conversations/:id/ask');
    return 'question asked';
  });

  await test('POST /conversations/:id/ask sends a follow-up', async () => {
    assert(conversationId, 'No conversation ID');
    const res = await post(`/conversations/${conversationId}/ask`, {
      question: 'What are the rewards like?',
    });
    assertOk(res, 'POST /conversations/:id/ask');
    return 'follow-up asked';
  });

  // ── Get Conversation with Messages ─────────────────────────────
  section('Get Conversation Details');

  await test('GET /conversations/:id returns conversation with messages', async () => {
    assert(conversationId, 'No conversation ID');
    const res = await get(`/conversations/${conversationId}`);
    assertOk(res, 'GET /conversations/:id');
    const messages = res.data.messages || [];
    return `${messages.length} messages`;
  });

  // ── Update Conversation ────────────────────────────────────────
  section('Update Conversation');

  await test('PUT /conversations/:id updates title', async () => {
    assert(conversationId, 'No conversation ID');
    const res = await put(`/conversations/${conversationId}`, {
      title: 'Updated Title — API Tester',
    });
    assertOk(res, 'PUT /conversations/:id');
    return 'title updated';
  });

  // ── Quick Ask ──────────────────────────────────────────────────
  section('Quick Ask');

  await test('POST /conversations/quick-ask creates and asks in one step', async () => {
    const res = await post('/conversations/quick-ask', {
      question: 'What is TON?',
    });
    assertOk(res, 'POST /conversations/quick-ask');
    if (res.data.conversation?.id) {
      quickAskConversationId = res.data.conversation.id;
    } else if (res.data.conversationId) {
      quickAskConversationId = res.data.conversationId;
    }
    return quickAskConversationId ? `conv: ${quickAskConversationId}` : 'ok';
  });

  // ── Delete Conversations (cleanup) ─────────────────────────────
  section('Delete Conversations (cleanup)');

  await test('DELETE /conversations/:id removes test conversation', async () => {
    assert(conversationId, 'No conversation ID');
    const res = await del(`/conversations/${conversationId}`);
    assertOk(res, 'DELETE /conversations/:id');
    return 'deleted';
  });

  if (quickAskConversationId) {
    await test('DELETE /conversations/:id removes quick-ask conversation', async () => {
      const res = await del(`/conversations/${quickAskConversationId}`);
      assertOk(res, 'DELETE quick-ask conversation');
      return 'deleted';
    });
  }

  return summary();
}

const isMain = process.argv[1]?.endsWith('05-conversations.mjs');
if (isMain) {
  run().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
}
