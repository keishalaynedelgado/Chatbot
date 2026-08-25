/**
 * UI Renderer for Chat Messages, Bubbles, and Components
 */

const UIRenderer = {
  chatContainer: null,
  messageListEl: null,

  init() {
    this.chatContainer = document.getElementById('chat-scroll-area');
    this.messageListEl = document.getElementById('message-list');
  },

  /**
   * Render the entire message list for the active conversation
   */
  renderMessages(conversation) {
    if (!this.messageListEl) this.init();
    if (!this.messageListEl) return;

    if (!conversation || conversation.messages.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.messageListEl.innerHTML = '';

    conversation.messages.forEach(msg => {
      if (msg.role === 'user') {
        this.messageListEl.appendChild(this.createUserBubble(msg));
      } else if (msg.role === 'assistant') {
        if (msg.status === 'error') {
          this.messageListEl.appendChild(this.createErrorBubble(msg));
        } else if (msg.status === 'streaming') {
          this.messageListEl.appendChild(this.createStreamingBubble(msg));
        } else {
          this.messageListEl.appendChild(this.createAIBubble(msg));
        }
      }
    });

    this.scrollToBottom();
  },

  /**
   * Render Empty/Starter State
   */
  renderEmptyState() {
    if (!this.messageListEl) return;

    const cardsHtml = CONFIG.STARTER_PROMPTS.map(item => `
      <button class="starter-prompt-card text-left p-4 rounded-xl border border-outline-variant hover:border-primary bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-200 shadow-sm flex flex-col gap-2 group cursor-pointer" data-prompt="${Helpers.escapeHtml(item.prompt)}">
        <div class="flex items-center justify-between w-full">
          <div class="w-8 h-8 rounded-lg bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
            <span class="material-symbols-outlined text-sm">${item.icon}</span>
          </div>
          <span class="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-sm">arrow_forward</span>
        </div>
        <div>
          <div class="font-label-md text-label-md font-semibold text-on-surface">${Helpers.escapeHtml(item.title)}</div>
          <div class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${Helpers.escapeHtml(item.desc)}</div>
        </div>
      </button>
    `).join('');

    this.messageListEl.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-center max-w-2xl mx-auto message-enter">
        <div class="w-16 h-16 rounded-2xl bg-surface-container-high dark:bg-surface-variant flex items-center justify-center mb-4 text-primary shadow-sm">
          <span class="material-symbols-outlined text-3xl">smart_toy</span>
        </div>
        <h2 class="font-headline-md text-headline-md font-bold text-on-surface">Welcome to Synthie AI</h2>
        <p class="font-body-md text-body-md text-on-surface-variant max-w-md mt-2 mb-8">
          Your modern enterprise AI assistant for financial intelligence, meeting synthesis, and automated workflows.
        </p>

        <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          ${cardsHtml}
        </div>
      </div>
    `;

    // Attach click handlers to prompt cards
    this.messageListEl.querySelectorAll('.starter-prompt-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt && window.app) {
          window.app.sendMessage(prompt);
        }
      });
    });
  },

  /**
   * Create User Message Element
   */
  createUserBubble(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-end w-full message-enter';
    wrapper.id = `msg-${msg.id}`;

    let attachmentHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
      attachmentHtml = `<div class="flex flex-wrap gap-2 mb-2">` +
        msg.attachments.map(att => `
          <div class="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-md">
            <span class="material-symbols-outlined text-[14px]">attachment</span>
            <span>${Helpers.escapeHtml(att.name)}</span>
          </div>
        `).join('') + `</div>`;
    }

    wrapper.innerHTML = `
      <div class="bg-primary text-on-primary rounded-2xl rounded-tr-sm p-bubble-padding max-w-[80%] font-body-md text-body-md shadow-sm select-text">
        ${attachmentHtml}
        <div class="whitespace-pre-wrap">${Helpers.escapeHtml(msg.content)}</div>
        <div class="text-[11px] text-right text-on-primary-container mt-1 opacity-70">
          ${Helpers.formatTime(new Date(msg.timestamp))}
        </div>
      </div>
    `;

    return wrapper;
  },

  /**
   * Create AI Message Element (Completed state)
   */
  createAIBubble(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start w-full group message-enter';
    wrapper.id = `msg-${msg.id}`;

    const formattedHtml = MarkdownRenderer.render(msg.content);
    const rawEncoded = encodeURIComponent(msg.content);

    wrapper.innerHTML = `
      <div class="flex gap-3 max-w-[80%] w-full">
        <div class="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-sm">smart_toy</span>
        </div>
        <div class="bg-surface-container-low text-on-surface rounded-2xl rounded-tl-sm p-bubble-padding font-body-md text-body-md border border-outline-variant w-full shadow-sm">
          <div class="markdown-body font-body-md text-on-surface select-text">
            ${formattedHtml}
          </div>
          
          <!-- Actions bar -->
          <div class="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-outline-variant/30 text-on-surface-variant text-xs">
            <div class="flex items-center gap-1">
              <button class="p-1 hover:text-primary hover:bg-surface-container-high rounded transition-colors" title="Copy response" onclick="Helpers.copyToClipboard(decodeURIComponent('${rawEncoded}')).then(ok => { if(ok) Helpers.showToast('Response copied to clipboard'); })">
                <span class="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
              <button class="p-1 hover:text-primary hover:bg-surface-container-high rounded transition-colors feedback-btn" data-type="up" title="Good response" onclick="UIRenderer.handleFeedback(this, 'up')">
                <span class="material-symbols-outlined text-[16px]">thumb_up</span>
              </button>
              <button class="p-1 hover:text-error hover:bg-surface-container-high rounded transition-colors feedback-btn" data-type="down" title="Bad response" onclick="UIRenderer.handleFeedback(this, 'down')">
                <span class="material-symbols-outlined text-[16px]">thumb_down</span>
              </button>
            </div>
            <span class="text-[11px] text-on-surface-variant/70">${Helpers.formatTime(new Date(msg.timestamp))}</span>
          </div>
        </div>
      </div>
    `;

    return wrapper;
  },

  /**
   * Create AI Streaming Element
   */
  createStreamingBubble(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start w-full group message-enter';
    wrapper.id = `msg-${msg.id}`;

    wrapper.innerHTML = `
      <div class="flex gap-3 max-w-[80%] w-full">
        <div class="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-sm">smart_toy</span>
        </div>
        <div class="bg-surface-container-low text-on-surface rounded-2xl rounded-tl-sm p-bubble-padding font-body-md text-body-md border border-outline-variant w-full shadow-sm">
          <div class="font-mono-streaming text-mono-streaming text-on-surface-variant streaming-content whitespace-pre-wrap select-text">${Helpers.escapeHtml(msg.content)}<span class="typing-cursor"></span></div>
        </div>
      </div>
    `;

    return wrapper;
  },

  /**
   * Update the active streaming bubble in real-time
   */
  updateStreamingBubble(messageId, text) {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      const streamContainer = el.querySelector('.streaming-content');
      if (streamContainer) {
        streamContainer.innerHTML = Helpers.escapeHtml(text) + '<span class="typing-cursor"></span>';
        this.scrollToBottom();
      }
    }
  },

  /**
   * Create Error Message Element
   */
  createErrorBubble(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start w-full group message-enter';
    wrapper.id = `msg-${msg.id}`;

    wrapper.innerHTML = `
      <div class="flex gap-3 max-w-[80%]">
        <div class="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-primary text-sm">smart_toy</span>
        </div>
        <div class="flex flex-col gap-1">
          <div class="bg-error-container text-on-error-container rounded-2xl rounded-tl-sm p-bubble-padding font-body-md text-body-md border border-error/20 flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined">error</span>
              <span class="font-semibold">Failed to generate response.</span>
            </div>
            <div class="text-xs opacity-90">${Helpers.escapeHtml(msg.error || 'Network error occurred')}</div>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="font-body-sm text-body-sm text-error">AI service unavailable - please try again</span>
            <button class="retry-action-btn text-primary hover:bg-surface-container-low px-2 py-1 rounded font-label-md text-label-md transition-colors flex items-center gap-1 font-semibold" data-msg-id="${msg.id}">
              <span class="material-symbols-outlined text-[16px]">refresh</span> Retry
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach retry button handler
    const retryBtn = wrapper.querySelector('.retry-action-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        if (window.app) {
          window.app.retryLastMessage();
        }
      });
    }

    return wrapper;
  },

  /**
   * Handle Thumbs Up / Down feedback
   */
  handleFeedback(btn, type) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('text-primary', 'text-error', 'opacity-100'));
    if (type === 'up') {
      btn.classList.add('text-primary', 'opacity-100');
      Helpers.showToast('Thank you for your feedback!');
    } else {
      btn.classList.add('text-error', 'opacity-100');
      Helpers.showToast('Feedback noted. We will improve!');
    }
  },

  /**
   * Smoothly scroll chat view to bottom
   */
  scrollToBottom(force = false) {
    if (!this.chatContainer) this.chatContainer = document.getElementById('chat-scroll-area');
    if (!this.chatContainer) return;

    // Only scroll if user is already near bottom or force is true
    const isNearBottom = this.chatContainer.scrollHeight - this.chatContainer.scrollTop - this.chatContainer.clientHeight < 150;
    if (isNearBottom || force) {
      this.chatContainer.scrollTo({
        top: this.chatContainer.scrollHeight,
        behavior: force ? 'auto' : 'smooth'
      });
    }
  }
};

window.UIRenderer = UIRenderer;
