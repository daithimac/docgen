import yaml from 'js-yaml';
import { detectCodeLanguage, EXECUTABLE_LANGUAGES, classifyConceptType } from './parser.js';

/**
 * Splits an optional YAML frontmatter block off the top of a markdown document.
 */
export function splitFrontmatter(markdown) {
  const text = (markdown || '').replace(/^﻿/, '');
  if (!text.trimStart().startsWith('---')) {
    return { frontmatter: {}, body: text };
  }

  const match = text.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: text };
  }

  try {
    const parsed = yaml.load(match[1]);
    return {
      frontmatter: parsed && typeof parsed === 'object' ? parsed : {},
      body: match[2] || ''
    };
  } catch (e) {
    // Malformed frontmatter is treated as ordinary content rather than an error.
    return { frontmatter: {}, body: text };
  }
}

/**
 * Extracts fenced code blocks, reusing the shared language sniffer.
 */
export function extractMarkdownCodeBlocks(body) {
  const blocks = [];
  const fenceRe = /^([ \t]*)(`{3,}|~{3,})[ \t]*([a-zA-Z0-9_+-]*)[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm;
  let match;
  let i = 0;

  while ((match = fenceRe.exec(body)) !== null) {
    const declared = (match[3] || '').toLowerCase();
    const code = (match[4] || '').trim();
    if (code.length <= 10) continue;

    const language = declared || detectCodeLanguage(code);
    blocks.push({
      id: `snippet-${++i}`,
      language,
      code,
      isExecutable: EXECUTABLE_LANGUAGES.includes(language)
    });
  }

  return blocks;
}

/**
 * Extracts ATX headings, ignoring anything inside fenced code blocks.
 */
export function extractMarkdownHeadings(body) {
  const headings = [];
  let inFence = false;
  let fenceMarker = '';

  for (const line of (body || '').split(/\r?\n/)) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const h = line.match(/^(#{1,4})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const text = stripInlineMarkdown(h[2]);
      if (text) headings.push({ level: h[1].length, text });
    }
  }

  return headings;
}

/**
 * Removes inline HTML tags. Markdown documents (README files especially) often
 * put badges and logos inside headings, which must not leak into titles.
 */
export function stripHtmlTags(text) {
  return (text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips markdown syntax from a fragment so it can be used as a description.
 */
function stripInlineMarkdown(text) {
  return stripHtmlTags(
    (text || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Badge rows are links wrapping an image; once the image is gone the
      // link is empty and should disappear rather than leave bare brackets.
      .replace(/\[\s*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the first prose paragraph (not a heading, list, fence, table or badge row).
 */
function firstParagraph(body) {
  const blocks = (body || '').split(/\r?\n\s*\r?\n/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^(#|>|[-*+]\s|\d+\.\s|\||`{3,}|~{3,}|---|<)/.test(trimmed)) continue;
    const clean = stripInlineMarkdown(trimmed);
    if (clean.length > 20) return clean;
  }
  return '';
}

/**
 * Derives a readable title from a URL or file path when the document has none.
 */
function titleFromPath(url) {
  try {
    const pathname = url.includes('://') ? new URL(url).pathname : url;
    const base = pathname.split('/').filter(Boolean).pop() || '';
    const stem = base.replace(/\.(md|mdx|markdown|txt|docx|pdf)$/i, '');
    if (!stem) return 'Untitled Document';
    if (stem.toLowerCase() === 'readme') return 'Overview';
    return stem
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch (e) {
    return 'Untitled Document';
  }
}

/**
 * Rewrites relative markdown links/images to absolute URLs against a base.
 * Keeps the bundle builder's existing URL-to-bundle-path rewriting able to match.
 */
export function absolutizeMarkdownLinks(body, baseUrl) {
  if (!baseUrl || !baseUrl.includes('://')) return body;
  return (body || '').replace(/(!?\[[^\]]*\]\()([^)\s]+)(\s*(?:"[^"]*")?\))/g, (m, head, href, tail) => {
    if (/^(https?:|mailto:|#|data:|upload:|git:)/i.test(href)) return m;
    try {
      return `${head}${new URL(href, baseUrl).href}${tail}`;
    } catch (e) {
      return m;
    }
  });
}

/**
 * Markdown counterpart to parseDocumentationHtml. Returns the same concept shape
 * so everything downstream of the source adapters is format-agnostic.
 */
export function parseMarkdownDocument(markdown, url = '', hints = {}) {
  const { frontmatter, body: rawBody } = splitFrontmatter(markdown);
  const body = hints.absolutizeLinks === false ? rawBody : absolutizeMarkdownLinks(rawBody, url);

  const headings = extractMarkdownHeadings(body);
  const codeBlocks = extractMarkdownCodeBlocks(body);

  let title = frontmatter.title || hints.title || '';
  if (!title) {
    const h1 = headings.find(h => h.level === 1);
    title = h1 ? h1.text : '';
  }
  if (!title) title = titleFromPath(url);
  title = stripInlineMarkdown(title) || titleFromPath(url);

  let description = frontmatter.description || frontmatter.summary || hints.description || '';
  if (!description) description = firstParagraph(body);
  description = stripInlineMarkdown(description).slice(0, 400);

  const tags = new Set();
  const fmTags = frontmatter.tags || frontmatter.keywords;
  if (Array.isArray(fmTags)) {
    fmTags.forEach(t => t && tags.add(String(t).toLowerCase()));
  } else if (typeof fmTags === 'string') {
    fmTags.split(',').forEach(t => t.trim() && tags.add(t.trim().toLowerCase()));
  }
  const section = frontmatter.section || hints.section || 'General';
  if (section) tags.add(String(section).toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  if (hints.tags) hints.tags.forEach(t => t && tags.add(String(t).toLowerCase()));

  let lastModified = frontmatter.last_modified || frontmatter.date || hints.lastModified || '';
  lastModified = String(lastModified || new Date().toISOString().split('T')[0]);
  if (lastModified.includes('T')) lastModified = lastModified.split('T')[0];

  const type = frontmatter.type || hints.type || classifyConceptType(title, codeBlocks);

  // Drop a leading H1 that duplicates the title - the builder emits its own.
  let markdownBody = body.trim();
  const leadingH1 = markdownBody.match(/^#\s+(.*?)\s*$/m);
  if (leadingH1 && markdownBody.startsWith('#') && stripInlineMarkdown(leadingH1[1]) === title.trim()) {
    markdownBody = markdownBody.slice(leadingH1[0].length).trim();
  }

  return {
    url,
    title,
    siteName: frontmatter.site_name || hints.siteName || '',
    description: description || `${title} documentation.`,
    section,
    breadcrumbs: hints.breadcrumbs || [],
    tags: Array.from(tags),
    type,
    author: frontmatter.author || hints.author || 'Documentation Team',
    lastModified,
    headings,
    codeBlocks,
    htmlBody: '',
    markdownBody
  };
}
