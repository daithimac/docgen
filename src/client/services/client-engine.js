import JSZip from 'jszip';
import { validateOKFBundle } from '../../core/validator.js';
import { OKFBundleBuilder } from '../../core/okf-builder.js';
import { buildBundleGraph } from '../../core/graph-builder.js';
import { generateBundle } from '../../core/pipeline.js';
import { createBrowserFetcher } from '../../core/http.js';
import { describeSources } from '../../core/sources/registry.js';

export { describeSources };

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
    validation: validateOKFBundle(bundle.files),
    graph: buildBundleGraph(bundle.files)
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
 * Reads browser File objects into upload descriptors the pipeline understands.
 */
export async function filesToSourceInputs(fileList) {
  const files = Array.from(fileList || []);
  return Promise.all(files.map(async (file) => ({
    type: 'upload',
    name: file.name,
    value: { name: file.name, data: await file.arrayBuffer() }
  })));
}

/**
 * Runs the full multi-source pipeline entirely in the browser.
 *
 * This is what keeps the static GitHub Pages build at parity with the server:
 * the same adapters and bundle builder run here, with a fetch + CORS-proxy
 * fetcher injected in place of the Node one.
 */
export async function generateBundleInBrowser(inputs, options = {}) {
  return generateBundle(inputs, {
    ...options,
    fetcher: createBrowserFetcher()
  });
}

/**
 * Convenience wrapper for a drag-and-drop file set, optionally combined with
 * URL sources typed into the input field.
 */
export async function generateBundleFromFiles(fileList, urlInputs = [], options = {}) {
  const uploads = await filesToSourceInputs(fileList);
  return generateBundleInBrowser([...(urlInputs || []), ...uploads], options);
}
