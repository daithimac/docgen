/**
 * Isomorphic fetching layer.
 *
 * Adapters never import axios or call fetch directly - they receive a fetcher
 * from the entry point (Node server / CLI use the axios fetcher, the static
 * browser build uses the fetch + CORS-proxy fetcher). This is what lets the
 * same source adapters run in all three runtimes.
 */

export const DEFAULT_USER_AGENT =
  'OKF-DocGen-Bot/0.2 (Open Knowledge Format Generator; +https://github.com/docgen-okf)';

const DEFAULT_TIMEOUT = 15000;

/**
 * Normalizes an arbitrary thrown value into an Error with a useful message.
 */
function toFetchError(url, err) {
  const status = err?.response?.status;
  const message = status
    ? `HTTP ${status} fetching ${url}`
    : `${err?.message || 'Request failed'} (${url})`;
  const error = new Error(message);
  error.status = status;
  error.url = url;
  return error;
}

/**
 * Node fetcher backed by axios. Mirrors the request configuration the crawler
 * has always used so crawl behaviour is unchanged.
 */
export function createNodeFetcher(options = {}) {
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  const request = async (url, { accept, responseType, headers = {} } = {}) => {
    const { default: axios } = await import('axios');
    try {
      return await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...headers
        },
        timeout,
        maxRedirects: 5,
        responseType: responseType || 'text',
        // Keep JSON responses as raw text unless getJson asked otherwise, so
        // callers can sniff content themselves.
        transformResponse: responseType === 'arraybuffer' ? undefined : [(d) => d]
      });
    } catch (err) {
      throw toFetchError(url, err);
    }
  };

  return {
    name: 'node',
    capabilities: { canClone: true, canReadLocalFiles: true, isBrowser: false },

    async getText(url, opts) {
      const res = await request(url, opts);
      return typeof res.data === 'string' ? res.data : String(res.data);
    },

    async getJson(url, opts) {
      const text = await this.getText(url, { accept: 'application/json', ...opts });
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Response from ${url} is not valid JSON: ${e.message}`);
      }
    },

    async getBinary(url, opts) {
      const res = await request(url, { responseType: 'arraybuffer', ...opts });
      return res.data instanceof ArrayBuffer ? res.data : new Uint8Array(res.data).buffer;
    }
  };
}

/**
 * Browser fetcher. Falls back to a public CORS proxy when a cross-origin
 * request is blocked - the same strategy the static GitHub Pages engine has
 * always used for OpenAPI specs.
 */
export function createBrowserFetcher(options = {}) {
  const proxy = options.corsProxy || ((url) => `https://corsproxy.io/?${encodeURIComponent(url)}`);

  const request = async (url, { accept, headers = {} } = {}) => {
    const init = { headers: { ...(accept ? { Accept: accept } : {}), ...headers } };
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (directErr) {
      try {
        const res = await fetch(proxy(url), init);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (proxyErr) {
        // Both the direct request and the proxy failed. In a browser this is
        // almost always the host refusing cross-origin requests rather than the
        // resource being missing, so say what actually works instead.
        const error = new Error(
          `${url} could not be fetched from the browser (${directErr.message}). ` +
          'The host does not allow cross-origin requests and the fallback proxy could not reach it either. ' +
          'Run this source through the DocGen server or the CLI, which fetch it directly.'
        );
        error.url = url;
        error.isCrossOriginBlocked = true;
        throw error;
      }
    }
  };

  return {
    name: 'browser',
    capabilities: { canClone: false, canReadLocalFiles: false, isBrowser: true },

    async getText(url, opts) {
      const res = await request(url, opts);
      return res.text();
    },

    async getJson(url, opts) {
      const text = await this.getText(url, { accept: 'application/json', ...opts });
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Response from ${url} is not valid JSON: ${e.message}`);
      }
    },

    async getBinary(url, opts) {
      const res = await request(url, opts);
      return res.arrayBuffer();
    }
  };
}

/**
 * Picks the right fetcher for the current runtime.
 */
export function createDefaultFetcher(options = {}) {
  const isBrowser = typeof window !== 'undefined' && typeof window.fetch === 'function';
  return isBrowser ? createBrowserFetcher(options) : createNodeFetcher(options);
}
