/**
 * Vercel AI SDK Configuration for Task Management System
 * 
 * Provides unified LLM resolution across NVIDIA NIM, Google Gemini, and OpenAI
 * with dynamic module loading and offline intelligent fallback.
 */

let aiModule = null;
let openaiModule = null;
let googleModule = null;

/**
 * Lazily load ES modules for Vercel AI SDK within CommonJS environment
 */
async function loadAIModules() {
  if (!aiModule) {
    aiModule = await import('ai');
  }
  if (!openaiModule) {
    openaiModule = await import('@ai-sdk/openai');
  }
  if (!googleModule) {
    googleModule = await import('@ai-sdk/google');
  }
  return {
    streamText: aiModule.streamText,
    createOpenAI: openaiModule.createOpenAI,
    createGoogleGenerativeAI: googleModule.createGoogleGenerativeAI
  };
}

const DEFAULT_PROVIDER = process.env.DEFAULT_AI_PROVIDER || 'nvidia';
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'meta/llama-3.2-11b-vision-instruct';

const MODEL_CATALOG = [
  {
    id: 'meta/llama-3.2-11b-vision-instruct',
    name: 'Meta Llama 3.2 11B Instruct (Active NVIDIA NIM)',
    provider: 'nvidia',
    description: 'Ultra-fast, high-intelligence reasoning model hosted on NVIDIA NIM.'
  },
  {
    id: 'meta/llama-3.2-90b-vision-instruct',
    name: 'Meta Llama 3.2 90B Instruct (High Intelligence NVIDIA NIM)',
    provider: 'nvidia',
    description: 'Deep reasoning model for high-intelligence task and operational analysis.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'google',
    description: 'High intelligence multimodal fast model from Google.'
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, versatile reasoning model from OpenAI.'
  }
];

function normalizeNvidiaModel(modelName) {
  if (!modelName) return 'meta/llama-3.2-11b-vision-instruct';
  if (modelName.includes('90b') || modelName.includes('70b')) {
    return 'meta/llama-3.2-90b-vision-instruct';
  }
  return 'meta/llama-3.2-11b-vision-instruct';
}

/**
 * Resolves model instance for Vercel AI SDK streamText
 */
async function resolveModel({ provider = 'auto', model, apiKey }) {
  const { createOpenAI, createGoogleGenerativeAI } = await loadAIModules();

  const envNvidiaKey = process.env.NVIDIA_API_KEY || (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);
  const nvidiaKey = (apiKey && apiKey.startsWith('nvapi-') ? apiKey : null) || envNvidiaKey;
  const geminiKey = (apiKey && apiKey.startsWith('AIza') ? apiKey : null) || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = (apiKey && apiKey.startsWith('sk-') ? apiKey : null) || (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') ? process.env.OPENAI_API_KEY : null);

  let targetProvider = provider;
  let targetModel = model;

  if (targetProvider === 'auto' || !targetProvider) {
    if (apiKey && apiKey.startsWith('AIza') || (targetModel && targetModel.startsWith('gemini'))) {
      targetProvider = 'google';
    } else if (apiKey && apiKey.startsWith('sk-') || (targetModel && targetModel.startsWith('gpt'))) {
      targetProvider = 'openai';
    } else if (apiKey && apiKey.startsWith('nvapi-') || (targetModel && (targetModel.includes('llama') || targetModel.includes('mistral') || targetModel.includes('deepseek')))) {
      targetProvider = 'nvidia';
    } else {
      targetProvider = DEFAULT_PROVIDER;
    }
  }

  // 1. NVIDIA NIM (Active)
  if (targetProvider === 'nvidia' && nvidiaKey) {
    const actualNvidiaModel = normalizeNvidiaModel(targetModel);
    const nvidia = createOpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      compatibility: 'compatible'
    });

    return {
      modelInstance: nvidia.chat(actualNvidiaModel),
      resolvedProvider: 'nvidia',
      resolvedModel: actualNvidiaModel
    };
  }

  // 2. Google Gemini (if key available)
  if (targetProvider === 'google' && geminiKey) {
    const selectedModel = (targetModel && targetModel.startsWith('gemini')) ? targetModel : 'gemini-2.5-flash';
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return {
      modelInstance: google(selectedModel),
      resolvedProvider: 'google',
      resolvedModel: selectedModel
    };
  }

  // 3. OpenAI (if key available)
  if (targetProvider === 'openai' && openaiKey) {
    const selectedModel = (targetModel && targetModel.startsWith('gpt')) ? targetModel : 'gpt-4o-mini';
    const openai = createOpenAI({ apiKey: openaiKey });
    return {
      modelInstance: openai.chat(selectedModel),
      resolvedProvider: 'openai',
      resolvedModel: selectedModel
    };
  }

  // 4. Default to active NVIDIA NIM model
  if (nvidiaKey) {
    const activeModel = 'meta/llama-3.2-11b-vision-instruct';
    const nvidia = createOpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      compatibility: 'compatible'
    });
    return {
      modelInstance: nvidia.chat(activeModel),
      resolvedProvider: 'nvidia',
      resolvedModel: activeModel
    };
  }

  return null;
}

module.exports = {
  loadAIModules,
  resolveModel,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
  MODEL_CATALOG
};
