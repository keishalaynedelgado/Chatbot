/**
 * Event Handlers for User Interactions
 */

const EventHandlers = {
  selectedFiles: [],

  init() {
    this.setupTextarea();
    this.setupSendButton();
    this.setupAttachmentInput();
    this.setupMobileMenu();
    this.setupNetworkStatus();
  },

  /**
   * Auto-resize textarea & handle Enter / Shift+Enter
   */
  setupTextarea() {
    const textarea = document.getElementById('chat-input');
    if (!textarea) return;

    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 160) + 'px';
      
      // Update send button state
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn && !aiService.isGenerating) {
        sendBtn.disabled = !this.value.trim() && EventHandlers.selectedFiles.length === 0;
      }
    });

    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = this.value.trim();
        if (text || EventHandlers.selectedFiles.length > 0) {
          window.app.sendMessage(text);
        }
      }
    });
  },

  /**
   * Send and Stop button handling
   */
  setupSendButton() {
    const sendBtn = document.getElementById('send-btn');
    if (!sendBtn) return;

    sendBtn.addEventListener('click', () => {
      if (aiService.isGenerating) {
        window.app.abort();
      } else {
        const textarea = document.getElementById('chat-input');
        const text = textarea?.value.trim() || '';
        if (text || this.selectedFiles.length > 0) {
          window.app.sendMessage(text);
        }
      }
    });
  },

  /**
   * File attachment handling
   */
  setupAttachmentInput() {
    const fileInput = document.getElementById('file-upload-input');
    const attachBtn = document.getElementById('attach-file-btn');
    const previewContainer = document.getElementById('attachment-previews');

    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(f => {
          this.selectedFiles.push({
            name: f.name,
            size: f.size,
            type: f.type
          });
        });

        fileInput.value = '';
        this.renderAttachmentPreviews();
      });
    }
  },

  renderAttachmentPreviews() {
    const container = document.getElementById('attachment-previews');
    if (!container) return;

    if (this.selectedFiles.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = this.selectedFiles.map((file, idx) => `
      <div class="inline-flex items-center gap-1.5 bg-surface-container-high dark:bg-surface-variant text-on-surface px-2.5 py-1 rounded-lg text-xs border border-outline-variant">
        <span class="material-symbols-outlined text-sm text-primary">description</span>
        <span class="max-w-[150px] truncate">${Helpers.escapeHtml(file.name)}</span>
        <button type="button" onclick="EventHandlers.removeAttachment(${idx})" class="text-on-surface-variant hover:text-error ml-1">
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    `).join('');
  },

  removeAttachment(idx) {
    this.selectedFiles.splice(idx, 1);
    this.renderAttachmentPreviews();
  },

  clearAttachments() {
    this.selectedFiles = [];
    this.renderAttachmentPreviews();
  },

  /**
   * Mobile Sidebar Toggle
   */
  setupMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar-nav');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
          sidebar.classList.remove('-translate-x-full');
          if (backdrop) backdrop.classList.remove('hidden');
        } else {
          sidebar.classList.add('-translate-x-full');
          if (backdrop) backdrop.classList.add('hidden');
        }
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      });
    }
  },

  /**
   * Network Status monitoring
   */
  setupNetworkStatus() {
    const banner = document.getElementById('system-banner');
    if (!banner) return;

    const updateStatus = () => {
      if (!navigator.onLine) {
        banner.classList.remove('hidden');
        banner.querySelector('.banner-text').textContent = 'Network connection offline. Local fallback mode enabled.';
      } else {
        banner.classList.add('hidden');
      }
    };

    window.addEventListener('offline', updateStatus);
    window.addEventListener('online', updateStatus);
  }
};

window.EventHandlers = EventHandlers;
