import assert from 'assert';
import { OKFBundleBuilder } from '../src/core/okf-builder.js';
import { validateOKFBundle } from '../src/core/validator.js';
import { buildBundleGraph } from '../src/core/graph-builder.js';
import { parseOpenApiSpec, openApiToDocuments } from '../src/core/openapi-parser.js';

console.log('🧪 Running Merged Multi-Source Bundle Tests...\n');

// -------------------------------------------------------------------------
// A heterogeneous document set: a crawled web page, two markdown documents
// from different sources that collide on filename, an uploaded Word document,
// and an OpenAPI specification.
// -------------------------------------------------------------------------
const apiSpec = {
  swagger: '2.0',
  info: { title: 'Widgets API', version: '2.0.0', description: 'Widget inventory API.' },
  host: 'api.acme.io',
  basePath: '/v2',
  schemes: ['https'],
  paths: {
    '/widgets': {
      get: {
        summary: 'List widgets',
        tags: ['widgets'],
        parameters: [{ name: 'limit', in: 'query', type: 'integer', required: false, description: 'Page size' }],
        responses: { 200: { description: 'Success' } }
      }
    }
  },
  definitions: { Widget: { type: 'object', properties: { id: { type: 'string' } } } }
};

const apiDocs = openApiToDocuments(
  parseOpenApiSpec(apiSpec, 'https://api.acme.io/swagger.json'),
  'https://api.acme.io/swagger.json',
  { sourceId: 'widgets-api' }
);

const documents = [
  {
    sourceId: 'acme-docs',
    sourceType: 'webpage',
    url: 'https://docs.acme.io/guides/overview',
    section: 'Overview',
    isRoot: true,
    html: '<html><head><title>Acme Platform</title><meta name="description" content="Acme platform documentation."></head>' +
          '<body><article><h1>Acme Platform</h1><p>The Acme platform coordinates widget inventory across regions.</p>' +
          '<h2>Query Example</h2><pre class="lang-sql"><code>SELECT * FROM `acme.inventory.widgets` WHERE region = @region;</code></pre>' +
          '</article></body></html>'
  },
  {
    // Collides with the document below on folder + filename
    sourceId: 'acme-docs',
    sourceType: 'markdown',
    url: 'https://docs.acme.io/guides/install.md',
    section: 'Guides',
    markdown: '# Install\n\nInstall the Acme CLI from the package registry before continuing.\n'
  },
  {
    sourceId: 'contoso-repo',
    sourceType: 'git',
    url: 'https://github.com/contoso/tools/blob/main/docs/install.md',
    section: 'Guides',
    markdown: '# Install\n\nContoso Tools installs from source with a single build command.\n'
  },
  {
    sourceId: 'runbook',
    sourceType: 'upload',
    url: 'upload://quarterly-runbook.docx',
    section: 'Documents',
    author: 'Uploaded Document',
    slugHint: 'quarterly-runbook',
    markdown: '## Quarterly Runbook\n\nRestart the ingestion service before validating the warehouse.\n'
  },
  ...apiDocs
];

const sources = [
  { sourceId: 'acme-docs', sourceType: 'webpage', url: 'https://docs.acme.io/guides/overview', title: 'Acme Docs', input: 'https://docs.acme.io/guides/overview', documentCount: 2 },
  { sourceId: 'contoso-repo', sourceType: 'git', url: 'https://github.com/contoso/tools', title: 'contoso/tools', input: 'https://github.com/contoso/tools', documentCount: 1 },
  { sourceId: 'runbook', sourceType: 'upload', url: 'upload://quarterly-runbook.docx', title: 'quarterly-runbook', input: 'quarterly-runbook.docx', documentCount: 1 },
  { sourceId: 'widgets-api', sourceType: 'openapi', url: 'https://api.acme.io/swagger.json', title: 'Widgets API (v2.0.0)', input: 'https://api.acme.io/swagger.json', documentCount: apiDocs.length }
];

const builder = new OKFBundleBuilder({ bundleTitle: 'Mixed Source Bundle' });
const bundle = builder.buildBundle({ documents, sources });
const paths = Array.from(bundle.files.keys());

// 1. Structural essentials
assert(bundle.files.has('index.md'), 'Root index.md must exist');
assert(bundle.files.has('log.md'), 'log.md must exist');
assert(bundle.files.has('overview.md'), 'The root document becomes overview.md');
console.log('✅ 1. Bundle skeleton verified: root index, log and overview concept created.');

