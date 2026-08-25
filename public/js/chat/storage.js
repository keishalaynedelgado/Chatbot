/**
 * Storage Service for Local Persistence (Settings & Conversations)
 */

const STORAGE_KEYS = {
  SETTINGS: 'synthie_settings_v1',
  CONVERSATIONS: 'synthie_conversations_v1',
  ACTIVE_ID: 'synthie_active_convo_id_v1',
  THEME: 'synthie_theme_v1'
};

const StorageService = {
  /**
   * Get application settings with defaults
   */
  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const defaults = {
        provider: CONFIG.DEFAULT_PROVIDER,
        model: CONFIG.DEFAULT_MODEL,
        nvidiaKey: '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',
        geminiKey: '',
        openaiKey: '',
        temperature: 0.7,
        systemPrompt: CONFIG.DEFAULT_SYSTEM_PROMPT,
        darkMode: false,
        useServerProxy: true
      };
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (!parsed.nvidiaKey) parsed.nvidiaKey = defaults.nvidiaKey;
      if (parsed.model === 'gemini-2.5-flash' && !parsed.geminiKey) {
        parsed.model = defaults.model;
      }
      return { ...defaults, ...parsed };
    } catch (e) {
      console.error('Error loading settings:', e);
      return {};
    }
  },

  /**
   * Save application settings
   */
  saveSettings(settings) {
    try {
      const current = this.getSettings();
      const merged = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  },

  /**
   * Get all conversations
   */
  getConversations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error loading conversations:', e);
      return [];
    }
  },

  /**
   * Save all conversations
   */
  saveConversations(conversations) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Error saving conversations:', e);
    }
  },

  /**
   * Get active conversation ID
   */
  getActiveConversationId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID) || null;
  },

  /**
   * Set active conversation ID
   */
  setActiveConversationId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    }
  },

  /**
   * Clear all stored conversations
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
  }
};

window.StorageService = StorageService;
