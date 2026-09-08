# 🤖 Synthie AI - Intelligent Chatbot Application (Powered by Vercel AI SDK)

A fully functional, modern corporate AI chatbot application built with **Express.js**, **Vanilla JavaScript**, **Tailwind CSS**, and integrated with the **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`) for multi-model AI streaming, grounded live on a **PostgreSQL Task Management database**.

---

## 🌟 Key Features

### 1. ⚡ Vercel AI SDK Integration
- **Vercel AI SDK Core (`ai`)**: High-performance streaming with `streamText`.
- **Multi-Provider Support**:
  - **NVIDIA NIM (`@ai-sdk/openai`)**: Meta Llama 3.2 11B/90B Vision Instruct.
  - **Google Gemini (`@ai-sdk/google`)**: Gemini 2.5 Flash, Gemini 2.5 Pro.
  - **OpenAI (`@ai-sdk/openai`)**: GPT-4o Mini, GPT-4o.
  - **Built-in Offline Engine**: Fallback smart engine that functions without external keys.
- **Live PostgreSQL Grounding**: Every response is grounded on the same Task Management System database (users, tasks, tenants) shown in Adminer — no separate/duplicated data.

### 2. 🛡️ Safety Guardrails
Every incoming message is checked before it ever reaches the AI model:
- Blocks harmful/violent content and prompt-injection attempts.
- Blocks forbidden keywords (passwords, credit card numbers, SSNs, etc.).
- Detects and masks PII (emails, phone numbers, addresses) rather than passing it through raw — while leaving genuine database IDs (UUIDs) untouched.

### 3. 🧠 Conversation Summarization
Conversations aren't just truncated once they get long. Anything older than the last 20 messages is condensed by the AI into a short summary (itself guardrail-checked before use) and kept as context, so long conversations don't lose earlier details while staying fast and bounded in size.

### 4. 🎯 Strict Department/Category Filtering
Ask about a specific task category (e.g. "Operations", "DevOps", "HR") and the response is built from a database query scoped to **only** that category — not a generic dump the AI has to self-filter from. If nothing matches, it says so plainly instead of substituting unrelated tasks.

### 5. 📄 AI Template Autofill
Ask the bot to fill a `.pptx` template with a real person's information — by name, by the task they're assigned to, or by database ID:
> "Fill Reports.pptx with Keisha's information."

- Detects `{placeholders}` in the template and maps them to real database fields (name, email, status, task details, task counts, deadlines, etc.) — never invents missing data.
- Automatically appends a **chart slide** (bar, pie, or line — bar by default, others on request) visualizing the person's real task-status breakdown, generated as a hand-rolled PNG with zero external dependencies.
- Handles ambiguous requests (multiple people with the same name, templates that don't exist) by asking for clarification instead of guessing.
- Generated files are saved to `backend/generated-files/` and returned as a downloadable link in the chat — originals in `ppt-templates/` are never modified.

### 6. 🎨 Faithful & Responsive Design
- **Exact Palette:** Implements the Deep Indigo brand palette (`#1f108e` / `#3730a3`), surface containers (`#f8f9ff`, `#eff4ff`, `#d5e3fc`), and crisp borders.
- **Typography:** Uses Google Fonts **Inter** for clean UI text and **JetBrains Mono** for AI code blocks and real-time streaming tokens.
- **Chat Geometry:** Directional message bubbles with 2xl curves and tailored corner radii.
- **Responsive Layout:** Responsive top app bar, collapsible navigation drawer on mobile, and centered 800px max-width conversation stream.

### 7. ⚡ Complete Chatbot Functionality
- **Streaming Tokens:** Real-time token delivery with animated blinking cursor (`.typing-cursor`).
- **Rich Markdown Support:** Formats headers, bold/italic, ordered/unordered lists, blockquotes, tables, and syntax-highlighted code blocks.
- **1-Click Code Copy:** Dedicated copy buttons on every code block and message.
- **Feedback Reactions:** Interactive Thumbs Up / Thumbs Down feedback controls.
- **Smart Conversations:** Create new chat threads, switch between sessions, delete conversations — persisted in the browser's `localStorage`.
- **Error Handling & Retry:** Graceful network error handling with retry actions and generation cancellation.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create `backend/.env`:
```env
PORT=3000

# Vercel AI SDK Default Provider & Model Configuration
DEFAULT_AI_PROVIDER=nvidia
DEFAULT_AI_MODEL=meta/llama-3.2-11b-vision-instruct

# AI Provider API Keys
NVIDIA_API_KEY=nvapi-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...

# PostgreSQL Task Management Database (same DB shown in Adminer)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskdb
DB_USER=postgres
DB_PASSWORD=admin123
DB_DIALECT=postgres
```

