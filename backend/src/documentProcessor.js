/**
 * Document text extraction + chunking for the RAG knowledge base.
 *
 * extractText() turns an uploaded file into plain text regardless of
 * source format. chunkText() then splits that text into overlapping
 * word windows sized for embedding — small enough to stay topically
 * focused, with enough overlap that an idea split across a chunk
 * boundary is still findable from either side.
 */

import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TEXT_MIME = 'text/plain';

/**
 * `originalFilename` is used as a fallback signal when `mimeType` is
 * the generic application/octet-stream — some browsers/OS
 * configurations misreport .docx (and occasionally other types) this
 * way, so the file extension backs up the mimetype check rather than
 * rejecting a legitimate upload.
 */
async function extractText(filePath, mimeType, originalFilename = '') {
  const ext = path.extname(originalFilename).toLowerCase();

  if (mimeType === PDF_MIME || ext === '.pdf') {
    const buffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === DOCX_MIME || ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (mimeType === TEXT_MIME || mimeType.startsWith('text/') || ext === '.txt') {
    return fs.readFile(filePath, 'utf-8');
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Splits `text` into overlapping word-based chunks.
 *
 * `chunkSize` targets the word count per chunk (500-1000 words per the
 * spec; 750 is the default midpoint). `overlapRatio` controls how much
 * of each chunk repeats at the start of the next one (~12.5% by
 * default), so context near a boundary isn't lost to either side.
 *
 * A trailing remainder too small to stand on its own (under ~15% of
 * chunkSize) is merged into the previous chunk instead of being emitted
 * as a near-empty final chunk.
 */
function chunkText(text, { chunkSize = 750, overlapRatio = 0.125 } = {}) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const overlap = Math.floor(chunkSize * overlapRatio);
  const step = chunkSize - overlap;
  const minTrailing = Math.floor(chunkSize * 0.15);

  const chunks = [];
  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
  }

  if (chunks.length > 1) {
    const lastChunkWordCount = chunks[chunks.length - 1].split(/\s+/).length;
    if (lastChunkWordCount < minTrailing) {
      const last = chunks.pop();
      chunks[chunks.length - 1] += ' ' + last;
    }
  }

  return chunks;
}

export { extractText, chunkText };
export default { extractText, chunkText };
