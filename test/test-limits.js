import assert from 'assert';
import { splitMarkdownIntoSections } from '../src/core/section-splitter.js';
import { DocumentationCrawler } from '../src/core/crawler.js';
import { ingest as ingestGit } from '../src/core/sources/git.js';
import { ingestSources } from '../src/core/sources/registry.js';
import { generateBundle } from '../src/core/pipeline.js';

console.log('🧪 Running Ingestion Limit Tests...\n');

// -------------------------------------------------------------------------
// Fixture repository: 12 documentation files, one of which cannot be read.
// -------------------------------------------------------------------------
const PROSE = 'This document carries a full paragraph of real prose, comfortably past the minimum length required for a section to stand on its own.';
const repoFiles = { 'README.md': `# Widgets\n\n${PROSE}` };
for (let i = 0; i < 11; i++) repoFiles[`docs/doc-${String(i).padStart(2, '0')}.md`] = `# Doc ${i}\n\n${PROSE}`;
const UNREADABLE = 'docs/doc-05.md';

function makeFetcher({ canClone = false, truncated = false, failOn = [] } = {}) {
  let reads = 0;
  let concurrent = 0;
  let peakConcurrent = 0;
  return {
    capabilities: { canClone, canReadLocalFiles: false, isBrowser: !canClone },
    stats: () => ({ reads, peakConcurrent }),
    async getJson(url) {
      if (url.endsWith('/acme/widgets')) return { default_branch: 'main' };
      if (url.includes('/git/trees/')) {
        return { tree: Object.keys(repoFiles).map(path => ({ path, type: 'blob' })), truncated };
      }
      throw new Error(`unexpected json: ${url}`);
    },
    async getText(url) {
      const path = decodeURIComponent((url.split('/main/')[1] || '').split('?')[0]);
      if (failOn.includes(path)) throw new Error('timeout of 15000ms exceeded');
      reads++;
      concurrent++;
      peakConcurrent = Math.max(peakConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 12));
      concurrent--;
      if (repoFiles[path] === undefined) throw new Error(`unexpected text: ${url}`);
      return repoFiles[path];
    },
    async getBinary() { throw new Error('unused'); }
  };
}

const collect = () => { const w = []; return { warnings: w, onProgress: e => { if (e?.type === 'warning') w.push(e.message); } }; };

// -------------------------------------------------------------------------
// 1. maxFiles: default caps, 0 removes the cap
// -------------------------------------------------------------------------
let c = collect();
const capped = await ingestGit({ value: 'https://github.com/acme/widgets' },
  { fetcher: makeFetcher(), onProgress: c.onProgress, options: { maxFiles: 4 } });
assert.strictEqual(capped.documents.length, 4, 'the cap must be honoured');
assert.strictEqual(c.warnings.length, 1, 'a capped run must warn');
assert(/skipping 8/.test(c.warnings[0]), `warning should say what was skipped: ${c.warnings[0]}`);
assert(/set it to 0 for no limit/.test(c.warnings[0]), 'warning should say how to lift the cap');

c = collect();
const unlimited = await ingestGit({ value: 'https://github.com/acme/widgets' },
  { fetcher: makeFetcher(), onProgress: c.onProgress, options: { maxFiles: 0 } });
assert.strictEqual(unlimited.documents.length, 12, 'maxFiles 0 must ingest everything');
assert.strictEqual(c.warnings.length, 0, 'an uncapped complete run must not warn');
console.log('✅ 1. File cap verified: honoured by default, removed by 0, and always reported.');

// -------------------------------------------------------------------------
// 2. Files that cannot be read are reported, never silently dropped
// -------------------------------------------------------------------------
c = collect();
const partial = await ingestGit({ value: 'https://github.com/acme/widgets' },
  { fetcher: makeFetcher({ failOn: [UNREADABLE] }), onProgress: c.onProgress, options: { maxFiles: 0 } });
assert.strictEqual(partial.documents.length, 11, 'the unreadable file is absent');
assert.strictEqual(c.warnings.length, 1, 'an unreadable file must produce a warning');
assert(/could not be read and are missing/.test(c.warnings[0]), c.warnings[0]);
assert(/fetch-mode clone/.test(c.warnings[0]), 'the warning should suggest the fix');
console.log('✅ 2. Unreadable files verified: counted, reported, and never silently dropped.');

// -------------------------------------------------------------------------
// 3. A truncated tree is either escalated to a clone or reported
// -------------------------------------------------------------------------
c = collect();
await ingestGit({ value: 'https://github.com/acme/widgets' },
  { fetcher: makeFetcher({ truncated: true, canClone: false }), onProgress: c.onProgress, options: { maxFiles: 0 } });
