/**
 * Direct OpenAI API Streaming Client
 */

const OpenAIClient = {
  /**
   * Stream content directly from OpenAI API
   */
  async streamResponse({ apiKey, model = 'gpt-4o-mini', messages, systemPrompt, temperature = 0.7 }, onChunk, signal) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set it in Settings or use Built-in Engine.');
    }

    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const formattedMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: Number(temperature) || 0.7,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `OpenAI API error (${response.status})`;
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
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.substring(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }
  }
};

window.OpenAIClient = OpenAIClient;
