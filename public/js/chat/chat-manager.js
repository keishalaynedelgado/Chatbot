/**
 * Chat State & Session Manager
 */

class ChatManager {
  constructor() {
    this.conversations = StorageService.getConversations();
    this.activeId = StorageService.getActiveConversationId();
    this.listeners = [];

    // If no conversations or active conversation invalid, initialize one
    if (!this.conversations.length || !this.getConversation(this.activeId)) {
      this.createNewChat(false);
    }
  }

  /**
   * Subscribe to state change notifications
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getActiveConversation(), this.conversations));
  }

  /**
   * Get specific conversation by ID
   */
  getConversation(id) {
    return this.conversations.find(c => c.id === id) || null;
  }

  /**
   * Get active conversation
   */
  getActiveConversation() {
    let convo = this.getConversation(this.activeId);
    if (!convo && this.conversations.length > 0) {
      this.activeId = this.conversations[0].id;
      StorageService.setActiveConversationId(this.activeId);
      convo = this.conversations[0];
    }
    return convo;
  }

  /**
   * Create a new chat session
   */
  createNewChat(autoNotify = true) {
    const newConvo = {
      id: Helpers.generateId('convo'),
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    this.conversations.unshift(newConvo);
    this.activeId = newConvo.id;
    this.saveState();

    if (autoNotify) this.notify();
    return newConvo;
  }

  /**
   * Switch to a conversation
   */
  switchConversation(id) {
    if (this.getConversation(id)) {
      this.activeId = id;
      StorageService.setActiveConversationId(id);
      this.notify();
    }
  }

  /**
   * Delete a conversation
   */
  deleteConversation(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.activeId === id) {
      this.activeId = this.conversations.length > 0 ? this.conversations[0].id : null;
      if (!this.activeId) {
        this.createNewChat(false);
      } else {
        StorageService.setActiveConversationId(this.activeId);
      }
    }
    this.saveState();
    this.notify();
  }

  /**
   * Clear all chats
   */
  clearAllChats() {
    this.conversations = [];
    this.activeId = null;
    this.createNewChat(false);
    this.saveState();
    this.notify();
  }

  /**
   * Add a user message
   */
  addUserMessage(content, attachments = []) {
    const convo = this.getActiveConversation();
    if (!convo) return null;

    const message = {
      id: Helpers.generateId('msg_user'),
      role: 'user',
      content,
      attachments,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    convo.messages.push(message);
    convo.updatedAt = new Date().toISOString();

    // Generate smart conversation title from first user message
    if (convo.messages.length <= 2 && convo.title === 'New Conversation') {
      convo.title = content.length > 35 ? content.substring(0, 32) + '...' : content;
    }

    this.saveState();
    this.notify();
    return message;
  }

  /**
   * Add an assistant placeholder message for streaming
   */
  addAssistantPlaceholder() {
    const convo = this.getActiveConversation();
    if (!convo) return null;

    const message = {
      id: Helpers.generateId('msg_ai'),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'streaming'
    };

    convo.messages.push(message);
    convo.updatedAt = new Date().toISOString();
    this.saveState();
    this.notify();
    return message;
  }

  /**
   * Append stream chunk to the latest assistant message
   */
  appendChunk(chunk) {
    const convo = this.getActiveConversation();
    if (!convo || convo.messages.length === 0) return;

    const lastMsg = convo.messages[convo.messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.status === 'streaming') {
      lastMsg.content += chunk;
      // We don't necessarily call this.notify() on every chunk to avoid heavy re-renders;
      // the UI renderer directly updates the streaming DOM node.
    }
  }

  /**
   * Finalize the streaming message
   */
  finalizeAssistantMessage() {
    const convo = this.getActiveConversation();
    if (!convo || convo.messages.length === 0) return;

    const lastMsg = convo.messages[convo.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.status = 'done';
      convo.updatedAt = new Date().toISOString();
      this.saveState();
      this.notify();
    }
  }

  /**
   * Mark the latest assistant message as failed with an error message
   */
  setAssistantError(errorMessage) {
    const convo = this.getActiveConversation();
    if (!convo || convo.messages.length === 0) return;

    const lastMsg = convo.messages[convo.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.status = 'error';
      lastMsg.error = errorMessage || 'Failed to generate response.';
      convo.updatedAt = new Date().toISOString();
      this.saveState();
      this.notify();
    }
  }

  /**
   * Remove last assistant error message and prepare for retry
   */
  prepareRetry() {
    const convo = this.getActiveConversation();
    if (!convo || convo.messages.length === 0) return null;

    const lastMsg = convo.messages[convo.messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.status === 'error') {
      convo.messages.pop(); // remove failed AI message
      this.saveState();
    }

    // Return current message history to resend
    return convo.messages.map(m => ({ role: m.role, content: m.content }));
  }

  /**
   * Save conversations to storage
   */
  saveState() {
    StorageService.saveConversations(this.conversations);
    StorageService.setActiveConversationId(this.activeId);
  }

  /**
   * Export active chat as Markdown
   */
  exportChatMarkdown() {
    const convo = this.getActiveConversation();
    if (!convo) return '';

    let md = `# ${convo.title}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    convo.messages.forEach(m => {
      const sender = m.role === 'user' ? '👤 User' : '🤖 Synthie AI';
      md += `### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---\n\n`;
    });
    return md;
  }
}

window.chatManager = new ChatManager();
