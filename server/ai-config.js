/**
 * Synthie AI - AI Provider Configuration & Model Resolver
 * Powered by Vercel AI SDK (@ai-sdk/google, @ai-sdk/openai, ai)
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Default configurations from environment variables or sensible fallbacks
export const DEFAULT_PROVIDER = process.env.DEFAULT_AI_PROVIDER || 'nvidia';
export const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'meta/llama-3.2-11b-vision-instruct';

// Available model catalog matching the UI list
export const MODEL_CATALOG = [
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
    id: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    provider: 'google',
    description: 'Ultra-fast, high intelligence multimodal model from Google.'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    provider: 'google',
    description: 'Complex reasoning, analysis, and extensive context window.'
  },
  {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, affordable model for focused enterprise tasks.'
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Flagship high-intelligence multimodal model from OpenAI.'
  }
];

/**
 * Normalizes NVIDIA model name to currently active NIM endpoints
 */
function normalizeNvidiaModel(modelName) {
  if (!modelName) return 'meta/llama-3.2-11b-vision-instruct';
  if (modelName.includes('90b') || modelName.includes('70b')) {
    return 'meta/llama-3.2-90b-vision-instruct';
  }
  return 'meta/llama-3.2-11b-vision-instruct';
}

/**
 * Resolves appropriate AI model instance using Vercel AI SDK
 * Prioritizes:
 * 1. Explicit user request (if provider/key available)
 * 2. NVIDIA NIM (Pre-configured active key)
 * 3. Google Gemini (if key configured)
 * 4. OpenAI (if key configured)
 */
export function resolveModel({ provider = 'auto', model, apiKey }) {
  const envNvidiaKey = process.env.NVIDIA_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);
  const nvidiaKey = (apiKey?.startsWith('nvapi-') ? apiKey : null) || envNvidiaKey;
  const geminiKey = (apiKey?.startsWith('AIza') ? apiKey : null) || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = (apiKey?.startsWith('sk-') ? apiKey : null) || (process.env.OPENAI_API_KEY?.startsWith('sk-') ? process.env.OPENAI_API_KEY : null);

  let targetProvider = provider;
  let targetModel = model;

  // Auto-detect provider if auto or model specifies it
  if (targetProvider === 'auto' || !targetProvider) {
    if (apiKey?.startsWith('AIza') || (targetModel && targetModel.startsWith('gemini'))) {
      targetProvider = 'google';
    } else if (apiKey?.startsWith('sk-') || (targetModel && targetModel.startsWith('gpt'))) {
      targetProvider = 'openai';
    } else if (apiKey?.startsWith('nvapi-') || (targetModel && (targetModel.includes('llama') || targetModel.includes('mistral') || targetModel.includes('deepseek')))) {
      targetProvider = 'nvidia';
    } else {
      targetProvider = DEFAULT_PROVIDER;
    }
  }

  // 1. NVIDIA NIM (Active)
  if (targetProvider === 'nvidia' && nvidiaKey) {
    const activeNvidiaModel = normalizeNvidiaModel(targetModel);
    const nvidia = createOpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      compatibility: 'compatible'
    });

    return {
      modelInstance: nvidia.chat(activeNvidiaModel),
      resolvedProvider: 'nvidia',
      resolvedModel: activeNvidiaModel
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
    const defaultNvidiaModel = 'meta/llama-3.2-11b-vision-instruct';
    const nvidia = createOpenAI({
      apiKey: nvidiaKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      compatibility: 'compatible'
    });
    return {
      modelInstance: nvidia.chat(defaultNvidiaModel),
      resolvedProvider: 'nvidia',
      resolvedModel: defaultNvidiaModel
    };
  }

  return null;
}

export { streamText };
