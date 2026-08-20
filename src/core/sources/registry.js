import { SOURCE_TYPES, SOURCE_TYPE_LABELS, createDocument } from './types.js';
import { isGoogleDocUrl } from './upload.js';
import * as webpageAdapter from './webpage.js';
import * as openapiAdapter from './openapi.js';
import * as gitAdapter from './git.js';
import * as markdownAdapter from './markdown.js';
import * as uploadAdapter from './upload.js';

const ADAPTERS = {
  [SOURCE_TYPES.WEBPAGE]: webpageAdapter,
  [SOURCE_TYPES.OPENAPI]: openapiAdapter,
  [SOURCE_TYPES.GIT]: gitAdapter,
  [SOURCE_TYPES.MARKDOWN]: markdownAdapter,
  [SOURCE_TYPES.UPLOAD]: uploadAdapter
};

export { SOURCE_TYPES, SOURCE_TYPE_LABELS };

/**
 * Splits a free-text field of comma/newline separated inputs.
 * URLs are never split on commas that appear inside a query string.
 */
export function splitSourceList(text) {
  if (Array.isArray(text)) return text.map(t => String(t).trim()).filter(Boolean);
  return String(text || '')
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Classifies a single input into a source type.
 *
 * Order matters: uploads, then git, then markdown, then specs, then
 * anything else that is an HTTP(S) URL, then raw text.
 */
export function detectSourceType(input) {
  // 1. Uploaded file descriptors
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if (input.type && ADAPTERS[input.type]) return input.type;
    if (input.file || input.data || input.name) return SOURCE_TYPES.UPLOAD;
    if (typeof input.value !== 'string') return SOURCE_TYPES.UPLOAD;
    return detectSourceType(input.value);
  }

  const value = String(input || '').trim();
  if (!value) return SOURCE_TYPES.WEBPAGE;

  // 2. Google Docs links are handled by the upload adapter
  if (isGoogleDocUrl(value)) return SOURCE_TYPES.UPLOAD;

  // 3. Git repositories
  if (/^(?:git\+|ssh:\/\/)?git@[^:/]+[:/]/.test(value) || /\.git$/i.test(value)) {
    return SOURCE_TYPES.GIT;
  }
  const repoLike = value.match(/^https?:\/\/(?:www\.)?(github\.com|[^/]*gitlab[^/]*)\/([^/]+)\/([^/]+)(\/.*)?$/i);
  if (repoLike) {
    const rest = repoLike[4] || '';
    // /blob/ and /raw/ point at a single file, not the repository
    if (!/^\/(blob|raw)\//i.test(rest)) return SOURCE_TYPES.GIT;
  }

  const isHttp = /^https?:\/\//i.test(value);
  if (isHttp) {
    let pathname = value;
    try { pathname = new URL(value).pathname; } catch (e) { /* use the raw value */ }

    // 4. Markdown pages
    if (/\.(md|mdx|markdown)$/i.test(pathname)) return SOURCE_TYPES.MARKDOWN;

    // 5. Spec documents
    if (/\.(json|ya?ml)$/i.test(pathname) || /(openapi|swagger|api-docs)/i.test(pathname)) {
      return SOURCE_TYPES.OPENAPI;
    }

    // 6. Everything else on the web
    return SOURCE_TYPES.WEBPAGE;
  }

  // 7. Raw text
  if (/^\s*\{/.test(value) || /^\s*(openapi|swagger)\s*:/m.test(value)) return SOURCE_TYPES.OPENAPI;
  return SOURCE_TYPES.MARKDOWN;
}

/**
 * Normalizes mixed user input into descriptors the adapters understand.
 */
export function normalizeSourceInputs(inputs) {
  const list = Array.isArray(inputs) ? inputs : splitSourceList(inputs);
  const descriptors = [];

  for (const entry of list) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      // Already a descriptor, or an uploaded file
      const value = entry.value !== undefined ? entry.value : entry;
      descriptors.push({
        ...entry,
        value,
        type: entry.type && ADAPTERS[entry.type] ? entry.type : detectSourceType(entry)
      });
      continue;
    }

    for (const value of splitSourceList(entry)) {
      descriptors.push({ value, type: detectSourceType(value) });
    }
  }

  return descriptors;
}

/**
 * Describes inputs without fetching anything - used by the UI to show a
 * resolved-type chip per entry before a run starts.
 */
export function describeSources(inputs) {
  return normalizeSourceInputs(inputs).map(d => ({
    value: typeof d.value === 'string' ? d.value : (d.name || d.value?.name || 'uploaded file'),
    type: d.type,
    label: SOURCE_TYPE_LABELS[d.type] || d.type
  }));
}

/**
 * Runs every source through its adapter and returns the merged document set.
 * One failing source does not abort the run - it is reported and skipped, so a
 * mixed batch still produces a bundle.
 */
export async function ingestSources(inputs, ctx = {}) {
  const userOnProgress = ctx.onProgress || (() => {});
  const warnings = [];

  // Warnings must survive past the progress stream - a capped or truncated run
  // has to be visible in the result, not only in a log line that scrolled by.
  const onProgress = (event) => {
    if (event && event.type === 'warning' && event.message) {
      warnings.push(event.message);
    }
    userOnProgress(event);
  };
  ctx = { ...ctx, onProgress };

  const descriptors = normalizeSourceInputs(inputs);

  if (descriptors.length === 0) {
    throw new Error('No sources supplied.');
  }

  const documents = [];
  const sources = [];
  const errors = [];
  const usedIds = new Map();

  for (const descriptor of descriptors) {
    const adapter = ADAPTERS[descriptor.type];
    const label = typeof descriptor.value === 'string' ? descriptor.value : (descriptor.name || 'uploaded file');

    if (!adapter) {
      errors.push({ source: label, type: descriptor.type, error: `No adapter for source type '${descriptor.type}'.` });
      continue;
    }

    onProgress({
      type: 'source_start',
      sourceType: descriptor.type,
      source: label,
      message: `Ingesting ${SOURCE_TYPE_LABELS[descriptor.type] || descriptor.type}: ${label}`
    });

    try {
      const result = await adapter.ingest(descriptor, ctx);
      const meta = result.meta || {};

      // Keep source ids unique so merged-folder filename collisions resolve cleanly
      let sourceId = meta.sourceId || 'source';
      const seen = usedIds.get(sourceId) || 0;
      usedIds.set(sourceId, seen + 1);
      if (seen > 0) sourceId = `${sourceId}-${seen + 1}`;

      const docs = (result.documents || []).map(doc => createDocument({ ...doc, sourceId }));
      documents.push(...docs);
      sources.push({
        ...meta,
        sourceId,
        sourceType: descriptor.type,
        input: label,
        documentCount: docs.length
      });

      onProgress({
        type: 'source_complete',
        sourceType: descriptor.type,
        source: label,
        documentCount: docs.length,
        message: `${label}: ${docs.length} concept document(s)`
      });
    } catch (err) {
      errors.push({ source: label, type: descriptor.type, error: err.message });
      onProgress({
        type: 'source_error',
        sourceType: descriptor.type,
        source: label,
        error: err.message,
        message: `Failed to ingest ${label}: ${err.message}`
      });
    }
  }

  if (documents.length === 0) {
    const detail = errors.map(e => `${e.source}: ${e.error}`).join('; ');
    throw new Error(detail || 'No documents could be extracted from the supplied sources.');
  }

  return { documents, sources, errors, warnings };
}
