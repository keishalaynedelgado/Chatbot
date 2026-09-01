/**
 * Modals and Dialog Controllers (Settings, History, FAQs, Human Agent)
 */

const Modals = {
  activeModal: null,

  init() {
    this.bindGlobalClose();
  },

  bindGlobalClose() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close();
      }
    });
  },

  /**
   * Close any open modal
   */
  close() {
    const container = document.getElementById('modal-container');
    if (container) {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
    this.activeModal = null;
  },

  /**
   * Open Settings Modal
   */
  openSettings() {
    const settings = StorageService.getSettings();
    const container = document.getElementById('modal-container');
    if (!container) return;

    const modelOptions = CONFIG.MODELS.map(m => `
      <option value="${m.id}" ${settings.model === m.id ? 'selected' : ''}>
        ${m.name} (${m.provider})
      </option>
    `).join('');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) Modals.close()">
        <div class="modal-content bg-surface-container-lowest text-on-surface w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">settings</span>
              <h3 class="font-headline-md text-lg font-bold text-on-surface">Settings & AI Configuration</h3>
            </div>
            <button onclick="Modals.close()" class="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto flex flex-col gap-4">
            <!-- Model Selection -->
            <div>
              <label class="block font-label-md text-label-md font-semibold text-on-surface mb-1">AI Model</label>
              <select id="settings-model" class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
                ${modelOptions}
              </select>
              <p class="text-xs text-on-surface-variant mt-1">Select the AI intelligence engine.</p>
            </div>

            <!-- SCX AI (MiniMax) API Key -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="font-label-md text-label-md font-semibold text-on-surface">SCX AI API Key</label>
                <span class="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">MiniMax Active</span>
              </div>
              <div class="relative">
                <input type="password" id="settings-scx-key" value="${Helpers.escapeHtml(settings.scxKey || '')}" placeholder="sk-scx-..." class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary font-mono text-xs" />
                <button type="button" onclick="Modals.togglePassword('settings-scx-key', this)" class="absolute right-2 top-2.5 text-outline hover:text-primary">
                  <span class="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </div>
              <p class="text-xs text-on-surface-variant mt-1">Powers MiniMax-M2.7 intelligence model via SCX AI.</p>
            </div>

            <!-- NVIDIA NIM API Key -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="font-label-md text-label-md font-semibold text-on-surface">NVIDIA NIM API Key</label>
                <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">Active Key</span>
              </div>
              <div class="relative">
                <input type="password" id="settings-nvidia-key" value="${Helpers.escapeHtml(settings.nvidiaKey || '')}" placeholder="nvapi-..." class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary font-mono text-xs" />
                <button type="button" onclick="Modals.togglePassword('settings-nvidia-key', this)" class="absolute right-2 top-2.5 text-outline hover:text-primary">
                  <span class="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </div>
              <p class="text-xs text-on-surface-variant mt-1">Powers Llama 3.3 70B, DeepSeek Coder, Mixtral, and Nemotron.</p>
            </div>

            <!-- Gemini API Key -->
            <div>
              <label class="block font-label-md text-label-md font-semibold text-on-surface mb-1">Google Gemini API Key (Optional)</label>
              <div class="relative">
                <input type="password" id="settings-gemini-key" value="${Helpers.escapeHtml(settings.geminiKey || '')}" placeholder="AIzaSy..." class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary" />
                <button type="button" onclick="Modals.togglePassword('settings-gemini-key', this)" class="absolute right-2 top-2.5 text-outline hover:text-primary">
                  <span class="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </div>
            </div>

            <!-- OpenAI API Key -->
            <div>
              <label class="block font-label-md text-label-md font-semibold text-on-surface mb-1">OpenAI API Key (Optional)</label>
              <div class="relative">
                <input type="password" id="settings-openai-key" value="${Helpers.escapeHtml(settings.openaiKey || '')}" placeholder="sk-..." class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 pr-10 text-body-md text-on-surface focus:outline-none focus:border-primary" />
                <button type="button" onclick="Modals.togglePassword('settings-openai-key', this)" class="absolute right-2 top-2.5 text-outline hover:text-primary">
                  <span class="material-symbols-outlined text-[18px]">visibility</span>
                </button>
              </div>
            </div>

            <!-- Temperature -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="font-label-md text-label-md font-semibold text-on-surface">Temperature (Creativity)</label>
                <span id="temp-val" class="font-mono-streaming text-xs font-semibold text-primary">${settings.temperature || 0.7}</span>
              </div>
              <input type="range" id="settings-temp" min="0" max="1" step="0.1" value="${settings.temperature || 0.7}" class="w-full accent-primary" oninput="document.getElementById('temp-val').innerText = this.value" />
            </div>

            <!-- System Prompt -->
            <div>
              <label class="block font-label-md text-label-md font-semibold text-on-surface mb-1">System Instructions</label>
              <textarea id="settings-system-prompt" rows="3" class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none">${Helpers.escapeHtml(settings.systemPrompt || CONFIG.DEFAULT_SYSTEM_PROMPT)}</textarea>
            </div>

            <!-- Dark Mode Toggle -->
            <div class="flex items-center justify-between pt-2 border-t border-outline-variant">
              <div>
                <div class="font-label-md text-label-md font-semibold text-on-surface">Dark Theme</div>
                <div class="text-xs text-on-surface-variant">Switch between light and dark UI themes</div>
              </div>
              <button id="theme-toggle-btn" type="button" onclick="Modals.toggleDarkMode()" class="p-2 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-sm" id="theme-icon">${document.documentElement.classList.contains('dark') ? 'light_mode' : 'dark_mode'}</span>
                <span class="text-xs font-medium" id="theme-text">${document.documentElement.classList.contains('dark') ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low">
            <button onclick="Modals.resetSettings()" class="text-error hover:bg-error-container/40 px-3 py-1.5 rounded-lg text-body-sm font-label-md transition-colors">
              Reset Defaults
            </button>
            <div class="flex gap-2">
              <button onclick="Modals.close()" class="px-4 py-2 border border-outline-variant hover:bg-surface-container-high rounded-lg text-body-sm font-label-md transition-colors">
                Cancel
              </button>
              <button onclick="Modals.saveSettings()" class="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-label-md hover:bg-primary/90 transition-colors shadow-sm">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    this.activeModal = 'settings';
  },

  /**
   * Toggle password input visibility
   */
  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    const icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.innerText = isPassword ? 'visibility_off' : 'visibility';
  },

  /**
   * Save Settings
   */
  saveSettings() {
    const model = document.getElementById('settings-model')?.value;
    const scxKey = document.getElementById('settings-scx-key')?.value.trim();
    const nvidiaKey = document.getElementById('settings-nvidia-key')?.value.trim();
    const geminiKey = document.getElementById('settings-gemini-key')?.value.trim();
    const openaiKey = document.getElementById('settings-openai-key')?.value.trim();
    const temperature = parseFloat(document.getElementById('settings-temp')?.value || '0.7');
    const systemPrompt = document.getElementById('settings-system-prompt')?.value.trim();

    StorageService.saveSettings({
      model,
      scxKey,
      nvidiaKey,
      geminiKey,
      openaiKey,
      temperature,
      systemPrompt
    });

    Helpers.showToast('Settings saved successfully!');
    this.close();
  },

  /**
   * Reset Settings to defaults
   */
  resetSettings() {
    StorageService.saveSettings({
      model: CONFIG.DEFAULT_MODEL,
      scxKey: 'sk-scx-926783afc408abe78ad48381029a8360',
      nvidiaKey: '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',
      geminiKey: '',
      openaiKey: '',
      temperature: 0.7,
      systemPrompt: CONFIG.DEFAULT_SYSTEM_PROMPT
    });
    Helpers.showToast('Settings reset to defaults');
    this.openSettings();
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    StorageService.saveSettings({ darkMode: isDark });
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (icon) icon.innerText = isDark ? 'light_mode' : 'dark_mode';
    if (text) text.innerText = isDark ? 'Light Mode' : 'Dark Mode';
  },

  /**
   * Open History Drawer / Modal
   */
  openHistory() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const convos = chatManager.conversations;
    const activeId = chatManager.activeId;

    const listHtml = convos.length === 0 
      ? `<div class="p-8 text-center text-on-surface-variant text-sm">No saved conversation history yet.</div>`
      : convos.map(c => `
          <div class="flex items-center justify-between p-3 rounded-xl border ${c.id === activeId ? 'border-primary bg-primary/5 font-semibold' : 'border-outline-variant hover:bg-surface-container-high'} transition-all group">
            <button class="flex-1 text-left flex items-center gap-3 overflow-hidden" onclick="chatManager.switchConversation('${c.id}'); Modals.close();">
              <span class="material-symbols-outlined text-primary text-sm">chat</span>
              <div class="overflow-hidden">
                <div class="truncate text-on-surface text-body-md">${Helpers.escapeHtml(c.title || 'Untitled Chat')}</div>
                <div class="text-xs text-on-surface-variant">${Helpers.formatRelativeDate(c.updatedAt)} • ${c.messages.length} messages</div>
              </div>
            </button>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="chatManager.deleteConversation('${c.id}'); Modals.openHistory();" class="p-1 hover:text-error rounded transition-colors" title="Delete conversation">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        `).join('');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) Modals.close()">
        <div class="modal-content bg-surface-container-lowest text-on-surface w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[85vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">history</span>
              <h3 class="font-headline-md text-lg font-bold text-on-surface">Conversation History</h3>
            </div>
            <button onclick="Modals.close()" class="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- List -->
          <div class="p-6 overflow-y-auto flex flex-col gap-2 flex-1">
            ${listHtml}
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low">
            <button onclick="if(confirm('Clear all conversation history?')) { chatManager.clearAllChats(); Modals.close(); Helpers.showToast('All chats cleared'); }" class="text-error hover:bg-error-container/40 px-3 py-1.5 rounded-lg text-body-sm font-label-md transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">delete_sweep</span> Clear All
            </button>
            <button onclick="Helpers.copyToClipboard(chatManager.exportChatMarkdown()).then(ok => { if(ok) Helpers.showToast('Chat history copied as Markdown!'); })" class="px-4 py-2 bg-secondary text-on-secondary rounded-lg text-body-sm font-label-md hover:bg-secondary/90 transition-colors flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">file_download</span> Export Markdown
            </button>
          </div>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    this.activeModal = 'history';
  },

  /**
   * Open FAQs Modal
   */
  openFAQs() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const faqsHtml = CONFIG.FAQS.map((faq, i) => `
      <details class="group rounded-xl border border-outline-variant p-4 bg-surface-container-low open:bg-surface-container transition-all">
        <summary class="font-label-md font-semibold text-on-surface cursor-pointer flex items-center justify-between list-none select-none">
          <span>${Helpers.escapeHtml(faq.question)}</span>
          <span class="material-symbols-outlined group-open:rotate-180 transition-transform text-sm text-outline">expand_more</span>
        </summary>
        <p class="font-body-sm text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/50 leading-relaxed">
          ${Helpers.escapeHtml(faq.answer)}
        </p>
      </details>
    `).join('');

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) Modals.close()">
        <div class="modal-content bg-surface-container-lowest text-on-surface w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[85vh]">
          <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">quiz</span>
              <h3 class="font-headline-md text-lg font-bold text-on-surface">Frequently Asked Questions</h3>
            </div>
            <button onclick="Modals.close()" class="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-6 overflow-y-auto flex flex-col gap-3">
            ${faqsHtml}
          </div>

          <div class="px-6 py-4 border-t border-outline-variant bg-surface-container-low text-right">
            <button onclick="Modals.close()" class="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-label-md hover:bg-primary/90">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    this.activeModal = 'faqs';
  },

  /**
   * Open Human Agent Support Modal
   */
  openHumanAgent() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target === this) Modals.close()">
        <div class="modal-content bg-surface-container-lowest text-on-surface w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">support_agent</span>
              <h3 class="font-headline-md text-lg font-bold text-on-surface">Connect with Human Agent</h3>
            </div>
            <button onclick="Modals.close()" class="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-6 flex flex-col gap-4">
            <div class="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant">
              <div class="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold">
                SJ
              </div>
              <div>
                <div class="font-label-md font-semibold text-on-surface">Support Specialist On Duty</div>
                <div class="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
                  <span>Average response time: 2 mins</span>
                </div>
              </div>
            </div>

            <div>
              <label class="block font-label-md text-label-md font-semibold text-on-surface mb-1">Issue Topic</label>
              <input type="text" id="agent-topic" placeholder="e.g., Financial report interpretation error" class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary" />
            </div>

            <div>
              <label class="block font-label-md text-label-md font-semibold text-on-surface mb-1">Urgency</label>
              <select id="agent-urgency" class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
                <option value="normal">Normal - General Inquiry</option>
                <option value="high">High - Escalated Issue</option>
                <option value="critical">Critical - Business Blocker</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
            <button onclick="Modals.close()" class="px-4 py-2 border border-outline-variant hover:bg-surface-container-high rounded-lg text-body-sm font-label-md transition-colors">
              Cancel
            </button>
            <button onclick="Modals.submitSupportTicket()" class="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-label-md hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">send</span> Start Live Hand-off
            </button>
          </div>
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    this.activeModal = 'human_agent';
  },

  submitSupportTicket() {
    Helpers.showToast('Connecting you with a Human Specialist...', 4000);
    this.close();
    setTimeout(() => {
      if (window.app) {
        window.app.sendMessage('I would like to transfer this conversation to a human support agent.');
      }
    }, 500);
  }
};

window.Modals = Modals;
