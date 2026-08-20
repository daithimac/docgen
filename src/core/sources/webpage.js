import { DocumentationCrawler, normalizeUrl } from '../crawler.js';
import { detectOpenApiSpec, ingest as ingestOpenApi } from './openapi.js';
import { slugify } from '../okf-builder.js';
import { SOURCE_TYPES } from './types.js';

/**
 * Derives a stable source id from a URL.
 */
export function sourceIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const firstPart = parsed.pathname.split('/').filter(Boolean)[0] || '';
    return slugify(firstPart ? `${host}-${firstPart}` : host);
  } catch (e) {
    return slugify(url) || 'source';
  }
}

/**
 * Ingests an HTML documentation site or a single web page.
 *
 * A URL that turns out to serve an OpenAPI spec (directly, or via a SwaggerUI
 * page) is transparently handed to the OpenAPI adapter, preserving the
 * behaviour the crawler used to implement inline.
 */
export async function ingest(input, ctx = {}) {
  const { fetcher, onProgress = () => {}, options = {} } = ctx;
  const url = normalizeUrl(input.value) || input.value;
  const sourceId = input.sourceId || sourceIdFromUrl(url);
  const single = options.maxPages === 1 || input.single === true;

  // Probe the entry point: it may actually be an API specification.
  let firstPageHtml = null;
  try {
    firstPageHtml = await fetcher.getText(url);
    const detected = await detectOpenApiSpec(firstPageHtml, url, fetcher);
    if (detected) {
      return ingestOpenApi({ ...input, value: detected.specUrl, sourceId }, ctx);
    }
  } catch (e) {
    onProgress({ type: 'page_error', url, error: e.message });
  }

  if (single) {
    const html = firstPageHtml !== null ? firstPageHtml : await fetcher.getText(url);
    onProgress({ type: 'page_crawled', url, depth: 0, linksFound: 0, pagesCrawled: 1 });
    return {
      documents: [{ sourceId, sourceType: SOURCE_TYPES.WEBPAGE, url, html, section: 'Overview', isRoot: true }],
      meta: { sourceId, sourceType: SOURCE_TYPES.WEBPAGE, url, title: url }
    };
  }

  const crawler = new DocumentationCrawler({
    fetcher,
    maxPages: options.maxPages,
    maxDepth: options.maxDepth,
    scope: options.scope,
    onProgress,
    onError: (err) => onProgress({ type: 'error', ...err })
  });

  const result = await crawler.crawl(url);
  const documents = result.pages.map((page, index) => ({
    sourceId,
    sourceType: SOURCE_TYPES.WEBPAGE,
    url: page.url,
    html: page.html,
    section: page.section || 'Overview',
    isRoot: index === 0
  }));

  return {
    documents,
    meta: {
      sourceId,
      sourceType: SOURCE_TYPES.WEBPAGE,
      url,
      title: url,
      pagesCrawled: result.pages.length
    }
  };
}
