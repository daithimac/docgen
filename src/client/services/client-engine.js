import JSZip from 'jszip';
import yaml from 'js-yaml';
import { parseOpenApiSpec, buildOKFBundleFromOpenApi } from '../../core/openapi-parser.js';
import { validateOKFBundle } from '../../core/validator.js';
import { OKFBundleBuilder } from '../../core/okf-builder.js';

/**
 * Built-in static demo bundle for BigQuery ELT / ETL Intro
 */
export function getStaticDemoBundle() {
  const sampleUrl = 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro';
  const builder = new OKFBundleBuilder();
  const mockPages = [
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro',
      section: 'Overview',
      html: `<html><head><title>Introduction to loading, transforming, and exporting data | BigQuery</title><meta property="og:site_name" content="Google Cloud Documentation"><meta name="description" content="Learn about ELT and ETL data integrations for loading and transforming data in BigQuery, and exporting data to other systems."></head><body><div class="devsite-article-body"><h1>Introduction to loading, transforming, and exporting data</h1><p>This document describes the data integration approaches to load and transform data in BigQuery using extract, load, and transform (ELT) or extract, transform, load (ETL). It also describes exporting data to other systems (reverse ETL).</p><h2>Deciding between ELT or ETL</h2><p>In general, we recommend the ELT approach. It splits complex integration into two manageable parts: extract & load, then transform.</p><h2>Loading and transforming data</h2><p>Learn more about <a href="/bigquery/docs/loading-data">loading data in BigQuery</a>, <a href="/bigquery/docs/transform-intro">transforming data in BigQuery</a>, and <a href="/bigquery/docs/export-intro">exporting data in BigQuery</a>.</p></div></body></html>`
    },
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/migration-intro',
      section: 'Migrate data',
      html: `<html><head><title>Migrate data to BigQuery | BigQuery</title><meta property="og:site_name" content="Google Cloud Documentation"><meta name="description" content="Guide to migrating schema, data, and pipelines to Google Cloud BigQuery."></head><body><div class="devsite-article-body"><h1>Migrate data to BigQuery</h1><p>Migrate your workloads from legacy data warehouses to BigQuery. Utilize the batch SQL translation engine and data migration service.</p><h2>Assessment and Planning</h2><p>Assess database objects, schema complexity, and query volume before migration.</p></div></body></html>`
    },
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/loading-data',
      section: 'Load data',
      html: `<html><head><title>Loading data into BigQuery | BigQuery</title><meta property="og:site_name" content="Google Cloud Documentation"><meta name="description" content="Methods for loading batch and streaming data into BigQuery tables."></head><body><div class="devsite-article-body"><h1>Loading data into BigQuery</h1><p>BigQuery supports batch loading from Cloud Storage, Google Drive, and local files, as well as real-time streaming ingestion via Storage Write API.</p><h2>Batch Loading Example</h2><pre class="lang-sql"><code>LOAD DATA INTO \`myproject.mydataset.orders\` FROM FILES (format = 'CSV', uris = ['gs://bucket/orders*.csv']);</code></pre></div></body></html>`
    },
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/transform-intro',
      section: 'Transform data',
      html: `<html><head><title>Transforming data in BigQuery | BigQuery</title><meta property="og:site_name" content="Google Cloud Documentation"><meta name="description" content="Transform data at scale using SQL, Dataform, and BigQuery Pipelines."></head><body><div class="devsite-article-body"><h1>Transforming data in BigQuery</h1><p>Once data is loaded into BigQuery, you can transform it using SQL queries, Dataform ELT pipelines, or AI-augmented data preparation.</p><h2>SQL Transformation Example</h2><pre class="lang-sql"><code>CREATE OR REPLACE TABLE \`myproject.analytics.daily_revenue\` AS SELECT DATE(placed_at) AS order_date, SUM(amount) AS total_revenue FROM \`myproject.raw.orders\` GROUP BY 1;</code></pre></div></body></html>`
    },
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/export-intro',
      section: 'Export data',
      html: `<html><head><title>Exporting data from BigQuery | BigQuery</title><meta property="og:site_name" content="Google Cloud Documentation"><meta name="description" content="Export BigQuery tables and query results to Cloud Storage, Spanner, and Google Sheets."></head><body><div class="devsite-article-body"><h1>Exporting data from BigQuery</h1><p>Export table data to Cloud Storage in Avro, CSV, JSON, or Parquet format, or stream results to operational databases (reverse ETL).</p><h2>Export Statement Example</h2><pre class="lang-sql"><code>EXPORT DATA OPTIONS(uri='gs://mybucket/export/orders_*.parquet', format='PARQUET') AS SELECT * FROM \`myproject.analytics.orders\`;</code></pre></div></body></html>`
    }
  ];

  const bundle = builder.buildBundle({ startUrl: sampleUrl, pages: mockPages });
  const filesObject = {};
  for (const [filePath, content] of bundle.files.entries()) {
    filesObject[filePath] = content;
  }
  const validation = validateOKFBundle(bundle.files);

  const graphNodes = [{ id: 'index.md', label: 'Root Index (v0.2)', type: 'root-index', folder: '' }];
  const graphLinks = [];

  for (const [filePath, content] of bundle.files.entries()) {
    if (filePath === 'index.md' || filePath === 'log.md') continue;
    let docType = 'Concept';
    let title = filePath;
    if (content.startsWith('---')) {
      const typeMatch = content.match(/type:\s*([^\n\r]+)/);
      if (typeMatch) docType = typeMatch[1].trim();
      const titleMatch = content.match(/title:\s*([^\n\r]+)/);
      if (titleMatch) title = titleMatch[1].trim();
    }

    graphNodes.push({ id: filePath, label: title, type: docType, folder: filePath.includes('/') ? filePath.split('/')[0] : 'root' });

    if (filePath.endsWith('/index.md')) {
      graphLinks.push({ source: 'index.md', target: filePath, type: 'hierarchy' });
    } else {
      const folder = filePath.includes('/') ? filePath.split('/')[0] : '';
      const parentIndex = folder ? `${folder}/index.md` : 'index.md';
      graphLinks.push({ source: parentIndex, target: filePath, type: 'contains' });
    }
  }

  return {
    success: true,
    title: 'Google Cloud BigQuery ELT / ETL Bundle',
    siteName: bundle.siteName,
    bundleName: bundle.bundleName,
    startUrl: sampleUrl,
    conceptCount: bundle.conceptCount,
    folderCount: bundle.folderCount,
    folders: bundle.folders,
    files: filesObject,
    validation,
    graph: { nodes: graphNodes, links: graphLinks }
  };
}

