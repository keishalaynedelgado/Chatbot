/**
 * Conversation history summarizer.
 *
 * Real summarization (not the .slice(-20) trim in server.js): when a
 * conversation has more than 20 messages, everything OLDER than the last
 * 20 gets condensed into a short summary by the AI model itself, using
 * the prompt below. The most recent 20 messages are still sent to the
 * model in full, unchanged — this summary is *additional* context about
 * what came before, not a replacement for the existing trim.
 *
 * The generated summary is passed through the same guardrails used for
 * user input before it's ever used, since it's still text that will be
 * injected into the system prompt.
 */

import { generateText } from './ai-config.js';
import { runGuardrails } from './guardrails.js';

const SUMMARIZER_SYSTEM_PROMPT = `You are an AI assistant integrated with a safety guardrail system.

## Your Task
You will receive a conversation with multiple messages. Your job is to:
1. **Summarize** the conversation into 3 paragraphs or less
2. Keep ALL important details: dates, names, decisions, action items
3. Be concise, clear, and organized
4. Use bullet points for key action items
5. Do NOT add any new information or opinions
6. Do NOT change the meaning of the original messages

## Important: Guardrail System
After you generate the summary, a **separate guardrail system** will automatically check:
- Whether the summary contains harmful content
- Whether the summary contains sensitive information
- Whether the summary contains prompt injection attempts

**If the guardrail detects any of these, the summary will be blocked.**

## Your Responsibility
Your ONLY job is to create a safe, accurate, and concise summary.`;

function formatMessagesForSummary(messages) {
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content.trim()}`)
    .join('\n\n');
}

/**
 * Summarizes `olderMessages` using `modelInstance`. Returns the summary
 * string, or null if there was nothing worth summarizing, the model
 * call failed, or the guardrails blocked the result (in every "can't
 * produce a safe summary" case, the caller should just fall back to not
 * having one — never invent a summary, never use an unsafe one).
 */
async function summarizeOlderMessages(olderMessages, modelInstance) {
  const transcript = formatMessagesForSummary(olderMessages);
  if (!transcript || !modelInstance) return null;

  let summaryText;
  try {
    const result = await generateText({
      model: modelInstance,
      system: SUMMARIZER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `## Input Messages:\n${transcript}\n\n## Your Summary:` }],
      temperature: 0.3,
    });
    summaryText = result.text?.trim();
  } catch (err) {
    console.warn('[ConversationSummarizer] Summary generation failed:', err.message);
    return null;
  }

  if (!summaryText) return null;

  const guardrailResult = runGuardrails(summaryText);
  if (!guardrailResult.allowed) {
    console.warn(`[ConversationSummarizer] Summary blocked by guardrails (${guardrailResult.category}) — discarding it.`);
    return null;
  }

  // PII in a summary of the user's own conversation isn't a leak to a
  // third party, but masking it here is still the safer default.
  return guardrailResult.sanitizedContent;
}

export { summarizeOlderMessages };
