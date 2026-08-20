import { htmlToMarkdown } from '../markdown-converter.js';
import { slugify } from '../okf-builder.js';
import { SOURCE_TYPES } from './types.js';

export const SUPPORTED_UPLOAD_EXTENSIONS = ['.docx', '.md', '.mdx', '.markdown', '.txt', '.pdf'];

const GOOGLE_DOC_RE = /^https?:\/\/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * True when a URL points at a Google Doc.
 */
export function isGoogleDocUrl(url) {
  return GOOGLE_DOC_RE.test(String(url || '').trim());
}

/**
 * Builds the public .docx export URL for a Google Doc.
 */
export function googleDocExportUrl(url) {
  const match = String(url).match(GOOGLE_DOC_RE);
  if (!match) return null;
  return `https://docs.google.com/document/d/${match[1]}/export?format=docx`;
}

function toUint8(data) {
  // pdf.js rejects Node Buffers, so subclasses are re-wrapped as plain Uint8Arrays.
  if (data instanceof Uint8Array) {
    return data.constructor === Uint8Array
      ? data
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data && data.buffer instanceof ArrayBuffer) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new Error('Unsupported binary payload for upload.');
}

function looksLikeZip(bytes) {
  return bytes.length >= 4 && ZIP_MAGIC.every((b, i) => bytes[i] === b);
}

function extensionOf(name) {
  const match = String(name || '').toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

/**
 * Converts a .docx file to markdown via mammoth, reusing the existing
 * HTML-to-markdown converter so formatting matches crawled pages.
 */
export async function docxToMarkdown(data) {
  const bytes = toUint8(data);
  if (!looksLikeZip(bytes)) {
    throw new Error('This file is not a valid .docx document (missing ZIP signature).');
  }
  const mod = await import('mammoth');
  const mammoth = mod.default || mod;
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  // Node's mammoth build reads `buffer`, the browser build reads `arrayBuffer`.
  const result = await mammoth.convertToHtml({ buffer: bytes, arrayBuffer });
  return htmlToMarkdown(result.value || '');
}

/**
 * Extracts text from a PDF, inferring headings from relative font sizes.
 * Lower fidelity than the other formats by nature.
 */
export async function pdfToMarkdown(data) {
  const bytes = toUint8(data);
  const isBrowser = typeof window !== 'undefined';
  const pdfjs = await import(isBrowser ? 'pdfjs-dist' : 'pdfjs-dist/legacy/build/pdf.mjs');
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjs.GlobalWorkerOptions.workerSrc || '';
  }

  const doc = await pdfjs.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const lines = [];
  const heights = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    let current = null;
    for (const item of content.items) {
      if (typeof item.str !== 'string') continue;
      const y = Math.round(item.transform[5]);
      const height = Math.abs(item.transform[3]) || 0;
      if (!current || Math.abs(current.y - y) > 2) {
        if (current) lines.push(current);
        current = { y, height, text: item.str };
      } else {
        current.text += item.str;
        current.height = Math.max(current.height, height);
      }
      if (height) heights.push(height);
    }
    if (current) lines.push(current);
    lines.push({ y: null, height: 0, text: '' });
  }

  const sorted = [...heights].sort((a, b) => a - b);
  const bodyHeight = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  const markdown = lines
    .map(line => {
      const text = line.text.replace(/\s+/g, ' ').trim();
      if (!text) return '';
      if (bodyHeight && line.height >= bodyHeight * 1.45) return `## ${text}`;
      if (bodyHeight && line.height >= bodyHeight * 1.18) return `### ${text}`;
      return text;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  await doc.destroy?.();
  return markdown;
}

/**
 * Converts one uploaded payload (buffer or text) into markdown.
 * `file` is { name, data?: ArrayBuffer|Uint8Array, text?: string }.
 */
export async function fileToMarkdown(file) {
  const ext = extensionOf(file.name);

  if (ext === '.docx') return docxToMarkdown(file.data);
  if (ext === '.pdf') return pdfToMarkdown(file.data);

  if (typeof file.text === 'string') return file.text;
  const bytes = toUint8(file.data);
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Ingests an uploaded document, or a Google Doc share/published link.
 *
 * `input.value` is either a Google Docs URL, or a file descriptor
 * { name, data, text }.
 */
export async function ingest(input, ctx = {}) {
  const { fetcher, onProgress = () => {} } = ctx;
  let file = input.file || (typeof input.value === 'object' ? input.value : null);
  let canonicalUrl = null;

  if (!file && typeof input.value === 'string' && isGoogleDocUrl(input.value)) {
    const sourceUrl = input.value.trim();
    const exportUrl = googleDocExportUrl(sourceUrl);
    onProgress({ type: 'fetching', url: exportUrl, message: 'Exporting Google Doc as .docx...' });

    let data;
    try {
      data = await fetcher.getBinary(exportUrl);
    } catch (err) {
      throw new Error(
        `Could not export that Google Doc (${err.message}). Set link sharing to "Anyone with the link", ` +
        'or download it as .docx and upload the file.'
      );
    }

    if (!looksLikeZip(toUint8(data))) {
      throw new Error(
        "This Google Doc isn't publicly shared. Either set link sharing to 'Anyone with the link', " +
        'or download it as .docx and upload the file.'
      );
    }

    file = { name: `${slugify(input.name || 'google-doc')}.docx`, data };
    canonicalUrl = sourceUrl;
  }

  if (!file || !file.name) {
    throw new Error('No uploaded file or Google Docs link supplied.');
  }

  const ext = extensionOf(file.name);
  if (!SUPPORTED_UPLOAD_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported upload type "${ext || file.name}". Supported: ${SUPPORTED_UPLOAD_EXTENSIONS.join(', ')}.`
    );
  }

  onProgress({ type: 'converting', message: `Converting ${file.name} to markdown...` });
  const markdown = await fileToMarkdown(file);

  if (!markdown || !markdown.trim()) {
    throw new Error(`No readable text could be extracted from ${file.name}.`);
  }

  const stem = file.name.replace(/\.[^.]+$/, '');
  const sourceId = input.sourceId || slugify(stem) || 'upload';
  const url = canonicalUrl || `upload://${file.name}`;

  onProgress({ type: 'page_crawled', url, depth: 0, linksFound: 0, pagesCrawled: 1 });

  return {
    documents: [{
      sourceId,
      sourceType: SOURCE_TYPES.UPLOAD,
      url,
      markdown,
      absolutizeLinks: false,
      section: input.section || 'Documents',
      author: input.author || 'Uploaded Document',
      tags: ['upload', ext.replace('.', '')],
      slugHint: slugify(stem)
    }],
    meta: { sourceId, sourceType: SOURCE_TYPES.UPLOAD, url, title: stem }
  };
}
