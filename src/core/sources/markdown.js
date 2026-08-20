import { SOURCE_TYPES } from './types.js';
import { sourceIdFromUrl } from './webpage.js';
import { slugify } from '../okf-builder.js';

/**
 * Derives a section name from a markdown URL's parent directory.
 */
function sectionFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const parent = parts[parts.length - 2];
      if (!['docs', 'doc', 'main', 'master', 'blob', 'raw'].includes(parent.toLowerCase())) {
        return parent.replace(/[-_]+/g, ' ');
      }
    }
  } catch (e) { /* fall through */ }
  return 'Guides';
}

/**
 * Rewrites a GitHub/GitLab HTML "blob" URL to its raw equivalent so the
 * markdown source is fetched rather than the surrounding page.
 */
export function toRawUrl(url) {
  const gh = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
  if (gh) return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;

  const gl = url.match(/^(https?:\/\/[^/]*gitlab[^/]*\/.+?)\/-\/blob\/(.+)$/i);
  if (gl) return `${gl[1]}/-/raw/${gl[2]}`;

  return url;
}

/**
 * Ingests a standalone markdown page (by URL) or raw markdown text.
 */
export async function ingest(input, ctx = {}) {
  const { fetcher, onProgress = () => {} } = ctx;
  const raw = typeof input.value === 'string' ? input.value : '';
  const isUrl = /^https?:\/\//i.test(raw.trim());

  let markdown;
  let url;

  if (isUrl) {
    url = toRawUrl(raw.trim());
    onProgress({ type: 'fetching', url, message: `Fetching markdown document: ${url}` });
    markdown = await fetcher.getText(url, { accept: 'text/plain, text/markdown, */*' });
    onProgress({ type: 'page_crawled', url, depth: 0, linksFound: 0, pagesCrawled: 1 });
  } else {
    markdown = raw;
    url = input.name ? `upload://${input.name}` : 'text://pasted-markdown';
  }

  if (!markdown || !markdown.trim()) {
    throw new Error(`No markdown content found at ${url}.`);
  }

  const sourceId = input.sourceId || (isUrl ? sourceIdFromUrl(url) : slugify(input.name || 'markdown'));

  return {
    documents: [{
      sourceId,
      sourceType: SOURCE_TYPES.MARKDOWN,
      url,
      markdown,
      section: input.section || (isUrl ? sectionFromUrl(url) : 'Guides'),
      isRoot: /readme\.mdx?$/i.test(url)
    }],
    meta: { sourceId, sourceType: SOURCE_TYPES.MARKDOWN, url, title: url }
  };
}
