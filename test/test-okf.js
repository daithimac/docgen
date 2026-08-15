import assert from 'assert';
import { parseDocumentationHtml } from '../src/core/parser.js';
import { htmlToMarkdown } from '../src/core/markdown-converter.js';
import { OKFBundleBuilder } from '../src/core/okf-builder.js';
import { validateOKFBundle } from '../src/core/validator.js';

console.log('🧪 Running OKF Parser & Generator Tests...\n');

// 1. Test HTML parsing
const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Load Data Overview | Google Cloud</title>
  <meta name="description" content="Overview of loading data into BigQuery tables." />
  <meta name="author" content="Google Cloud Documentation" />
  <meta name="last-modified" content="2026-08-15" />
</head>
<body>
  <div class="devsite-article-body">
    <h1>Loading data in BigQuery</h1>
    <p>You can load data into BigQuery using several methods.</p>
    <h2>Supported Formats</h2>
    <table>
      <thead><tr><th>Format</th><th>Type</th></tr></thead>
      <tbody><tr><td>CSV</td><td>Delimited</td></tr><tr><td>Parquet</td><td>Columnar</td></tr></tbody>
    </table>
    <h2>Sample Query</h2>
    <pre class="lang-sql"><code>SELECT * FROM \`project.dataset.table\` WHERE id = @user_id</code></pre>
    <a href="/bigquery/docs/transform-intro">Learn about transformation</a>
  </div>
</body>
</html>
`;

const parsed = parseDocumentationHtml(sampleHtml, 'https://docs.cloud.google.com/bigquery/docs/loading-data');
assert.strictEqual(parsed.title, 'Loading data in BigQuery');
assert.strictEqual(parsed.description, 'Overview of loading data into BigQuery tables.');
assert.strictEqual(parsed.codeBlocks.length, 1);
assert.strictEqual(parsed.codeBlocks[0].language, 'sql');
console.log('✅ 1. HTML parsing verified: Title, description, and SQL code blocks extracted correctly.');

// 2. Test Markdown conversion with GFM tables
const md = htmlToMarkdown(parsed.htmlBody);
assert(md.includes('| Format | Type |'));
assert(md.includes('```sql'));
console.log('✅ 2. Markdown converter verified: GFM tables and fenced code blocks properly formatted.');

// 3. Test OKF Bundle Builder
const mockCrawlResult = {
  startUrl: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro',
  pages: [
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro',
      html: sampleHtml,
      section: 'Overview'
    },
    {
      url: 'https://docs.cloud.google.com/bigquery/docs/loading-data',
      html: sampleHtml,
      section: 'Load data'
    }
  ]
};

const builder = new OKFBundleBuilder();
const bundle = builder.buildBundle(mockCrawlResult);

assert(bundle.files.has('index.md'), 'Root index.md must exist');
assert(bundle.files.has('log.md'), 'log.md must exist');
assert(bundle.files.has('overview.md'), 'overview.md must exist');
assert(bundle.files.has('load-data/loading-data.md'), 'load-data/loading-data.md must exist');
console.log('✅ 3. OKF Bundle structure verified: Root index.md, log.md, and concept files created.');

// 4. Test OKF Validator
const validation = validateOKFBundle(bundle.files);
assert.strictEqual(validation.isValid, true, `Bundle should be conformant: ${JSON.stringify(validation.errors)}`);
assert.strictEqual(validation.errors.length, 0);
console.log('✅ 4. OKF v0.2 Validator verified: 100% conformance on generated bundle.');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
