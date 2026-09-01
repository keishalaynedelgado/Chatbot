import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import { resolveModel, streamText, DEFAULT_PROVIDER, DEFAULT_MODEL, MODEL_CATALOG } from './server/ai-config.js';
import taskDbService from './server/taskdb-service.js';
import { testConnection } from './server/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dxvwyapqtokxenyiliwy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_1yPDpLFJgcPu8vd6dy4l-w_xUUKwCrY';

// Cache for Supabase data to optimize speed
let employeesCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Fetch live employee records from Supabase
 */
async function fetchSupabaseEmployees() {
  const now = Date.now();
  if (employeesCache && (now - lastCacheTime < CACHE_TTL)) {
    return employeesCache;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        employeesCache = data;
        lastCacheTime = now;
        return data;
      }
    }
  } catch (err) {
    console.warn('[Supabase Fetch Error]:', err.message);
  }
  return employeesCache || [];
}

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
    scxConfigured: Boolean(process.env.SCX_API_KEY),
    nvidiaConfigured: Boolean(nvidiaKey),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('nvapi-') && !process.env.OPENAI_API_KEY.startsWith('sk-scx-')),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY)
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
  console.log('bading', req.body)
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
    // Enrich system prompt with live Supabase records and PostgreSQL Task Management records
    let enrichedSystemPrompt = systemInstruction || `You are Synthie AI, an intelligent corporate and technical assistant with access to the organization's connected databases, knowledge sources, and available tools.
Primary Objective:
Your highest priority is to answer the user's latest request accurately, directly, and naturally. Never replace an answer with an introduction, welcome message, or capability list.
Core Behavior:
- Answer the user's question first.
- Respond naturally to greetings and casual conversation.
- Answer general knowledge questions accurately.
- Provide clear explanations for technical questions.
- Maintain context throughout the conversation.
- Forbidden: Never start every response with "I'm Synthie AI...", never repeat capabilities unless asked.`;

    // 1. Task Management PostgreSQL Database Grounding (Live Query)
    const taskContext = await taskDbService.formatContextForPrompt();
    enrichedSystemPrompt += `\n\n${taskContext}`;

    // 2. Supabase Live Employee Database Grounding
    const employees = await fetchSupabaseEmployees();
    if (employees && employees.length > 0) {
      const summaryList = employees.map(e =>
        `- ${e.first_name} ${e.last_name} | Role: ${e.position} | Dept: ${e.department} | Salary: $${Number(e.salary).toLocaleString()} | Location: ${e.location} | Status: ${e.status} | Email: ${e.email}`
      ).join('\n');

      enrichedSystemPrompt += `\n\n### LIVE SUPABASE DATABASE CONTEXT (Table: public.employees, Total: ${employees.length} records):
${summaryList}

INSTRUCTIONS FOR DATABASE QUERIES:
- When asked about tasks, deadlines, workloads, pending tasks, or task completion rates, use the live PostgreSQL Task Management data.
- When asked about employees, departments, salaries, or company staff, use the Supabase Employee database.
- Present answers in clean, professional Markdown tables or bulleted lists.`;
    }

    // Resolve model using Vercel AI SDK configuration
    const resolved = resolveModel({ provider, model, apiKey });

    if (resolved && resolved.modelInstance) {
      console.log(`[Vercel AI SDK] Streaming with provider: ${resolved.resolvedProvider}, model: ${resolved.resolvedModel}`);

      // Format & sanitize messages for AI SDK (removes any empty placeholders that cause 400 Bad Request)
      const validMessages = (Array.isArray(messages) ? messages : [])
        .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
        .slice(-20) // Keep last 20 messages for context
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.trim()
        }));

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
    const reply = await generateBuiltinReply(lastMsg, employees);

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

async function generateBuiltinReply(prompt, employees = []) {
  const p = prompt.toLowerCase();

  // Check Task Database queries first (queries live PostgreSQL)
  const taskReply = await taskDbService.generateOfflineReply(prompt);
  if (taskReply) {
    return taskReply;
  }

  if ((p.includes('employee') || p.includes('staff') || p.includes('database') || p.includes('engineering') || p.includes('salary')) && employees.length > 0) {
    let filtered = employees;
    if (p.includes('engineering')) filtered = employees.filter(e => e.department.toLowerCase() === 'engineering');
    if (p.includes('design')) filtered = employees.filter(e => e.department.toLowerCase() === 'design');
    if (p.includes('finance')) filtered = employees.filter(e => e.department.toLowerCase() === 'finance');
    if (p.includes('marketing')) filtered = employees.filter(e => e.department.toLowerCase() === 'marketing');

    const rows = filtered.map(e => `| ${e.first_name} ${e.last_name} | ${e.position} | ${e.department} | $${Number(e.salary).toLocaleString()} | ${e.location} | ${e.status} |`).join('\n');
    return `### **Live Supabase Employee Directory**\n\nFound **${filtered.length}** records in the database:\n\n| Name | Position | Department | Salary | Location | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows}\n\n*Data fetched live from Supabase \`public.employees\` table.*`;
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

  if (p === 'hi' || p === 'hello' || p === 'hey' || p.startsWith('hi ') || p.startsWith('hello ') || p.startsWith('hey ')) {
    return `Hi! How can I help you today?`;
  }

  if (p.includes('what is 2 + 2') || p === '2+2' || p === '2 + 2') {
    return `4`;
  }

  if (p.includes('what can you do') || p.includes('your capabilities') || p.includes('who are you') || p.includes('what are you')) {
    return `I am **Synthie AI**, an intelligent corporate and technical assistant with access to connected databases (Supabase employee records and PostgreSQL task management), technical problem solving, software engineering, and data analysis.\n\nHow can I assist you?`;
  }

  return `How can I assist you with that? Let me know the specific questions or details you'd like to explore.`;
}

app.use(express.static(path.join(__dirname, 'public')));

// Fallback all other routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Synthie AI Server running on http://localhost:${PORT} (Vercel AI SDK Integrated)`);
  });
}

export default app;
