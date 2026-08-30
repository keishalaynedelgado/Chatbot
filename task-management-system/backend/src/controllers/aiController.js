/**
 * AI Controller - Vercel AI SDK & PostgreSQL Scoped Chat Controller
 */

const { loadAIModules, resolveModel } = require('../config/aiConfig');
const taskAnalyticsService = require('../services/taskAnalyticsService');

/**
 * Real-time SSE Chat Stream with Vercel AI SDK and Multi-Tenant DB Grounding
 * POST /api/ai/chat/stream
 */
exports.streamChatWithAI = async (req, res) => {
  const user = req.user;
  const { messages = [], message, provider = 'auto', model, apiKey, temperature = 0.7 } = req.body;

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Fetch authorized live PostgreSQL analytics for grounding
    const analytics = await taskAnalyticsService.getScopedAnalytics(user);
    const systemPrompt = taskAnalyticsService.generateSystemPrompt(user, analytics);

    // 2. Prepare message history
    let conversationHistory = Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: 'user', content: message || 'Hello' }];

    // Sanitize messages to eliminate empty strings (prevents 400 Bad Request)
    const validMessages = conversationHistory
      .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .slice(-20)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content.trim()
      }));

    const aiMessages = validMessages.length > 0 ? validMessages : [{ role: 'user', content: 'Hello' }];

    // 3. Resolve AI model
    const resolved = await resolveModel({ provider, model, apiKey });

    if (resolved && resolved.modelInstance) {
      try {
        const { streamText } = await loadAIModules();
        console.log(`[Vercel AI SDK] Streaming for user ${user.username} (${user.role}) with model ${resolved.resolvedModel}`);

        const result = streamText({
          model: resolved.modelInstance,
          system: systemPrompt,
          messages: aiMessages,
          temperature: Number(temperature) || 0.7
        });

        let streamedAnyTokens = false;
        for await (const chunk of result.textStream) {
          if (chunk) {
            streamedAnyTokens = true;
            sendEvent({ text: chunk });
          }
        }

        if (streamedAnyTokens) {
          sendEvent({ done: true });
          res.end();
          return;
        }
      } catch (streamErr) {
        console.warn('[AI SDK Stream Error - Falling back to smart generator]:', streamErr.message);
      }
    }

    // 4. Fallback: Intelligent Grounded Engine
    console.log('[AI Stream] Using intelligent grounded assistant fallback');
    const latestUserPrompt = aiMessages[aiMessages.length - 1]?.content || '';
    const offlineReply = taskAnalyticsService.generateOfflineReply(latestUserPrompt, analytics, user);

    const tokens = offlineReply.match(/(\S+\s*|\n+)/g) || [offlineReply];
    for (const token of tokens) {
      sendEvent({ text: token });
      await new Promise(r => setTimeout(r, 15));
    }

    sendEvent({ done: true });
    res.end();

  } catch (error) {
    console.error('[AI Stream Fatal Error]:', error);
    sendEvent({ error: error.message || 'Error processing AI chat stream' });
    sendEvent({ done: true });
    res.end();
  }
};

/**
 * Standard JSON Chat Endpoint (Backward Compatibility)
 * POST /api/ai/chat
 */
exports.chatWithAI = async (req, res) => {
  try {
    const user = req.user;
    const { message = '' } = req.body;

    const analytics = await taskAnalyticsService.getScopedAnalytics(user);
    const reply = taskAnalyticsService.generateOfflineReply(message, analytics, user);

    res.json({
      success: true,
      data: {
        message: reply,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing AI request'
    });
  }
};