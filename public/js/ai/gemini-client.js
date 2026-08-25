/**
 * Direct Google Gemini API Streaming Client
 */

const GeminiClient = {
  /**
   * Stream content directly from Gemini API
   */
  async streamResponse({ apiKey, model = 'gemini-2.5-flash', messages, systemPrompt, temperature = 0.7 }, onChunk, signal) {
    if (!apiKey) {
      throw new Error('Gemini API key is required. Please set it in Settings or use Built-in Engine.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    // Convert messages into Gemini structure
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const payload = {
      contents,
      generationConfig: {
        temperature: Number(temperature) || 0.7,
        maxOutputTokens: 2048
      }
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Gemini API error (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        msg = parsed.error?.message || msg;
      } catch (e) {
        msg += `: ${errText}`;
      }
      throw new Error(msg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep partial

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.substring(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              onChunk(chunk);
            }
          } catch (e) {
            console.warn('Failed parsing Gemini SSE line:', line);
          }
        }
      }
    }
  }
};

window.GeminiClient = GeminiClient;
