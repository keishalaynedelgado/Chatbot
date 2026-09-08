/**
 * PPTX Template Engine
 *
 * Reads a .pptx (a zip of OOXML files), finds {curly brace} placeholders
 * inside slide text, and replaces them with real values while leaving
 * every other part of the file (layouts, masters, media, tables, fonts,
 * colors) byte-for-byte untouched. Only <a:t> text-run nodes are ever
 * modified.
 */

import JSZip from 'jszip';

const PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;
const RUN_PATTERN = /<a:t>([^<]*)<\/a:t>/g;
const PARAGRAPH_PATTERN = /<a:p>[\s\S]*?<\/a:p>/g;

/**
 * Returns the list of slideN.xml paths inside a loaded JSZip pptx.
 */
function getSlidePaths(zip) {
  return Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();
}

/**
 * Extracts every unique raw placeholder string (e.g. "{full name}") found
 * across all slides in the given .pptx buffer.
 */
async function extractPlaceholders(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = getSlidePaths(zip);
  const found = new Set();

  for (const slidePath of slidePaths) {
    const xml = await zip.file(slidePath).async('string');
    const paragraphs = xml.match(PARAGRAPH_PATTERN) || [];

    for (const paragraph of paragraphs) {
      const runs = [...paragraph.matchAll(RUN_PATTERN)].map((m) => m[1]);
      const mergedText = runs.join('');
      const matches = mergedText.matchAll(PLACEHOLDER_PATTERN);
      for (const match of matches) {
        found.add(match[0]);
      }
    }
  }

  return [...found];
}

/**
 * Replaces all {placeholder} occurrences in a single paragraph's XML.
 * `resolveValue(rawPlaceholder)` must return the replacement string.
 *
 * Fast path: every placeholder in the paragraph is fully contained within
 * a single <a:t> run — replace that run's text in place, preserving the
 * exact per-run formatting (this is the common case).
 *
 * Fallback path: a placeholder spans multiple runs (PowerPoint sometimes
 * splits text across runs for spellcheck/autocorrect reasons) — merge the
 * paragraph's runs into the first one and clear the rest. This loses
 * intra-paragraph formatting boundaries for that paragraph only; every
 * other paragraph in the file is unaffected.
 */
function fillParagraph(paragraphXml, resolveValue) {
  const runMatches = [...paragraphXml.matchAll(RUN_PATTERN)];
  if (runMatches.length === 0) return paragraphXml;

  const runTexts = runMatches.map((m) => m[1]);
  const mergedText = runTexts.join('');

  if (!PLACEHOLDER_PATTERN.test(mergedText)) return paragraphXml;
  PLACEHOLDER_PATTERN.lastIndex = 0;

  // Check whether every placeholder match falls within a single run's span.
  let offset = 0;
  const runSpans = runTexts.map((text) => {
    const span = [offset, offset + text.length];
    offset += text.length;
    return span;
  });

  let allWithinSingleRun = true;
  for (const match of mergedText.matchAll(PLACEHOLDER_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;
    const withinSome = runSpans.some(([s, e]) => start >= s && end <= e);
    if (!withinSome) {
      allWithinSingleRun = false;
      break;
    }
  }

  if (allWithinSingleRun) {
    // Fast path: replace placeholders within each run independently.
    let runIndex = 0;
    return paragraphXml.replace(RUN_PATTERN, (fullMatch, text) => {
      const replaced = text.replace(PLACEHOLDER_PATTERN, (ph) => resolveValue(ph));
      runIndex++;
      return `<a:t>${escapeXml(replaced)}</a:t>`;
    });
  }

  // Fallback path: collapse the paragraph's runs into the first one.
  const replacedMerged = mergedText.replace(PLACEHOLDER_PATTERN, (ph) => resolveValue(ph));
  let firstRunHandled = false;
  return paragraphXml.replace(RUN_PATTERN, (fullMatch) => {
    if (!firstRunHandled) {
      firstRunHandled = true;
      return `<a:t>${escapeXml(replacedMerged)}</a:t>`;
    }
    return '<a:t></a:t>';
  });
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Fills a .pptx template buffer, replacing every {placeholder} using
 * `resolveValue(rawPlaceholder)`, and returns the new file as a Buffer.
 * The input buffer/zip entry is never mutated in place on disk by the
 * caller — this always produces a fresh in-memory result.
 *
 * `afterFill(zip)`, if provided, runs after placeholders are filled but
 * before the zip is finalized — lets a caller (e.g. to add extra slides)
 * make further changes to the same open JSZip instance without a second
 * unzip/rezip round-trip. It may return a Promise.
 */
async function fillTemplate(buffer, resolveValue, afterFill) {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = getSlidePaths(zip);

  for (const slidePath of slidePaths) {
    const xml = await zip.file(slidePath).async('string');
    const newXml = xml.replace(PARAGRAPH_PATTERN, (paragraph) => fillParagraph(paragraph, resolveValue));
    zip.file(slidePath, newXml);
  }

  if (typeof afterFill === 'function') {
    await afterFill(zip);
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}

export { extractPlaceholders, fillTemplate };
