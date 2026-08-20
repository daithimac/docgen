import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { OKFBundleBuilder } from '../core/okf-builder.js';
import { validateOKFBundle } from '../core/validator.js';
import { buildBundleGraph } from '../core/graph-builder.js';
import { generateBundle } from '../core/pipeline.js';
import { createNodeFetcher } from '../core/http.js';
import { describeSources, SOURCE_TYPE_LABELS } from '../core/sources/registry.js';
import { SUPPORTED_UPLOAD_EXTENSIONS } from '../core/sources/upload.js';
import { createBundleZip, saveBundleToDisk } from '../core/exporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory cache for active crawl streams
const activeCrawlEvents = new Map();

/**
 * SSE endpoint for live streaming crawl progress
 */
app.get('/api/crawl/stream', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).send('sessionId required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  activeCrawlEvents.set(sessionId, sendEvent);

  req.on('close', () => {
    activeCrawlEvents.delete(sessionId);
  });
});

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 20 },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [''])[0].toLowerCase();
    if (!SUPPORTED_UPLOAD_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Unsupported upload type "${ext || file.originalname}". Supported: ${SUPPORTED_UPLOAD_EXTENSIONS.join(', ')}.`));
    }
    cb(null, true);
  }
});

/**
 * Resolves a request body into the source inputs the pipeline understands.
 */
function collectSourceInputs(body = {}, files = []) {
  const inputs = [];

  const raw = body.sources || body.urls || body.url;
  if (raw) {
    if (Array.isArray(raw)) {
      inputs.push(...raw);
    } else if (typeof raw === 'string') {
      inputs.push(raw);
    }
  }

  for (const file of files) {
    inputs.push({
      type: 'upload',
      name: file.originalname,
      value: { name: file.originalname, data: file.buffer }
    });
  }

  return inputs;
}

/**
 * Runs the shared pipeline and streams progress over the session's SSE channel.
 */
async function runGeneration(req, res, files = []) {
  const body = req.body || {};
  const sessionId = body.sessionId;
  const streamSender = sessionId ? activeCrawlEvents.get(sessionId) : null;
  const emitProgress = (payload) => {
    if (streamSender) streamSender(payload);
  };

  const inputs = collectSourceInputs(body, files);
  if (inputs.length === 0) {
    return res.status(400).json({ error: 'At least one source URL or uploaded file is required.' });
  }

  const unlimited = body.unlimited === true || body.unlimited === 'true';

  try {
    const described = describeSources(inputs);
    emitProgress({
      type: 'init',
      message: `Initializing ingestion for ${described.length} source(s): ` +
        described.map(d => `${d.value} [${SOURCE_TYPE_LABELS[d.type] || d.type}]`).join(', ')
    });

    const payload = await generateBundle(inputs, {
      fetcher: createNodeFetcher(),
      onProgress: emitProgress,
      // 0 means unlimited for each cap; `unlimited` clears them all at once.
      maxPages: unlimited ? 0 : (body.maxPages ?? 20),
      maxDepth: unlimited ? 0 : (body.maxDepth ?? 3),
      scope: body.scope || 'subtree',
      maxFiles: unlimited ? 0 : (body.maxFiles ?? 100),
      readConcurrency: body.readConcurrency,
      fetchMode: body.fetchMode,
      githubToken: body.githubToken || process.env.GITHUB_TOKEN || '',
      computations: body.computations !== false && body.computations !== 'false',
      splitSections: body.splitSections !== false && body.splitSections !== 'false',
      minSections: body.minSections,
      maxSections: unlimited ? 0 : body.maxSections
    });

    res.json(payload);
  } catch (error) {
    console.error('Ingestion & Generation error:', error);
    emitProgress({ type: 'fatal_error', error: error.message });
    res.status(500).json({ error: error.message });
  }
}

/**
 * Canonical multi-source generation endpoint.
 */
app.post('/api/generate', (req, res) => runGeneration(req, res));

/**
 * Legacy crawl endpoint - same pipeline, kept for existing clients.
 */
app.post('/api/crawl', (req, res) => runGeneration(req, res));

/**
 * Multi-source generation with uploaded documents attached.
 */
app.post('/api/upload', (req, res) => {
  upload.array('files', 20)(req, res, (err) => {
    if (err) {
      // Surface rejected uploads as JSON, not Express's default HTML error page.
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? `Uploaded file exceeds the ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit.`
        : err.message;
      return res.status(400).json({ error: message });
    }
    runGeneration(req, res, req.files || []);
  });
});

/**
 * Classify source inputs without fetching anything (drives the UI type chips).
 */
app.post('/api/describe-sources', (req, res) => {
  const inputs = collectSourceInputs(req.body || {});
  res.json({ sources: describeSources(inputs) });
});

/**
 * Validate arbitrary OKF Bundle
 */
app.post('/api/validate', (req, res) => {
  const { files } = req.body;
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'files object required' });
  }
  const validation = validateOKFBundle(files);
  res.json(validation);
});

/**
 * Download Bundle as ZIP
 */
app.post('/api/download-zip', async (req, res) => {
  let { files, bundleName = 'okf-knowledge-bundle' } = req.body;
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'files object required' });
  }

  // Clean and sanitize filename
  const cleanName = (bundleName || 'okf-knowledge-bundle')
    .toString()
    .replace(/[^\w.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\.zip$/i, '');

  try {
    const zipBuffer = await createBundleZip(files);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanName}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save Bundle to local disk
 */
app.post('/api/export-disk', async (req, res) => {
  const { files, targetDir = './bundles/okf-bundle' } = req.body;
  if (!files || typeof files !== 'object') {
    return res.status(400).json({ error: 'files object required' });
  }

  try {
    const result = await saveBundleToDisk(files, targetDir);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Sample Pre-built Bundle for instant demo
 */
app.get('/api/sample', async (req, res) => {
  const sampleUrl = 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro';
  try {
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

    res.json({
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
      graph: buildBundleGraph(bundle.files)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production or if static build exists
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

app.listen(PORT, () => {
  console.log(`🚀 OKF Bundle Generator Server running on http://localhost:${PORT}`);
});
