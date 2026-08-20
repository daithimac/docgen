import { ingestSources } from './sources/registry.js';
import { OKFBundleBuilder } from './okf-builder.js';
import { validateOKFBundle } from './validator.js';
import { buildBundleGraph } from './graph-builder.js';
import { createDefaultFetcher } from './http.js';

/**
 * The single ingestion pipeline shared by the HTTP server, the CLI and the
 * in-browser engine. Entry points differ only in the fetcher they inject and
 * how they surface progress.
 */
export async function generateBundle(inputs, options = {}) {
  const onProgress = options.onProgress || (() => {});
  const fetcher = options.fetcher || createDefaultFetcher();

  const ctx = {
    fetcher,
    onProgress,
    timestamp: options.timestamp,
    options: {
      // 0 means unlimited for each of these caps.
      maxPages: options.maxPages === undefined ? 25 : parseInt(options.maxPages, 10),
      maxDepth: options.maxDepth === undefined ? 3 : parseInt(options.maxDepth, 10),
      scope: options.scope || 'subtree',
      maxFiles: options.maxFiles === undefined ? 100 : parseInt(options.maxFiles, 10),
      readConcurrency: options.readConcurrency,
      fetchMode: options.fetchMode,
      githubToken: options.githubToken || ''
    }
  };

  const { documents, sources, errors, warnings } = await ingestSources(inputs, ctx);

  onProgress({ type: 'building_bundle', message: 'Generating OKF v0.2 bundle structure...' });

  const builder = new OKFBundleBuilder({
    includeAttestedComputations: options.computations !== false,
    bundleTitle: options.bundleTitle || 'Documentation Knowledge Bundle',
    timestamp: options.timestamp,
    splitSections: options.splitSections !== false,
    splitOptions: {
      ...(options.minSections !== undefined ? { minSections: parseInt(options.minSections, 10) } : {}),
      ...(options.maxSections !== undefined ? { maxSections: parseInt(options.maxSections, 10) } : {})
    }
  });

  const bundle = builder.buildBundle({
    documents,
    sources,
    startUrl: sources.map(src => src.url).filter(Boolean).join(', ')
  });

  onProgress({ type: 'validating', message: 'Validating OKF v0.2 compliance...' });
  const validation = validateOKFBundle(bundle.files);

  // The CLI writes straight to disk, so copying every file into a second plain
  // object would double peak memory on a large bundle for no reason.
  let files;
  if (options.filesAs === 'map') {
    files = bundle.files;
  } else {
    files = {};
    for (const [filePath, content] of bundle.files.entries()) {
      files[filePath] = content;
    }
  }

  onProgress({ type: 'done', message: 'OKF Bundle successfully built and verified!' });

  return {
    success: true,
    title: bundle.title,
    siteName: bundle.siteName,
    bundleName: bundle.bundleName,
    startUrl: bundle.startUrl,
    conceptCount: bundle.conceptCount,
    folderCount: bundle.folderCount,
    folders: bundle.folders,
    sources: bundle.sources,
    sourceErrors: errors,
    warnings,
    files,
    validation,
    graph: buildBundleGraph(bundle.files)
  };
}