### 3. Start the Server
```bash
npm start
```
This single process serves both the API and the frontend.

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔧 How to Change the AI Model or Provider

### Option 1: Via Environment Variables (No Code Rebuild)
Set `DEFAULT_AI_PROVIDER` and `DEFAULT_AI_MODEL` in `backend/.env`:
- **NVIDIA NIM**:
  ```env
  DEFAULT_AI_PROVIDER=nvidia
  DEFAULT_AI_MODEL=meta/llama-3.2-11b-vision-instruct
  ```
- **Google Gemini**:
  ```env
  DEFAULT_AI_PROVIDER=google
  DEFAULT_AI_MODEL=gemini-2.5-flash
  ```
- **OpenAI**:
  ```env
  DEFAULT_AI_PROVIDER=openai
  DEFAULT_AI_MODEL=gpt-4o-mini
  ```

### Option 2: In Centralized Configuration (`backend/src/ai-config.js`)
All model provider resolution is centralized in `backend/src/ai-config.js`. You can add new providers, custom endpoints, or adjust model definitions in this single file without modifying any UI code.

### Option 3: In the UI Settings Modal
Click the **Settings** gear icon in the UI to dynamically switch between configured AI models or supply a custom API key for the session.

---

## 📁 Architecture & File Structure

```
Chatbot/
├── backend/
│   ├── server.js                    # Express server, SSE streaming, request pipeline
│   ├── package.json                 # Dependencies (ai, @ai-sdk/openai, @ai-sdk/google, sequelize, jszip, etc.)
│   ├── .env                         # Environment variables (not committed)
│   ├── generated-files/             # AI Template Autofill output (gitignored)
│   ├── tests/
│   │   └── test_suite.js            # Automated end-to-end test suite
│   └── src/
│       ├── ai-config.js             # Centralized Vercel AI SDK provider factory & model registry
│       ├── database.js              # PostgreSQL (Sequelize) connection
│       ├── models/                  # Sequelize models: User, Task, Tenant
│       ├── taskdb-service.js        # Live task analytics, reports, offline query engine
│       ├── guardrails.js            # Harmful content / prompt injection / PII / keyword filtering
│       ├── conversationSummarizer.js # Summarizes conversation history beyond the last 20 messages
│       ├── departmentFilter.js      # Strict task-category (tag) filtering
│       ├── reportGenerationFlow.js  # AI Template Autofill conversational orchestrator
│       ├── personLookup.js          # Person/task database lookups for Template Autofill
│       ├── placeholderResolver.js   # Maps {placeholder} names to database fields
│       ├── pptxTemplater.js         # Reads/fills .pptx placeholders (JSZip + XML)
│       ├── pptxSlideBuilder.js      # Appends a new chart slide to a .pptx
│       ├── chartGenerator.js        # Hand-rolled PNG bar/pie/line chart renderer (zero dependencies)
│       └── ppt-templates/           # Source .pptx templates (never modified)
│
├── frontend/
│   └── public/                      # Static frontend, served by the backend
│       ├── index.html               # Application markup and Tailwind theme config
│       ├── css/
│       │   └── custom.css           # Animations, Markdown styling, and custom scrollbars
│       └── js/
│           ├── app.js                # Application bootstrap and main orchestrator
│           ├── config.js             # UI constants, models, prompt cards, and FAQ data
│           ├── ai/
│           │   ├── ai-service.js       # Streaming coordinator & AbortController
│           │   ├── builtin-engine.js   # Offline fallback engine (used only if the server is unreachable)
│           │   ├── gemini-client.js
│           │   ├── nvidia-client.js
│           │   └── openai-client.js
│           ├── chat/
│           │   ├── chat-manager.js     # Conversation state & session management
│           │   └── storage.js          # localStorage persistence layer
│           ├── ui/
│           │   ├── ui-renderer.js      # Chat bubble rendering, markdown, and auto-scroll
│           │   ├── modals.js           # Settings, History, FAQs, and Human Agent dialogs
│           │   └── event-handlers.js   # Keyboard shortcuts, auto-resize, file attachments
│           └── utils/
│               ├── markdown.js         # Markdown parser & code block enhancer
│               └── helpers.js          # Formatting, toast notifications, and clipboard
│
├── UI/                       # Design reference assets
│   ├── DESIGN.md
│   ├── code.html
│   └── screen.png
├── SETUP_GUIDE.md
└── vercel.json                # Deployment config
```

---

## 🧪 Testing

Run the automated test suite anytime with:
```bash
cd backend
node tests/test_suite.js
```

Note: the test suite expects the server to already be running, and its base URL (`http://localhost:3000`) is hardcoded rather than read from `.env` — if you change `PORT`, update `backend/tests/test_suite.js` to match.
