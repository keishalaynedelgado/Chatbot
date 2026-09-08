/**
 * Synthie AI - AI Provider Configuration & Model Resolver
 * Powered by Vercel AI SDK (@ai-sdk/google, @ai-sdk/openai, ai)
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';

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
  },
  {
    id: 'gemma-4-31B-it',
    name: 'Gemma 4 31B IT (SCX AI)',
    provider: 'scx',
    description: 'Google Gemma 4 31B dense multimodal model, served directly by SCX AI.'
  },
  {
    id: 'MiniMax-M2.7',
    name: 'MiniMax M2.7 (SCX AI)',
    provider: 'scx',
    description: '230B sparse MoE model from MiniMax, served directly by SCX AI.'
  },
  {
    id: 'gpt-oss-120b',
    name: 'GPT OSS 120B (SCX AI)',
    provider: 'scx',
    description: 'Open-weight 117B MoE model from OpenAI, served directly by SCX AI.'
  },
  {
    id: 'DeepSeek-V3.1',
    name: 'DeepSeek V3.1 (SCX AI)',
    provider: 'scx',
    description: '671B MoE model with hybrid thinking modes, served directly by SCX AI.'
  },
  {
    id: 'Meta-Llama-3.3-70B-Instruct',
    name: 'Meta Llama 3.3 70B Instruct (SCX AI)',
    provider: 'scx',
    description: '70B instruction-tuned model, served directly by SCX AI.'
  }
];

// Model ids exposed by SCX AI's own live /v1/models endpoint
// (https://api.scx.ai/v1/models) — case-sensitive exact ids, confirmed
// working directly against their API, not a third-party aggregator.
// They don't share a common prefix like "gpt-"/"gemini-", so
// auto-detection below matches against this list instead of a pattern.
const SCX_MODEL_IDS = new Set(
  MODEL_CATALOG.filter((m) => m.provider === 'scx').map((m) => m.id)
);

/**
 * Normalizes NVIDIA model name to currently active NIM endpoints.
 * NOTE: meta/llama-3.2-90b-vision-instruct currently times out on NVIDIA's
 * side, so every request is pinned to the confirmed-working 11B endpoint
 * until NVIDIA restores it.
 */
function normalizeNvidiaModel(modelName) {
  return 'meta/llama-3.2-11b-vision-instruct';
}

/**
 * Resolves appropriate AI model instance using Vercel AI SDK
 * Prioritizes:
 * 1. Explicit user request (if provider/key available)
 * 2. NVIDIA NIM (Pre-configured active key)
 * 3. SCX AI, direct API (Pre-configured active key)
 * 4. Google Gemini (if key configured)
 * 5. OpenAI (if key configured)
 */
export function resolveModel({ provider = 'auto', model, apiKey }) {
  const envNvidiaKey = process.env.NVIDIA_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : null);
  const nvidiaKey = (apiKey?.startsWith('nvapi-') ? apiKey : null) || envNvidiaKey;
  const geminiKey = (apiKey?.startsWith('AIza') ? apiKey : null) || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  // SCX AI keys also start with "sk-" (sk-scx-...), so they're excluded
  // here and matched separately below — otherwise every SCX key would be
  // misdetected as an OpenAI key.
  const openaiKey = (apiKey?.startsWith('sk-') && !apiKey.startsWith('sk-scx-') ? apiKey : null) || (process.env.OPENAI_API_KEY?.startsWith('sk-') ? process.env.OPENAI_API_KEY : null);
  const scxKey = (apiKey?.startsWith('sk-scx-') ? apiKey : null) || process.env.SCX_API_KEY;

  let targetProvider = provider;
  let targetModel = model;

  // Auto-detect provider if auto or model specifies it
  if (targetProvider === 'auto' || !targetProvider) {
    if (apiKey?.startsWith('AIza') || (targetModel && targetModel.startsWith('gemini'))) {
      targetProvider = 'google';
    } else if (apiKey?.startsWith('sk-scx-') || (targetModel && SCX_MODEL_IDS.has(targetModel))) {
      // Checked before the OpenAI "gpt-" prefix check below, since one of
      // SCX's own model ids ("gpt-oss-120b") would otherwise false-match it.
      targetProvider = 'scx';
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

  // 2. SCX AI, via their own OpenAI-compatible endpoint
  // (https://api.scx.ai/v1/chat/completions) — same integration shape as
  // the NVIDIA NIM client above, just a different baseURL/key.
  if (targetProvider === 'scx' && scxKey) {
    const selectedModel = (targetModel && SCX_MODEL_IDS.has(targetModel)) ? targetModel : 'gemma-4-31B-it';
    const scx = createOpenAI({
      apiKey: scxKey,
      baseURL: 'https://api.scx.ai/v1',
      compatibility: 'compatible'
    });

    return {
      modelInstance: scx.chat(selectedModel),
      resolvedProvider: 'scx',
      resolvedModel: selectedModel
    };
  }

  // 3. Google Gemini (if key available)
  if (targetProvider === 'google' && geminiKey) {
    const selectedModel = (targetModel && targetModel.startsWith('gemini')) ? targetModel : 'gemini-2.5-flash';
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return {
      modelInstance: google(selectedModel),
      resolvedProvider: 'google',
      resolvedModel: selectedModel
    };
  }

  // 4. OpenAI (if key available)
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

export { streamText, generateText };
