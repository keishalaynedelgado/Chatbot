import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import { resolveModel, streamText, DEFAULT_PROVIDER, DEFAULT_MODEL, MODEL_CATALOG } from './src/ai-config.js';
import taskDbService from './src/taskdb-service.js';
import { testConnection } from './src/database.js';
import { runGuardrails } from './src/guardrails.js';
import { handle as handleReportGeneration } from './src/reportGenerationFlow.js';
import { summarizeOlderMessages } from './src/conversationSummarizer.js';
import {
  extractTaskTagMention,
  getTasksForTag,
  formatTaskTagContext,
} from './src/departmentFilter.js';
import multer from 'multer';
import fsSync from 'fs';
import { randomUUID } from 'crypto';
import { ingestDocument, syncUploadedFolder } from './src/documentIngestion.js';
import { Document, DocumentChunk } from './src/models/index.js';
import { retrieveRelevantChunks, formatChunksForPrompt } from './src/documentRetrieval.js';
import { classifyIntent } from './src/intentRouter.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Shared knowledge-base document storage (RAG) — mirrors the
// generated-files/ convention used for Template Autofill output.
const UPLOADED_DOCS_DIR = path.join(__dirname, 'uploaded-documents');
fsSync.mkdirSync(UPLOADED_DOCS_DIR, { recursive: true });

