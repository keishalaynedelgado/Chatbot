/**
 * Local, self-hosted text embeddings — no external API, no API key.
 *
 * Uses @xenova/transformers to run Xenova/all-MiniLM-L6-v2 entirely
 * in-process (ONNX/WASM). The model is downloaded once on first use
 * (cached under node_modules/@xenova/transformers/.cache by default)
 * and then kept warm as a singleton, since loading it is the expensive
 * part — every embedText/embedBatch call after the first is fast.
 *
 * Produces 384-dimensional vectors, matching the `vector(384)` column
 * used for document_chunks.embedding (see scripts/setupRagSchema.js).
 */

import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise = null;

function getExtractor() {
  if (!extractorPromise) {
    // If model loading fails (e.g. a transient network error fetching
    // the weights), clear the cached promise so the NEXT call retries
    // instead of every future call rejecting forever with the same error.
    extractorPromise = pipeline('feature-extraction', MODEL_NAME).catch((err) => {
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/**
 * Embeds a single string. Returns a plain number[] of length 384
 * (mean-pooled, L2-normalized — ready for cosine-distance comparison).
 */
async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Embeds many strings, reusing the same loaded model instance.
 */
async function embedBatch(texts) {
  const extractor = await getExtractor();
  const vectors = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    vectors.push(Array.from(output.data));
  }
  return vectors;
}

export { embedText, embedBatch };
export default { embedText, embedBatch };
