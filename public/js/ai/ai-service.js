/**
 * AI Service Orchestrator
 * Coordinates AI streaming via secure server proxy with CORS protection
 */

class AIService {
  constructor() {
    this.currentAbortController = null;
    this.isGenerating = false;
  }

  /**
   * Cancel ongoing AI generation
   */
  abort() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isGenerating = false;
  }

  /**
   * Send a conversation and stream back tokens
   */
  async streamChat({ messages, onChunk, onStart, onComplete, onError }) {
    if (this.isGenerating) {
      this.abort();
    }

    this.isGenerating = true;
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    if (onStart) onStart();

    const settings = StorageService.getSettings();
    const model = settings.model || CONFIG.DEFAULT_MODEL;
    const provider = settings.provider || 'auto';
    const scxKey = settings.scxKey || '';
    const nvidiaKey = settings.nvidiaKey || '';
    const geminiKey = settings.geminiKey || '';
    const openaiKey = settings.openaiKey || '';
    const systemPrompt = settings.systemPrompt || CONFIG.DEFAULT_SYSTEM_PROMPT;
    const temperature = settings.temperature || 0.7;

    let apiKey = '';
    if (model === 'MiniMax-M2.7' || provider === 'scx') {
      apiKey = scxKey;
    } else if (model.startsWith('gemini') || provider === 'google') {
      apiKey = geminiKey;
    } else if (model.startsWith('gpt') || provider === 'openai') {
      apiKey = openaiKey;
    } else {
      apiKey = nvidiaKey || scxKey || geminiKey || openaiKey;
    }

    try {
      // 1. Direct Builtin selection
      if (provider === 'builtin' || model === 'builtin-smart') {
        await BuiltinEngine.streamResponse(messages, onChunk, signal);
      }
      // 2. Secure Server Streaming Proxy (Bypasses CORS restrictions)
      else {
        let serverSuccess = false;
        try {
          const res = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages,
              provider,
              model,
              apiKey,
              systemInstruction: systemPrompt,
              temperature
            }),
            signal
          });

          if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
            serverSuccess = true;
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop();

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  const dataStr = trimmed.substring(6).trim();
                  if (!dataStr || dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.error) {
                      throw new Error(parsed.error);
                    }
                    if (parsed.text) {
                      onChunk(parsed.text);
                    }
                  } catch (e) {
                    if (e.message && !e.message.includes('JSON')) {
                      throw e;
                    }
                  }
                }
              }
            }
          } else {
            const errText = await res.text();
            throw new Error(`Server stream request failed (${res.status}): ${errText}`);
          }
        } catch (serverErr) {
          if (serverErr.name === 'AbortError') throw serverErr;
          console.warn('Server streaming error, falling back to built-in smart assistant:', serverErr);

          if (!serverSuccess) {
            await BuiltinEngine.streamResponse(messages, onChunk, signal);
          }
        }
      }

      this.isGenerating = false;
      this.currentAbortController = null;
      if (onComplete) onComplete();
    } catch (err) {
      this.isGenerating = false;
      this.currentAbortController = null;
      if (err.name === 'AbortError') {
        console.log('Stream generation was cancelled by user');
        if (onComplete) onComplete();
      } else {
        console.error('AI Stream Error:', err);
        if (onError) onError(err);
      }
    }
  }
}

window.aiService = new AIService();
