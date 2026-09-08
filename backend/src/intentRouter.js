/**
 * LLM-based intent routing: decides which context source (if any)
 * should back the AI's answer for a given message — Database Query,
 * RAG (uploaded documents), or General Knowledge.
 *
 * Template Autofill is deliberately NOT one of these routes — it
 * already has its own deterministic, regex-based detector
 * (reportGenerationFlow.js, intercepted in server.js before the AI
 * model is ever called) that guarantees zero hallucination in
 * generated documents. Routing that through an LLM classifier would
 * reintroduce exactly the risk that detector was built to avoid, so it
 * stays upstream of this router entirely.
 *
 * Classification is done via plain free-text generation (the same
 * reliable pattern conversationSummarizer.js already uses), not the AI
 * SDK's structured-output mechanism (`generateObject` / `Output.choice`)
 * — those were tried first, but the NVIDIA NIM provider (this
 * project's default/only-configured provider) doesn't support them
 * reliably: every call failed with "response did not match schema" in
 * testing. Asking for one exact word in plain text and parsing it
 * ourselves works across every provider this app supports.
 */

import { generateText } from 'ai';

const ROUTES = ['database_query', 'rag', 'general_knowledge'];

const ROUTER_SYSTEM_PROMPT = `You are an intent classifier for a company assistant. Read the conversation and decide which single source should answer the user's LATEST message.

Routes:
- "database_query": the answer requires live data from the company's PostgreSQL database — tasks, users, assignees, projects, departments, statuses, priorities, deadlines, reports, analytics, or counts of any current records. This is the HIGHEST PRIORITY route — if the question could plausibly be answered from current database records, choose this even if it also sounds like it could be a document question.
- "rag": the answer is about documentation, guides, procedures, FAQs, or policies contained in uploaded reference documents (e.g. "how do I create a task", "what is the vacation policy", "how do I use feature X") — NOT live/current database records.
- "general_knowledge": the request is casual conversation, a greeting, an opinion, or a general-knowledge question unrelated to this company's database or documents.

Rules:
- Judge intent from the full conversation, not just keywords — a vague follow-up like "what about her?" or "show me more" should be classified using what was already being discussed.
- If a request could plausibly fit more than one route, prefer the higher-priority one in this order: database_query > rag > general_knowledge.
- Respond with ONLY one of these exact words and nothing else: database_query, rag, general_knowledge`;

function formatRecentMessages(messages) {
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content.trim()}`)
    .join('\n\n');
}

/**
 * Classifies the latest message's intent using recent conversation
 * context. Returns one of ROUTES, or `null` if classification failed
 * for any reason (network error, unsupported provider, etc.) — `null`
 * is a meaningful signal telling the caller to fall back to running
 * every context source rather than none, so a classifier hiccup never
 * makes the chatbot less capable than before this feature existed.
 */
async function classifyIntent(recentMessages, modelInstance) {
  if (!modelInstance) return null;

  const transcript = formatRecentMessages(recentMessages);
  if (!transcript) return null;

  try {
    const result = await generateText({
      model: modelInstance,
      system: ROUTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
      temperature: 0,
    });

    // The model is instructed to reply with just the bare word, but
    // parse defensively in case it wraps it in extra text/punctuation.
    const text = (result.text || '').toLowerCase();
    return ROUTES.find((route) => text.includes(route)) || null;
  } catch (err) {
    console.warn('[IntentRouter] Classification failed, falling back to default behavior:', err.message);
    return null;
  }
}

export { classifyIntent };
export default { classifyIntent };