const ALLOWED_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const ALLOWED_DOC_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADED_DOCS_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Some browsers/OS configurations report .docx (and occasionally
    // .pdf/.txt) as the generic application/octet-stream instead of
    // the real mimetype, so a known extension is accepted as a fallback
    // rather than rejecting a legitimate file over a client quirk.
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_DOC_MIME_TYPES.has(file.mimetype) && !ALLOWED_DOC_EXTENSIONS.has(ext)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype || ext}`));
    }
    cb(null, true);
  },
});

// Health check endpoint (supports both /api/health and /health)
app.get(['/api/health', '/health'], async (req, res) => {
  const nvidiaKey = process.env.NVIDIA_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);
  const isPostgresConnected = await testConnection();
  res.json({
    status: 'ok',
    aiSdk: 'vercel-ai-sdk',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
    postgresConfigured: isPostgresConnected,
    nvidiaConfigured: Boolean(nvidiaKey),
    scxConfigured: Boolean(process.env.SCX_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('nvapi-'))
  });
});

// Models and configuration endpoint
app.get(['/api/models', '/models'], (req, res) => {
  res.json({
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
    models: MODEL_CATALOG
  });
});

// Stream endpoint powered by Vercel AI SDK
app.post(['/api/chat/stream', '/chat/stream'], async (req, res) => {
  const { messages = [], provider = 'auto', apiKey, model, systemInstruction, temperature = 0.7 } = req.body;

  // Guardrails: check the latest user message for harmful content, prompt
  // injection, forbidden keywords, and PII before the AI ever sees it.
  const lastMessage = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;
  if (lastMessage && typeof lastMessage.content === 'string') {
    const guardrailResult = runGuardrails(lastMessage.content);

    if (!guardrailResult.allowed) {
      console.warn(`[Guardrails] Blocked message (${guardrailResult.category}): ${guardrailResult.reason}`);
      return res.status(400).json({
        error: 'Message blocked by safety guardrails',
        category: guardrailResult.category,
        message: guardrailResult.reason,
      });
    }

    if (guardrailResult.category === 'pii_masked') {
      console.warn('[Guardrails] PII detected and masked in latest message.');
      lastMessage.content = guardrailResult.sanitizedContent;
    }
  }

  // Set SSE headers
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
    // AI Template Autofill: deterministic (non-LLM) interception for
    // "fill <template>.pptx with <person>'s information" style requests.
    // Never invokes the AI model for this — pure DB lookups + XML
    // substitution, so document data can never be hallucinated.
    const reportReply = await handleReportGeneration(messages);
    if (reportReply) {
      const tokens = reportReply.match(/(\S+\s*|\n+)/g) || [reportReply];
      for (const token of tokens) {
        sendEvent({ text: token });
        await new Promise(r => setTimeout(r, 15));
      }
      sendEvent({ done: true });
      res.end();
      return;
    }

    // Enrich system prompt with live PostgreSQL Task Management records
    let enrichedSystemPrompt = systemInstruction || `You are Synthie AI, a conversational assistant integrated with the Task Management System's PostgreSQL database (the same database visible through Adminer).`;

    enrichedSystemPrompt += `\n\nCORE BEHAVIOR:
- Respond naturally, like a helpful human assistant — not a keyword-matching bot. Understand what the user MEANS, not just the specific words they used. Treat differently-worded requests with the same underlying intent identically (e.g. "Show my pending work", "Anything left today?", and "What do I still need to finish?" are the same request).
- Maintain context across the whole conversation. Resolve references like "that project", "those tasks", "the first one", or "do the same for John" using what was already discussed — don't make the user repeat information they already gave you.
- Follow-up questions inherit context from earlier turns. If the user asks about someone/something and then asks a follow-up ("Which ones are overdue?", "What about her?"), understand it refers to what was just discussed.
- Give concise answers by default; offer more detail if asked.
- Ask a clarifying question only when genuinely ambiguous (e.g. two people/projects could match) — never ask for information you can already infer from context.
- Be friendly and professional, not robotic. Never reply with a generic self-introduction unless the user explicitly asks who you are or what you can do.
- Respond in whatever language the user writes in or explicitly requests, even if it differs from the language of the database context below.
- Never fall back to a generic templated response (e.g. a vague "here are the key considerations" analysis) when you don't have a specific answer. If you genuinely don't know or the data isn't available, say so plainly instead of padding the response.
- When the user asks about a specific department, team, or category (e.g. "Operations", "DevOps", "Engineering", "Human Resources"), return ONLY information belonging to that exact category. Do not infer related categories, expand into other departments, or mix in results from anything else — if a database context section below is explicitly marked "STRICT FILTER APPLIED", it already contains only the matching records; treat that as the complete and only answer for that category.

DECISION PRIORITY FOR EVERY MESSAGE:
1. Casual conversation (greetings, small talk, opinions) → respond naturally, no database needed.
2. Basic/general knowledge question (not about this company's data) → answer directly from your own knowledge.
3. Work-related question (tasks, users, projects, deadlines, reports, statistics) → use the live database context provided below. NEVER invent, guess, or fabricate records, names, numbers, or statistics — if the requested data isn't present in the context below, say so plainly rather than making something up.
4. Template-fill request → handled separately before you ever see the message; if you're seeing this, it wasn't one.
5. If genuinely ambiguous → ask one concise clarifying question.`;

    const requestText = (lastMessage && typeof lastMessage.content === 'string') ? lastMessage.content : '';

    // Resolve model using Vercel AI SDK configuration — done early since
    // the intent router below needs a model instance to classify with.
    const resolved = resolveModel({ provider, model, apiKey });

    // LLM-based intent routing: decide whether this message needs live
    // database data, the document knowledge base (RAG), or neither.
    // `null` means classification failed/was skipped — falls back to
    // running BOTH context sources (today's pre-routing behavior),
    // so a classifier hiccup never makes the chatbot less capable.
    const route = resolved?.modelInstance
      ? await classifyIntent(messages.slice(-6), resolved.modelInstance)
      : null;
    console.log(`[IntentRouter] Route: ${route ?? 'fallback (both)'}`);

    // Strict category filtering: if the user's message names a specific
    // task tag (e.g. "Operations", "DevOps"), the task context section
    // below is REPLACED with a version containing ONLY matching records —
    // never appended alongside the full list — so the AI physically has
    // no other department's data available to accidentally mix in.
    if (route === 'database_query' || route === null) {
      const mentionedTaskTag = extractTaskTagMention(requestText);

      // Task Management PostgreSQL Database Grounding (Live Query)
      if (mentionedTaskTag) {
        const scopedTasks = await getTasksForTag(mentionedTaskTag);
        enrichedSystemPrompt += `\n\n${formatTaskTagContext(mentionedTaskTag, scopedTasks)}`;
      } else {
        const taskContext = await taskDbService.formatContextForPrompt();
        enrichedSystemPrompt += `\n\n${taskContext}`;
      }
    }

    // Shared knowledge-base retrieval (RAG) — additive to the task
    // context above; a retrieval failure must never break normal chat.
    if (route === 'rag' || route === null) {
      try {
        const relevantChunks = await retrieveRelevantChunks(requestText, { topK: 5 });
        const ragContext = formatChunksForPrompt(relevantChunks);
        if (ragContext) {
          enrichedSystemPrompt += `\n\n${ragContext}`;
        }
      } catch (ragErr) {
        console.warn('[RAG] Retrieval failed — continuing without knowledge-base context:', ragErr.message);
      }
    }

    if (resolved && resolved.modelInstance) {
      console.log(`[Vercel AI SDK] Streaming with provider: ${resolved.resolvedProvider}, model: ${resolved.resolvedModel}`);

      // Format & sanitize messages for AI SDK (removes any empty placeholders that cause 400 Bad Request)
      console.log(`[Conversation History] Total messages received from frontend: ${Array.isArray(messages) ? messages.length : 0}`);

      const cleanedMessages = (Array.isArray(messages) ? messages : [])
        .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.trim()
        }));

      // Messages beyond the last 20 would previously just be dropped.
      // Instead, condense them into a short summary (via the AI itself,
      // guardrail-checked before use) and keep it as extra system-prompt
      // context, while the last 20 messages still go through in full.
      const olderMessages = cleanedMessages.slice(0, -20);
      const validMessages = cleanedMessages.slice(-20); // Keep last 20 messages verbatim for context

      if (olderMessages.length > 0) {
        const summary = await summarizeOlderMessages(olderMessages, resolved.modelInstance);
        if (summary) {
          enrichedSystemPrompt += `\n\n### SUMMARY OF EARLIER CONVERSATION (${olderMessages.length} older messages, condensed):\n${summary}`;
          console.log(`[ConversationSummarizer] Summarized ${olderMessages.length} older messages into system prompt.`);
        } else {
          console.log(`[ConversationSummarizer] No usable summary for ${olderMessages.length} older messages (skipped or blocked).`);
        }
      }

      console.log(`[Conversation History] Messages being sent to AI (after slice): ${validMessages.length}`);
      console.log('[Conversation History] Content of messages sent to AI:', JSON.stringify(validMessages, null, 2));

      const aiMessages = validMessages.length > 0 ? validMessages : [{ role: 'user', content: 'Hello' }];

      try {
        // Call Vercel AI SDK streamText
        const result = streamText({
          model: resolved.modelInstance,
          system: enrichedSystemPrompt,
          messages: aiMessages,
          temperature: Number(temperature) || 0.7
        });

        let streamedAnyTokens = false;
        // Stream text chunks directly as they arrive from the AI provider
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
        console.warn('[AI SDK Stream Error - Falling back]:', streamErr.message);
      }
    }

    // Fallback: Built-in smart assistant stream (Offline / No Key mode)
    console.log('[AI Stream] Using built-in smart assistant engine fallback');
    const lastMsg = messages[messages.length - 1]?.content || '';
    const reply = await generateBuiltinReply(lastMsg);

    const tokens = reply.match(/(\S+\s*|\n+)/g) || [reply];
    for (const token of tokens) {
      sendEvent({ text: token });
      await new Promise(r => setTimeout(r, 15));
    }
    sendEvent({ done: true });
    res.end();

  } catch (err) {
    console.error('[AI Stream Critical Error]:', err);
    sendEvent({ error: err.message || 'Internal server error during chat stream' });
    sendEvent({ done: true });
    res.end();
  }
});

