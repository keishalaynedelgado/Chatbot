const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  const nvidiaKey = process.env.NVIDIA_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    nvidiaConfigured: Boolean(nvidiaKey),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('nvapi-')),
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY)
  });
});

// Stream endpoint for proxying AI requests safely
app.post('/api/chat/stream', async (req, res) => {
  const { messages, provider = 'auto', apiKey, model, systemInstruction, temperature = 0.7 } = req.body;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const rawKey = apiKey || '';
    const nvidiaKey = (rawKey.startsWith('nvapi-') ? rawKey : null) || 
                      process.env.NVIDIA_API_KEY || 
                      (process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);

    const geminiKey = (!rawKey.startsWith('nvapi-') ? rawKey : null) || process.env.GEMINI_API_KEY;
    const openaiKey = (!rawKey.startsWith('nvapi-') ? rawKey : null) || 
                      (!process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);

    // Fetch live Supabase records to ground responses with 100% accurate data
    let enrichedSystemPrompt = systemInstruction || 'You are Synthie AI, an intelligent, professional, and helpful enterprise AI assistant.';
    const employees = await fetchSupabaseEmployees();
    if (employees && employees.length > 0) {
      const summaryList = employees.map(e => 
        `- ${e.first_name} ${e.last_name} | Role: ${e.position} | Dept: ${e.department} | Salary: $${Number(e.salary).toLocaleString()} | Location: ${e.location} | Status: ${e.status} | Email: ${e.email}`
      ).join('\n');

      enrichedSystemPrompt += `\n\n### LIVE SUPABASE DATABASE CONTEXT (Table: public.employees, Total: ${employees.length} records):
${summaryList}

INSTRUCTIONS FOR SUPABASE DATABASE QUERIES:
- You have direct live access to the Supabase employee database above.
- When the user asks about employees, team members, departments, salaries, compensation, locations, or specific staff members (e.g. Sophia Chen, Alexander Wright, Elena Rostova, etc.), use the exact facts and figures from this database.
- Present answers in clean, professional Markdown tables or bulleted lists.
- If asked about statistics (e.g. total headcount, average salary, highest paid, counts per department), compute them accurately from this data.`;
    }

    // 1. NVIDIA NIM Provider
    if (provider !== 'builtin' && (provider === 'nvidia' || (nvidiaKey && (!geminiKey && !openaiKey || provider === 'auto' || model?.includes('/') || rawKey.startsWith('nvapi-'))))) {
      const selectedModel = (model && model.includes('/')) ? model : 'meta/llama-3.1-8b-instruct';
      console.log(`[NVIDIA NIM] Streaming with model: ${selectedModel}`);

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nvidiaKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: enrichedSystemPrompt },
            ...messages
          ],
          temperature: Number(temperature) || 0.7,
          max_tokens: 2048,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[NVIDIA Error]', response.status, errText);
        sendEvent({ error: `NVIDIA API Error (${response.status}): ${errText}` });
        sendEvent({ done: true });
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed.choices?.[0]?.delta?.content || '';
              if (text) {
                sendEvent({ text });
              }
            } catch (e) {}
          }
        }
      }

      sendEvent({ done: true });
      res.end();
      return;
    }

    // 2. Google Gemini Provider
    if (provider === 'gemini' || (provider === 'auto' && geminiKey)) {
      const selectedModel = model || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${geminiKey}`;

      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const bodyPayload = {
        contents,
        systemInstruction: {
          parts: [{ text: enrichedSystemPrompt }]
        },
        generationConfig: {
          temperature: Number(temperature) || 0.7,
          maxOutputTokens: 2048,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        sendEvent({ error: `Gemini API Error (${response.status}): ${errorText}` });
        sendEvent({ done: true });
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textChunk) {
                sendEvent({ text: textChunk });
              }
            } catch (e) {}
          }
        }
      }

      sendEvent({ done: true });
      res.end();
      return;
    } 
    
    // 3. OpenAI Provider
    if (provider === 'openai' || (provider === 'auto' && openaiKey)) {
      const selectedModel = model || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: enrichedSystemPrompt },
            ...messages
          ],
          temperature: Number(temperature) || 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        sendEvent({ error: `OpenAI API Error (${response.status}): ${errText}` });
        sendEvent({ done: true });
        return res.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed.choices?.[0]?.delta?.content || '';
              if (text) {
                sendEvent({ text });
              }
            } catch (e) {}
          }
        }
      }

      sendEvent({ done: true });
      res.end();
      return;
    }

    // 4. Fallback: Builtin smart assistant stream
    const lastMsg = messages[messages.length - 1]?.content || '';
    const reply = generateBuiltinReply(lastMsg, employees);

    const tokens = reply.match(/(\S+\s*|\n+)/g) || [reply];
    for (const token of tokens) {
      sendEvent({ text: token });
      await new Promise(r => setTimeout(r, 15));
    }
    sendEvent({ done: true });
    res.end();

  } catch (err) {
    sendEvent({ error: err.message || 'Internal server error during chat stream' });
    sendEvent({ done: true });
    res.end();
  }
});

function generateBuiltinReply(prompt, employees = []) {
  const p = prompt.toLowerCase();

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

  if (p.includes('code') || p.includes('python') || p.includes('javascript') || p.includes('function')) {
    return `Here is a clean implementation for your request:

\`\`\`javascript
/**
 * Asynchronously stream tokens from an AI model
 * @param {string} prompt - The user question
 * @returns {Promise<void>}
 */
async function streamAIResponse(prompt) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    console.log(decoder.decode(value));
  }
}
\`\`\`

Let me know if you would like me to customize this further!`;
  }

  return `I'm **Synthie AI**, your intelligent corporate and technical assistant with direct access to your **Supabase Database**.

I can assist you with:
- **Live Database Queries**: Ask about employees, salaries, departments, and roles in Supabase.
- **Financial & Data Analysis**: Summarizing reports, quarterly trends, and KPIs.
- **Meeting Synthesis**: Extracting action items and key decisions.
- **Code & Architecture**: Designing clean software components and debugging issues.

How can I help you today?`;
}

// Fallback all other routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Synthie AI Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
