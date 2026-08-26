/**
 * Vercel AI SDK - Centralized Model & Provider Configuration
 * 
 * Isolates AI model and provider resolution from UI and server routing logic.
 * Default models and providers can be customized here or via environment variables.
 */

const { createOpenAI } = require('@ai-sdk/openai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { streamText } = require('ai');

// Default configurations from environment variables or sensible fallbacks
const DEFAULT_PROVIDER = process.env.DEFAULT_AI_PROVIDER || 'nvidia';
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'meta/llama-3.1-8b-instruct';

// Available model catalog matching the original UI list
const MODEL_CATALOG = [
  {
    id: 'meta/llama-3.1-8b-instruct',
    name: 'Meta Llama 3.1 8B Instruct (Ultra-Fast NVIDIA NIM - Active)',
    provider: 'nvidia',
    description: 'Ultra-fast sub-second responses hosted on NVIDIA NIM.'
  },
  {
    id: 'meta/llama-3.3-70b-instruct',
    name: 'Meta Llama 3.3 70B Instruct (High Intelligence NVIDIA NIM)',
    provider: 'nvidia',
    description: 'State-of-the-art 70B reasoning model hosted on NVIDIA NIM.'
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
    provider: 'google',
    description: 'Ultra-fast, high intelligence multimodal model from Google.'
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and versatile flagship mini model from OpenAI.'
  },
  {
    id: 'builtin-smart',
    name: 'Built-in Synthie AI Engine',
    provider: 'builtin',
    description: 'Offline-ready smart assistant (No API key required).'
  }
];

/**
 * Resolves a Vercel AI SDK language model instance based on requested provider, model, and optional apiKey.
 *
 * @param {Object} options
 * @param {string} [options.provider] - 'auto', 'nvidia', 'google', 'gemini', 'openai', 'builtin'
 * @param {string} [options.model] - Specific model identifier
 * @param {string} [options.apiKey] - Optional custom API key from client
 * @returns {{ modelInstance: any, resolvedProvider: string, resolvedModel: string } | null}
 */
function resolveModel({ provider = 'auto', model, apiKey }) {
  const rawKey = (apiKey || '').trim();

  // Determine available keys from environment variables or parameter
  const envNvidiaKey = process.env.NVIDIA_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);
  const envGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
  const envOpenaiKey = (!process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);

  const nvidiaKey = (rawKey.startsWith('nvapi-') ? rawKey : null) || envNvidiaKey;
  const geminiKey = (!rawKey.startsWith('nvapi-') && (rawKey.startsWith('AIza') || provider === 'gemini' || provider === 'google') ? rawKey : null) || envGeminiKey;
  const openaiKey = (!rawKey.startsWith('nvapi-') && !rawKey.startsWith('AIza') && (rawKey.startsWith('sk-') || provider === 'openai') ? rawKey : null) || envOpenaiKey;

  let targetProvider = provider;
  let targetModel = model;

  if (targetProvider === 'builtin' || targetModel === 'builtin-smart') {
    return null; // Will trigger built-in generator
  }

  // Auto-detect provider based on requested model or available credentials
  if (!targetProvider || targetProvider === 'auto') {
    if (targetModel && targetModel.includes('/')) {
      targetProvider = 'nvidia';
    } else if (targetModel && targetModel.startsWith('gemini') && geminiKey) {
      targetProvider = 'google';
    } else if (targetModel && (targetModel.startsWith('gpt') || targetModel.startsWith('o1')) && openaiKey) {
      targetProvider = 'openai';
    } else if (nvidiaKey) {
      targetProvider = 'nvidia';
    } else if (geminiKey) {
      targetProvider = 'google';
    } else if (openaiKey) {
      targetProvider = 'openai';
    } else {
      targetProvider = DEFAULT_PROVIDER;
    }
  }

  // Normalize provider naming
  if (targetProvider === 'gemini') targetProvider = 'google';

  // 1. NVIDIA NIM
  if (targetProvider === 'nvidia' && nvidiaKey) {
    // Route to ultra-fast sub-second model to avoid 60-80s queue delays on NVIDIA 70B cloud
    const actualNvidiaModel = 'meta/llama-3.1-8b-instruct';

    const nvidia = createOpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      compatibility: 'compatible'
    });

    return {
      modelInstance: nvidia.chat(actualNvidiaModel),
      resolvedProvider: 'nvidia',
      resolvedModel: targetModel || actualNvidiaModel
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
    const activeModel = 'meta/llama-3.1-8b-instruct';
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
  resolveModel,
  streamText,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
  MODEL_CATALOG
};