async function generateBuiltinReply(prompt) {
  const p = prompt.toLowerCase();

  // Check Task Database queries first (queries live PostgreSQL)
  const taskReply = await taskDbService.generateOfflineReply(prompt);
  if (taskReply) {
    return taskReply;
  }

  if (p.includes('q3') || p.includes('financial') || p.includes('report')) {
    return `### **Q3 Financial Performance Summary**

Here is the breakdown of the **Q3 Financial Report**:

* **Total Revenue:** $18.4M (+12.6% YoY growth)
* **Net Operating Margin:** 24.2% (an increase of 180 bps from Q2)
* **EBITDA:** $4.8M vs. $4.1M target
* **Customer Acquisition Cost (CAC):** Decreased by 8.4% to $342
* **Key Growth Drivers:**
  1. Expansion in enterprise AI subscription tiers (+34%).
  2. Enhanced operational efficiency and lower cloud compute costs.

> **Executive Note:** All division benchmarks for Q3 have been exceeded. The full PDF audit is available in the reporting portal.`;
  }

  if (p.includes('meeting') || p.includes('takeaway') || p.includes('takeaways')) {
    return `Based on the meeting notes, here are the key takeaways:

1. **Q4 Marketing Budget:** Approved with a **15% increase** focused on product-led growth.
2. **Mobile App Feature:** Development is on track for a **November release**.
3. **Design Team Sync:** Scheduled follow-up for Tuesday at 10:00 AM to review finalized UI components.
4. **Action Items:**
   - Engineering to finalize API contracts by Friday.
   - Product team to circulate user feedback synthesis.`;
  }

  if (p.includes('code') || p.includes('python') || p.includes('javascript') || p.includes('function') || p.includes('stream')) {
    return `Here is a clean implementation using the **Vercel AI SDK**:

\`\`\`javascript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Stream text using Vercel AI SDK
const result = streamText({
  model: openai('gpt-4o-mini'),
  messages: [{ role: 'user', content: 'Hello AI!' }],
});

for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}
\`\`\`

Let me know if you would like me to customize this further!`;
  }

  return `I'm **Synthie AI**, your intelligent corporate and technical assistant powered by the **Vercel AI SDK** with direct access to your **Task Management Database**.

I can assist you with:
- **Live Database Queries**: Ask about tasks, deadlines, workloads, and completion rates.
- **Financial & Data Analysis**: Summarizing reports, quarterly trends, and KPIs.
- **Meeting Synthesis**: Extracting action items and key decisions.
- **Code & Architecture**: Designing clean software components and debugging issues.

How can I help you today?`;
}

