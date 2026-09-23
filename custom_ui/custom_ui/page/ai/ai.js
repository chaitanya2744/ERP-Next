frappe.pages["ai"].on_page_load = function (wrapper) {
  console.log("AI Assistant page loaded!");

  // Add custom class to target wrappers for layout overrides
  $(wrapper).addClass('ai-assistant-page-wrapper');
  $('body').addClass('ai-assistant-page-active');

  // Ensure the class is added on initial load
  $('body').addClass('ai-assistant-page-active');
  $(wrapper).show();

  // Use MutationObserver to reliably detect when Frappe hides/shows this page wrapper.
  // This bypasses any routing or pushState anomalies.
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
        if (wrapper.style.display === 'none') {
          $('body').removeClass('ai-assistant-page-active');
        } else {
          $('body').addClass('ai-assistant-page-active');
        }
      }
    });
  });

  observer.observe(wrapper, { attributes: true, attributeFilter: ['style', 'class'] });

  // Fallback lifecycle hooks
  frappe.pages["ai"].on_page_show = function (wrapper) {
    $('body').addClass('ai-assistant-page-active');
    $(wrapper).show();
    if (typeof scrollToBottom === 'function') scrollToBottom();
  };

  frappe.pages["ai"].on_page_hide = function (wrapper) {
    $('body').removeClass('ai-assistant-page-active');
  };

  // Clean up observer on page destruction
  $(wrapper).on('destroy', function () {
    observer.disconnect();
  });

  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "AI Assistant",
    single_column: true,
  });
  const ALL_PROMPTS = [
    { text: "Check Cash Position: Accounts Receivable vs Accounts Payable.", icon: "💰" },
    { text: "Review profitability and top customers for FY 2025-2026.", icon: "👥" },
    { text: "Review daily production targets and Work Order output.", icon: "🏭" },
    { text: "Check Raw Material and Finished Goods Inventory Levels.", icon: "📦" },
    { text: "Follow up on supplier deliveries and outstanding purchase invoices.", icon: "🚛" },
    { text: "Review Sales Revenue vs Outstanding Debt for FY 2025-2026.", icon: "📈" },
    { text: "Analyze operating expenses by plant for FY 2025-2026.", icon: "📋" },
    { text: "Monitor branch-wise Sales Performance and targets.", icon: "📊" },
    { text: "Review stock transfers and inter-branch movements.", icon: "🔄" },
    { text: "Check General Ledger summary for inefficiencies or cost leaks.", icon: "🧾" },
    { text: "End of Day Review: Output vs Plan and next day actions.", icon: "⚡" },
    { text: "Identify bottlenecks in Lead-to-Cash cycle (Sales Orders to Delivery).", icon: "🔍" }
  ];

  function formatPromptTextForDisplay(text) {
    return text.replace(/\[([^\]]+)\]/g, function (match, placeholder) {
      return '<span class="prompt-text-placeholder">[' + placeholder + ']</span>';
    });
  }

  function initExecutiveSuite() {
    const root = wrapper.querySelector('#executive-suite-root');
    if (!root) return;

    // Shuffle and pick 8 prompts randomly
    const shuffled = [...ALL_PROMPTS].sort(() => 0.5 - Math.random());
    const selectedPrompts = ALL_PROMPTS;

    let pillsHtml = selectedPrompts.map(p => {
      const displayHtml = formatPromptTextForDisplay(p.text);
      return `<div class="suggestion-pill" data-prompt="${p.text.replace(/"/g, '&quot;')}">
        <span class="pill-icon">${p.icon}</span>
        <span class="pill-text">${displayHtml}</span>
      </div>`;
    }).join('');

    root.innerHTML = `
      <div class="executive-suite-container">
        <div class="suggestion-pills-container">
          ${pillsHtml}
        </div>
      </div>
    `;

    // Attach click events
    root.querySelectorAll('.suggestion-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const pt = pill.getAttribute('data-prompt');
        if (typeof window.selectSuggestion === 'function') window.selectSuggestion(pt);
      });
    });
  }




  // Inline HTML markup directly to bypass template cache issues
  let html = `
    <div id="ai-chat-root">
      <!-- Header -->
      <div id="chat-header">
        <div class="avatar">✦</div>
        <div class="info">
          <div class="name">AI Assistant</div>
        </div>
        <button class="clear-btn" onclick="clearChat()">Clear chat</button>
      </div>

      <!-- Messages -->
      <div id="chat-messages">
        <div id="chat-welcome">
          <div class="welcome-hero">
            <div class="welcome-icon-ring">
              <div class="welcome-icon-glow"></div>
              <div class="welcome-icon">✦</div>
            </div>
            <h2 class="welcome-headline">
              Your Business,<br>
              <span class="welcome-headline-accent">Instantly Understood</span>
            </h2>
            <p class="welcome-sub">Ask about <span class="welcome-kw">revenue</span>, <span class="welcome-kw">inventory</span>, <span class="welcome-kw">orders</span>, <span class="welcome-kw">cash flow</span> — get instant answers from your live ERP data.</p>
          </div>
          <div id="executive-suite-root"></div>
        </div>
      </div>

      <!-- Input -->
      <div id="chat-input-area">
        <div id="chat-input-wrap">
          <textarea
            id="chat-input"
            placeholder="Ask about invoices, orders, stock, or any ERPNext data…"
            rows="1"
            onkeydown="handleKey(event)"
            oninput="autoResize(this)"
          ></textarea>
          <button id="mic-btn" class="voice-call-trigger-btn" onclick="toggleVoice()" title="Start Voice Call (मराठी / हिन्दी / English)" type="button">
            <svg class="voice-wave-icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8">
              <path d="M12 3v18" stroke-linecap="round"/>
              <path d="M8 8v8" stroke-linecap="round"/>
              <path d="M4 11v2" stroke-linecap="round"/>
              <path d="M16 6v12" stroke-linecap="round"/>
              <path d="M20 10v4" stroke-linecap="round"/>
            </svg>
          </button>
          <button id="send-btn" onclick="sendMessage()" title="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <div class="input-hint">Enter to send · Shift+Enter for new line · ⚡ Voice Call (मराठी / हिन्दी / English)</div>
      </div>

      <!-- 1. Enterprise-Grade Immersive Voice Call Overlay (Full Stage) -->
      <div id="voice-overlay" class="voice-call-overlay" style="display: none;">
        <div class="voice-screen-stage" id="voice-screen-stage">
          <!-- Top Telemetry & Controls Header -->
          <div class="voice-top-header">
            <div class="voice-brand-badge">
              <div class="voice-live-pulse-dot"></div>
              <div class="voice-agent-details">
                <span class="voice-agent-name">Enterprise Voice AI</span>
                <span class="voice-call-timer" id="voice-call-timer">00:00</span>
              </div>
            </div>

            <!-- Segmented Language Switcher -->
            <div class="voice-lang-segmented" id="voice-lang-segmented">
              <button type="button" class="voice-lang-chip active" data-lang="mr-IN" onclick="setVoiceLanguage('mr-IN')">मराठी</button>
              <button type="button" class="voice-lang-chip" data-lang="hi-IN" onclick="setVoiceLanguage('hi-IN')">हिन्दी</button>
              <button type="button" class="voice-lang-chip" data-lang="en-IN" onclick="setVoiceLanguage('en-IN')">English</button>
            </div>

            <!-- Header Actions: Minimize / Close -->
            <div class="voice-header-actions">
              <button type="button" id="voice-btn-minimize" class="voice-head-btn" onclick="setVoiceUIMode('pip')" title="Minimize to Floating Pill (Multi-task)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7"/></svg>
              </button>
              <button type="button" id="voice-btn-close-header" class="voice-head-btn voice-head-close" onclick="closeVoiceCall()" title="End Call (Esc)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>

          <!-- Center Stage: Multi-layer Acoustic Orb Reactor -->
          <div class="voice-center-stage">
            <div class="voice-reactor-container" id="voice-reactor-container" onclick="handleOrbClick()">
              <div class="voice-acoustic-ring ring-3"></div>
              <div class="voice-acoustic-ring ring-2"></div>
              <div class="voice-acoustic-ring ring-1"></div>
              
              <div class="voice-avatar-orb" id="voice-avatar-orb">
                <div class="voice-orb-glow"></div>
                <div class="voice-orb-core">
                  <div class="voice-core-bars">
                    <span class="vbar"></span><span class="vbar"></span><span class="vbar"></span>
                    <span class="vbar"></span><span class="vbar"></span><span class="vbar"></span>
                    <span class="vbar"></span><span class="vbar"></span><span class="vbar"></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Real-time Status Badge -->
            <div class="voice-status-wrapper">
              <div class="voice-status-pill" id="voice-status-pill">
                <span class="voice-status-indicator"></span>
                <span id="voice-status-label">ऐकत आहे… (Listening)</span>
              </div>
              <div id="voice-sub-label" class="voice-sub-caption">मराठीत बोला · मिनिमाइझ करण्यासाठी बॅकग्राउंडवर क्लिक करा</div>
            </div>
          </div>

          <!-- Live Floating Subtitles / Captions -->
          <div class="voice-caption-stage">
            <div id="voice-transcript-live" class="voice-caption-stream">
              <span class="vplaceholder">उदा. "आजचा विक्री अहवाल दाखवा" किंवा "स्टॉक किती आहे?" बोला…</span>
            </div>

            <!-- AI Spoken Response Card -->
            <div class="voice-ai-response-sheet" id="voice-ai-reply-box" style="display: none;">
              <div class="voice-ai-sheet-header">
                <span class="voice-ai-tag">AI ASSISTANT</span>
                <button type="button" class="voice-replay-pill" onclick="replayVoiceReply()" title="Replay response">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Replay
                </button>
              </div>
              <div id="voice-ai-reply-text" class="voice-ai-sheet-text"></div>
            </div>
          </div>

          <!-- Bottom Ergonomic Action Dock -->
          <div class="voice-bottom-dock">
            <!-- Mute/Unmute Mic -->
            <button type="button" id="voice-ctrl-mute" class="voice-dock-btn" onclick="toggleVoiceMute()" title="Mute Microphone (M)">
              <svg id="voice-mute-icon-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
              <svg id="voice-mute-icon-off" style="display:none;" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="2" y1="2" x2="22" y2="22"></line>
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path>
                <path d="M5 10v2a7 7 0 0 0 12 5"></path>
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </button>

            <!-- Interrupt / Stop Audio -->
            <button type="button" id="voice-btn-interrupt" class="voice-dock-btn voice-btn-interrupt" onclick="interruptVoiceSpeech()" title="Stop Assistant Speaking">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2.5"></rect></svg>
            </button>

            <!-- Manual Commit / Done -->
            <button type="button" id="voice-btn-send" class="voice-dock-btn voice-btn-commit" onclick="confirmVoiceSend()" title="Done speaking / Send now">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>

            <!-- End Call -->
            <button type="button" class="voice-dock-btn voice-btn-end" onclick="closeVoiceCall()" title="End Voice Call">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.8-1.8a2 2 0 0 1 2.11-.45 11.36 11.36 0 0 0 3.51.56 2 2 0 0 1 2 2v3.1a2 2 0 0 1-2 2A19 19 0 0 1 3 4a2 2 0 0 1 2-2h3.1a2 2 0 0 1 2 2 11.36 11.36 0 0 0 .56 3.51 2 2 0 0 1-.45 2.11z"/>
                <line x1="23" y1="1" x2="1" y2="23"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Independent Floating PiP Capsule (Picture-in-Picture Mode) -->
      <div id="voice-pip-pill" class="voice-pip-pill" style="display: none;">
        <div class="voice-pip-click-area" onclick="setVoiceUIMode('full')" title="Expand Voice Call">
          <span class="voice-pip-pulse-dot"></span>
          <div class="voice-pip-wave">
            <span class="vbar"></span><span class="vbar"></span><span class="vbar"></span><span class="vbar"></span><span class="vbar"></span>
          </div>
          <span id="voice-mini-status" class="voice-pip-status">ऐकत आहे…</span>
          <span id="voice-mini-timer" class="voice-pip-timer">00:00</span>
          <span id="voice-mini-lang" class="voice-pip-lang">मराठी</span>
        </div>

        <div class="voice-pip-actions">
          <button type="button" class="voice-pip-btn voice-pip-send" onclick="confirmVoiceSend()" title="Send">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
          <button type="button" class="voice-pip-btn voice-pip-expand" onclick="setVoiceUIMode('full')" title="Expand Voice Call">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
          <button type="button" class="voice-pip-btn voice-pip-end" onclick="closeVoiceCall()" title="End Call">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Render HTML template into the page body
  page.main.html(html);

  // Initialize dynamic prompt suggestion component
  initExecutiveSuite();

  // State
  var history = [];
  var isLoading = false;

  // DOM elements (scoped to this page wrapper)
  var messagesEl = wrapper.querySelector('#chat-messages');
  var inputEl = wrapper.querySelector('#chat-input');
  var sendBtn = wrapper.querySelector('#send-btn');
  var welcomeEl = wrapper.querySelector('#chat-welcome');

  function renderMarkdown(text) {
    if (!text) return "";

    // 1. Escape HTML to prevent malicious code injection
    var escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Preformatted Code blocks (```code```)
    escaped = escaped.replace(/```([\s\S]*?)```/g, function (match, code) {
      var trimmed = code.trim();
      if (trimmed.startsWith('chart\n') || trimmed.startsWith('chart\r\n')) {
        var jsonStr = trimmed.substring(5).trim();
        // Undo HTML escaping for JSON content
        jsonStr = jsonStr.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        var encodedConfig = encodeURIComponent(jsonStr);
        return '<div class="ai-chart-container" style="width: 100%; min-height: 250px; margin: 15px 0; background: var(--bg-color, #fff); border-radius: 8px; padding: 10px; border: 1px solid var(--border-color, #e2e8f0);" data-chart-config="' + encodedConfig + '"></div>';
      }
      return '<pre><code>' + code.trim() + '</code></pre>';
    });

    // 3. Inline code (`code`)
    escaped = escaped.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 4. Bold formatting (**text**)
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5. Render markdown tables
    escaped = escaped.replace(/((?:\|[^\n]+\|\n?)+)/g, function (match) {
      var rows = match.trim().split('\n').filter(function (r) { return r.trim(); });
      var html = '<div class="table-responsive"><table>';
      rows.forEach(function (row, i) {
        var cells = row.split('|').map(function (c) { return c.trim(); });

        // Remove empty edge cells from markdown table syntax
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();

        if (i === 1 && cells.every(function (c) { return /^[-: ]+$/.test(c); })) return;
        var tag = (i === 0) ? 'th' : 'td';
        html += '<tr>' + cells.map(function (c) {
          return '<' + tag + '>' + c + '</' + tag + '>';
        }).join('') + '</tr>';
      });
      return html + '</table></div>';
    });

    // 6. Handle newlines outside of pre codeblocks
    var parts = escaped.split(/(<\/pre>|<pre>|<div class="ai-chart-container"|<\/div>)/g);
    var insidePreOrChart = false;
    for (var j = 0; j < parts.length; j++) {
      if (parts[j] === '<pre>' || parts[j] === '<div class="ai-chart-container"') {
        insidePreOrChart = true;
      } else if (parts[j] === '</pre>' || (insidePreOrChart && parts[j] === '</div>')) {
        insidePreOrChart = false;
      } else if (!insidePreOrChart) {
        parts[j] = parts[j].replace(/\n/g, '<br>');
      }
    }
    return parts.join('');
  }

  function scrollToBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(role, content) {
    if (role === 'ai') {
      try {
        if (typeof _voiceOverlayOpen !== 'undefined' && _voiceOverlayOpen) {
          _onAIReplyInVoiceCall(content);
        }
      } catch(e) { console.error(e); }
    }
    if (welcomeEl) welcomeEl.style.display = 'none';

    var row = document.createElement('div');
    row.className = 'msg-row ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? '👤' : '✦';

    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (role === 'user') {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = renderMarkdown(content);

      // Initialize charts
      var charts = bubble.querySelectorAll('.ai-chart-container');
      charts.forEach(function (container) {
        try {
          var configStr = decodeURIComponent(container.getAttribute('data-chart-config'));
          var config = JSON.parse(configStr);

          // Render using Frappe Charts
          new frappe.Chart(container, config);
        } catch (e) {
          console.error("Failed to render chart", e);
          container.innerHTML = '<div style="color:var(--text-color, red); padding: 10px; font-size: 13px;">⚠ Failed to render chart: ' + e.message + '</div>';
        }
      });

      // Add Copy Button
      var copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.title = 'Copy response';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      copyBtn.onclick = function () {
        navigator.clipboard.writeText(content);
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#0099A3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        }, 2000);
      };
      bubble.appendChild(copyBtn);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  const funkyStatuses = [
    "Synthesizing financial telemetry...",
    "Aggregating enterprise ledgers...",
    "Correlating supply chain variables...",
    "Extrapolating performance metrics...",
    "Cross-referencing capital expenditures...",
    "Analyzing operational bottlenecks...",
    "Distilling multi-plant data...",
    "Parsing global fiscal trends...",
    "Consolidating executive insights...",
    "Evaluating yield and throughput...",
    "Modeling strategic outcomes..."
  ];

  function showTyping() {
    var row = document.createElement('div');
    row.className = 'msg-row ai';
    row.id = 'typing-row';

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '✦';
    avatar.style.animation = 'pulse-avatar 1.5s infinite';

    var indicator = document.createElement('div');
    indicator.className = 'msg-bubble';
    indicator.style.padding = '12px 18px';
    indicator.style.display = 'flex';
    indicator.style.flexDirection = 'column';
    indicator.style.alignItems = 'center';
    indicator.innerHTML = `
      <div class="liquid-thinking"></div>
      <div id="thinking-status-text" class="thinking-status">${funkyStatuses[0]}</div>
    `;

    row.appendChild(avatar);
    row.appendChild(indicator);
    messagesEl.appendChild(row);
    scrollToBottom();

    let statusIndex = 0;
    typingStatusInterval = setInterval(() => {
      let statusEl = document.getElementById('thinking-status-text');
      if (statusEl) {
        statusIndex = (statusIndex + 1) % funkyStatuses.length;
        statusEl.textContent = funkyStatuses[statusIndex];
      }
    }, 2500);
  }

  // Bind handlers globally on window (mapped to wrapper scope)
  window.handleKey = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  window.autoResize = function (el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  window.selectSuggestion = function (text) {
    inputEl.value = text;
    autoResize(inputEl);
    inputEl.focus();

    // Auto-highlight the first placeholder bracket [Placeholder] if present
    var start = text.indexOf('[');
    if (start !== -1) {
      var end = text.indexOf(']', start);
      if (end !== -1) {
        // Use setTimeout to ensure selection is executed after browser focuses inputEl
        setTimeout(function () {
          inputEl.setSelectionRange(start, end + 1);
        }, 50);
      }
    }
  };

  window.clearChat = function () {
    history = [];
    messagesEl.innerHTML = '';

    // recreate welcome area with animation reset
    var welcome = document.createElement('div');
    welcome.id = 'chat-welcome';
    welcome.innerHTML = `
      <div class="icon">✦</div>
      <h3>What can I help you with?</h3>
      <p>Ask me anything about your ERPNext data — invoices, stock, sales orders, reports, and more.</p>
      <div id="executive-suite-root"></div>
    `;
    messagesEl.appendChild(welcome);
    welcomeEl = welcome;

    initExecutiveSuite();
  };

  let typingStatusInterval;

  function hideTyping() {
    if (typingStatusInterval) {
      clearInterval(typingStatusInterval);
    }
    var el = wrapper.querySelector('#typing-row');
    if (el) el.remove();
  }

  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    isLoading = true;
    sendBtn.disabled = true;

    appendMessage('user', text);
    history.push({ role: 'user', content: text });
    showTyping();

    frappe.call({
      method: 'custom_ui.custom_ui.api.chat',
      args: {
        messages: JSON.stringify(history)
      },
      callback: function (r) {
        hideTyping();
        isLoading = false;
        sendBtn.disabled = false;

        if (r && r.message) {
          if (typeof r.message === 'object') {
            if (r.message.new_history) {
              r.message.new_history.forEach(function (msg) {
                history.push(msg);
              });
            }
            if (r.message.error) {
              appendMessage('ai', '⚠ ' + r.message.error);
            } else if (r.message.requires_approval) {
              renderApprovalCard(r.message.tool_call);
            } else if (r.message.reply !== undefined) {
              appendMessage('ai', r.message.reply);
              history.push({ role: 'assistant', content: r.message.reply });
            }
          } else {
            var reply = r.message;
            appendMessage('ai', reply);
            history.push({ role: 'assistant', content: reply });
          }
        } else {
          appendMessage('ai', '⚠ Sorry, I could not get a response. Please try again.');
        }
      },
      error: function (err) {
        hideTyping();
        isLoading = false;
        sendBtn.disabled = false;
        appendMessage('ai', '⚠ Connection error. Verify your Gemini API key is configured.');
        console.error('AI chat error:', err);
      }
    });
  }

  window.sendMessage = sendMessage;

  window.sendApprovedAction = function (btn, name, argsStr) {
    var card = btn.closest('.approval-card');
    card.innerHTML = '<em style="color: var(--pro-primary); font-weight: 500;">Action approved. Executing...</em>';

    var args = JSON.parse(decodeURIComponent(argsStr));
    var tool_call = { name: name, args: args };

    isLoading = true;
    showTyping();

    frappe.call({
      method: 'custom_ui.custom_ui.api.chat',
      args: {
        messages: JSON.stringify(history),
        approved_action: JSON.stringify(tool_call)
      },
      callback: function (r) {
        hideTyping();
        isLoading = false;
        if (r && r.message) {
          if (typeof r.message === 'object') {
            if (r.message.new_history) {
              r.message.new_history.forEach(function (msg) {
                history.push(msg);
              });
            }
            if (r.message.error) {
              appendMessage('ai', '⚠ ' + r.message.error);
            } else if (r.message.requires_approval) {
              renderApprovalCard(r.message.tool_call);
            } else if (r.message.reply !== undefined) {
              appendMessage('ai', r.message.reply);
              history.push({ role: 'assistant', content: r.message.reply });
            }
          } else {
            var reply = r.message;
            appendMessage('ai', reply);
            history.push({ role: 'assistant', content: reply });
          }
        }
      },
      error: function (err) {
        hideTyping();
        isLoading = false;
        appendMessage('ai', '⚠ Execution failed.');
      }
    });
  };

  window.rejectAction = function (btn) {
    var card = btn.closest('.approval-card');
    card.innerHTML = '<em style="color:#E11D48; font-weight: 500;">Action rejected by user.</em>';

    var rejectionMsg = 'I have rejected this action. Please abort and wait for my next instruction.';
    appendMessage('user', rejectionMsg);
    history.push({ role: 'user', content: rejectionMsg });

    isLoading = true;
    showTyping();
    frappe.call({
      method: 'custom_ui.custom_ui.api.chat',
      args: {
        messages: JSON.stringify(history)
      },
      callback: function (r) {
        hideTyping();
        isLoading = false;
        if (r && r.message) {
          if (typeof r.message === 'object') {
            if (r.message.new_history) {
              r.message.new_history.forEach(function (msg) {
                history.push(msg);
              });
            }
            if (r.message.error) {
              appendMessage('ai', '⚠ ' + r.message.error);
            } else if (r.message.requires_approval) {
              renderApprovalCard(r.message.tool_call);
            } else if (r.message.reply !== undefined) {
              appendMessage('ai', r.message.reply);
              history.push({ role: 'assistant', content: r.message.reply });
            }
          } else {
            var reply = r.message;
            appendMessage('ai', reply);
            history.push({ role: 'assistant', content: reply });
          }
        }
      }
    });
  };

  // Toggle technical details disclosure panel
  window.toggleDetails = function (id) {
    var content = wrapper.querySelector('#' + id);
    var toggleBtn = content.previousElementSibling;
    if (content.classList.contains('open')) {
      content.classList.remove('open');
      toggleBtn.classList.remove('open');
      toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
    } else {
      content.classList.add('open');
      toggleBtn.classList.add('open');
      toggleBtn.querySelector('svg').style.transform = 'rotate(90deg)';
    }
  };

  function renderApprovalCard(tool_call) {
    if (welcomeEl) welcomeEl.style.display = 'none';

    var row = document.createElement('div');
    row.className = 'msg-row ai';

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '✦';

    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    var argsStr = encodeURIComponent(JSON.stringify(tool_call.args || {})).replace(/'/g, "%27");
    var actionName = "Action Required";
    var userFriendlyMsg = "I need your permission to perform this action.";

    if (tool_call.name === "create_document") {
      actionName = "Create Document";
      userFriendlyMsg = "Create a new <strong>" + (tool_call.args.doctype || "document") + "</strong>?";
    } else if (tool_call.name === "update_document") {
      actionName = "Update Document";
      userFriendlyMsg = "Update the <strong>" + (tool_call.args.doctype || "document") + "</strong> (" + (tool_call.args.name || "Unknown") + ")?";
    } else if (tool_call.name === "execute_sql_query") {
      actionName = "Analyze Information";
      var dt = tool_call.args.target_doctype || "data";
      userFriendlyMsg = "Analyze and summarize the <strong>" + dt + "</strong> information?";
    } else if (tool_call.name === "execute_document_method") {
      actionName = "Process Workflow Step";
      var dt = tool_call.args.doctype || "document";
      var name = tool_call.args.name || "Unknown";
      var method = tool_call.args.method || "action";
      userFriendlyMsg = "Execute the action <strong>" + method + "</strong> on the <strong>" + dt + "</strong> (" + name + ")?";
    } else if (tool_call.name === "send_email") {
      actionName = "Send Notification";
      var rcpts = tool_call.args.recipients || "someone";
      var subj = tool_call.args.subject || "No Subject";
      userFriendlyMsg = "Send email to <strong>" + rcpts + "</strong> with subject <strong>" + subj + "</strong>?";
    }

    // Prepare tech details content
    var detailsHtml = "";
    if (tool_call.args && Object.keys(tool_call.args).length > 0) {
      var detailsContent = "";
      if (tool_call.name === "execute_sql_query" && tool_call.args.query) {
        detailsContent = tool_call.args.query;
      } else {
        detailsContent = JSON.stringify(tool_call.args, null, 2);
      }

      var toggleId = 'details-' + Math.random().toString(36).substr(2, 9);
      detailsHtml = `
        <button class="approval-details-toggle" onclick="toggleDetails('${toggleId}')">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg);"><polyline points="9 18 15 12 9 6"></polyline></svg>
          Show data details
        </button>
        <div id="${toggleId}" class="approval-details-content">
          <pre>${detailsContent}</pre>
        </div>
      `;
    }

    bubble.innerHTML = `
        <div class="approval-card">
            <div class="approval-card-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                ${actionName}
            </div>
            <div class="approval-card-body">
                ${userFriendlyMsg}
                ${detailsHtml}
            </div>
            <div class="approval-card-actions">
                <button class="approval-btn approve" onclick="sendApprovedAction(this, '${tool_call.name}', '${argsStr}')">Allow</button>
                <button class="approval-btn reject" onclick="rejectAction(this)">Deny</button>
            </div>
        </div>
    `;

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollToBottom();
  }


  // ═══════════════════════════════════════════════════════════
  // ENTERPRISE MULTILINGUAL VOICE CALL CONTROLLER (SPLIT ARCHITECTURE)
  // ═══════════════════════════════════════════════════════════
  var _voiceRecognition = null;
  var _voiceRunning = false;
  var _voiceOverlayOpen = false;
  var _voiceMinimized = false;
  var _isMuted = false;
  var _voiceFinalText = '';
  var _lastInterim = '';
  var _lastAIReply = '';
  var _aiSpeakingStartTime = 0;
  var _ignoreUntil = 0;
  var _silenceTimer = null;
  var _isAssistantSpeaking = false;
  var _audioCtx = null;
  var _analyser = null;
  var _audioStream = null;
  var _animFrameId = null;
  var _callStartTime = 0;
  var _callTimerInterval = null;

  var _currentLang = localStorage.getItem('custom_ui_voice_lang') || 'mr-IN';

  var _INTERRUPT_KEYWORDS = [
    // Marathi
    'थांबा', 'थांब', 'थांबवा', 'बस', 'नको', 'ऐका', 'ऐक', 'पॉज', 'अरे', 'सांगा', 'सांग', 'बोल', 'हे', 'का', 'काय', 'थांब रे',
    // Hindi
    'रुको', 'रुकिए', 'बस', 'ठहरो', 'बंद', 'रोको', 'सुनो', 'सुनिए', 'अरे', 'बताओ', 'बताइए', 'क्या', 'रुक',
    // English
    'stop', 'wait', 'hold', 'pause', 'quiet', 'shut up', 'cancel', 'cut', 'hey', 'hello', 'listen', 'tell me', 'what', 'why', 'no'
  ];

  var _LANG_CONFIG = {
    'mr-IN': {
      label: 'मराठी',
      name: 'Marathi',
      listening: 'ऐकत आहे… (Listening)',
      sub: 'मराठीत बोला · थांबवण्यासाठी "थांबा" बोला',
      thinking: 'विचार करत आहे… (Thinking)',
      thinkingSub: 'ईआरपी डेटा विश्लेषित करत आहे…',
      speaking: 'उत्तर देत आहे… (AI Speaking)',
      speakingSub: 'थांबवण्यासाठी "थांबा" बोला किंवा टॅप करा',
      placeholder: 'उदा. "आजचा विक्री अहवाल दाखवा" किंवा "स्टॉक किती आहे?" बोला…',
      miniStatus: 'ऐकत आहे…'
    },
    'hi-IN': {
      label: 'हिन्दी',
      name: 'Hindi',
      listening: 'सुन रहा हूँ… (Listening)',
      sub: 'हिन्दी में बोलिए · रोकने के लिए "रुको" बोलें',
      thinking: 'सोच रहा हूँ… (Thinking)',
      thinkingSub: 'ईआरपी डेटा देख रहा हूँ…',
      speaking: 'उत्तर दे रहा हूँ… (AI Speaking)',
      speakingSub: 'रोकने के लिए "रुको" बोलें या टैप करें',
      placeholder: 'जैसे "आज का सेल्स डेटा दिखाओ" या "स्टॉक कितना है?" बोलिए…',
      miniStatus: 'सुन रहा हूँ…'
    },
    'en-IN': {
      label: 'English',
      name: 'English',
      listening: 'Listening…',
      sub: 'Speak in English · Say "Stop" to interrupt',
      thinking: 'Thinking…',
      thinkingSub: 'Querying live ERP data…',
      speaking: 'AI Speaking…',
      speakingSub: 'Say "Stop" or tap to interrupt',
      placeholder: 'Say something like "Show today\'s sales report" or "Check inventory"…',
      miniStatus: 'Listening…'
    }
  };

  function _escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Pure Deterministic UI Mode Switcher
  // 'full'   -> Full-screen stage visible, PiP pill hidden
  // 'pip'    -> Full-screen stage hidden, PiP pill visible
  // 'closed' -> Both hidden
  function setVoiceUIMode(mode) {
    var overlay = wrapper.querySelector('#voice-overlay');
    var pill = wrapper.querySelector('#voice-pip-pill');

    if (mode === 'full') {
      _voiceMinimized = false;
      if (overlay) {
        overlay.classList.add('active');
        overlay.style.display = 'flex';
      }
      if (pill) {
        pill.style.display = 'none';
      }
    } else if (mode === 'pip') {
      _voiceMinimized = true;
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
      if (pill) {
        pill.style.display = 'flex';
      }
    } else { // 'closed'
      _voiceMinimized = false;
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
      }
      if (pill) {
        pill.style.display = 'none';
      }
    }
  }
  window.setVoiceUIMode = setVoiceUIMode;

  function toggleVoiceDockMinimize() {
    if (_voiceMinimized) {
      setVoiceUIMode('full');
    } else {
      setVoiceUIMode('pip');
    }
  }
  window.toggleVoiceDockMinimize = toggleVoiceDockMinimize;

  // Setup click listeners for backdrop minimize & controls
  function _setupVoiceBackdropClick() {
    var stage = wrapper.querySelector('#voice-screen-stage');
    if (stage) {
      stage.onclick = function(e) {
        // If clicked on backdrop (outside buttons, segmented chips, orb, or response card)
        if (
          !e.target.closest('.voice-bottom-dock') &&
          !e.target.closest('.voice-lang-segmented') &&
          !e.target.closest('.voice-header-actions') &&
          !e.target.closest('.voice-reactor-container') &&
          !e.target.closest('.voice-ai-response-sheet') &&
          !e.target.closest('.voice-replay-pill')
        ) {
          setVoiceUIMode('pip');
        }
      };
    }
  }
  setTimeout(_setupVoiceBackdropClick, 100);

  // Call duration timer (MM:SS)
  function _updateCallTimer() {
    if (!_voiceRunning || !_callStartTime) return;
    var elapsed = Math.floor((Date.now() - _callStartTime) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var formatted = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

    var headerTimer = wrapper.querySelector('#voice-call-timer');
    var miniTimer = wrapper.querySelector('#voice-mini-timer');
    if (headerTimer) headerTimer.textContent = formatted;
    if (miniTimer) miniTimer.textContent = formatted;
  }

  // Echo cancellation filter
  function _isAIEcho(spokenText) {
    if (!_lastAIReply || !spokenText) return false;
    var cleanSpoken = spokenText.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, ' ').trim();
    if (!cleanSpoken || cleanSpoken.length < 2) return true;

    var hasInterruptWord = _INTERRUPT_KEYWORDS.some(function(kw) {
      return cleanSpoken.includes(kw);
    });
    if (hasInterruptWord) return false;

    var cleanAI = _lastAIReply.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, ' ').trim();
    if (cleanAI.includes(cleanSpoken)) {
      console.log('[Echo Filter] Speaker audio suppressed:', cleanSpoken);
      return true;
    }

    return false;
  }

  // Barge-In: Cut off AI speech immediately & reset audio pipelines
  function _triggerBargeInInterruption(initialSpokenText) {
    console.log('%c[Voice Barge-In] User interrupted:', 'color: #ef4444; font-weight: bold;', initialSpokenText || '');

    stopAllSpeech();
    _isAssistantSpeaking = false;
    _ignoreUntil = Date.now() + 350;

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
    var statusLabel = wrapper.querySelector('#voice-status-label');
    var subLabel = wrapper.querySelector('#voice-sub-label');
    var miniStatus = wrapper.querySelector('#voice-mini-status');
    var orbEl = wrapper.querySelector('#voice-avatar-orb');
    var statusPill = wrapper.querySelector('#voice-status-pill');
    var interruptBtn = wrapper.querySelector('#voice-btn-interrupt');
    var sendBtn = wrapper.querySelector('#voice-btn-send');

    if (statusLabel) statusLabel.textContent = cfg.listening;
    if (subLabel) subLabel.textContent = cfg.sub;
    if (miniStatus) miniStatus.textContent = cfg.miniStatus;
    if (orbEl) orbEl.classList.remove('speaking', 'thinking');
    if (statusPill) statusPill.classList.remove('speaking', 'thinking');
    if (interruptBtn) interruptBtn.classList.remove('visible');
    if (sendBtn) sendBtn.style.display = 'flex';

    var cleanSpoken = (initialSpokenText || '').trim();
    var isJustStopWord = _INTERRUPT_KEYWORDS.some(function(kw) {
      return cleanSpoken.toLowerCase() === kw.toLowerCase();
    });

    if (cleanSpoken && !isJustStopWord) {
      _voiceFinalText = cleanSpoken + ' ';
      _lastInterim = '';
      var transcriptEl = wrapper.querySelector('#voice-transcript-live');
      if (transcriptEl) {
        transcriptEl.innerHTML = '<span class="vfinal">' + _escapeHtml(_voiceFinalText) + '</span>';
      }
    } else {
      _voiceFinalText = '';
      _lastInterim = '';
      var transcriptEl = wrapper.querySelector('#voice-transcript-live');
      if (transcriptEl) {
        transcriptEl.innerHTML = '<span class="vplaceholder">' + cfg.placeholder + '</span>';
      }
    }

    if (_voiceRunning && _voiceOverlayOpen && !_isMuted) {
      _startListening();
    }
  }

  function handleOrbClick() {
    if (_isAssistantSpeaking) {
      _triggerBargeInInterruption();
    } else if (!_voiceRecognition && !_isMuted && _voiceOverlayOpen) {
      _startListening();
    }
  }
  window.handleOrbClick = handleOrbClick;

  function toggleVoiceMute() {
    _isMuted = !_isMuted;
    var muteBtn = wrapper.querySelector('#voice-ctrl-mute');
    var iconOn = wrapper.querySelector('#voice-mute-icon-on');
    var iconOff = wrapper.querySelector('#voice-mute-icon-off');
    var statusLabel = wrapper.querySelector('#voice-status-label');

    if (_isMuted) {
      if (muteBtn) muteBtn.classList.add('muted');
      if (iconOn) iconOn.style.display = 'none';
      if (iconOff) iconOff.style.display = 'block';
      if (statusLabel) statusLabel.textContent = 'Muted (Microphone Off)';
      if (_voiceRecognition) {
        try { _voiceRecognition.stop(); } catch(e) {}
      }
    } else {
      if (muteBtn) muteBtn.classList.remove('muted');
      if (iconOn) iconOn.style.display = 'block';
      if (iconOff) iconOff.style.display = 'none';
      var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
      if (statusLabel) statusLabel.textContent = _isAssistantSpeaking ? cfg.speaking : cfg.listening;
      if (_voiceRunning && _voiceOverlayOpen && !_isAssistantSpeaking) {
        _startListening();
      }
    }
  }
  window.toggleVoiceMute = toggleVoiceMute;

  function setVoiceLanguage(langCode) {
    if (!_LANG_CONFIG[langCode]) langCode = 'mr-IN';
    _currentLang = langCode;
    localStorage.setItem('custom_ui_voice_lang', langCode);

    var chips = wrapper.querySelectorAll('.voice-lang-chip');
    chips.forEach(function(chip) {
      if (chip.getAttribute('data-lang') === langCode) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    var cfg = _LANG_CONFIG[langCode];
    var statusLabel = wrapper.querySelector('#voice-status-label');
    var subLabel = wrapper.querySelector('#voice-sub-label');
    var transcriptEl = wrapper.querySelector('#voice-transcript-live');
    var miniStatus = wrapper.querySelector('#voice-mini-status');
    var miniLang = wrapper.querySelector('#voice-mini-lang');

    if (miniLang) miniLang.textContent = cfg.label;
    if (miniStatus) miniStatus.textContent = cfg.miniStatus;

    if (!_isAssistantSpeaking && _voiceRunning && !_isMuted) {
      if (statusLabel) statusLabel.textContent = cfg.listening;
      if (subLabel) subLabel.textContent = cfg.sub;
      if (transcriptEl && !_voiceFinalText && !_lastInterim) {
        transcriptEl.innerHTML = '<span class="vplaceholder">' + cfg.placeholder + '</span>';
      }
    }

    if (_voiceRecognition) {
      try {
        _voiceRecognition.lang = langCode;
      } catch(e) {}
    }
  }
  window.setVoiceLanguage = setVoiceLanguage;

  function toggleVoice() {
    if (_voiceOverlayOpen) {
      closeVoiceCall();
    } else {
      openVoiceCall();
    }
  }
  window.toggleVoice = toggleVoice;

  function openVoiceCall() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      frappe.show_alert({
        message: 'Voice input requires Google Chrome or Chromium. Please open in Chrome.',
        indicator: 'red'
      }, 5);
      return;
    }

    _voiceOverlayOpen = true;
    _voiceRunning = true;
    _voiceFinalText = '';
    _lastInterim = '';
    _isAssistantSpeaking = false;
    _isMuted = false;
    _ignoreUntil = 0;
    _callStartTime = Date.now();

    var triggerBtn = wrapper.querySelector('#mic-btn');
    var aiReplyBox = wrapper.querySelector('#voice-ai-reply-box');
    var orbEl = wrapper.querySelector('#voice-avatar-orb');
    var statusPill = wrapper.querySelector('#voice-status-pill');
    var interruptBtn = wrapper.querySelector('#voice-btn-interrupt');
    var sendBtn = wrapper.querySelector('#voice-btn-send');
    var muteBtn = wrapper.querySelector('#voice-ctrl-mute');
    var iconOn = wrapper.querySelector('#voice-mute-icon-on');
    var iconOff = wrapper.querySelector('#voice-mute-icon-off');

    // Switch cleanly to Full Stage Mode
    setVoiceUIMode('full');

    if (triggerBtn) triggerBtn.classList.add('recording');
    if (aiReplyBox) aiReplyBox.style.display = 'none';
    if (orbEl) orbEl.classList.remove('thinking', 'speaking');
    if (statusPill) statusPill.classList.remove('thinking', 'speaking');
    if (interruptBtn) interruptBtn.classList.remove('visible');
    if (sendBtn) sendBtn.style.display = 'flex';
    if (muteBtn) muteBtn.classList.remove('muted');
    if (iconOn) iconOn.style.display = 'block';
    if (iconOff) iconOff.style.display = 'none';

    _callTimerInterval = setInterval(_updateCallTimer, 1000);
    _updateCallTimer();

    setVoiceLanguage(_currentLang);
    _startListening();
    _startAudioVisualizer();
  }
  window.openVoiceCall = openVoiceCall;

  function _stopListening() {
    if (_voiceRecognition) {
      _voiceRecognition.onend = null;
      try { _voiceRecognition.stop(); } catch(e) {}
      _voiceRecognition = null;
    }
  }

  function _startListening() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || _isMuted || !_voiceRunning || !_voiceOverlayOpen) return;

    _stopListening();

    try {
      _voiceRecognition = new SR();
      _voiceRecognition.continuous = true;
      _voiceRecognition.interimResults = true;
      _voiceRecognition.lang = _currentLang;

      _voiceRecognition.onresult = function(event) {
        if (Date.now() < _ignoreUntil || _isMuted) return;

        var interim = '';
        var latestSpeech = '';
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var t = event.results[i][0].transcript;
          latestSpeech += t + ' ';
          if (!event.results[i].isFinal) {
            interim += t;
          }
        }

        var spokenChunk = (latestSpeech + ' ' + interim).trim();

        // 1. While AI is speaking: Barge-In check only
        if (_isAssistantSpeaking) {
          if (_silenceTimer) clearTimeout(_silenceTimer);
          if (!spokenChunk || spokenChunk.length < 2) return;

          if (Date.now() - _aiSpeakingStartTime > 300) {
            if (!_isAIEcho(spokenChunk)) {
              console.log('[Barge-In] Human speech detected during narration:', spokenChunk);
              _triggerBargeInInterruption(spokenChunk);
            }
          }
          return;
        }

        // 2. Capture Real User Speech
        for (var j = event.resultIndex; j < event.results.length; j++) {
          if (event.results[j].isFinal) {
            _voiceFinalText += event.results[j][0].transcript + ' ';
          }
        }
        _lastInterim = interim;

        var transcriptEl = wrapper.querySelector('#voice-transcript-live');
        if (transcriptEl) {
          if (_voiceFinalText || interim) {
            transcriptEl.innerHTML =
              '<span class="vfinal">' + _escapeHtml(_voiceFinalText) + '</span>' +
              '<span class="vinterim">' + _escapeHtml(interim) + '</span>';
          }
        }

        // Auto-commit on 2.4s silence
        if (_silenceTimer) clearTimeout(_silenceTimer);
        var total = (_voiceFinalText + interim).trim();
        if (total.length >= 2) {
          _silenceTimer = setTimeout(function() {
            if (_voiceRunning && !_isAssistantSpeaking && _voiceOverlayOpen && !_isMuted) {
              confirmVoiceSend();
            }
          }, 2400);
        }
      };

      _voiceRecognition.onerror = function(event) {
        console.warn('Voice recognition error:', event.error);
        if (event.error === 'not-allowed') {
          frappe.show_alert({
            message: 'Microphone access denied. Please click the camera/lock icon in URL bar to allow.',
            indicator: 'red'
          }, 6);
          closeVoiceCall();
          return;
        }
        // Non-fatal errors ('no-speech', 'audio-capture', 'network')
        if (_voiceRunning && _voiceOverlayOpen && !_isMuted && !_isAssistantSpeaking) {
          setTimeout(function() {
            if (_voiceRunning && _voiceOverlayOpen && !_isMuted && !_isAssistantSpeaking && !_voiceRecognition) {
              _startListening();
            }
          }, 250);
        }
      };

      _voiceRecognition.onend = function() {
        _voiceRecognition = null;
        if (_voiceRunning && _voiceOverlayOpen && !_isMuted && !_isAssistantSpeaking) {
          setTimeout(function() {
            if (_voiceRunning && _voiceOverlayOpen && !_isMuted && !_isAssistantSpeaking && !_voiceRecognition) {
              _startListening();
            }
          }, 120);
        }
      };

      _voiceRecognition.start();
    } catch(err) {
      console.warn('Failed to start SpeechRecognition:', err);
    }
  }

  function _startAudioVisualizer() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }).then(function(stream) {
      _audioStream = stream;
      try {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        _audioCtx = new AudioContext();
        var source = _audioCtx.createMediaStreamSource(stream);
        _analyser = _audioCtx.createAnalyser();
        _analyser.fftSize = 64;
        _analyser.smoothingTimeConstant = 0.6;
        source.connect(_analyser);

        var dataArray = new Uint8Array(_analyser.frequencyBinCount);
        var bars = wrapper.querySelectorAll('.vbar');
        var rings = wrapper.querySelectorAll('.voice-acoustic-ring');

        function updateWave() {
          if (!_voiceOverlayOpen) return;
          if (_analyser) {
            _analyser.getByteFrequencyData(dataArray);

            var sum = 0;
            for (var k = 0; k < dataArray.length; k++) {
              sum += dataArray[k];
            }
            var avg = sum / dataArray.length / 255.0;

            if (bars.length) {
              for (var i = 0; i < bars.length; i++) {
                var val = dataArray[i % dataArray.length] / 255.0;
                var scale = Math.max(0.18, Math.min(1.0, val * 2.4));
                bars[i].style.transform = 'scaleY(' + scale + ')';
              }
            }

            if (rings.length && !_isAssistantSpeaking) {
              var ringScale1 = 1.0 + (avg * 0.22);
              var ringScale2 = 1.0 + (avg * 0.45);
              var ringScale3 = 1.0 + (avg * 0.70);
              var ringOp = Math.min(0.85, 0.2 + (avg * 1.5));

              if (rings[0]) rings[0].style.transform = 'translate(-50%, -50%) scale(' + ringScale1 + ')';
              if (rings[1]) rings[1].style.transform = 'translate(-50%, -50%) scale(' + ringScale2 + ')';
              if (rings[2]) rings[2].style.transform = 'translate(-50%, -50%) scale(' + ringScale3 + ')';
              rings.forEach(function(r) { r.style.opacity = ringOp; });
            }
          }
          _animFrameId = requestAnimationFrame(updateWave);
        }
        updateWave();
      } catch(e) {
        console.warn('Web Audio error:', e);
      }
    }).catch(function(err) {
      console.warn('Microphone stream error for visualizer:', err);
    });
  }

  function confirmVoiceSend() {
    if (_silenceTimer) clearTimeout(_silenceTimer);
    if (_isAssistantSpeaking) return;

    var fullText = (_voiceFinalText + ' ' + _lastInterim).trim();
    if (!fullText || fullText.length < 2) {
      return;
    }

    // Echo safeguard
    if (_lastAIReply) {
      var cleanSend = fullText.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, ' ').trim();
      var cleanAI = _lastAIReply.toLowerCase().replace(/[^\w\s\u0900-\u097F]/gi, ' ').trim();
      if (cleanSend.length > 5 && cleanAI.includes(cleanSend)) {
        console.warn('[Safety Block] Blocked echo from sending:', fullText);
        _voiceFinalText = '';
        _lastInterim = '';
        var transcriptEl = wrapper.querySelector('#voice-transcript-live');
        if (transcriptEl) {
          var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
          transcriptEl.innerHTML = '<span class="vplaceholder">' + cfg.placeholder + '</span>';
        }
        return;
      }
    }

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
    var statusLabel = wrapper.querySelector('#voice-status-label');
    var subLabel = wrapper.querySelector('#voice-sub-label');
    var miniStatus = wrapper.querySelector('#voice-mini-status');
    var orbEl = wrapper.querySelector('#voice-avatar-orb');
    var statusPill = wrapper.querySelector('#voice-status-pill');
    var sendBtn = wrapper.querySelector('#voice-btn-send');

    if (statusLabel) statusLabel.textContent = cfg.thinking;
    if (subLabel) subLabel.textContent = cfg.thinkingSub;
    if (miniStatus) miniStatus.textContent = cfg.thinking;
    if (orbEl) {
      orbEl.classList.remove('speaking');
      orbEl.classList.add('thinking');
    }
    if (statusPill) {
      statusPill.classList.remove('speaking');
      statusPill.classList.add('thinking');
    }
    if (sendBtn) sendBtn.style.display = 'none';

    _stopListening();

    inputEl.value = fullText;
    autoResize(inputEl);
    _voiceFinalText = '';
    _lastInterim = '';

    sendMessage();
  }
  window.confirmVoiceSend = confirmVoiceSend;

  function interruptVoiceSpeech() {
    _triggerBargeInInterruption();
  }
  window.interruptVoiceSpeech = interruptVoiceSpeech;

  function replayVoiceReply() {
    if (_lastAIReply) {
      _isAssistantSpeaking = true;
      _aiSpeakingStartTime = Date.now();
      _ignoreUntil = 0;

      var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
      var statusLabel = wrapper.querySelector('#voice-status-label');
      var subLabel = wrapper.querySelector('#voice-sub-label');
      var miniStatus = wrapper.querySelector('#voice-mini-status');
      var orbEl = wrapper.querySelector('#voice-avatar-orb');
      var statusPill = wrapper.querySelector('#voice-status-pill');
      var interruptBtn = wrapper.querySelector('#voice-btn-interrupt');

      if (statusLabel) statusLabel.textContent = cfg.speaking;
      if (subLabel) subLabel.textContent = cfg.speakingSub;
      if (miniStatus) miniStatus.textContent = cfg.speaking;
      if (orbEl) {
        orbEl.classList.remove('thinking');
        orbEl.classList.add('speaking');
      }
      if (statusPill) {
        statusPill.classList.remove('thinking');
        statusPill.classList.add('speaking');
      }
      if (interruptBtn) interruptBtn.classList.add('visible');

      speakReply(_lastAIReply, _currentLang, function() {
        _onAssistantFinishedSpeaking();
      });
    }
  }
  window.replayVoiceReply = replayVoiceReply;

  function _onAIReplyInVoiceCall(content) {
    _isAssistantSpeaking = true;
    _lastAIReply = content;
    _aiSpeakingStartTime = Date.now();
    _ignoreUntil = 0;

    _voiceFinalText = '';
    _lastInterim = '';
    if (_silenceTimer) clearTimeout(_silenceTimer);

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
    var statusLabel = wrapper.querySelector('#voice-status-label');
    var subLabel = wrapper.querySelector('#voice-sub-label');
    var miniStatus = wrapper.querySelector('#voice-mini-status');
    var orbEl = wrapper.querySelector('#voice-avatar-orb');
    var statusPill = wrapper.querySelector('#voice-status-pill');
    var interruptBtn = wrapper.querySelector('#voice-btn-interrupt');
    var aiReplyBox = wrapper.querySelector('#voice-ai-reply-box');
    var aiReplyText = wrapper.querySelector('#voice-ai-reply-text');

    if (statusLabel) statusLabel.textContent = cfg.speaking;
    if (subLabel) subLabel.textContent = cfg.speakingSub;
    if (miniStatus) miniStatus.textContent = cfg.speaking;
    if (orbEl) {
      orbEl.classList.remove('thinking');
      orbEl.classList.add('speaking');
    }
    if (statusPill) {
      statusPill.classList.remove('thinking');
      statusPill.classList.add('speaking');
    }
    if (interruptBtn) interruptBtn.classList.add('visible');

    if (aiReplyBox && aiReplyText) {
      aiReplyBox.style.display = 'block';
      aiReplyText.innerHTML = renderMarkdown(content);
    }

    speakReply(content, _currentLang, function() {
      _onAssistantFinishedSpeaking();
    });
  }

  function _onAssistantFinishedSpeaking() {
    _clearTTSWatchdogs();
    _isAssistantSpeaking = false;

    _voiceFinalText = '';
    _lastInterim = '';
    if (_silenceTimer) clearTimeout(_silenceTimer);

    _ignoreUntil = Date.now() + 400;

    if (!_voiceOverlayOpen) return;

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['mr-IN'];
    var statusLabel = wrapper.querySelector('#voice-status-label');
    var subLabel = wrapper.querySelector('#voice-sub-label');
    var miniStatus = wrapper.querySelector('#voice-mini-status');
    var orbEl = wrapper.querySelector('#voice-avatar-orb');
    var statusPill = wrapper.querySelector('#voice-status-pill');
    var interruptBtn = wrapper.querySelector('#voice-btn-interrupt');
    var sendBtn = wrapper.querySelector('#voice-btn-send');
    var transcriptEl = wrapper.querySelector('#voice-transcript-live');

    if (statusLabel) statusLabel.textContent = _isMuted ? 'Muted (Microphone Off)' : cfg.listening;
    if (subLabel) subLabel.textContent = cfg.sub;
    if (miniStatus) miniStatus.textContent = cfg.miniStatus;
    if (orbEl) orbEl.classList.remove('speaking', 'thinking');
    if (statusPill) statusPill.classList.remove('speaking', 'thinking');
    if (interruptBtn) interruptBtn.classList.remove('visible');
    if (sendBtn) sendBtn.style.display = 'flex';
    if (transcriptEl) transcriptEl.innerHTML = '<span class="vplaceholder">' + cfg.placeholder + '</span>';

    if (_voiceRunning && _voiceOverlayOpen && !_isMuted) {
      _startListening();
    }
  }

  function closeVoiceCall() {
    _voiceOverlayOpen = false;
    _voiceRunning = false;
    _isAssistantSpeaking = false;
    _voiceMinimized = false;
    _isMuted = false;

    if (_silenceTimer) clearTimeout(_silenceTimer);
    if (_callTimerInterval) {
      clearInterval(_callTimerInterval);
      _callTimerInterval = null;
    }

    _stopListening();

    if (_audioStream) {
      _audioStream.getTracks().forEach(function(track) { track.stop(); });
      _audioStream = null;
    }

    if (_audioCtx) {
      try { _audioCtx.close(); } catch(e) {}
      _audioCtx = null;
    }

    if (_animFrameId) {
      cancelAnimationFrame(_animFrameId);
      _animFrameId = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Hide both overlay and pill cleanly
    setVoiceUIMode('closed');

    var triggerBtn = wrapper.querySelector('#mic-btn');
    if (triggerBtn) triggerBtn.classList.remove('recording');
  }
  window.closeVoiceCall = closeVoiceCall;

  document.addEventListener('keydown', function(e) {
    if (!_voiceOverlayOpen) return;

    if (e.key === 'Escape') {
      closeVoiceCall();
      return;
    }

    if (e.code === 'KeyM') {
      toggleVoiceMute();
      return;
    }

    // Space or Tab: Unstuck key / instant barge-in
    if (e.code === 'Space' || e.key === 'Tab') {
      e.preventDefault();
      if (inputEl) {
        try { inputEl.blur(); } catch(err) {}
      }

      if (_isAssistantSpeaking) {
        _triggerBargeInInterruption();
      } else {
        var fullText = (_voiceFinalText + ' ' + _lastInterim).trim();
        if (fullText.length >= 2) {
          confirmVoiceSend();
        } else {
          // If silent or stalled, ensure recognition is running
          if (!_voiceRecognition && !_isMuted) {
            _startListening();
          }
        }
      }
      return;
    }
  });

  var _browserVoices = [];
  function _updateVoices() {
    if (window.speechSynthesis) {
      _browserVoices = window.speechSynthesis.getVoices() || [];
    }
  }
  if (window.speechSynthesis) {
    _updateVoices();
    window.speechSynthesis.onvoiceschanged = _updateVoices;
  }

  function _findBestVoice(langCode) {
    var voices = _browserVoices.length ? _browserVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    if (!voices || !voices.length) return null;

    var prefix = langCode.toLowerCase().split('-')[0];

    var exact = voices.find(function(v) {
      return v.lang && v.lang.toLowerCase().replace('_', '-') === langCode.toLowerCase();
    });
    if (exact) return exact;

    var byPrefix = voices.find(function(v) {
      return v.lang && v.lang.toLowerCase().startsWith(prefix);
    });
    if (byPrefix) return byPrefix;

    var byName = voices.find(function(v) {
      var n = (v.name || '').toLowerCase();
      if (prefix === 'mr' && (n.includes('marathi') || n.includes('aarohi'))) return true;
      if (prefix === 'hi' && (n.includes('hindi') || n.includes('madhur') || n.includes('swara') || n.includes('kalpana') || n.includes('hemant'))) return true;
      return false;
    });
    if (byName) return byName;

    if (prefix === 'mr') {
      var hiFallback = voices.find(function(v) {
        return v.lang && v.lang.toLowerCase().startsWith('hi');
      }) || voices.find(function(v) {
        return (v.name || '').toLowerCase().includes('hindi');
      });
      if (hiFallback) return hiFallback;
    }

    var inVoice = voices.find(function(v) {
      return v.lang && (v.lang.toLowerCase() === 'en-in' || (v.name || '').toLowerCase().includes('india'));
    });
    if (inVoice) return inVoice;

    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // BULLETPROOF ENTERPRISE TTS ENGINE (GC-PROOF & CHROMIUM 15s FREEZE IMMUNE)
  // ═══════════════════════════════════════════════════════════
  window._activeUtterancePool = [];
  var _ttsWatchdogTimer = null;
  var _ttsHeartbeatTimer = null;

  function _clearTTSWatchdogs() {
    if (_ttsWatchdogTimer) {
      clearTimeout(_ttsWatchdogTimer);
      _ttsWatchdogTimer = null;
    }
    if (_ttsHeartbeatTimer) {
      clearInterval(_ttsHeartbeatTimer);
      _ttsHeartbeatTimer = null;
    }
  }

  function stopAllSpeech() {
    _clearTTSWatchdogs();
    if (window._activeUtterancePool) {
      window._activeUtterancePool.length = 0;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch(e) {}
    }
  }
  window.stopAllSpeech = stopAllSpeech;

  // Split text into natural, digestible sentence chunks (< 140 chars)
  function _splitIntoSentences(text) {
    if (!text) return [];
    var parts = text.split(/(?<=[.?!।\n])\s+/);
    var chunks = [];

    parts.forEach(function(p) {
      p = p.trim();
      if (!p) return;
      if (p.length > 140) {
        var subParts = p.split(/(?<=[,;:])\s+/);
        subParts.forEach(function(sp) {
          sp = sp.trim();
          if (sp) chunks.push(sp);
        });
      } else {
        chunks.push(p);
      }
    });

    return chunks.length ? chunks : [text];
  }

  function speakReply(text, targetLang, onEnd) {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }

    stopAllSpeech();

    var lang = targetLang || _currentLang || 'mr-IN';

    var clean = (text || '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\|[^\n]+\|/g, '')
      .replace(/[*_`#>~|]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!clean || clean.length < 2) {
      if (onEnd) onEnd();
      return;
    }

    var chunks = _splitIntoSentences(clean);
    if (!chunks.length) {
      if (onEnd) onEnd();
      return;
    }

    _isAssistantSpeaking = true;
    _aiSpeakingStartTime = Date.now();

    // 1. Chrome Heartbeat: Prevents Chromium 15-second silent speech freeze
    _ttsHeartbeatTimer = setInterval(function() {
      if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 4500);

    // 2. Hard Watchdog: Forces recovery if the browser engine gets wedged
    // Max 140ms per char + 5000ms buffer (capped between 5s and 60s)
    var totalLimitMs = Math.max(5000, Math.min(60000, clean.length * 140 + 5000));
    _ttsWatchdogTimer = setTimeout(function() {
      console.warn('[TTS Watchdog] Force recovery: speech duration exceeded limit (' + totalLimitMs + 'ms)');
      stopAllSpeech();
      _isAssistantSpeaking = false;
      if (onEnd) onEnd();
    }, totalLimitMs);

    var currentIdx = 0;

    function playNextChunk() {
      if (!_isAssistantSpeaking || currentIdx >= chunks.length) {
        _clearTTSWatchdogs();
        _isAssistantSpeaking = false;
        if (onEnd) onEnd();
        return;
      }

      var chunkText = chunks[currentIdx];
      currentIdx++;

      var utt = new SpeechSynthesisUtterance(chunkText);
      utt.lang = lang;

      if (lang === 'mr-IN') {
        utt.rate = 0.90;
        utt.pitch = 1.0;
      } else if (lang === 'hi-IN') {
        utt.rate = 0.93;
        utt.pitch = 1.0;
      } else {
        utt.rate = 1.0;
        utt.pitch = 1.0;
      }

      var bestVoice = _findBestVoice(lang);
      if (bestVoice) {
        utt.voice = bestVoice;
      }

      // CRITICAL: Prevent V8 Garbage Collection of active utterance!
      window._activeUtterancePool.push(utt);

      utt.onstart = function() {
        _aiSpeakingStartTime = Date.now();
        _isAssistantSpeaking = true;
      };

      utt.onend = function() {
        var idx = window._activeUtterancePool.indexOf(utt);
        if (idx !== -1) window._activeUtterancePool.splice(idx, 1);
        playNextChunk();
      };

      utt.onerror = function(err) {
        console.warn('Speech chunk error:', err);
        var idx = window._activeUtterancePool.indexOf(utt);
        if (idx !== -1) window._activeUtterancePool.splice(idx, 1);
        playNextChunk();
      };

      window.speechSynthesis.speak(utt);
    }

    playNextChunk();
  }
  window.speakReply = speakReply;

  // Focus input
  setTimeout(function () { inputEl.focus(); }, 300);
};
