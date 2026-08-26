# 🤖 Synthie AI - Intelligent Chatbot Application (Powered by Vercel AI SDK)

A fully functional, modern corporate AI chatbot application built with **Express.js**, **Vanilla JavaScript**, **Tailwind CSS**, and integrated with the **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`) for multi-model AI streaming and Supabase database grounding.

---

## 🌟 Key Features

### 1. ⚡ Vercel AI SDK Integration
- **Vercel AI SDK Core (`ai`)**: High-performance streaming with `streamText`.
- **Multi-Provider Support**:
  - **NVIDIA NIM (`@ai-sdk/openai`)**: Meta Llama 3.1 8B, Meta Llama 3.3 70B, DeepSeek Coder 6.7B, Mixtral 8x7B.
  - **Google Gemini (`@ai-sdk/google`)**: Gemini 2.5 Flash, Gemini 1.5 Pro.
  - **OpenAI (`@ai-sdk/openai`)**: GPT-4o Mini, GPT-4o.
  - **Built-in Offline Engine**: Fallback smart engine that functions without external keys.
- **Live Supabase Grounding**: Real-time context enrichment from `public.employees` database.

### 2. 🎨 Faithful & Responsive Design
- **Exact Palette:** Implements the Deep Indigo brand palette (`#1f108e` / `#3730a3`), surface containers (`#f8f9ff`, `#eff4ff`, `#d5e3fc`), and crisp borders.
- **Typography:** Uses Google Fonts **Inter** for clean UI text and **JetBrains Mono** for AI code blocks and real-time streaming tokens.
- **Chat Geometry:** Directional message bubbles with 2xl curves and tailored corner radii.
- **Responsive Layout:** Responsive top app bar, collapsible navigation drawer on mobile, and centered 800px max-width conversation stream.

### 3. ⚡ Complete Chatbot Functionality
- **Streaming Tokens:** Real-time token delivery with animated blinking cursor (`.typing-cursor`).
- **Rich Markdown Support:** Formats headers, bold/italic, ordered/unordered lists, blockquotes, tables, and syntax-highlighted code blocks.
- **1-Click Code Copy:** Dedicated copy buttons on every code block and message.
- **Feedback Reactions:** Interactive Thumbs Up / Thumbs Down feedback controls.
- **Smart Conversations:** Create new chat threads, switch between sessions, delete conversations, and export entire chats as Markdown.
- **Error Handling & Retry:** Graceful network error handling with retry actions and generation cancellation.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your preferred model keys:
```env
PORT=3000

# Vercel AI SDK Default Provider & Model Configuration
DEFAULT_AI_PROVIDER=nvidia
DEFAULT_AI_MODEL=meta/llama-3.1-8b-instruct

# AI Provider API Keys
NVIDIA_API_KEY=nvapi-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...

# Supabase Live Database Integration
SUPABASE_URL=https://dxvwyapqtokxenyiliwy.supabase.co
SUPABASE_KEY=sb_publishable_1yPDpLFJgcPu8vd6dy4l-w_xUUKwCrY
```

### 3. Start the Server
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔧 How to Change the AI Model or Provider

### Option 1: Via Environment Variables (No Code Rebuild)
Set `DEFAULT_AI_PROVIDER` and `DEFAULT_AI_MODEL` in `.env`:
- **NVIDIA NIM (Llama 3.3 70B)**:
  ```env
  DEFAULT_AI_PROVIDER=nvidia
  DEFAULT_AI_MODEL=meta/llama-3.3-70b-instruct
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

### Option 2: In Centralized Configuration (`server/ai-config.js`)
All model provider resolution is centralized in [`server/ai-config.js`](file:///c:/Users/Shirley/OneDrive/Documents/meldcx/server/ai-config.js). You can add new providers, custom endpoints, or adjust model definitions in this single file without modifying any UI code.

### Option 3: In the UI Settings Modal
Click the **Settings** gear icon in the UI to dynamically switch between configured AI models or supply a custom API key for the session.

---

## 📁 Architecture & File Structure

```
meldcx/
├── server/
│   └── ai-config.js           # Centralized Vercel AI SDK provider factory & model registry
├── server.js                  # Express server & Vercel AI SDK streamText handler
├── package.json               # Dependencies (ai, @ai-sdk/openai, @ai-sdk/google, etc.)
├── .env.example               # Environment variables template
├── tests/
│   └── test_suite.js          # Automated end-to-end test suite
├── public/                    # Frontend client assets
│   ├── index.html             # Application markup and Tailwind theme config
│   ├── css/
│   │   └── custom.css         # Animations, Markdown styling, and custom scrollbars
│   └── js/
│       ├── app.js             # Application bootstrap and main orchestrator
│       ├── config.js          # UI constants, models, prompt cards, and FAQ data
│       ├── ai/
│       │   ├── ai-service.js      # Streaming coordinator & AbortController
│       │   ├── builtin-engine.js  # Intelligent offline assistant fallback
│       │   ├── gemini-client.js   # Gemini direct client reference
│       │   └── openai-client.js   # OpenAI direct client reference
│       ├── chat/
│       │   ├── chat-manager.js    # Conversation state & session management
│       │   └── storage.js         # LocalStorage persistence layer
│       ├── ui/
│       │   ├── ui-renderer.js     # Chat bubble rendering, markdown, and auto-scroll
│       │   ├── modals.js          # Settings, History, FAQs, and Human Agent dialogs
│       │   └── event-handlers.js  # Keyboard shortcuts, auto-resize, file attachments
│       └── utils/
│           ├── markdown.js        # Markdown parser & code block enhancer
│           └── helpers.js         # Formatting, toast notifications, and clipboard
└── UI/                        # Design reference assets
    ├── DESIGN.md
    ├── code.html
    └── screen.png
```

---

## 🧪 Testing

Run the automated test suite anytime with:
```bash
node tests/test_suite.js
```
