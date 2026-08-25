# 🤖 Synthie AI - Intelligent Chatbot Application

A fully functional, modern corporate AI chatbot application faithfully built from the design specifications in [`UI/DESIGN.md`](./UI/DESIGN.md) and [`UI/code.html`](./UI/code.html).

---

## 🌟 Key Features

### 1. 🎨 Faithful & Responsive Design
- **Exact Palette:** Implements the Deep Indigo brand palette (`#1f108e` / `#3730a3`), surface containers (`#f8f9ff`, `#eff4ff`, `#d5e3fc`), and crisp borders.
- **Typography:** Uses Google Fonts **Inter** for clean UI text and **JetBrains Mono** for AI code blocks and real-time streaming tokens.
- **Chat Geometry:** Directional message bubbles with 2xl curves and tailored corner radii (`rounded-tr-sm` for user bubbles, `rounded-tl-sm` for AI bubbles).
- **Responsive Layout:** Responsive top app bar, collapsible navigation drawer on mobile, and centered 800px max-width conversation stream.

### 2. ⚡ Complete Chatbot Functionality
- **Streaming Tokens:** Real-time token delivery with animated blinking cursor (`.typing-cursor`).
- **Rich Markdown Support:** Formats headers, bold/italic, ordered/unordered lists, blockquotes, tables, and syntax-highlighted code blocks.
- **1-Click Code Copy:** Dedicated copy buttons on every code block and message.
- **Feedback Reactions:** Interactive Thumbs Up / Thumbs Down feedback controls.
- **Smart Conversations:** Create new chat threads, switch between sessions, delete conversations, and export entire chats as Markdown.
- **Error Handling & Retry:** Graceful network error handling with retry actions.
- **File Attachments:** Interactive attachment upload with chip previews.
- **Quick Starter Cards:** One-click enterprise prompt cards for Q3 financial summaries, meeting takeaways, and code generation.

### 3. 🧠 Multi-Provider AI Integration
- **Google Gemini API:** Native streaming integration with `gemini-2.5-flash`, `gemini-1.5-pro`, and `gemini-1.5-flash`.
- **OpenAI API:** Direct support for `gpt-4o`, `gpt-4o-mini`, or any compatible completions API.
- **Built-in Smart Assistant Engine:** High-quality offline fallback engine ready to respond out of the box without requiring external API keys.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## ⚙️ Configuration & API Keys

You can configure API keys in two convenient ways:

### Option A: Via the In-App Settings Modal (Recommended)
1. Click the **Settings** icon in the top header or sidebar.
2. Select your desired AI model and paste your Google Gemini or OpenAI API Key.
3. Adjust the creativity **temperature** and **system instructions** if desired.
4. Click **Save Settings** (keys are saved securely in your local browser storage).

### Option B: Via Server Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 📁 Architecture & File Structure

```
meldcx/
├── server.js                  # Express server & Server-Sent Events (SSE) AI streaming proxy
├── package.json               # Project metadata and dependencies
├── .env.example               # Environment variables template
├── tests/
│   └── test_suite.js          # Automated end-to-end integration tests
├── public/                    # Frontend client assets
│   ├── index.html             # Application markup and Tailwind config
│   ├── css/
│   │   └── custom.css         # Animations, Markdown styling, and custom scrollbars
│   └── js/
│       ├── app.js             # Application bootstrap and main orchestrator
│       ├── config.js          # App constants, models, prompt cards, and FAQ data
│       ├── ai/
│       │   ├── ai-service.js      # Main AI coordinator & AbortController
│       │   ├── gemini-client.js   # Direct Google Gemini streaming client
│       │   ├── openai-client.js   # Direct OpenAI streaming client
│       │   └── builtin-engine.js  # Intelligent offline assistant
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
└── UI/                        # Original design reference assets
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