// 2. Sources merge into shared topic folders rather than per-source trees
const folders = new Set(paths.filter(p => p.includes('/')).map(p => p.split('/')[0]));
assert(folders.has('guides'), `expected a shared 'guides' folder, got: ${[...folders].join(', ')}`);
assert(folders.has('documents'), 'uploaded documents land in the shared documents folder');
assert(folders.has('schemas'), 'API schemas land in the shared schemas folder');
assert(folders.has('widgets'), 'API endpoints land in their tag folder');
// No folder is named after a source id
assert(!folders.has('acme-docs') && !folders.has('contoso-repo'), 'sources must not create their own top-level folders');

const guideDocs = paths.filter(p => p.startsWith('guides/') && p !== 'guides/index.md');
assert.strictEqual(guideDocs.length, 2, `both install guides should live in guides/, got: ${guideDocs.join(', ')}`);
console.log('✅ 2. Merged layout verified: heterogeneous sources share topic folders.');

// 3. Filename collisions are resolved with a source suffix, not overwritten
assert(guideDocs.includes('guides/install.md'), 'first source keeps the natural filename');
const suffixed = guideDocs.find(p => p !== 'guides/install.md');
assert(/^guides\/install-[a-z0-9-]+\.md$/.test(suffixed), `colliding concept should be source-suffixed, got: ${suffixed}`);
assert.strictEqual(new Set(paths).size, paths.length, 'no duplicate paths');
// Both bodies survived - neither document was clobbered
assert(bundle.files.get('guides/install.md').includes('Acme CLI'));
assert(bundle.files.get(suffixed).includes('Contoso Tools'));
console.log(`✅ 3. Collision handling verified: '${suffixed}' created instead of overwriting guides/install.md.`);

// 4. Root index carries source provenance
const rootIndex = bundle.files.get('index.md');
assert(rootIndex.startsWith('---\nokf_version: "0.2"'), 'root index must declare okf_version');
assert(rootIndex.includes('## Sources'), 'root index should list contributing sources');
assert(rootIndex.includes('https://github.com/contoso/tools'), 'git source should be listed');
assert(rootIndex.includes('Widgets API'), 'API source should be listed');
assert(rootIndex.includes('Uploaded document') || rootIndex.includes('quarterly-runbook'), 'upload should be listed');

const log = bundle.files.get('log.md');
assert(/##\s+\d{4}-\d{2}-\d{2}/.test(log), 'log.md needs an ISO date heading');
assert(log.includes('Merged 4 heterogeneous sources'), `log should enumerate sources: ${log}`);
console.log('✅ 4. Provenance verified: root index Sources section and log enumerate all four sources.');

// 5. Content from every source type actually made it into the bundle
const allContent = paths.map(p => bundle.files.get(p)).join('\n');
assert(allContent.includes('Acme platform coordinates widget inventory'), 'web page content missing');
assert(allContent.includes('Restart the ingestion service'), 'uploaded document content missing');
assert(allContent.includes('GET /widgets'), 'API endpoint content missing');
assert(bundle.files.has('schemas/widget.md'), 'API schema concept missing');
// The uploaded document used its slug hint
assert(bundle.files.has('documents/quarterly-runbook.md'), `upload slug hint ignored: ${paths.join(', ')}`);
// The SQL snippet on the crawled page became an Attested Computation
assert(paths.some(p => p.startsWith('computations/') && p !== 'computations/index.md'), 'attested computation missing');
console.log('✅ 5. Content verified: web, markdown, git, upload and API documents all present.');

// 6. Conformance and graph
const validation = validateOKFBundle(bundle.files);
assert.strictEqual(validation.isValid, true, `Validation failed: ${JSON.stringify(validation.errors)}`);
assert.strictEqual(validation.errors.length, 0);

const graph = buildBundleGraph(bundle.files);
assert.strictEqual(graph.nodes.length, paths.filter(p => p !== 'index.md' && p !== 'log.md').length + 1);
assert(graph.links.length > 0, 'graph should link concepts to their section indexes');
console.log(`✅ 6. OKF v0.2 conformance: 100% PASS across ${bundle.files.size} merged files; graph built with ${graph.nodes.length} nodes.`);

// 7. The legacy crawl-result shape still builds an identical-shaped bundle
const legacy = new OKFBundleBuilder().buildBundle({
  startUrl: 'https://docs.acme.io/guides/overview',
  pages: [{ url: 'https://docs.acme.io/guides/overview', section: 'Overview', html: documents[0].html }]
});
assert(legacy.files.has('index.md') && legacy.files.has('overview.md'));
assert.strictEqual(validateOKFBundle(legacy.files).isValid, true);
console.log('✅ 7. Backwards compatibility verified: legacy { pages } crawl results still build valid bundles.');

console.log('\n🎉 ALL MERGED MULTI-SOURCE TESTS PASSED!\n');