// Shared knowledge-base document endpoints (RAG) — plain JSON, not SSE.
app.post('/api/documents/upload', (req, res) => {
  documentUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const result = await ingestDocument({
        filePath: req.file.path,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      });
      res.json(result);
    } catch (ingestErr) {
      console.error('[Documents] Ingestion failed:', ingestErr);
      res.status(500).json({ error: ingestErr.message });
    }
  });
});

app.get('/api/documents', async (req, res) => {
  try {
    const documents = await Document.findAll({
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'originalFilename', 'status', 'chunkCount', 'createdAt'],
    });
    res.json(documents);
  } catch (err) {
    console.error('[Documents] List failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    await DocumentChunk.destroy({ where: { documentId: document.id } });
    const storedPath = path.join(UPLOADED_DOCS_DIR, document.storedFilename);
    await document.destroy();
    await fsSync.promises.unlink(storedPath).catch(() => {});
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Documents] Delete failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Re-scans uploaded-documents/ for files not yet in the database (e.g.
// dropped in manually rather than via the upload endpoint) and ingests
// them. Also run once automatically on server startup, below.
app.post('/api/documents/sync', async (req, res) => {
  try {
    const result = await syncUploadedFolder(UPLOADED_DOCS_DIR);
    res.json(result);
  } catch (err) {
    console.error('[Documents] Sync failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serves AI Template Autofill output files as forced downloads
app.use('/generated-files', (req, res, next) => {
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(decodeURIComponent(req.path))}"`);
  next();
}, express.static(path.join(__dirname, 'generated-files')));

app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Fallback all other routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Synthie AI Server running on http://localhost:${PORT} (Vercel AI SDK Integrated)`);

    // Ingest any files dropped directly into uploaded-documents/ since
    // the last run. Runs in the background so it never delays the
    // server from accepting requests.
    syncUploadedFolder(UPLOADED_DOCS_DIR)
      .then(({ ingested, skipped }) => {
        if (ingested.length > 0) {
          console.log(`[Documents] Startup sync: ingested ${ingested.length} file(s) found in uploaded-documents/`, ingested.map(i => `${i.filename} (${i.status})`));
        }
        if (skipped.length > 0) {
          console.log(`[Documents] Startup sync: skipped ${skipped.length} file(s)`, skipped);
        }
      })
      .catch((err) => console.warn('[Documents] Startup sync failed:', err.message));
  });
}

export default app;
