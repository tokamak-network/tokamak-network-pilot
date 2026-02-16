import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiProduces } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('widget')
@Controller()
export class WidgetController {
  constructor(private readonly config: ConfigService) {}

  @Get('widget.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Embeddable chat widget script',
    description:
      'Returns a JavaScript snippet that can be embedded on any website to add an ' +
      '"Ask about Tokamak" chat widget. Pass your API key as a query parameter.',
  })
  @ApiQuery({
    name: 'key',
    required: false,
    description:
      'API key to use for the widget. Can also be set via data-api-key on the script tag.',
  })
  @ApiProduces('application/javascript')
  getWidgetScript(@Query('key') key?: string): string {
    const port = this.config.get<number>('API_PORT', 4000);
    const apiBase = this.config.get<string>(
      'PUBLIC_URL',
      `http://localhost:${port}`,
    );
    const prefix = this.config.get<string>('API_PREFIX', '/api/v1');

    return this.buildWidgetScript(apiBase, prefix, key);
  }

  private buildWidgetScript(
    apiBase: string,
    prefix: string,
    defaultKey?: string,
  ): string {
    return `(function() {
  'use strict';

  // ── Configuration ──────────────────────────────────────
  var script = document.currentScript;
  var apiKey = ${defaultKey ? `'${defaultKey}'` : 'null'} || (script && script.getAttribute('data-api-key')) || '';
  var apiUrl = (script && script.getAttribute('data-api-url')) || '${apiBase}${prefix}/public';
  var position = (script && script.getAttribute('data-position')) || 'bottom-right';
  var theme = (script && script.getAttribute('data-theme')) || 'dark';

  if (!apiKey) {
    console.warn('[Tokamak Widget] No API key provided. Set data-api-key on the script tag.');
    return;
  }

  // ── Styles ─────────────────────────────────────────────
  var css = \`
    #tokamak-widget-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #tokamak-widget-btn {
      position: fixed; z-index: 99999; width: 56px; height: 56px; border-radius: 28px;
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25); transition: transform 0.2s, box-shadow 0.2s;
    }
    #tokamak-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.35); }
    #tokamak-widget-btn.dark { background: #1a1a2e; color: #fff; }
    #tokamak-widget-btn.light { background: #fff; color: #1a1a2e; border: 1px solid #e0e0e0; }
    #tokamak-widget-btn svg { width: 24px; height: 24px; }
    .pos-bottom-right { bottom: 20px; right: 20px; }
    .pos-bottom-left { bottom: 20px; left: 20px; }

    #tokamak-widget-panel {
      position: fixed; z-index: 99998; width: 380px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 100px); border-radius: 16px;
      display: none; flex-direction: column; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.3); transition: opacity 0.2s, transform 0.2s;
    }
    #tokamak-widget-panel.open { display: flex; }
    #tokamak-widget-panel.dark { background: #0f0f23; color: #e0e0e0; border: 1px solid #2a2a4a; }
    #tokamak-widget-panel.light { background: #fff; color: #1a1a2e; border: 1px solid #e0e0e0; }
    .panel-bottom-right { bottom: 86px; right: 20px; }
    .panel-bottom-left { bottom: 86px; left: 20px; }

    #tokamak-widget-header {
      padding: 16px; display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid rgba(128,128,128,0.2); flex-shrink: 0;
    }
    #tokamak-widget-header .logo { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .dark .logo { background: #6366f1; }
    .light .logo { background: #4f46e5; }
    .logo svg { width: 16px; height: 16px; color: #fff; }
    #tokamak-widget-header .title { font-size: 14px; font-weight: 600; flex: 1; }
    #tokamak-widget-close { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: inherit; opacity: 0.6; }
    #tokamak-widget-close:hover { opacity: 1; }

    #tokamak-widget-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
    }
    .tw-msg { font-size: 13px; line-height: 1.5; padding: 10px 14px; border-radius: 12px; max-width: 90%; word-wrap: break-word; }
    .tw-msg.user { align-self: flex-end; border-radius: 12px 12px 4px 12px; }
    .dark .tw-msg.user { background: #6366f1; color: #fff; }
    .light .tw-msg.user { background: #4f46e5; color: #fff; }
    .tw-msg.assistant { align-self: flex-start; border-radius: 12px 12px 12px 4px; }
    .dark .tw-msg.assistant { background: #1e1e3a; }
    .light .tw-msg.assistant { background: #f3f4f6; }
    .tw-msg.loading .dots { display: inline-flex; gap: 4px; }
    .tw-msg.loading .dot { width: 6px; height: 6px; border-radius: 50%; animation: tw-bounce 1.2s infinite; }
    .dark .dot { background: #6366f1; }
    .light .dot { background: #4f46e5; }
    .tw-msg.loading .dot:nth-child(2) { animation-delay: 0.2s; }
    .tw-msg.loading .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes tw-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

    .tw-sources { font-size: 11px; margin-top: 8px; opacity: 0.7; }
    .tw-sources a { color: inherit; text-decoration: underline; }

    #tokamak-widget-input-area {
      padding: 12px 16px; border-top: 1px solid rgba(128,128,128,0.2); display: flex; gap: 8px; flex-shrink: 0;
    }
    #tokamak-widget-input {
      flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(128,128,128,0.3);
      font-size: 13px; outline: none; resize: none; font-family: inherit;
    }
    .dark #tokamak-widget-input { background: #1a1a2e; color: #e0e0e0; }
    .light #tokamak-widget-input { background: #f9fafb; color: #1a1a2e; }
    #tokamak-widget-input:focus { border-color: #6366f1; }
    #tokamak-widget-send {
      width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .dark #tokamak-widget-send { background: #6366f1; color: #fff; }
    .light #tokamak-widget-send { background: #4f46e5; color: #fff; }
    #tokamak-widget-send:hover { opacity: 0.9; }
    #tokamak-widget-send:disabled { opacity: 0.4; cursor: not-allowed; }

    .tw-welcome { text-align: center; padding: 24px 16px; }
    .tw-welcome h3 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .tw-welcome p { font-size: 12px; opacity: 0.6; }
  \`;

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── DOM ────────────────────────────────────────────────
  var container = document.createElement('div');
  container.id = 'tokamak-widget-container';

  var posClass = position === 'bottom-left' ? 'pos-bottom-left' : 'pos-bottom-right';
  var panelPosClass = position === 'bottom-left' ? 'panel-bottom-left' : 'panel-bottom-right';

  container.innerHTML = \`
    <div id="tokamak-widget-panel" class="\${theme} \${panelPosClass}">
      <div id="tokamak-widget-header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span class="title">Ask about Tokamak</span>
        <button id="tokamak-widget-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="tokamak-widget-messages">
        <div class="tw-welcome">
          <h3>Tokamak Pilot</h3>
          <p>Ask anything about the Tokamak Network ecosystem</p>
        </div>
      </div>
      <div id="tokamak-widget-input-area">
        <input id="tokamak-widget-input" type="text" placeholder="Ask a question..." autocomplete="off" />
        <button id="tokamak-widget-send" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
    <button id="tokamak-widget-btn" class="\${theme} \${posClass}" aria-label="Ask about Tokamak">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    </button>
  \`;
  document.body.appendChild(container);

  // ── Interactions ───────────────────────────────────────
  var panel = document.getElementById('tokamak-widget-panel');
  var btn = document.getElementById('tokamak-widget-btn');
  var closeBtn = document.getElementById('tokamak-widget-close');
  var input = document.getElementById('tokamak-widget-input');
  var sendBtn = document.getElementById('tokamak-widget-send');
  var messagesEl = document.getElementById('tokamak-widget-messages');
  var isOpen = false;
  var isLoading = false;
  var conversationHistory = [];

  btn.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('open');
      input.focus();
    } else {
      panel.classList.remove('open');
    }
  });

  closeBtn.addEventListener('click', function() {
    isOpen = false;
    panel.classList.remove('open');
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  function sendMessage() {
    var question = input.value.trim();
    if (!question || isLoading) return;

    input.value = '';
    addMessage('user', question);
    conversationHistory.push({ role: 'user', content: question });

    isLoading = true;
    sendBtn.disabled = true;
    var loadingEl = addLoading();

    fetch(apiUrl + '/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        question: question,
        conversationHistory: conversationHistory.slice(-10),
      }),
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      loadingEl.remove();
      if (data.answer) {
        addMessage('assistant', data.answer, data.sources);
        conversationHistory.push({ role: 'assistant', content: data.answer });
      } else {
        addMessage('assistant', data.message || 'Sorry, I could not find an answer.');
      }
    })
    .catch(function(err) {
      loadingEl.remove();
      addMessage('assistant', 'An error occurred. Please try again.');
      console.error('[Tokamak Widget]', err);
    })
    .finally(function() {
      isLoading = false;
      sendBtn.disabled = false;
    });
  }

  function addMessage(role, text, sources) {
    var welcome = messagesEl.querySelector('.tw-welcome');
    if (welcome) welcome.remove();

    var el = document.createElement('div');
    el.className = 'tw-msg ' + role;
    el.textContent = text;

    if (sources && sources.length > 0) {
      var srcDiv = document.createElement('div');
      srcDiv.className = 'tw-sources';
      srcDiv.innerHTML = 'Sources: ' + sources.slice(0, 3).map(function(s) {
        return s.url ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.title + '</a>' : s.title;
      }).join(', ');
      el.appendChild(srcDiv);
    }

    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function addLoading() {
    var el = document.createElement('div');
    el.className = 'tw-msg assistant loading';
    el.innerHTML = '<span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }
})();`;
  }
}