/**
 * Downloads a ZIP file directly in the browser using JSZip without a backend server.
 */
export async function downloadZipInBrowser(files, bundleName = 'okf-knowledge-bundle') {
  const zip = new JSZip();
  for (const [filePath, content] of Object.entries(files)) {
    zip.file(filePath, content);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const cleanName = (bundleName || 'okf-knowledge-bundle')
    .toString()
    .replace(/[^\w.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\.zip$/i, '');

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${cleanName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Client-side bundle generator for OpenAPI specs or custom input
 */
export async function generateBundleInBrowser(rawContentOrUrl, isUrl = true) {
  let specs = [];
  let sourceUrl = isUrl ? rawContentOrUrl : 'https://api.example.com/spec.json';

  if (isUrl) {
    const urls = rawContentOrUrl.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

    for (const u of urls) {
      let fetchUrl = u;
      if (u.includes('api.oireachtas.ie') && !u.endsWith('.json')) {
        fetchUrl = 'https://api.oireachtas.ie/swagger.json';
      }

      let fetchedSpec = null;
      try {
        const resp = await fetch(fetchUrl);
        fetchedSpec = await resp.json();
      } catch (e) {
        // Try CORS proxy if direct fetch fails on GitHub pages
        try {
          const corsUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
          const resp = await fetch(corsUrl);
          fetchedSpec = await resp.json();
        } catch (err2) {}
      }

      if (fetchedSpec) {
        specs.push({ spec: fetchedSpec, url: u });
      }
    }
  } else {
    // Parse raw text JSON or YAML
    try {
      const parsed = typeof rawContentOrUrl === 'string' ? (rawContentOrUrl.trim().startsWith('{') ? JSON.parse(rawContentOrUrl) : yaml.load(rawContentOrUrl)) : rawContentOrUrl;
      specs.push({ spec: parsed, url: sourceUrl });
    } catch (err) {
      throw new Error(`Failed to parse OpenAPI JSON/YAML: ${err.message}`);
    }
  }

  if (specs.length > 0) {
    // Combine specs into bundle
    let mainParsedApi = null;
    for (const { spec, url } of specs) {
      if (spec && (spec.swagger || spec.openapi)) {
        mainParsedApi = parseOpenApiSpec(spec, url);
        break;
      }
    }

    if (!mainParsedApi) {
      throw new Error('Could not parse OpenAPI specification from provided URL(s).');
    }

    const bundle = buildOKFBundleFromOpenApi(mainParsedApi, sourceUrl);

    const filesObject = {};
    for (const [filePath, content] of bundle.files.entries()) {
      filesObject[filePath] = content;
    }

    const validation = validateOKFBundle(bundle.files);

    // Build Graph Data
    const graphNodes = [{ id: 'index.md', label: 'Root Index (v0.2)', type: 'root-index', folder: '' }];
    const graphLinks = [];

    for (const [filePath, content] of bundle.files.entries()) {
      if (filePath === 'index.md' || filePath === 'log.md') continue;
      let docType = 'Concept';
      let title = filePath;
      if (content.startsWith('---')) {
        const typeMatch = content.match(/type:\s*([^\n\r]+)/);
        if (typeMatch) docType = typeMatch[1].trim();
        const titleMatch = content.match(/title:\s*([^\n\r]+)/);
        if (titleMatch) title = titleMatch[1].trim();
      }

      graphNodes.push({ id: filePath, label: title, type: docType, folder: filePath.includes('/') ? filePath.split('/')[0] : 'root' });

      if (filePath.endsWith('/index.md')) {
        graphLinks.push({ source: 'index.md', target: filePath, type: 'hierarchy' });
      } else {
        const folder = filePath.includes('/') ? filePath.split('/')[0] : '';
        const parentIndex = folder ? `${folder}/index.md` : 'index.md';
        graphLinks.push({ source: parentIndex, target: filePath, type: 'contains' });
      }
    }

    return {
      success: true,
      title: bundle.title,
      siteName: bundle.siteName,
      bundleName: bundle.bundleName,
      startUrl: sourceUrl,
      conceptCount: bundle.conceptCount,
      folderCount: bundle.folderCount,
      folders: bundle.folders,
      files: filesObject,
      validation,
      graph: { nodes: graphNodes, links: graphLinks }
    };
  }

  throw new Error('Content is not a recognized OpenAPI / Swagger specification. Please ensure it contains "swagger" or "openapi" declaration.');
}
