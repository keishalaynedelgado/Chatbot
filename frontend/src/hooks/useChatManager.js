/**
 * Chat State & Session Manager (React port of chat-manager.js)
 *
 * Mirrors the original ChatManager class 1:1, including its perf
 * shortcut: appendChunk() only updates in-memory streaming state (no
 * localStorage write, no full conversations update) on every token —
 * only finalizeAssistantMessage() commits the finished text into the
 * conversation and persists it, exactly like the original.
 */

import { useCallback, useState } from 'react';
import { StorageService } from '../services/storage.js';
import { Helpers } from '../utils/helpers.js';

function createConversation() {
  return {
    id: Helpers.generateId('convo'),
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
}

function initConversations() {
  let conversations = StorageService.getConversations();
  let activeId = StorageService.getActiveConversationId();

  if (!conversations.length || !conversations.find((c) => c.id === activeId)) {
    const newConvo = createConversation();
    conversations = [newConvo, ...conversations];
    activeId = newConvo.id;
    StorageService.saveConversations(conversations);
    StorageService.setActiveConversationId(activeId);
  }

  return { conversations, activeId };
}

export function useChatManager() {
  const [state, setState] = useState(initConversations);
  const [streaming, setStreaming] = useState({ id: null, text: '' });

  const { conversations, activeId } = state;
  const activeConversation = conversations.find((c) => c.id === activeId) || conversations[0] || null;

  const persist = useCallback((nextConversations, nextActiveId) => {
    StorageService.saveConversations(nextConversations);
    StorageService.setActiveConversationId(nextActiveId);
  }, []);

  const createNewChat = useCallback(() => {
    const newConvo = createConversation();
    setState((prev) => {
      const nextConversations = [newConvo, ...prev.conversations];
      persist(nextConversations, newConvo.id);
      return { conversations: nextConversations, activeId: newConvo.id };
    });
    return newConvo;
  }, [persist]);

  const switchConversation = useCallback((id) => {
    setState((prev) => {
      if (!prev.conversations.find((c) => c.id === id)) return prev;
      StorageService.setActiveConversationId(id);
      return { ...prev, activeId: id };
    });
  }, []);

  const deleteConversation = useCallback((id) => {
    setState((prev) => {
      let nextConversations = prev.conversations.filter((c) => c.id !== id);
      let nextActiveId = prev.activeId;

      if (prev.activeId === id) {
        if (nextConversations.length > 0) {
          nextActiveId = nextConversations[0].id;
        } else {
          const newConvo = createConversation();
          nextConversations = [newConvo];
          nextActiveId = newConvo.id;
        }
      }

      persist(nextConversations, nextActiveId);
      return { conversations: nextConversations, activeId: nextActiveId };
    });
  }, [persist]);

  const clearAllChats = useCallback(() => {
    const newConvo = createConversation();
    setState(() => {
      persist([newConvo], newConvo.id);
      return { conversations: [newConvo], activeId: newConvo.id };
    });
  }, [persist]);

  const addUserMessage = useCallback((content, attachments = []) => {
    const message = {
      id: Helpers.generateId('msg_user'),
      role: 'user',
      content,
      attachments,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    setState((prev) => {
      const nextConversations = prev.conversations.map((c) => {
        if (c.id !== prev.activeId) return c;
        const messages = [...c.messages, message];
        let title = c.title;
        if (messages.length <= 2 && title === 'New Conversation') {
          title = content.length > 35 ? content.substring(0, 32) + '...' : content;
        }
        return { ...c, messages, title, updatedAt: new Date().toISOString() };
      });
      persist(nextConversations, prev.activeId);
      return { ...prev, conversations: nextConversations };
    });

    return message;
  }, [persist]);

  const addAssistantPlaceholder = useCallback(() => {
    const message = {
      id: Helpers.generateId('msg_ai'),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'streaming'
    };

    setState((prev) => {
      const nextConversations = prev.conversations.map((c) => {
        if (c.id !== prev.activeId) return c;
        return { ...c, messages: [...c.messages, message], updatedAt: new Date().toISOString() };
      });
      persist(nextConversations, prev.activeId);
      return { ...prev, conversations: nextConversations };
    });

    setStreaming({ id: message.id, text: '' });
    return message;
  }, [persist]);

  const appendChunk = useCallback((chunk) => {
    setStreaming((prev) => ({ ...prev, text: prev.text + chunk }));
  }, []);

  const finalizeAssistantMessage = useCallback(() => {
    setStreaming((currentStreaming) => {
      setState((prev) => {
        const nextConversations = prev.conversations.map((c) => {
          if (c.id !== prev.activeId) return c;
          const messages = c.messages.map((m) =>
            m.id === currentStreaming.id ? { ...m, content: currentStreaming.text, status: 'done' } : m
          );
          return { ...c, messages, updatedAt: new Date().toISOString() };
        });
        persist(nextConversations, prev.activeId);
        return { ...prev, conversations: nextConversations };
      });
      return { id: null, text: '' };
    });
  }, [persist]);

  const setAssistantError = useCallback((errorMessage) => {
    setStreaming(() => {
      setState((prev) => {
        const nextConversations = prev.conversations.map((c) => {
          if (c.id !== prev.activeId) return c;
          const messages = c.messages.map((m, idx) =>
            idx === c.messages.length - 1 && m.role === 'assistant'
              ? { ...m, status: 'error', error: errorMessage || 'Failed to generate response.' }
              : m
          );
          return { ...c, messages, updatedAt: new Date().toISOString() };
        });
        persist(nextConversations, prev.activeId);
        return { ...prev, conversations: nextConversations };
      });
      return { id: null, text: '' };
    });
  }, [persist]);

  const prepareRetry = useCallback(() => {
    let result = null;
    setState((prev) => {
      const nextConversations = prev.conversations.map((c) => {
        if (c.id !== prev.activeId) return c;
        const messages = [...c.messages];
        const last = messages[messages.length - 1];
        if (last && last.role === 'assistant' && last.status === 'error') {
          messages.pop();
        }
        result = messages.map((m) => ({ role: m.role, content: m.content }));
        return { ...c, messages };
      });
      persist(nextConversations, prev.activeId);
      return { ...prev, conversations: nextConversations };
    });
    return result;
  }, [persist]);

  const exportChatMarkdown = useCallback(() => {
    if (!activeConversation) return '';
    let md = `# ${activeConversation.title}\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    activeConversation.messages.forEach((m) => {
      const sender = m.role === 'user' ? '👤 User' : '🤖 Synthie AI';
      md += `### ${sender} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---\n\n`;
    });
    return md;
  }, [activeConversation]);

  return {
    conversations,
    activeId,
    activeConversation,
    streamingId: streaming.id,
    streamingText: streaming.text,
    createNewChat,
    switchConversation,
    deleteConversation,
    clearAllChats,
    addUserMessage,
    addAssistantPlaceholder,
    appendChunk,
    finalizeAssistantMessage,
    setAssistantError,
    prepareRetry,
    exportChatMarkdown
  };
}

export default useChatManager;
