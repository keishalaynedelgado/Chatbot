import api from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const aiService = {
  /**
   * Real-time Server-Sent Events (SSE) AI Streaming
   */
  streamChat: async ({ messages = [], model, provider, onChunk, onDone, onError, signal }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages, model, provider }),
        signal
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                if (onError) onError(new Error(parsed.error));
              } else if (parsed.text) {
                if (onChunk) onChunk(parsed.text);
              } else if (parsed.done) {
                if (onDone) onDone();
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      if (onDone) onDone();

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user.');
      } else {
        console.error('AI Stream Error:', error);
        if (onError) onError(error);
      }
    }
  },

  /**
   * Fetch Available AI Models
   */
  getModels: async () => {
    return api.get('/ai/models');
  },

  /**
   * Standard Non-streaming Chat (Fallback)
   */
  chat: async (message, context = {}) => {
    return api.post('/ai/chat', { message, context });
  }
};