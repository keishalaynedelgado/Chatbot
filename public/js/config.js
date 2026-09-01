/**
 * Synthie AI - Application Configuration & Defaults
 */

const CONFIG = {
  APP_NAME: 'Synthie AI',
  VERSION: '1.0.0',
  DEFAULT_PROVIDER: 'auto', // 'auto', 'nvidia', 'gemini', 'openai', 'builtin'
  DEFAULT_MODEL: 'meta/llama-3.2-11b-vision-instruct',

  MODELS: [
    {
      id: 'MiniMax-M2.7',
      name: 'MiniMax M2.7 (SCX AI - High Intelligence)',
      provider: 'scx',
      description: 'High intelligence reasoning and conversation model hosted on SCX AI.'
    },
    {
      id: 'meta/llama-3.2-11b-vision-instruct',
      name: 'Meta Llama 3.2 11B Instruct (Ultra-Fast NVIDIA NIM - Active)',
      provider: 'nvidia',
      description: 'Ultra-fast sub-second responses hosted on NVIDIA NIM.'
    },
    {
      id: 'meta/llama-3.2-90b-vision-instruct',
      name: 'Meta Llama 3.2 90B Instruct (High Intelligence NVIDIA NIM)',
      provider: 'nvidia',
      description: 'State-of-the-art 90B reasoning model hosted on NVIDIA NIM.'
    },
    {
      id: 'deepseek-ai/deepseek-coder-6.7b-instruct',
      name: 'DeepSeek Coder 6.7B (NVIDIA NIM)',
      provider: 'nvidia',
      description: 'Specialized code generation & technical synthesis.'
    },
    {
      id: 'mistralai/mixtral-8x7b-instruct-v0.1',
      name: 'Mixtral 8x7B (NVIDIA NIM)',
      provider: 'nvidia',
      description: 'High performance sparse mixture-of-experts model.'
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Google Gemini 2.5 Flash',
      provider: 'gemini',
      description: 'Ultra-fast, high intelligence multimodal model.'
    },
    {
      id: 'gpt-4o-mini',
      name: 'OpenAI GPT-4o Mini',
      provider: 'openai',
      description: 'Fast and versatile model from OpenAI.'
    },
    {
      id: 'builtin-smart',
      name: 'Built-in Synthie AI Engine',
      provider: 'builtin',
      description: 'Offline-ready smart assistant (No API key needed).'
    }
  ],

  DEFAULT_SYSTEM_PROMPT: `You are Synthie AI, an intelligent corporate and technical assistant with access to the organization's connected databases, knowledge sources, and available tools.

Primary Objective:
Your highest priority is to answer the user's latest request accurately, directly, and naturally. Never replace an answer with an introduction, welcome message, or capability list.

Core Behavior:
- Answer the user's question first.
- Respond naturally to greetings and casual conversation.
- Answer general knowledge questions accurately.
- Provide clear explanations for technical questions.
- Ask for clarification only when the request is genuinely ambiguous.
- Maintain context throughout the conversation.

Database & Tool Usage:
When a request requires company-specific or stored information—such as employees, departments, salaries, attendance, tasks, projects, reports, meetings, KPIs, inventory, customers, historical records, or other organizational data—use the appropriate database or tool to retrieve the information before answering.
- Always use the most relevant connected data source for the request.
- Base your answer only on retrieved data.
- Never fabricate records, numbers, names, or statistics.
- If no records exist, clearly state that no matching data was found.
- If access is unavailable, explain that you cannot retrieve the data instead of pretending you did.
- If multiple databases contain relevant information, combine the results into a single coherent answer.

General Knowledge:
If the user's question does not require company data, answer normally using your general knowledge.

Technical Assistance:
Help with programming, debugging, software architecture, SQL and databases, APIs and integrations, documentation, data analysis, and system design. Provide practical, accurate solutions with examples when helpful.

Response Style:
- Friendly and professional. Conversational, not robotic.
- Short answers for simple questions. Detailed answers for complex questions.
- Use bullet points only when they improve readability.

Forbidden Behavior:
- Never start every response with "I'm Synthie AI..."
- Never repeat your capabilities automatically.
- Never ignore the user's actual question.
- Never claim to have accessed a database or tool unless you actually used it.
- Never invent company data or database results.
- Never return a generic introduction instead of answering.`,

  STARTER_PROMPTS: [
    {
      title: "Pending Tasks Report",
      desc: "Query PostgreSQL for active pending items & status breakdown",
      prompt: "How many tasks are currently pending in the database?",
      icon: "task_alt"
    },
    {
      title: "Team Workload & Assignments",
      desc: "Analyze task volume and distribution across team members",
      prompt: "Which users have the most assigned tasks and what is their current workload?",
      icon: "groups"
    },
    {
      title: "Task Progress & Insights",
      desc: "Generate summary of completion rates, deadlines & bottlenecks",
      prompt: "Give me a summary of task progress, completion rates, and overdue tasks.",
      icon: "insights"
    },
    {
      title: "Engineering Staff Directory",
      desc: "Query Supabase database for engineering roles and compensation",
      prompt: "Show me all employees in the Engineering department from the database.",
      icon: "badge"
    }
  ],

  FAQS: [
    {
      question: "How do I configure my NVIDIA NIM, Gemini, or OpenAI API Key?",
      answer: "Click on 'Settings' in the top bar or left navigation sidebar. Enter your API key in the corresponding field and click 'Save Settings'. Your key is saved securely and used for instant streaming."
    },
    {
      question: "Can I use Synthie AI without an API Key?",
      answer: "Yes! Synthie AI comes with an integrated Built-in Engine that generates contextual smart responses, summaries, code samples, and business analysis without requiring any external API key."
    },
    {
      question: "Does Synthie AI support code highlighting and formatting?",
      answer: "Yes, Synthie AI provides rich Markdown rendering, table support, blockquotes, and syntax-highlighted code blocks with 1-click clipboard copying."
    },
    {
      question: "How do I start a new conversation or view chat history?",
      answer: "Click the 'New Chat' button at the top of the sidebar to start a fresh thread. Click 'History' to browse, resume, or export previous conversations."
    }
  ]
};

window.CONFIG = CONFIG;
