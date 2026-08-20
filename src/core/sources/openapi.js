import yaml from 'js-yaml';
import { parseOpenApiSpec, openApiToDocuments } from '../openapi-parser.js';
import { slugify } from '../okf-builder.js';
import { SOURCE_TYPES } from './types.js';

const COMMON_SPEC_PATHS = [
  '/swagger.json',
  '/openapi.json',
  '/v1/swagger.json',
  '/api-docs',
  '/v3/api-docs',
  '/swagger/v1/swagger.json'
];

/**
 * Parses a string as an OpenAPI/Swagger spec if it looks like one (JSON or YAML).
 */
export function parseSpecText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && (parsed.swagger || parsed.openapi) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  if (/^\s*(openapi|swagger)\s*:/m.test(trimmed)) {
    try {
      const parsed = yaml.load(trimmed);
      return parsed && (parsed.swagger || parsed.openapi) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Detects an OpenAPI/Swagger specification from a URL's content.
 * Handles direct specs, SwaggerUI/Redoc pages that name a spec URL, and the
 * well-known spec endpoints. Moved here from the crawler so the crawler stays
 * a pure HTML crawler.
 */
export async function detectOpenApiSpec(contentOrData, url, fetcher) {
  if (contentOrData && typeof contentOrData === 'object' && (contentOrData.swagger || contentOrData.openapi)) {
    return { spec: contentOrData, specUrl: url };
  }

  if (typeof contentOrData !== 'string') return null;

  // 1. The content itself is a spec
  const direct = parseSpecText(contentOrData);
  if (direct) return { spec: direct, specUrl: url };

  if (!fetcher) return null;

  // 2. A SwaggerUI / Redoc page pointing at a spec URL
  const specUrlMatch = contentOrData.match(/(?:url|spec-url)\s*[:=]\s*["']([^"']+)["']/i);
  if (specUrlMatch) {
    try {
      const candidateUrl = new URL(specUrlMatch[1], url).href;
      const spec = parseSpecText(await fetcher.getText(candidateUrl, { accept: 'application/json' }));
      if (spec) return { spec, specUrl: candidateUrl };
    } catch (e) { /* fall through to well-known paths */ }
  }

  // 3. Well-known spec endpoints on a page that advertises Swagger/OpenAPI
  if (/swagger-ui|swagger|openapi|redoc/i.test(contentOrData)) {
    for (const specPath of COMMON_SPEC_PATHS) {
      try {
        const candidateUrl = new URL(specPath, url).href;
        const spec = parseSpecText(await fetcher.getText(candidateUrl, { accept: 'application/json' }));
        if (spec) return { spec, specUrl: candidateUrl };
      } catch (e) { /* try the next candidate */ }
    }
  }

  return null;
}

/**
 * Ingests an OpenAPI/Swagger source (URL or raw spec text) into documents.
 */
export async function ingest(input, ctx = {}) {
  const { fetcher, onProgress = () => {} } = ctx;
  const isUrl = typeof input.value === 'string' && /^https?:\/\//i.test(input.value.trim());

  let spec = null;
  let specUrl = isUrl ? input.value.trim() : (input.name || 'spec://uploaded');

  if (isUrl) {
    onProgress({ type: 'fetching', url: specUrl, message: `Fetching API specification: ${specUrl}` });
    const text = await fetcher.getText(specUrl, { accept: 'application/json, application/yaml, */*' });
    const detected = await detectOpenApiSpec(text, specUrl, fetcher);
    if (detected) {
      spec = detected.spec;
      specUrl = detected.specUrl;
    }
  } else {
    spec = parseSpecText(input.value);
  }

  if (!spec) {
    throw new Error(
      `No OpenAPI or Swagger specification found at ${specUrl}. ` +
      'Ensure the document declares an "openapi" or "swagger" version field.'
    );
  }

  const parsedApi = parseOpenApiSpec(spec, specUrl);
  onProgress({
    type: 'openapi_detected',
    specUrl,
    title: parsedApi.title,
    message: `Parsed ${parsedApi.endpoints.length} endpoints from ${parsedApi.title}`
  });

  const sourceId = input.sourceId || slugify(parsedApi.title || 'api');
  const documents = openApiToDocuments(parsedApi, specUrl, { sourceId, timestamp: ctx.timestamp });

  return {
    documents,
    meta: {
      sourceId,
      sourceType: SOURCE_TYPES.OPENAPI,
      url: specUrl,
      title: `${parsedApi.title} (v${parsedApi.version})`,
      description: parsedApi.description
    }
  };
}
