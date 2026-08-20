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
      maxPages: options.maxPages ? parseInt(options.maxPages, 10) : 25,
      maxDepth: options.maxDepth ? parseInt(options.maxDepth, 10) : 3,
      scope: options.scope || 'subtree',
      maxFiles: options.maxFiles ? parseInt(options.maxFiles, 10) : 100,
      githubToken: options.githubToken || ''
    }
  };

  const { documents, sources, errors } = await ingestSources(inputs, ctx);

  onProgress({ type: 'building_bundle', message: 'Generating OKF v0.2 bundle structure...' });

  const builder = new OKFBundleBuilder({
    includeAttestedComputations: options.computations !== false,
    bundleTitle: options.bundleTitle || 'Documentation Knowledge Bundle',
    timestamp: options.timestamp,
    splitSections: options.splitSections !== false,
    splitOptions: {
      ...(options.minSections ? { minSections: parseInt(options.minSections, 10) } : {}),
      ...(options.maxSections ? { maxSections: parseInt(options.maxSections, 10) } : {})
    }
  });

  const bundle = builder.buildBundle({
    documents,
    sources,
    startUrl: sources.map(src => src.url).filter(Boolean).join(', ')
  });

  onProgress({ type: 'validating', message: 'Validating OKF v0.2 compliance...' });
  const validation = validateOKFBundle(bundle.files);

  const files = {};
  for (const [filePath, content] of bundle.files.entries()) {
    files[filePath] = content;
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
    files,
    validation,
    graph: buildBundleGraph(bundle.files)
  };
}
