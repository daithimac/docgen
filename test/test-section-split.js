import assert from 'assert';
import { splitMarkdownIntoSections, chooseSplitLevel, measureProse } from '../src/core/section-splitter.js';
import { scanHeadings, parseMarkdownDocument, absolutizeMarkdownLinks } from '../src/core/markdown-parser.js';
import { OKFBundleBuilder, truncateSlug } from '../src/core/okf-builder.js';
import { validateOKFBundle } from '../src/core/validator.js';
import { repoLinkRoot } from '../src/core/sources/markdown.js';

console.log('🧪 Running Section Splitting Tests...\n');

// A structural replica of the reported document: an indented title, two
// headings used as intro prose, a screenshot, then a catalogue of metrics.
const METRICS_DOC = [
  '   # Performance Metrics',
  '',
  '   ## This dashboard breaks out instance performance across the main components of query runtime.',
  '',
  '   ## This dashboard can be filtered to review specific timeframes, models, explores or users',
  '',
  '![Dashboard Screenshot](/documentation/images/perf.png)',
  '',
  '# Performance Metric Descriptions',
  '',
  '## Indicative Looker Overhead',
  'The amount of time a query spends being processed exclusively within Looker. This captures the percentage of pre and post processing as a total of the overall query run time.',
  '',
  '## Average Async Runtime',
  'The average amount of time a query takes to complete inclusive of pre query processing, main query execution, totals execution and post query processing.',
  '',
  '## Main Query Execution time',
  'The amount of time the main query takes to complete within the database. The recommended benchmark is 4.8698 seconds. This figure can be optimised through aggregation of data.',
  '',
  '## Acquire Connection Time',
  'The time it takes for Looker to obtain a connection to your database. This includes time to look up credentials and initialise the connection for use.',
  ''
].join('\n');

const SOURCE_URL = 'https://raw.githubusercontent.com/acme/dashboards/master/documentation/performance_metrics.md';

// -------------------------------------------------------------------------
// 1. Indented headings (CommonMark allows up to three spaces)
// -------------------------------------------------------------------------
const headings = scanHeadings(METRICS_DOC);
assert.strictEqual(headings[0].text, 'Performance Metrics', 'an indented h1 must still be a heading');
assert.strictEqual(headings[0].level, 1);
assert.strictEqual(headings.filter(h => h.level === 2).length, 6);
// Headings inside fences are still ignored, indented or not
assert.strictEqual(scanHeadings('  ```\n  # not a heading\n  ```\n# real').length, 1);
console.log('✅ 1. Indented headings verified: up to three spaces of indentation is still a heading.');

// -------------------------------------------------------------------------
// 2. Split level selection
// -------------------------------------------------------------------------
// Two h1s is a document structure; six h2s is a catalogue.
assert.strictEqual(chooseSplitLevel(headings, 3), 2);
assert.strictEqual(chooseSplitLevel([{ level: 1 }, { level: 1 }, { level: 1 }], 3), 1);
assert.strictEqual(chooseSplitLevel([{ level: 2 }, { level: 2 }], 3), null, 'too few siblings to split');
console.log('✅ 2. Split level selection verified: shallowest level with enough siblings wins.');

// -------------------------------------------------------------------------
// 3. Prose weighing - markup must not masquerade as content
// -------------------------------------------------------------------------
const imageOnly = '![Dashboard Screenshot](https://raw.githubusercontent.com/acme/dashboards/master/documentation/images/perf.png)';
assert(imageOnly.length > 100, 'the raw image line is long enough to fool a naive length check');
assert(measureProse(imageOnly) < 30, `an image-only section carries almost no prose, got ${measureProse(imageOnly)}`);
assert(measureProse('```\nSELECT * FROM a_very_long_table_name_here WHERE x = 1 AND y = 2 AND z = 3;\n```') < 30, 'fenced code is not prose');
console.log('✅ 3. Prose weighing verified: images, links and code do not count as section content.');

