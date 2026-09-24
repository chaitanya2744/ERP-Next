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

            <div class="voice-header-center">
              <!-- Single Searchable Language Dropdown -->
              <div class="voice-picker-dock voice-lang-dropdown-wrap" style="position: relative;" id="voice-lang-dropdown-wrap" title="Choose Voice Language">
                <button type="button" class="voice-picker-trigger voice-lang-dropdown-btn" id="voice-lang-trigger" onclick="toggleLangDropdown(event)" title="Select Voice Language">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  <span id="voice-lang-dropdown-label" class="voice-picker-selected-name">English</span>
                  <svg class="voice-lang-dropdown-caret" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                <!-- Searchable Language Menu Dropdown -->
                <div class="voice-lang-dropdown-panel" id="voice-lang-dropdown-panel" style="display: none;" onclick="event.stopPropagation()">
                  <div class="voice-lang-dp-search-row">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="voice-lang-dp-input" placeholder="Search language (English, Marathi, Hindi...)" autocomplete="off" oninput="filterLangDropdown(this.value)">
                    <button type="button" class="voice-lang-dp-close" onclick="event.stopPropagation(); closeLangDropdown(event);" title="Close Language Selector (Esc)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div class="voice-lang-dp-list" id="voice-lang-dp-list">
                    <!-- Dynamically populated via filterLangDropdown -->
                  </div>
                </div>
              </div>

              <!-- Searchable Voice Picker Dock -->
              <div class="voice-picker-dock" id="voice-picker-dock" title="Choose Voice Model">
                <button type="button" class="voice-picker-trigger" id="voice-picker-trigger" onclick="toggleVoicePickerDropdown(event)" title="Select AI Voice Model">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  <span id="voice-picker-selected-name" class="voice-picker-selected-name">✨ Auto AI Voice</span>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                <!-- Searchable Voice Menu Dropdown -->
                <div class="voice-picker-menu" id="voice-picker-menu" style="display: none;" onclick="event.stopPropagation()">
                  <div class="voice-picker-menu-header">
                    <div class="voice-picker-search-box">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <input type="text" id="voice-picker-search-input" placeholder="Search voices (Google, Microsoft, Natural...)" autocomplete="off" oninput="filterVoicePickerMenu(this.value)">
                    </div>
                    <button type="button" class="voice-picker-close-btn" onclick="event.stopPropagation(); closeVoicePickerDropdown(event);" title="Close Voice Selector (Esc)">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div class="voice-picker-list" id="voice-picker-list">
                    <!-- Dynamically populated via _populateVoiceDropdown -->
                  </div>
                </div>
              </div>
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
                <span id="voice-status-label">Listening…</span>
              </div>
              <div id="voice-sub-label" class="voice-sub-caption">Speak in English · Say "Stop" to interrupt</div>
            </div>
          </div>

          <!-- Live Floating Subtitles / Captions -->
          <div class="voice-caption-stage">
            <div id="voice-transcript-live" class="voice-caption-stream">
              <span class="vplaceholder">Say something like "Show today's sales report" or "Check inventory"…</span>
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
    // Screen WakeLock API (Edge case matching OpenWebUI CallOverlay)
  var _wakeLock = null;
  function _requestWakeLock() {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function(lock) {
        _wakeLock = lock;
      }).catch(function(e) {});
    }
  }
  function _releaseWakeLock() {
    if (_wakeLock) {
      try { _wakeLock.release(); } catch(e) {}
      _wakeLock = null;
    }
  }

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

  var _currentLang = 'en-IN';

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
      native: 'मराठी',
      region: 'India',
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
      native: 'हिन्दी',
      region: 'India',
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
      name: 'English (India)',
      native: 'English',
      region: 'India',
      listening: 'Listening…',
      sub: 'Speak in English · Say "Stop" to interrupt',
      thinking: 'Thinking…',
      thinkingSub: 'Querying live ERP data…',
      speaking: 'AI Speaking…',
      speakingSub: 'Say "Stop" or tap to interrupt',
      placeholder: 'Say something like "Show today\'s sales report" or "Check inventory"…',
      miniStatus: 'Listening…'
    },
    'gu-IN': {
      label: 'ગુજરાતી',
      name: 'Gujarati',
      native: 'ગુજરાતી',
      region: 'India',
      listening: 'સાંભળી રહ્યો છું… (Listening)',
      sub: 'ગુજરાતીમાં બોલો · રોકવા માટે "થોભો" બોલો',
      thinking: 'વિચારી રહ્યો છું… (Thinking)',
      thinkingSub: 'ERP ડેટા તપાસી રહ્યો છું…',
      speaking: 'જવાબ આપી રહ્યો છું… (AI Speaking)',
      speakingSub: 'રોકવા માટે "થોભો" બોલો અથવા ટૅપ કરો',
      placeholder: 'ઉદા. "આજનો વેચાણ અહેવાલ બતાવો" બોલો…',
      miniStatus: 'સાંભળી રહ્યો છું…'
    },
    'ta-IN': {
      label: 'தமிழ்',
      name: 'Tamil',
      native: 'தமிழ்',
      region: 'India',
      listening: 'கேட்கிறேன்… (Listening)',
      sub: 'தமிழில் பேசுங்கள் · நிறுத்த "நிறுத்து" சொல்லுங்கள்',
      thinking: 'சிந்திக்கிறது… (Thinking)',
      thinkingSub: 'ERP தரவை பகுப்பாய்வு செய்கிறது…',
      speaking: 'பதில் கூறுகிறது… (AI Speaking)',
      speakingSub: 'நிறுத்த "நிறுத்து" சொல்லுங்கள்',
      placeholder: 'எ.கா. "இன்றைய விற்பனை அறிக்கையைக் காட்டு"…',
      miniStatus: 'கேட்கிறேன்…'
    },
    'te-IN': {
      label: 'తెలుగు',
      name: 'Telugu',
      native: 'తెలుగు',
      region: 'India',
      listening: 'వింటున్నాను… (Listening)',
      sub: 'తెలుగులో మాట్లాడండి · ఆపడానికి "ఆపు" అనండి',
      thinking: 'ఆలోచిస్తున్నాను… (Thinking)',
      thinkingSub: 'ERP డేటాను విశ్లేషిస్తోంది…',
      speaking: 'సమాధానం ఇస్తోంది… (AI Speaking)',
      speakingSub: 'ఆపడానికి "ఆపు" అనండి',
      placeholder: 'ఉదా. "ఈరోజు అమ్మకాల నివేదిక చూపించు"…',
      miniStatus: 'వింటున్నాను…'
    },
    'kn-IN': {
      label: 'ಕನ್ನಡ',
      name: 'Kannada',
      native: 'ಕನ್ನಡ',
      region: 'India',
      listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ… (Listening)',
      sub: 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ · ನಿಲ್ಲಿಸಲು "ನಿಲ್ಲಿಸಿ" ಎನ್ನಿ',
      thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ… (Thinking)',
      thinkingSub: 'ERP ಡೇಟಾವನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ…',
      speaking: 'ಉತ್ತರಿಸುತ್ತಿದ್ದೇನೆ… (AI Speaking)',
      speakingSub: 'ನಿಲ್ಲಿಸಲು "ನಿಲ್ಲಿಸಿ" ಎನ್ನಿ',
      placeholder: 'ಉದಾ. "ಇಂದಿನ ಮಾರಾಟ ವರದಿ ತೋರಿಸಿ"…',
      miniStatus: 'ಕೇಳುತ್ತಿದ್ದೇನೆ…'
    },
    'bn-IN': {
      label: 'বাংলা',
      name: 'Bengali',
      native: 'বাংলা',
      region: 'India',
      listening: 'শুনছি… (Listening)',
      sub: 'বাংলায় বলুন · থামাতে "থামো" বলুন',
      thinking: 'ভাবছি… (Thinking)',
      thinkingSub: 'ইআরপি ডেটা বিশ্লেষণ করছি…',
      speaking: 'উত্তর দিচ্ছি… (AI Speaking)',
      speakingSub: 'থামাতে "থামো" বলুন',
      placeholder: 'যেমন "আজকের বিক্রির রিপোর্ট দেখাও"…',
      miniStatus: 'শুনছি…'
    },
    'pa-IN': {
      label: 'ਪੰਜਾਬੀ',
      name: 'Punjabi',
      native: 'ਪੰਜਾਬੀ',
      region: 'India',
      listening: 'ਸੁਣ ਰਿਹਾ ਹਾਂ… (Listening)',
      sub: 'ਪੰਜਾਬੀ ਵਿੱਚ ਬੋਲੋ · ਰੋਕਣ ਲਈ "ਰੁਕੋ" ਬੋਲੋ',
      thinking: 'ਸੋਚ ਰਿਹਾ ਹਾਂ… (Thinking)',
      thinkingSub: 'ERP ਡਾਟਾ ਲੱਭ ਰਿਹਾ ਹਾਂ…',
      speaking: 'ਜਵਾਬ ਦੇ ਰਿਹਾ ਹਾਂ… (AI Speaking)',
      speakingSub: 'ਰੋਕਣ ਲਈ "ਰੁਕੋ" ਬੋਲੋ',
      placeholder: 'ਜਿਵੇਂ "ਅੱਜ ਦੀ ਵਿਕਰੀ ਰਿਪੋਰਟ ਦਿਖਾਓ"…',
      miniStatus: 'ਸੁਣ ਰਿਹਾ ਹਾਂ…'
    },
    'ml-IN': {
      label: 'മലയാളം',
      name: 'Malayalam',
      native: 'മലയാളം',
      region: 'India',
      listening: 'കേൾക്കുന്നു… (Listening)',
      sub: 'മലയാളത്തിൽ സംസാരിക്കുക · "നിർത്തൂ" എന്ന് പറയുക',
      thinking: 'ചിന്തിക്കുന്നു… (Thinking)',
      thinkingSub: 'ERP ഡാറ്റ പരിശോധിക്കുന്നു…',
      speaking: 'മറുപടി നൽകുന്നു… (AI Speaking)',
      speakingSub: 'നിർത്താൻ "നിർത്തൂ" പറയുക',
      placeholder: 'ഉദാ: "ഇന്നത്തെ വിൽപ്പന റിപ്പോർട്ട് കാണിക്കൂ"…',
      miniStatus: 'കേൾക്കുന്നു…'
    },
    'en-US': {
      label: 'English (US)',
      name: 'English (US)',
      native: 'English (US)',
      region: 'International',
      listening: 'Listening…',
      sub: 'Speak in English · Say "Stop" to interrupt',
      thinking: 'Thinking…',
      thinkingSub: 'Analyzing ERP records…',
      speaking: 'Responding…',
      speakingSub: 'Say "Stop" or tap to interrupt',
      placeholder: 'Ask questions like "Show outstanding invoices" or "Check inventory"…',
      miniStatus: 'Listening…'
    },
    'es-ES': {
      label: 'Español',
      name: 'Spanish',
      native: 'Español',
      region: 'International',
      listening: 'Escuchando…',
      sub: 'Habla en español · Di "Para" para interrumpir',
      thinking: 'Pensando…',
      thinkingSub: 'Consultando datos de ERP…',
      speaking: 'Respondiendo…',
      speakingSub: 'Di "Para" o toca para interrumpir',
      placeholder: 'Ej: "¿Cuáles son las ventas de hoy?"…',
      miniStatus: 'Escuchando…'
    },
    'fr-FR': {
      label: 'Français',
      name: 'French',
      native: 'Français',
      region: 'International',
      listening: 'Écoute en cours…',
      sub: 'Parlez en français · Dites "Arrêter" pour couper',
      thinking: 'Réflexion…',
      thinkingSub: 'Recherche des données ERP…',
      speaking: 'Réponse en cours…',
      speakingSub: 'Dites "Arrêter" pour interrompre',
      placeholder: 'Ex: "Affichez les factures en attente"…',
      miniStatus: 'Écoute…'
    },
    'de-DE': {
      label: 'Deutsch',
      name: 'German',
      native: 'Deutsch',
      region: 'International',
      listening: 'Zuhören…',
      sub: 'Sprechen Sie auf Deutsch · Sagen Sie "Stopp"',
      thinking: 'Überlegen…',
      thinkingSub: 'ERP-Daten werden abgefragt…',
      speaking: 'Antwortet…',
      speakingSub: 'Sagen Sie "Stopp" zum Unterbrechen',
      placeholder: 'Z.B. "Zeige heutige Verkaufsberichte"…',
      miniStatus: 'Zuhören…'
    },
    'ar-SA': {
      label: 'العربية',
      name: 'Arabic',
      native: 'العربية',
      region: 'International',
      listening: 'استماع…',
      sub: 'تحدث بالعربية · قل "توقف" للمقاطعة',
      thinking: 'جاري التفكير…',
      thinkingSub: 'تحليل بيانات النظام…',
      speaking: 'جاري الرد…',
      speakingSub: 'قل "توقف" للمقاطعة',
      placeholder: 'مثال: "اعرض تقرير المبيعات اليوم"…',
      miniStatus: 'استماع…'
    },
    'ja-JP': {
      label: '日本語',
      name: 'Japanese',
      native: '日本語',
      region: 'International',
      listening: '聞いています…',
      sub: '日本語で話してください · 「止めて」で中断',
      thinking: '考え中…',
      thinkingSub: 'ERPデータを検索しています…',
      speaking: '回答中…',
      speakingSub: '「止めて」またはタップで中断',
      placeholder: '例：「本日の売上レポートを見せて」…',
      miniStatus: '聞き取り中…'
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
    var stage = (wrapper || document).querySelector('#voice-screen-stage');
    if (stage) {
      stage.onclick = function(e) {
        var pickerMenu = (wrapper || document).querySelector('#voice-picker-menu');
        var pickerOpen = pickerMenu && (pickerMenu.classList.contains('open') || pickerMenu.style.display === 'flex');

        // Priority 0: If Language Dropdown is open, ANY click on stage closes it & STOPS (never PiP)
        var langPanel = (wrapper || document).querySelector('#voice-lang-dropdown-panel');
        var langOpen = langPanel && langPanel.style.display !== 'none' && langPanel.style.display !== '';
        if (langOpen) {
          if (!e.target.closest('#voice-lang-dropdown-panel') || e.target.closest('.voice-lang-dp-close')) {
            closeLangDropdown(e);
          }
          return;
        }

        // Priority 1: If Voice Picker Dropdown is open, ANY click on stage outside the menu closes dropdown & STOPS (never PiP)
        if (pickerOpen) {
          if (!e.target.closest('#voice-picker-menu') || e.target.closest('.voice-picker-close-btn')) {
            closeVoicePickerDropdown(e);
          }
          return;
        }

        // Priority 2: Collapse to PiP only when no dropdown is open and click is on stage backdrop
        if (
          !e.target.closest('.voice-bottom-dock') &&
          !e.target.closest('.voice-picker-dock') &&
          !e.target.closest('#voice-lang-dropdown-wrap') &&
          !e.target.closest('.voice-header-actions') &&
          !e.target.closest('.voice-brand-badge') &&
          !e.target.closest('.voice-status-wrapper') &&
          !e.target.closest('.voice-top-header') &&
          !e.target.closest('.voice-reactor-container') &&
          !e.target.closest('.voice-ai-response-sheet') &&
          !e.target.closest('.voice-replay-pill') &&
          !e.target.closest('.voice-caption-stage')
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
  function stopAllSpeech() {
    // Cancel TTS watchdogs
    if (typeof _clearTTSWatchdogs === 'function') _clearTTSWatchdogs();
    // Cancel speakReply chunk loop
    if (typeof speakReply !== 'undefined' && typeof speakReply._cancel === 'function') {
      speakReply._cancel();
    }
    // Cancel browser speechSynthesis
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch(e) {}
    }
  }
  window.stopAllSpeech = stopAllSpeech;

  function _triggerBargeInInterruption(initialSpokenText) {
    console.log('%c[Voice Barge-In] User interrupted:', 'color: #ef4444; font-weight: bold;', initialSpokenText || '');

    stopAllSpeech();
    _isAssistantSpeaking = false;
    _ignoreUntil = Date.now() + 350;

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
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

    // Hardware microphone track sync (edge case matching OpenWebUI)
    if (_audioStream) {
      _audioStream.getAudioTracks().forEach(function(track) {
        track.enabled = !_isMuted;
      });
    }

    if (_isMuted) {
      if (muteBtn) muteBtn.classList.add('muted');
      if (iconOn) iconOn.style.display = 'none';
      if (iconOff) iconOff.style.display = 'block';
      if (statusLabel) statusLabel.textContent = 'Muted (Microphone Off)';
      _populateVoiceDropdown();

    if (_voiceRecognition) {
        try { _voiceRecognition.stop(); } catch(e) {}
      }
    } else {
      if (muteBtn) muteBtn.classList.remove('muted');
      if (iconOn) iconOn.style.display = 'block';
      if (iconOff) iconOff.style.display = 'none';
      var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
      if (statusLabel) statusLabel.textContent = _isAssistantSpeaking ? cfg.speaking : cfg.listening;
      if (_voiceRunning && _voiceOverlayOpen && !_isAssistantSpeaking) {
        _startListening();
      }
    }
  }
  window.toggleVoiceMute = toggleVoiceMute;

  function setVoiceLanguage(langCode) {
    if (!_LANG_CONFIG[langCode]) langCode = 'en-IN';
    _currentLang = langCode;
    localStorage.setItem('custom_ui_voice_lang', langCode);

    // Update the single language dropdown label
    var dpLabel = wrapper.querySelector('#voice-lang-dropdown-label');
    if (dpLabel) {
      dpLabel.textContent = (_LANG_CONFIG[langCode] && _LANG_CONFIG[langCode].label) || langCode;
    }
    closeLangDropdown();

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
        if (_voiceRunning && !_isMuted && !_isAssistantSpeaking) {
          _startListening();
        }
      } catch(e) {}
    }

    if (typeof _populateVoiceDropdown === 'function') {
      _populateVoiceDropdown();
    }
  }
  window.setVoiceLanguage = setVoiceLanguage;

  // ── Single Language Dropdown (replaces segmented chips + modal) ─────────
  function toggleLangDropdown(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    var panel = wrapper.querySelector('#voice-lang-dropdown-panel');
    if (!panel) return;
    var isOpen = panel.style.display !== 'none' && panel.style.display !== '';
    if (isOpen) {
      closeLangDropdown();
    } else {
      closeVoicePickerDropdown();
      panel.style.display = 'flex';
      var inp = wrapper.querySelector('#voice-lang-dp-input');
      if (inp) { inp.value = ''; setTimeout(function() { inp.focus(); }, 60); }
      filterLangDropdown('');
    }
  }
  window.toggleLangDropdown = toggleLangDropdown;

  function closeLangDropdown(e) {
    if (e) e.stopPropagation();
    var panel = wrapper.querySelector('#voice-lang-dropdown-panel');
    if (panel) panel.style.display = 'none';
  }
  window.closeLangDropdown = closeLangDropdown;

  function filterLangDropdown(query) {
    var list = wrapper.querySelector('#voice-lang-dp-list');
    if (!list) return;

    // Merge _LANG_CONFIG keys with extra browser voice languages
    var q = (query || '').toLowerCase().trim();
    var configCodes = Object.keys(_LANG_CONFIG);

    // Gather extra browser voice language codes not in _LANG_CONFIG
    var browserVoices = (window.speechSynthesis ? window.speechSynthesis.getVoices() : []) || [];
    var extraCodes = [];
    browserVoices.forEach(function(v) {
      var lc = (v.lang || '').trim();
      if (lc && !_LANG_CONFIG[lc] && !extraCodes.includes(lc)) {
        extraCodes.push(lc);
      }
    });

    // Build unified list: config languages first, then browser extras
    var allEntries = configCodes.map(function(code) {
      var item = _LANG_CONFIG[code];
      return { code: code, label: item.label, native: item.native || item.label, name: item.name, region: item.region || '' };
    });
    extraCodes.forEach(function(code) {
      // Try to get a nice name from the browser voice
      var voice = browserVoices.find(function(v) { return v.lang === code; });
      var displayName = voice ? (voice.name || code) : code;
      allEntries.push({ code: code, label: code, native: displayName, name: displayName, region: 'Browser' });
    });

    var filtered = allEntries.filter(function(item) {
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.label || '').toLowerCase().includes(q) ||
        (item.native || '').toLowerCase().includes(q) ||
        (item.region || '').toLowerCase().includes(q)
      );
    });

    if (!filtered.length) {
      list.innerHTML = '<div class="voice-lang-dp-empty">No languages found for "' + _escapeHtml(query) + '"</div>';
      return;
    }

    var html = '';
    filtered.forEach(function(item) {
      var isActive = _currentLang === item.code ? ' active' : '';
      html += '<div class="voice-lang-dp-item' + isActive + '" onclick="selectLangFromDropdown(\'' + _escapeHtml(item.code) + '\')">';
      html += '  <span class="voice-lang-dp-native">' + _escapeHtml(item.native) + '</span>';
      html += '  <span class="voice-lang-dp-sub">' + _escapeHtml(item.name || item.code) + (item.region ? ' · ' + item.region : '') + '</span>';
      html += '</div>';
    });
    list.innerHTML = html;
  }
  window.filterLangDropdown = filterLangDropdown;

  function selectLangFromDropdown(langCode) {
    setVoiceLanguage(langCode);
    closeLangDropdown();
  }
  window.selectLangFromDropdown = selectLangFromDropdown;

  // Backward-compat stubs (old code may still call these)
  function toggleLanguageSearchModal(e) { toggleLangDropdown(e); }
  window.toggleLanguageSearchModal = toggleLanguageSearchModal;
  function closeLanguageSearchModal(e) { closeLangDropdown(e); }
  window.closeLanguageSearchModal = closeLanguageSearchModal;
  function filterVoiceLanguages(q) { filterLangDropdown(q); }
  window.filterVoiceLanguages = filterVoiceLanguages;
  function selectVoiceLanguageFromSearch(code) { selectLangFromDropdown(code); }
  window.selectVoiceLanguageFromSearch = selectVoiceLanguageFromSearch;

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
    _requestWakeLock();

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

    // Guarantee clean English startup every time call is opened
    try {
      
      localStorage.removeItem('custom_ui_voice_lang');
    } catch(e) {}
    _currentLang = 'en-IN';
    setVoiceLanguage('en-IN');
    _populateVoiceDropdown();
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
          var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
          transcriptEl.innerHTML = '<span class="vplaceholder">' + cfg.placeholder + '</span>';
        }
        return;
      }
    }

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
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

      var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
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

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
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

    var cfg = _LANG_CONFIG[_currentLang] || _LANG_CONFIG['en-IN'];
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
    _releaseWakeLock();
    closeLangDropdown();
    closeVoicePickerDropdown();
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

  
  // ── Document-level click outside listener to ensure dropdowns always shut ──
  /* GLOBAL CLICK OUTSIDE SHUT */
  document.addEventListener('click', function(e) {
    if (!_voiceOverlayOpen) return;

    var pickerMenu = wrapper.querySelector('#voice-picker-menu');
    if (pickerMenu && pickerMenu.style.display !== 'none' && pickerMenu.style.display !== '') {
      if (!e.target.closest('#voice-picker-dock')) {
        closeVoicePickerDropdown();
      }
    }

    var langModal = wrapper.querySelector('#voice-lang-modal');
    if (langModal && langModal.style.display !== 'none' && langModal.style.display !== '') {
      if (!e.target.closest('#voice-lang-modal') && !e.target.closest('#voice-lang-search-btn')) {
        closeLanguageSearchModal();
      }
    }
  });

  document.addEventListener('keydown', function(e) {
    if (!_voiceOverlayOpen) return;

    if (e.key === 'Escape') {
      var pickerMenu = wrapper.querySelector('#voice-picker-menu');
      if (pickerMenu && pickerMenu.style.display !== 'none' && pickerMenu.style.display !== '') {
        closeVoicePickerDropdown();
        return;
      }
      var langModal = wrapper.querySelector('#voice-lang-modal');
      if (langModal && langModal.style.display !== 'none' && langModal.style.display !== '') {
        closeLanguageSearchModal();
        return;
      }
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
      _populateVoiceDropdown();
    }
  }
  if (window.speechSynthesis) {
    _updateVoices();
    window.speechSynthesis.onvoiceschanged = _updateVoices;
  }

  function _cleanVoiceName(name, lang) {
    if (!name) return lang || 'Voice';
    return name
      .replace(/Microsoft /g, '')
      .replace(/ Online \(Natural\)/g, ' ★')
      .replace(/ Desktop/g, '')
      .replace(/ English \(United States\)/g, ' (US)')
      .replace(/ English \(India\)/g, ' (IN)')
      .replace(/ - /g, ' · ');
  }

  // ═══════════════════════════════════════════════════════════
  // SEARCHABLE VOICE PICKER DOCK CONTROLLER
  // ═══════════════════════════════════════════════════════════

  function toggleVoicePickerDropdown(e) {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    var menu = (wrapper || document).querySelector('#voice-picker-menu');
    if (!menu) return;
    var isOpen = menu.classList.contains('open') || (menu.style.display === 'flex');
    if (isOpen) {
      closeVoicePickerDropdown(e);
    } else {
      menu.classList.add('open');
      menu.style.setProperty('display', 'flex', 'important');
      var input = (wrapper || document).querySelector('#voice-picker-search-input');
      if (input) {
        input.value = '';
        setTimeout(function() { input.focus(); }, 60);
      }
      filterVoicePickerMenu('');
    }
  }
  window.toggleVoicePickerDropdown = toggleVoicePickerDropdown;

  function closeVoicePickerDropdown(e) {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    var menu = (wrapper || document).querySelector('#voice-picker-menu');
    if (menu) {
      menu.classList.remove('open');
      menu.style.setProperty('display', 'none', 'important');
    }
  }
  window.closeVoicePickerDropdown = closeVoicePickerDropdown;

    function filterVoicePickerMenu(query) {
    var listEl = wrapper.querySelector('#voice-picker-list');
    if (!listEl) return;

    var q = (query || '').toLowerCase().trim();
    var voices = _browserVoices.length ? _browserVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    var savedVoice = localStorage.getItem('custom_ui_voice_' + _currentLang) || '';

    if (!voices || !voices.length) {
      listEl.innerHTML = '<div class="voice-picker-item selected" onclick="onUserVoiceSelected(\'\', \'\', \'\')"><span class="voice-picker-item-name">✨ Auto AI Voice</span></div>';
      return;
    }

    var langPrefix = (_currentLang || 'en-IN').toLowerCase().split('-')[0];
    var recommended = [];
    var other = [];

    voices.forEach(function(v) {
      var vLang = (v.lang || '').toLowerCase().replace(/_/g, '-');
      var vName = (v.name || '').toLowerCase();

      var isMatch = false;
      if (langPrefix === 'mr') {
        if (vLang.startsWith('mr') || vName.includes('marathi') || vName.includes('aarohi')) isMatch = true;
      } else if (langPrefix === 'hi') {
        if (vLang.startsWith('hi') || vName.includes('hindi') || vName.includes('madhur') || vName.includes('swara') || vName.includes('kalpana')) isMatch = true;
      } else if (langPrefix === 'gu') {
        if (vLang.startsWith('gu') || vName.includes('gujarati')) isMatch = true;
      } else if (langPrefix === 'ta') {
        if (vLang.startsWith('ta') || vName.includes('tamil')) isMatch = true;
      } else if (langPrefix === 'te') {
        if (vLang.startsWith('te') || vName.includes('telugu')) isMatch = true;
      } else {
        if (vLang.startsWith('en') || vName.includes('english')) isMatch = true;
      }

      if (q) {
        var clean = (v.name + ' ' + v.lang).toLowerCase();
        if (!clean.includes(q)) return;
      }

      if (isMatch) {
        recommended.push(v);
      } else {
        other.push(v);
      }
    });

    if (!recommended.length && !other.length && q) {
      listEl.innerHTML = '<div class="voice-picker-empty">No voices matching "' + _escapeHtml(query) + '"</div>';
      return;
    }

    var html = '';
    var isAutoSelected = !savedVoice ? ' selected' : '';
    html += '<div class="voice-picker-item' + isAutoSelected + '" onclick="onUserVoiceSelected(\'\', \'\', \'\')">';
    html += '  <span class="voice-picker-item-name">✨ Auto-Select Best AI Voice</span>';
    html += '  <span class="voice-picker-item-tag">Default</span>';
    html += '</div>';

    if (recommended.length > 0) {
      var langLabel = (_LANG_CONFIG[_currentLang] && _LANG_CONFIG[_currentLang].label) || 'Current Language';
      html += '<div class="voice-picker-header">RECOMMENDED FOR ' + _escapeHtml(langLabel.toUpperCase()) + '</div>';
      recommended.forEach(function(v) {
        var clean = _cleanVoiceName(v.name, v.lang);
        var isSelected = (savedVoice && (v.voiceURI === savedVoice || v.name === savedVoice)) ? ' selected' : '';
        html += '<div class="voice-picker-item' + isSelected + '" onclick="onUserVoiceSelected(\'' + _escapeHtml(v.voiceURI || v.name) + '\', \'' + _escapeHtml(clean) + '\', \'' + _escapeHtml(v.lang || '') + '\')">';
        html += '  <span class="voice-picker-item-name">' + _escapeHtml(clean) + '</span>';
        html += '  <span class="voice-picker-item-tag">' + _escapeHtml(v.lang || '') + '</span>';
        html += '</div>';
      });
    }

    if (other.length > 0) {
      html += '<div class="voice-picker-header">OTHER LANGUAGES &amp; VOICES</div>';
      other.forEach(function(v) {
        var clean = _cleanVoiceName(v.name, v.lang);
        var isSelected = (savedVoice && (v.voiceURI === savedVoice || v.name === savedVoice)) ? ' selected' : '';
        html += '<div class="voice-picker-item' + isSelected + '" onclick="onUserVoiceSelected(\'' + _escapeHtml(v.voiceURI || v.name) + '\', \'' + _escapeHtml(clean) + '\', \'' + _escapeHtml(v.lang || '') + '\')">';
        html += '  <span class="voice-picker-item-name">' + _escapeHtml(clean) + '</span>';
        html += '  <span class="voice-picker-item-tag">' + _escapeHtml(v.lang || '') + '</span>';
        html += '</div>';
      });
    }

    listEl.innerHTML = html;
  }
  window.filterVoicePickerMenu = filterVoicePickerMenu;

  function _populateVoiceDropdown() {
    var labelEl = wrapper.querySelector('#voice-picker-selected-name');
    if (!labelEl) return;

    var savedVoice = localStorage.getItem('custom_ui_voice_' + _currentLang) || '';
    var voices = _browserVoices.length ? _browserVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    var langBase = (_currentLang || 'en-IN').split('-')[0].toLowerCase();

    // Only display saved voice if it exists AND actually belongs to the current language
    if (savedVoice && voices.length > 0) {
      var match = voices.find(function(v) {
        return (v.voiceURI === savedVoice || v.name === savedVoice) &&
               v.lang && v.lang.toLowerCase().replace(/_/g, '-').startsWith(langBase);
      });
      if (match) {
        labelEl.textContent = _cleanVoiceName(match.name, match.lang);
        return;
      }
    }

    labelEl.textContent = '✨ Auto AI Voice';
  }

    function _detectLangFromVoice(rawLang, voiceName) {
    var l = (rawLang || '').toLowerCase().replace(/_/g, '-');
    var n = (voiceName || '').toLowerCase();

    // Check exact matches in _LANG_CONFIG first
    if (rawLang && _LANG_CONFIG[rawLang]) return rawLang;

    // Marathi
    if (l.startsWith('mr') || n.includes('marathi') || n.includes('aarohi')) return 'mr-IN';

    // Hindi
    if (l.startsWith('hi') || n.includes('hindi') || n.includes('madhur') || n.includes('swara') || n.includes('kalpana')) return 'hi-IN';

    // English
    if (l.startsWith('en') || n.includes('english')) return 'en-IN';

    // Gujarati
    if (l.startsWith('gu') || n.includes('gujarati')) return 'gu-IN';

    // Tamil
    if (l.startsWith('ta') || n.includes('tamil')) return 'ta-IN';

    // Telugu
    if (l.startsWith('te') || n.includes('telugu')) return 'te-IN';

    // Kannada
    if (l.startsWith('kn') || n.includes('kannada')) return 'kn-IN';

    // Bengali
    if (l.startsWith('bn') || n.includes('bengali') || n.includes('bangla')) return 'bn-IN';

    // Malayalam
    if (l.startsWith('ml') || n.includes('malayalam')) return 'ml-IN';

    // Punjabi
    if (l.startsWith('pa') || n.includes('punjabi')) return 'pa-IN';

    // Generic prefix match against _LANG_CONFIG
    var prefix = l.split('-')[0];
    for (var code in _LANG_CONFIG) {
      if (code.toLowerCase().startsWith(prefix)) return code;
    }

    return null;
  }

  function onUserVoiceSelected(voiceURI, cleanName, voiceLang) {
    var voices = _browserVoices.length ? _browserVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    var chosenVoice = voices.find(function(v) { return (v.voiceURI === voiceURI || v.name === voiceURI); });

    var targetLang = null;
    if (chosenVoice) {
      targetLang = _detectLangFromVoice(chosenVoice.lang || voiceLang, chosenVoice.name);
    } else if (voiceLang) {
      targetLang = _detectLangFromVoice(voiceLang, cleanName);
    }

    // When user changes voice, update UI & STT language automatically!
    if (targetLang && targetLang !== _currentLang) {
      setVoiceLanguage(targetLang);
    }

    if (voiceURI) {
      localStorage.setItem('custom_ui_voice_' + _currentLang, voiceURI);
    } else {
      localStorage.removeItem('custom_ui_voice_' + _currentLang);
    }

    var labelEl = wrapper.querySelector('#voice-picker-selected-name');
    if (labelEl) {
      labelEl.textContent = cleanName || '✨ Auto AI Voice';
    }

    closeVoicePickerDropdown();
    _playVoicePreview(chosenVoice);
  }
  window.onUserVoiceSelected = onUserVoiceSelected;

  function _playVoicePreview(chosenVoice) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var sample = _currentLang === 'mr-IN' ? 'नमस्कार! मी आपली काय मदत करू शकतो?' :
                   (_currentLang === 'hi-IN' ? 'नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?' :
                   'Hello! How can I assist you today?');
      var utt = new SpeechSynthesisUtterance(sample);
      utt.lang = _currentLang;
      var bestVoice = chosenVoice || _findBestVoice(_currentLang);
      if (bestVoice) utt.voice = bestVoice;
      window.speechSynthesis.speak(utt);
    } catch(e) {}
  }

  // ── TTS Watchdog helpers ──────────────────────────────────────────────────
  var _ttsWatchdogTimer = null;
  var _ttsChunkTimer = null;

  function _clearTTSWatchdogs() {
    if (_ttsWatchdogTimer) { clearTimeout(_ttsWatchdogTimer); _ttsWatchdogTimer = null; }
    if (_ttsChunkTimer) { clearTimeout(_ttsChunkTimer); _ttsChunkTimer = null; }
  }

  // ── _findBestVoice: pick the best browser voice for a language ────────────
  function _findBestVoice(lang) {
    var voices = _browserVoices.length ? _browserVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    if (!voices || !voices.length) return null;

    // User-selected voice (per-lang or global)
    var userPref = localStorage.getItem('custom_ui_voice_' + lang) || '';
    if (userPref) {
      var pref = voices.find(function(v) { return v.voiceURI === userPref || v.name === userPref; });
      if (pref) return pref;
    }

    var langBase = (lang || '').split('-')[0].toLowerCase();

    // Priority 1: Exact lang match + online/natural (best quality)
    var online = voices.find(function(v) {
      return v.lang && v.lang.toLowerCase().startsWith(langBase) &&
             (v.name.toLowerCase().includes('online') || v.name.toLowerCase().includes('natural'));
    });
    if (online) return online;

    // Priority 2: Exact lang match
    var exact = voices.find(function(v) {
      return v.lang && v.lang.toLowerCase() === (lang || '').toLowerCase();
    });
    if (exact) return exact;

    // Priority 3: Same base language (e.g. 'mr' for 'mr-IN')
    var base = voices.find(function(v) {
      return v.lang && v.lang.toLowerCase().startsWith(langBase);
    });
    if (base) return base;

    // Priority 4: Fallback to any English voice
    var enVoice = voices.find(function(v) { return v.lang && v.lang.toLowerCase().startsWith('en'); });
    if (enVoice) return enVoice;

    return null;
  }

  // ── speakReply: speak AI response via Web Speech Synthesis TTS ───────────
  // Signature: speakReply(text, lang, onDone)
  function speakReply(text, lang, onDone) {
    if (!window.speechSynthesis) {
      console.warn('[TTS] speechSynthesis not supported.');
      if (typeof onDone === 'function') onDone();
      return;
    }

    // Strip markdown/HTML for clean speech output
    var clean = (text || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#*_`~>\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!clean) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    _clearTTSWatchdogs();

    try { window.speechSynthesis.cancel(); } catch(e) {}

    // Chrome has a ~200-char TTS bug where long utterances pause silently.
    // Split into natural sentence chunks.
    var MAX_CHUNK = 175;
    var rawSentences = clean.match(/[^\u0964\u0965.?!]+[\u0964\u0965.?!]*/g) || [clean];
    var chunks = [];

    rawSentences.forEach(function(s) {
      s = s.trim();
      if (!s) return;
      if (s.length <= MAX_CHUNK) {
        chunks.push(s);
      } else {
        var parts = s.split(/[,;\u060C\u061B\u3001\uFF0C]+/);
        var cur = '';
        parts.forEach(function(p) {
          p = p.trim();
          if (!p) return;
          if ((cur + ' ' + p).trim().length <= MAX_CHUNK) {
            cur = (cur + ' ' + p).trim();
          } else {
            if (cur) chunks.push(cur);
            cur = p.slice(0, MAX_CHUNK);
          }
        });
        if (cur) chunks.push(cur);
      }
    });

    if (!chunks.length) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    var chunkIdx = 0;
    var bestVoice = _findBestVoice(lang || _currentLang);
    var cancelled = false;

    // Expose cancel handle so interruptVoiceSpeech() can stop it
    speakReply._cancel = function() {
      cancelled = true;
      _clearTTSWatchdogs();
      try { window.speechSynthesis.cancel(); } catch(e) {}
    };

    function speakNext() {
      if (cancelled) return;
      // Stop if voice call was ended
      if (!_voiceRunning && !_isAssistantSpeaking) {
        if (typeof onDone === 'function') onDone();
        return;
      }
      if (chunkIdx >= chunks.length) {
        _clearTTSWatchdogs();
        if (typeof onDone === 'function') onDone();
        return;
      }

      var chunk = chunks[chunkIdx++];
      var utt = new SpeechSynthesisUtterance(chunk);
      utt.lang = lang || _currentLang || 'en-IN';
      utt.rate = 1.0;
      utt.pitch = 1.05;
      utt.volume = 1.0;
      if (bestVoice) utt.voice = bestVoice;

      utt.onend = function() {
        _clearTTSWatchdogs();
        if (!cancelled) {
          // Small natural pause between chunks
          _ttsChunkTimer = setTimeout(speakNext, 60);
        }
      };

      utt.onerror = function(e) {
        _clearTTSWatchdogs();
        // 'interrupted'/'canceled' = intentional stop, don't continue
        if (e.error === 'interrupted' || e.error === 'canceled') {
          cancelled = true;
          return;
        }
        console.warn('[TTS] utterance error:', e.error, '- skipping chunk');
        if (!cancelled) {
          _ttsChunkTimer = setTimeout(speakNext, 100);
        }
      };

      try {
        window.speechSynthesis.speak(utt);
      } catch(err) {
        console.warn('[TTS] speak() threw:', err);
        if (typeof onDone === 'function') onDone();
        return;
      }

      // Chrome TTS watchdog: onend sometimes never fires
      var watchdogMs = Math.max(8000, chunk.length * 110);
      _ttsWatchdogTimer = setTimeout(function() {
        if (!cancelled) {
          console.warn('[TTS] watchdog triggered for chunk, moving to next');
          try { window.speechSynthesis.cancel(); } catch(e) {}
          speakNext();
        }
      }, watchdogMs);
    }

    // Chrome requires a brief delay after cancel() before the next speak()
    setTimeout(speakNext, 80);
  }
  window.speakReply = speakReply;


  // ── Outside-click handler: only fires for clicks outside the voice overlay ──
  // (Clicks inside the overlay are handled by stage.onclick above)
  document.addEventListener('click', function _voiceOutsideClickHandler(e) {
    var overlay = wrapper.querySelector('#voice-overlay');
    // If click is inside the overlay, stage.onclick handles it
    if (overlay && overlay.contains(e.target)) return;

    // Click is outside overlay — close both dropdowns
    var langPanel = wrapper.querySelector('#voice-lang-dropdown-panel');
    if (langPanel && langPanel.style.display !== 'none') {
      closeLangDropdown();
    }
    var pickerMenu = wrapper.querySelector('#voice-picker-menu');
    if (pickerMenu && pickerMenu.style.display !== 'none') {
      closeVoicePickerDropdown();
    }
  }, false);

  // Focus input
  setTimeout(function () { inputEl.focus(); }, 300);
};
