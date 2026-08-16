import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseOpenApiSpec } from './openapi-parser.js';

/**
 * Normalizes a URL by removing hashes, query tracking params, and trailing slashes.
 */
export function normalizeUrl(urlStr, baseUrl = null) {
  try {
    const parsed = baseUrl ? new URL(urlStr, baseUrl) : new URL(urlStr);
    // Strip hash and trailing slash for standard comparison
    parsed.hash = '';
    // Strip localized query parameters if needed, but preserve necessary path
    if (parsed.searchParams.has('hl')) {
      parsed.searchParams.delete('hl');
    }
    let href = parsed.origin + parsed.pathname;
    if (href.endsWith('/') && parsed.pathname !== '/') {
      href = href.slice(0, -1);
    }
    if (parsed.search) {
      href += parsed.search;
    }
    return href;
  } catch (e) {
    return null;
  }
}

/**
 * Checks whether a candidate link is within the target scope of any seed URL.
 */
export function isRelevantLink(candidateUrl, seedUrls, scope = 'subtree') {
  const seeds = Array.isArray(seedUrls) ? seedUrls : [seedUrls];

  try {
    const candidate = new URL(candidateUrl);

    // Ignore asset extensions
    const pathname = candidate.pathname.toLowerCase();
    const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.zip', '.tar', '.gz', '.mp4', '.xml', '.json', '.ico'];
    if (ignoredExtensions.some(ext => pathname.endsWith(ext))) {
      return false;
    }

    for (const rootUrl of seeds) {
      if (!rootUrl) continue;
      const root = new URL(rootUrl);

      // Must match hostname / domain
      if (candidate.origin !== root.origin) {
        continue;
      }

      if (scope === 'domain') {
        return true;
      }

      // If scope is 'section' or 'subtree', check path prefix or related section roots
      const rootPathParts = root.pathname.split('/').filter(Boolean);
      const candidateParts = candidate.pathname.split('/').filter(Boolean);

      // If at least the first 2 parts match (e.g. ['bigquery', 'docs'])
      if (rootPathParts.length >= 2 && candidateParts.length >= 2) {
        if (rootPathParts[0] === candidateParts[0] && rootPathParts[1] === candidateParts[1]) {
          return true;
        }
      }

      // Common documentation roots (e.g. /docs/, /guide/, etc.)
      if (rootPathParts.length > 0 && rootPathParts[0] === candidateParts[0]) {
        return true;
      }

      if (candidate.pathname.startsWith(root.pathname)) {
        return true;
      }
    }

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Discovers links from a page, prioritizing article body links and the active
 * documentation section (e.g. Migrate Data, Load Data, Transform Data, Export Data).
 */
export function extractLinksFromHtml(html, currentUrl, seedUrls, options = {}) {
  const $ = cheerio.load(html);
  const discovered = [];
  const seen = new Set();

  const addCandidate = (href, text, context = 'body', section = '', priority = 10) => {
    if (!href) return;
    const normalized = normalizeUrl(href, currentUrl);
    if (!normalized || seen.has(normalized)) return;

    if (isRelevantLink(normalized, seedUrls, options.scope || 'subtree')) {
      seen.add(normalized);
      discovered.push({
        url: normalized,
        text: (text || '').replace(/\s+/g, ' ').trim(),
        context,
        section: section ? section.trim() : '',
        priority
      });
    }
  };

  // 1. HIGHEST PRIORITY: Article Body Links (Direct references in the text)
  $('article, main, .devsite-article-body, .markdown-body, .theme-doc-markdown, .content').find('a[href]').each((_, a) => {
    const href = $(a).attr('href');
    const text = $(a).text();
    const prevHeading = $(a).prevAll('h1, h2, h3, h4').first().text();
    addCandidate(href, text, 'body', prevHeading || 'Overview', 1);
  });

  // 2. HIGH PRIORITY: Active Section Navigation in Devsite / Sidebar
  const currentPathname = new URL(currentUrl).pathname;

  $('.devsite-nav-section, .devsite-expandable-nav, .menu__list-item, .nav-group').each((_, sectionElem) => {
    const sectionText = $(sectionElem).text();
    const hasCurrentLink = $(sectionElem).find(`a[href*="${currentPathname}"]`).length > 0;
    const isTargetSection = /migrate|load|transform|export|api|quickstart/i.test(sectionText);

    if (hasCurrentLink || isTargetSection) {
      let sectionTitle = '';
      const headingElem = $(sectionElem).find('.devsite-nav-title, .menu__link--sublist, span').first();
      if (headingElem.length) {
        sectionTitle = headingElem.text().trim();
      }

      $(sectionElem).find('a[href]').each((_, a) => {
        const href = $(a).attr('href');
        const text = $(a).text();
        addCandidate(href, text, 'active-section-nav', sectionTitle, 2);
      });
    }
  });

  // 3. MEDIUM PRIORITY: All other expandable nav sections in the documentation
  $('.devsite-expandable-nav, .devsite-nav-section, .devsite-nav-item').each((_, elem) => {
    let sectionTitle = '';
    const headingElem = $(elem).find('.devsite-nav-title').first();
    if (headingElem.length) {
      sectionTitle = headingElem.text().trim();
    }

    $(elem).find('a[href]').each((_, a) => {
      const href = $(a).attr('href');
      const text = $(a).text();
      addCandidate(href, text, 'nav-item', sectionTitle, 5);
    });
  });

  // 4. LOWER PRIORITY: Generic Sidebars & Footers
  $('nav, aside, .sidebar, .table-of-contents, .toc, .docs-sidebar, .menu__list').each((_, nav) => {
    $(nav).find('a[href]').each((_, a) => {
      const href = $(a).attr('href');
      const text = $(a).text();
      const section = $(a).closest('li, div, section').find('span, h2, h3, h4').first().text();
      addCandidate(href, text, 'sidebar', section, 8);
    });
  });

  // Sort by priority so most relevant links are queued and crawled first
  discovered.sort((a, b) => a.priority - b.priority);

  return discovered;
}

/**
 * Main Crawler Class
 */
export class DocumentationCrawler {
  constructor(options = {}) {
    this.maxPages = options.maxPages || 30;
    this.maxDepth = options.maxDepth || 3;
    this.concurrency = options.concurrency || 3;
    this.delayMs = options.delayMs || 200;
    this.scope = options.scope || 'subtree'; // 'subtree' | 'domain' | 'custom'
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
    this.userAgent = options.userAgent || 'OKF-DocGen-Bot/0.2 (Open Knowledge Format Generator; +https://github.com/docgen-okf)';
  }

  async fetchPage(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    return response.data;
  }

  async detectOpenApiSpec(htmlOrData, url) {
    // 1. Direct object
    if (typeof htmlOrData === 'object' && (htmlOrData.swagger || htmlOrData.openapi)) {
      return { spec: htmlOrData, specUrl: url };
    }

    if (typeof htmlOrData === 'string') {
      const trimmed = htmlOrData.trim();
      // 2. Direct JSON string
      if (trimmed.startsWith('{') && (trimmed.includes('"swagger"') || trimmed.includes('"openapi"'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.swagger || parsed.openapi) {
            return { spec: parsed, specUrl: url };
          }
        } catch (e) {}
      }

      // 3. SwaggerUI / Redoc URL in script or HTML
      const swaggerUrlMatch = htmlOrData.match(/(?:url|spec-url)\s*[:=]\s*["']([^"']+)["']/i);
      if (swaggerUrlMatch) {
        const candidatePath = swaggerUrlMatch[1];
        try {
          const candidateUrl = new URL(candidatePath, url).href;
          const resp = await axios.get(candidateUrl, { timeout: 10000 });
          const specData = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
          if (specData && (specData.swagger || specData.openapi)) {
            return { spec: specData, specUrl: candidateUrl };
          }
        } catch (e) {}
      }

      // 4. Check common Swagger/OpenAPI endpoints if swagger UI is detected
      if (/swagger-ui|swagger|openapi|redoc/i.test(htmlOrData)) {
        const commonPaths = ['/swagger.json', '/openapi.json', '/v1/swagger.json', '/api-docs', '/v3/api-docs', '/swagger/v1/swagger.json'];
        for (const p of commonPaths) {
          try {
            const candidateUrl = new URL(p, url).href;
            const resp = await axios.get(candidateUrl, { timeout: 6000 });
            const specData = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
            if (specData && (specData.swagger || specData.openapi)) {
              return { spec: specData, specUrl: candidateUrl };
            }
          } catch (e) {}
        }
      }
    }

    return null;
  }

  async crawl(startInput) {
    let rawUrls = [];
    if (Array.isArray(startInput)) {
      rawUrls = startInput;
    } else if (typeof startInput === 'string') {
      rawUrls = startInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    }

    const seedUrls = rawUrls
      .map(u => normalizeUrl(u))
      .filter(Boolean);

    if (seedUrls.length === 0) {
      throw new Error(`No valid starting URLs provided: ${startInput}`);
    }

    const queue = [];
    const visited = new Set();
    const crawledPages = [];
    const discoveredLinkGraph = new Map();
    const openApiSpecs = [];

    this.onProgress({
      type: 'start',
      startUrl: seedUrls.join(', '),
      seedCount: seedUrls.length,
      maxPages: this.maxPages,
      maxDepth: this.maxDepth
    });

    // Check each seed URL for OpenAPI / Swagger first
    for (const seedUrl of seedUrls) {
      try {
        const initialHtml = await this.fetchPage(seedUrl);
        const openApiSpecInfo = await this.detectOpenApiSpec(initialHtml, seedUrl);

        if (openApiSpecInfo) {
          this.onProgress({
            type: 'openapi_detected',
            specUrl: openApiSpecInfo.specUrl,
            title: openApiSpecInfo.spec.info?.title || 'OpenAPI Specification'
          });

          const parsedApi = parseOpenApiSpec(openApiSpecInfo.spec, openApiSpecInfo.specUrl);
          openApiSpecs.push({
            spec: openApiSpecInfo.spec,
            parsedApi,
            specUrl: openApiSpecInfo.specUrl
          });
        } else {
          queue.push({
            url: seedUrl,
            depth: 0,
            parentUrl: null,
            section: 'Overview'
          });
        }
      } catch (e) {
        queue.push({
          url: seedUrl,
          depth: 0,
          parentUrl: null,
          section: 'Overview'
        });
      }
    }

    // If ONLY OpenAPI specs were provided (e.g. single swagger URL)
    if (queue.length === 0 && openApiSpecs.length > 0) {
      return {
        isOpenApi: true,
        openApiData: openApiSpecs[0].parsedApi,
        openApiSpecs,
        specUrl: openApiSpecs[0].specUrl,
        startUrl: seedUrls.join(', '),
        seedUrls,
        pages: [],
        linkGraph: new Map()
      };
    }

    while (queue.length > 0 && crawledPages.length < this.maxPages) {
      const current = queue.shift();
      if (visited.has(current.url)) {
        continue;
      }
      visited.add(current.url);

      this.onProgress({
        type: 'crawling',
        url: current.url,
        depth: current.depth,
        pagesCrawled: crawledPages.length,
        queueSize: queue.length
      });

      try {
        const html = await this.fetchPage(current.url);
        const extractedLinks = extractLinksFromHtml(html, current.url, seedUrls, { scope: this.scope });
        discoveredLinkGraph.set(current.url, extractedLinks);

        crawledPages.push({
          url: current.url,
          depth: current.depth,
          parentUrl: current.parentUrl,
          section: current.section,
          html,
          links: extractedLinks
        });

        this.onProgress({
          type: 'page_crawled',
          url: current.url,
          depth: current.depth,
          linksFound: extractedLinks.length,
          pagesCrawled: crawledPages.length
        });

        // Enqueue next links if depth allows
        if (current.depth < this.maxDepth) {
          for (const link of extractedLinks) {
            if (!visited.has(link.url) && !queue.some(item => item.url === link.url)) {
              if (queue.length + crawledPages.length < this.maxPages * 2) {
                queue.push({
                  url: link.url,
                  depth: current.depth + 1,
                  parentUrl: current.url,
                  section: link.section || current.section
                });
              }
            }
          }
        }

        // Polite delay
        if (this.delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayMs));
        }

      } catch (err) {
        this.onError({
          url: current.url,
          error: err.message
        });
        this.onProgress({
          type: 'page_error',
          url: current.url,
          error: err.message
        });
      }
    }

    this.onProgress({
      type: 'complete',
      totalCrawled: crawledPages.length,
      startUrl: seedUrls.join(', ')
    });

    return {
      startUrl: seedUrls.join(', '),
      seedUrls,
      pages: crawledPages,
      openApiSpecs,
      linkGraph: discoveredLinkGraph
    };
  }
}
