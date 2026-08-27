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

  DEFAULT_SYSTEM_PROMPT: `You are Synthie AI, an intelligent, professional, and helpful enterprise AI assistant.
Your goal is to provide accurate, articulate, and well-structured answers.
Use clear Markdown formatting with headers, bullet points, and code blocks where appropriate.
Maintain a polite, competent, and confident tone.`,

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