assert.strictEqual(c.warnings.length, 1, 'a truncated tree with no clone available must warn');
assert(/covers only the part of the repository/.test(c.warnings[0]), c.warnings[0]);
console.log('✅ 3. Tree truncation verified: reported as incomplete when cloning is unavailable.');

// -------------------------------------------------------------------------
// 4. Reads run in parallel
// -------------------------------------------------------------------------
const parallelFetcher = makeFetcher();
await ingestGit({ value: 'https://github.com/acme/widgets' },
  { fetcher: parallelFetcher, options: { maxFiles: 0, readConcurrency: 6 } });
const { peakConcurrent } = parallelFetcher.stats();
assert(peakConcurrent > 1, `reads should overlap, peak was ${peakConcurrent}`);
assert(peakConcurrent <= 6, `concurrency must stay within its bound, peak was ${peakConcurrent}`);

const serialFetcher = makeFetcher();
await ingestGit({ value: 'https://github.com/acme/widgets' },
  { fetcher: serialFetcher, options: { maxFiles: 0, readConcurrency: 1 } });
assert.strictEqual(serialFetcher.stats().peakConcurrent, 1, 'concurrency 1 must stay sequential');
console.log(`✅ 4. Concurrency verified: bounded at the configured limit (peak ${peakConcurrent} of 6), and 1 stays serial.`);

// -------------------------------------------------------------------------
// 5. Section cap: 0 removes it
// -------------------------------------------------------------------------
const many = ['# Catalogue'].concat(
  Array.from({ length: 120 }, (_, i) => `## Item ${i}\n${PROSE}`)
).join('\n\n');
assert.strictEqual(splitMarkdownIntoSections(many), null, 'the default cap leaves a 120-section document whole');
assert.strictEqual(splitMarkdownIntoSections(many, { maxSections: 0 }).sections.length, 120, 'maxSections 0 removes the cap');
console.log('✅ 5. Section cap verified: default protects against explosion, 0 removes it.');

// -------------------------------------------------------------------------
// 6. Crawl caps accept 0 as unlimited
// -------------------------------------------------------------------------
assert.strictEqual(new DocumentationCrawler({ maxPages: 0, maxDepth: 0 }).maxPages, Infinity);
assert.strictEqual(new DocumentationCrawler({ maxPages: 0, maxDepth: 0 }).maxDepth, Infinity);
// Explicit values and defaults both still apply
assert.strictEqual(new DocumentationCrawler({ maxPages: 5, maxDepth: 2 }).maxPages, 5);
assert.strictEqual(new DocumentationCrawler({}).maxDepth, 3);
console.log('✅ 6. Crawl caps verified: 0 means unlimited, explicit values and defaults unchanged.');

// -------------------------------------------------------------------------
// 7. Warnings survive all the way to the pipeline result
// -------------------------------------------------------------------------
const ingested = await ingestSources(['https://github.com/acme/widgets'],
  { fetcher: makeFetcher({ failOn: [UNREADABLE] }), options: { maxFiles: 3 } });
assert(ingested.warnings.length >= 1, 'ingestSources must collect warnings');

const payload = await generateBundle(['https://github.com/acme/widgets'],
  { fetcher: makeFetcher(), maxFiles: 3 });
assert(Array.isArray(payload.warnings) && payload.warnings.length === 1,
  `the pipeline result must carry warnings, got ${JSON.stringify(payload.warnings)}`);
assert(/skipping/.test(payload.warnings[0]));

const clean = await generateBundle(['https://github.com/acme/widgets'], { fetcher: makeFetcher(), maxFiles: 0 });
assert.strictEqual(clean.warnings.length, 0, 'a complete run reports no warnings');
assert.strictEqual(clean.validation.isValid, true);
console.log('✅ 7. Reporting verified: warnings reach the pipeline result, absent on a complete run.');

// -------------------------------------------------------------------------
// 8. The CLI can take the file Map without a second full copy
// -------------------------------------------------------------------------
const asMap = await generateBundle(['https://github.com/acme/widgets'], { fetcher: makeFetcher(), maxFiles: 0, filesAs: 'map' });
assert(asMap.files instanceof Map, 'filesAs map should hand back the Map itself');
assert(asMap.files.has('index.md'));
const asObject = await generateBundle(['https://github.com/acme/widgets'], { fetcher: makeFetcher(), maxFiles: 0 });
assert(!(asObject.files instanceof Map) && typeof asObject.files === 'object', 'the default stays a plain object');
assert.deepStrictEqual(Array.from(asMap.files.keys()).sort(), Object.keys(asObject.files).sort());
console.log('✅ 8. Output shape verified: Map for the CLI, plain object for HTTP callers.');

console.log('\n🎉 ALL INGESTION LIMIT TESTS PASSED!\n');