// -------------------------------------------------------------------------
// 4. Splitting the catalogue
// -------------------------------------------------------------------------
const split = splitMarkdownIntoSections(METRICS_DOC);
assert(split, 'the metrics document should split');
assert.strictEqual(split.sections.length, 4, `expected 4 metric sections, got ${split.sections.map(s => s.title).join(', ')}`);
assert.deepStrictEqual(split.sections.map(s => s.title), [
  'Indicative Looker Overhead',
  'Average Async Runtime',
  'Main Query Execution time',
  'Acquire Connection Time'
]);

// The intro headings and the screenshot fold into the preamble, not into stubs
assert(split.preamble.includes('# Performance Metrics'));
assert(split.preamble.includes('This dashboard breaks out instance performance'));
assert(split.preamble.includes('perf.png'), 'the screenshot must survive folding');
assert(split.preamble.includes('# Performance Metric Descriptions'));
// Folded headings are dedented
assert(!/^ +#/m.test(split.preamble), `preamble should have no indented headings:\n${split.preamble}`);
console.log('✅ 4. Catalogue split verified: 4 concepts, intro and screenshot folded into the preamble.');

// -------------------------------------------------------------------------
// 5. Documents that are not catalogues are left whole
// -------------------------------------------------------------------------
assert.strictEqual(
  splitMarkdownIntoSections('# Title\n\nA single narrative document with no sibling sections at all.'),
  null,
  'a document with no sections must not split'
);
assert.strictEqual(
  splitMarkdownIntoSections('# T\n\n## A\nshort\n\n## B\nalso short\n\n## C\ntiny'),
  null,
  'sections without real bodies must not split'
);

// A long changelog would explode the bundle, so it is left whole
const changelog = ['# Changelog'].concat(
  Array.from({ length: 120 }, (_, i) =>
    `## v1.${i}.0\nThis release fixes a number of defects and improves performance across the ingestion pipeline substantially.`
  )
).join('\n\n');
assert.strictEqual(splitMarkdownIntoSections(changelog), null, 'a 120-section changelog must not split');
assert(splitMarkdownIntoSections(changelog, { maxSections: 200 }), 'raising maxSections allows it');
console.log('✅ 5. Guard rails verified: narratives, stub sections and long changelogs stay as one concept.');

// -------------------------------------------------------------------------
// 6. Repository-relative link resolution
// -------------------------------------------------------------------------
assert.strictEqual(
  repoLinkRoot(SOURCE_URL),
  'https://raw.githubusercontent.com/acme/dashboards/master/'
);
assert.strictEqual(
  repoLinkRoot('https://github.com/acme/dashboards/blob/main/docs/a.md'),
  'https://github.com/acme/dashboards/blob/main/'
);
assert.strictEqual(repoLinkRoot('https://example.com/docs/a.md'), '', 'non-repository URLs have no repo root');

// Without a link root, "/documentation/images/perf.png" would resolve against
// the host and lose the owner/repo/ref prefix entirely.
assert.strictEqual(
  absolutizeMarkdownLinks('![x](/documentation/images/perf.png)', SOURCE_URL, repoLinkRoot(SOURCE_URL)),
  '![x](https://raw.githubusercontent.com/acme/dashboards/master/documentation/images/perf.png)'
);
// Relative links still resolve against the document
assert.strictEqual(
  absolutizeMarkdownLinks('[y](./other.md)', SOURCE_URL, repoLinkRoot(SOURCE_URL)),
  '[y](https://raw.githubusercontent.com/acme/dashboards/master/documentation/other.md)'
);
console.log('✅ 6. Link resolution verified: root-relative repo paths resolve against the repository root.');

// -------------------------------------------------------------------------
// 7. End to end through the bundle builder
// -------------------------------------------------------------------------
const doc = {
  sourceId: 'acme-dashboards',
  sourceType: 'markdown',
  url: SOURCE_URL,
  markdown: METRICS_DOC,
  linkRoot: repoLinkRoot(SOURCE_URL),
  section: 'documentation',
  isRoot: false
};

const bundle = new OKFBundleBuilder().buildBundle({
  documents: [doc],
  sources: [{ sourceId: 'acme-dashboards', sourceType: 'markdown', url: SOURCE_URL, title: 'Performance Metrics', input: SOURCE_URL, documentCount: 1 }]
});
const paths = Array.from(bundle.files.keys());

// One directory named after the document, one concept per metric
assert(bundle.files.has('performance-metrics/index.md'), `expected a performance-metrics directory, got: ${paths.join(', ')}`);
assert(bundle.files.has('performance-metrics/indicative-looker-overhead.md'));
assert(bundle.files.has('performance-metrics/main-query-execution-time.md'));
assert(bundle.files.has('performance-metrics/acquire-connection-time.md'));
const conceptCount = paths.filter(p => p.startsWith('performance-metrics/') && p !== 'performance-metrics/index.md').length;
assert.strictEqual(conceptCount, 4, `expected 4 metric concepts, got ${conceptCount}`);

// The directory index carries the document's own title and preamble
const folderIndex = bundle.files.get('performance-metrics/index.md');
assert(folderIndex.startsWith('# Performance Metrics'), 'directory index keeps the document title');
assert(folderIndex.includes('This dashboard breaks out instance performance'), 'preamble prose belongs in the index');
assert(folderIndex.includes('https://raw.githubusercontent.com/acme/dashboards/master/documentation/images/perf.png'), 'the screenshot link must be repo-correct');
assert(!folderIndex.startsWith('---'), 'subdirectory indexes must not carry frontmatter (OKF §8)');

// Each concept gets its own description and a deep-linked resource
const concept = bundle.files.get('performance-metrics/main-query-execution-time.md');
assert(concept.includes('title: Main Query Execution time'));
assert(concept.includes('The amount of time the main query takes to complete within the database.'));
assert(concept.includes('#main-query-execution-time'), 'resource should deep-link to the section anchor');
assert(!concept.includes('Indicative Looker Overhead'), 'concepts must not carry their siblings\' bodies');

// The bundle is still titled after the document, not after its first section
assert(bundle.files.get('index.md').includes('# Performance Metrics'));
assert.strictEqual(validateOKFBundle(bundle.files).isValid, true, JSON.stringify(validateOKFBundle(bundle.files).errors));
console.log(`✅ 7. End to end verified: ${conceptCount} concepts under performance-metrics/ with a populated index, 100% conformant.`);

// -------------------------------------------------------------------------
// 8. Splitting can be turned off
// -------------------------------------------------------------------------
const whole = new OKFBundleBuilder({ splitSections: false }).buildBundle({ documents: [doc], sources: [] });
const wholePaths = Array.from(whole.files.keys());
assert(!wholePaths.some(p => p.startsWith('performance-metrics/')), 'splitting disabled should not create the directory');
assert.strictEqual(
  wholePaths.filter(p => !['index.md', 'log.md'].includes(p) && !p.endsWith('/index.md')).length,
  1,
  `expected a single concept when splitting is off, got: ${wholePaths.join(', ')}`
);
console.log('✅ 8. Opt-out verified: splitSections:false keeps one concept per document.');

// -------------------------------------------------------------------------
// 9. Long section titles produce readable filenames
// -------------------------------------------------------------------------
assert.strictEqual(truncateSlug('short-title'), 'short-title');
const long = truncateSlug('this-dashboard-can-be-filtered-in-order-to-review-specific-timeframes-specific-models-explores');
assert(long.length <= 60, `slug should be capped, got ${long.length}`);
assert(!long.endsWith('-'), 'slug should not end on a separator');
assert(long.startsWith('this-dashboard-can-be-filtered'), 'slug should keep the leading words');
console.log('✅ 9. Filename hygiene verified: sentence-length titles are trimmed at a word boundary.');

console.log('\n🎉 ALL SECTION SPLITTING TESTS PASSED!\n');
