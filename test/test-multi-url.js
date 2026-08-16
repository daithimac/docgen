import assert from 'assert';
import { isRelevantLink } from '../src/core/crawler.js';
import { OKFBundleBuilder } from '../src/core/okf-builder.js';
import { validateOKFBundle } from '../src/core/validator.js';

console.log('🧪 Running Multi-URL Documentation Crawl & Bundle Tests...\n');

// 1. Test multi-seed URL relevance checking
const seedUrls = [
  'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro',
  'https://docs.cloud.google.com/dataform/docs/overview'
];

assert.strictEqual(
  isRelevantLink('https://docs.cloud.google.com/bigquery/docs/loading-data', seedUrls),
  true,
  'Should accept sub-link of first seed URL'
);

assert.strictEqual(
  isRelevantLink('https://docs.cloud.google.com/dataform/docs/quickstart', seedUrls),
  true,
  'Should accept sub-link of second seed URL'
);

assert.strictEqual(
  isRelevantLink('https://cloud.google.com/unrelated-service/overview', seedUrls),
  false,
  'Should reject unrelated links'
);

console.log('✅ 1. Multi-URL Scope Filtering: Correctly accepts links from all seed URLs.');

// 2. Test Multi-Site OKF Bundle Building
const mockPages = [
  {
    url: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro',
    section: 'BigQuery Data Integration',
    html: `<html><head><title>BigQuery Load & Transform Guide</title><meta property="og:site_name" content="Google Cloud"></head><body><div class="devsite-article-body"><h1>BigQuery Load & Transform</h1><p>Comprehensive guide to BigQuery ELT.</p></div></body></html>`
  },
  {
    url: 'https://docs.cloud.google.com/bigquery/docs/loading-data',
    section: 'Load Data',
    html: `<html><head><title>Loading Data into BigQuery</title><meta property="og:site_name" content="Google Cloud"></head><body><div class="devsite-article-body"><h1>Loading Data</h1><p>Batch and streaming ingestion.</p></div></body></html>`
  },
  {
    url: 'https://docs.cloud.google.com/dataform/docs/overview',
    section: 'Dataform SQL Pipelines',
    html: `<html><head><title>Dataform Overview</title><meta property="og:site_name" content="Google Cloud"></head><body><div class="devsite-article-body"><h1>Dataform Overview</h1><p>Developing scalable SQL workflows.</p></div></body></html>`
  },
  {
    url: 'https://docs.cloud.google.com/dataform/docs/quickstart',
    section: 'Dataform SQL Pipelines',
    html: `<html><head><title>Dataform Quickstart</title><meta property="og:site_name" content="Google Cloud"></head><body><div class="devsite-article-body"><h1>Dataform Quickstart</h1><p>Create your first repository.</p></div></body></html>`
  }
];

const builder = new OKFBundleBuilder({
  bundleTitle: 'Enterprise Data Platform Bundle'
});

const multiUrlResult = {
  startUrl: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro, https://docs.cloud.google.com/dataform/docs/overview',
  seedUrls,
  pages: mockPages
};

const bundle = builder.buildBundle(multiUrlResult);

assert(bundle.files.has('index.md'), 'Root index.md must exist');
assert(bundle.files.has('log.md'), 'log.md must exist');
assert(bundle.folders.length >= 2, 'Must have at least 2 section folders');

const validation = validateOKFBundle(bundle.files);
assert.strictEqual(validation.isValid, true, `Validation failed: ${JSON.stringify(validation.errors)}`);
assert.strictEqual(validation.errors.length, 0);

console.log(`✅ 2. Multi-URL OKF Bundle Builder: Successfully generated ${bundle.files.size} files across ${bundle.folderCount} folders with 100% OKF v0.2 conformance.`);

console.log('\n🎉 ALL MULTI-URL TESTS PASSED SUCCESSFULLY!\n');
