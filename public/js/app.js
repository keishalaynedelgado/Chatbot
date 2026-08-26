/**
 * Main Application Orchestrator for Synthie AI
 */

class SynthieApp {
  constructor() {
    this.initTheme();
    this.initServices();
  }

  /**
   * Initialize Theme (Dark/Light mode)
   */
  initTheme() {
    const settings = StorageService.getSettings();
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Initialize UI and event subscriptions
   */
  initServices() {
    // Initialize UI Renderer and Modals
    UIRenderer.init();
    Modals.init();
    EventHandlers.init();

    // Subscribe to chat manager state updates
    chatManager.subscribe((activeConvo) => {
      UIRenderer.renderMessages(activeConvo);
    });

    // Render initial conversation state
    UIRenderer.renderMessages(chatManager.getActiveConversation());

    console.log('✨ Synthie AI initialized successfully.');
  }

  /**
   * Start a new chat session
   */
  newChat() {
    if (aiService.isGenerating) {
      this.abort();
    }
    chatManager.createNewChat();
    const textarea = document.getElementById('chat-input');
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
      textarea.focus();
    }
    EventHandlers.clearAttachments();
    Helpers.showToast('Started new conversation');
  }

  /**
   * Send a user message and trigger AI stream
   */
  async sendMessage(customText) {
    if (aiService.isGenerating) return;

    const textarea = document.getElementById('chat-input');
    const content = (customText !== undefined ? customText : textarea?.value)?.trim();
    const attachments = [...EventHandlers.selectedFiles];

    if (!content && attachments.length === 0) return;

    // Reset input field and attachments
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }
    EventHandlers.clearAttachments();

    // 1. Add User Message
    chatManager.addUserMessage(content, attachments);

    // 2. Add Assistant Streaming Placeholder
    const aiPlaceholder = chatManager.addAssistantPlaceholder();
    let accumulatedText = '';

    const sendBtn = document.getElementById('send-btn');
    const sendIcon = document.getElementById('send-icon');

    // 3. Trigger AI Stream
    const currentMessages = chatManager.getActiveConversation().messages
      .filter(m => m.id !== aiPlaceholder.id && m.content && m.content.trim().length > 0)
      .map(m => ({ role: m.role, content: m.content.trim() }));

    await aiService.streamChat({
      messages: currentMessages,
      onStart: () => {
        if (sendIcon) sendIcon.innerText = 'stop';
        if (sendBtn) {
          sendBtn.title = 'Stop generating';
          sendBtn.classList.remove('bg-primary');
          sendBtn.classList.add('bg-error');
        }
      },
      onChunk: (chunk) => {
        accumulatedText += chunk;
        chatManager.appendChunk(chunk);
        UIRenderer.updateStreamingBubble(aiPlaceholder.id, accumulatedText);
      },
      onComplete: () => {
        chatManager.finalizeAssistantMessage();
        this.resetSendButton();
      },
      onError: (err) => {
        chatManager.setAssistantError(err.message || 'An unexpected error occurred.');
        this.resetSendButton();
      }
    });
  }

  /**
   * Cancel ongoing AI generation
   */
  abort() {
    aiService.abort();
    this.resetSendButton();
    Helpers.showToast('Generation cancelled');
  }

  /**
   * Reset Send Button icon and styling
   */
  resetSendButton() {
    const sendBtn = document.getElementById('send-btn');
    const sendIcon = document.getElementById('send-icon');
    if (sendIcon) sendIcon.innerText = 'send';
    if (sendBtn) {
      sendBtn.title = 'Send message';
      sendBtn.classList.add('bg-primary');
      sendBtn.classList.remove('bg-error');
    }
  }

  /**
   * Retry the last message in current conversation
   */
  async retryLastMessage() {
    if (aiService.isGenerating) return;

    const messages = chatManager.prepareRetry();
    if (!messages || messages.length === 0) return;

    // Add new placeholder
    const aiPlaceholder = chatManager.addAssistantPlaceholder();
    let accumulatedText = '';

    const sendBtn = document.getElementById('send-btn');
    const sendIcon = document.getElementById('send-icon');

    await aiService.streamChat({
      messages,
      onStart: () => {
        if (sendIcon) sendIcon.innerText = 'stop';
        if (sendBtn) {
          sendBtn.title = 'Stop generating';
          sendBtn.classList.remove('bg-primary');
          sendBtn.classList.add('bg-error');
        }
      },
      onChunk: (chunk) => {
        accumulatedText += chunk;
        chatManager.appendChunk(chunk);
        UIRenderer.updateStreamingBubble(aiPlaceholder.id, accumulatedText);
      },
      onComplete: () => {
        chatManager.finalizeAssistantMessage();
        this.resetSendButton();
      },
      onError: (err) => {
        chatManager.setAssistantError(err.message || 'Retry failed.');
        this.resetSendButton();
      }
    });
  }
}

// Bootstrap application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SynthieApp();
});
