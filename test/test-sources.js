import assert from 'assert';
import JSZip from 'jszip';
import { detectSourceType, describeSources, normalizeSourceInputs } from '../src/core/sources/registry.js';
import { parseMarkdownDocument, splitFrontmatter, extractMarkdownCodeBlocks } from '../src/core/markdown-parser.js';
import { docxToMarkdown, pdfToMarkdown, isGoogleDocUrl, googleDocExportUrl, ingest as ingestUpload } from '../src/core/sources/upload.js';
import { ingest as ingestGit, parseRepoUrl, sectionForRepoPath, isIngestibleRepoPath } from '../src/core/sources/git.js';
import { ingest as ingestMarkdown, toRawUrl } from '../src/core/sources/markdown.js';

console.log('🧪 Running Multi-Source Adapter Tests...\n');

// -------------------------------------------------------------------------
// 1. Source type detection
// -------------------------------------------------------------------------
const detectionCases = [
  ['https://docs.cloud.google.com/bigquery/docs/intro', 'webpage'],
  ['https://fastapi.tiangolo.com/tutorial/', 'webpage'],
  ['https://github.com/tiangolo/fastapi', 'git'],
  ['https://gitlab.com/group/project', 'git'],
  ['git@github.com:owner/repo.git', 'git'],
  ['https://example.com/repo.git', 'git'],
  ['https://github.com/o/r/blob/main/docs/a.md', 'markdown'],
  ['https://raw.githubusercontent.com/nodejs/node/main/README.md', 'markdown'],
  ['https://api.oireachtas.ie/swagger.json', 'openapi'],
  ['https://petstore.swagger.io/v2/openapi.yaml', 'openapi'],
  ['https://docs.google.com/document/d/1AbC_dEf/edit?usp=sharing', 'upload'],
  ['{"openapi":"3.0.0","info":{}}', 'openapi'],
  ['openapi: 3.0.0\ninfo:\n  title: X', 'openapi'],
  ['# A plain markdown heading', 'markdown']
];

for (const [input, expected] of detectionCases) {
  assert.strictEqual(detectSourceType(input), expected, `detectSourceType(${input}) should be '${expected}'`);
}

// Uploaded file descriptors classify as uploads
assert.strictEqual(detectSourceType({ name: 'report.docx', data: new Uint8Array() }), 'upload');

// Comma-separated free text expands into one descriptor per source
const described = describeSources('https://a.io/docs, https://github.com/o/r,https://x.io/swagger.json');
assert.strictEqual(described.length, 3);
assert.deepStrictEqual(described.map(d => d.type), ['webpage', 'git', 'openapi']);
assert.strictEqual(normalizeSourceInputs(['https://a.io/docs']).length, 1);
console.log('✅ 1. Source detection verified: web, git, markdown, OpenAPI, Google Docs and uploads all classified.');

// -------------------------------------------------------------------------
// 2. Markdown parsing
// -------------------------------------------------------------------------
const { frontmatter, body } = splitFrontmatter('---\ntitle: Fixture\ntags: [x]\n---\n\nBody text here.\n');
assert.strictEqual(frontmatter.title, 'Fixture');
assert.strictEqual(body.trim(), 'Body text here.');

// A document with no frontmatter is left intact
assert.strictEqual(splitFrontmatter('# No frontmatter\n').frontmatter.title, undefined);

const mdDoc = parseMarkdownDocument(
  '---\ntitle: Loading Data Reference\nauthor: Docs Team\ntags: [load, sql]\n---\n\n' +
  '# Loading Data Reference\n\nThis paragraph explains how batch loading works in practice.\n\n' +
  '## Example Query\n\n```sql\nSELECT * FROM `p.d.t` WHERE id = 1;\n```\n\n' +
  'See the [companion guide](./companion.md).\n',
  'https://example.io/docs/loading.md'
);

assert.strictEqual(mdDoc.title, 'Loading Data Reference');
assert.strictEqual(mdDoc.type, 'Reference', 'title containing "reference" should classify as Reference');
assert.strictEqual(mdDoc.author, 'Docs Team');
assert(mdDoc.description.startsWith('This paragraph explains'), `unexpected description: ${mdDoc.description}`);
assert.deepStrictEqual(mdDoc.headings.map(h => h.text), ['Loading Data Reference', 'Example Query']);
assert.strictEqual(mdDoc.codeBlocks.length, 1);
assert.strictEqual(mdDoc.codeBlocks[0].language, 'sql');
assert.strictEqual(mdDoc.codeBlocks[0].isExecutable, true);
assert(mdDoc.tags.includes('load') && mdDoc.tags.includes('sql'));

// Relative links are absolutized so bundle-relative rewriting can match them
assert(mdDoc.markdownBody.includes('https://example.io/docs/companion.md'), 'relative links should be absolutized');
// The duplicate leading H1 is dropped - the builder emits its own
assert(!mdDoc.markdownBody.startsWith('# Loading Data Reference'), 'duplicate H1 should be removed');

// README-style headings carrying logos/badges yield clean titles and descriptions
const readmeDoc = parseMarkdownDocument(
  '# <img src="logo.svg" width="32"> Claude SDK for TypeScript\n\n' +
  '[![NPM](https://img.shields.io/npm/v/x)](https://npmjs.org/package/x)\n\n' +
  'This library provides convenient access to the Anthropic REST API.\n',
  'https://github.com/a/b/blob/main/README.md'
);
assert.strictEqual(readmeDoc.title, 'Claude SDK for TypeScript', 'inline HTML must not leak into the title');
assert.strictEqual(readmeDoc.description, 'This library provides convenient access to the Anthropic REST API.', 'badge rows must not become the description');

// Headings inside fenced code blocks are not treated as headings
const fenced = parseMarkdownDocument('# Real\n\n```\n# Not a heading\n```\n', 'https://x.io/a.md');
assert.deepStrictEqual(fenced.headings.map(h => h.text), ['Real']);

// Fence language is honoured over sniffing
const blocks = extractMarkdownCodeBlocks('```python\nprint("a long enough snippet here")\n```\n');
assert.strictEqual(blocks[0].language, 'python');
console.log('✅ 2. Markdown parser verified: frontmatter, headings, fenced code, link absolutization.');

// -------------------------------------------------------------------------
// 3. Word (.docx) conversion
// -------------------------------------------------------------------------
async function buildDocxFixture() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>');
  zip.folder('_rels').file('.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>');
  zip.folder('word').file('document.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Quarterly Runbook</w:t></w:r></w:p>' +
    '<w:p><w:r><w:t>Restart the ingestion service before validating the warehouse.</w:t></w:r></w:p>' +
    '</w:body></w:document>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

const docxBuffer = await buildDocxFixture();
const docxMarkdown = await docxToMarkdown(docxBuffer);
assert(docxMarkdown.includes('# Quarterly Runbook'), `docx heading missing: ${docxMarkdown}`);
assert(docxMarkdown.includes('Restart the ingestion service'), 'docx body text missing');

// A non-docx payload is rejected with a clear message rather than a parser crash
await assert.rejects(
  () => docxToMarkdown(new Uint8Array([1, 2, 3, 4])),
  /not a valid \.docx/i
);
console.log('✅ 3. Word (.docx) conversion verified: headings and body text extracted, invalid files rejected.');

// -------------------------------------------------------------------------
// 4. Google Docs link handling
// -------------------------------------------------------------------------
assert.strictEqual(isGoogleDocUrl('https://docs.google.com/document/d/1AbC_dEf/edit'), true);
assert.strictEqual(isGoogleDocUrl('https://docs.google.com/spreadsheets/d/1AbC/edit'), false);
assert.strictEqual(
  googleDocExportUrl('https://docs.google.com/document/d/1AbC_dEf/edit?usp=sharing'),
  'https://docs.google.com/document/d/1AbC_dEf/export?format=docx'
);
console.log('✅ 4. Google Docs handling verified: share links map to public .docx export URLs.');

// -------------------------------------------------------------------------
// 5. Git repository ingestion (recorded fixture, no network)
// -------------------------------------------------------------------------
assert.deepStrictEqual(
  { ...parseRepoUrl('https://github.com/acme/widgets/tree/dev/docs') },
  {
    host: 'github', hostname: 'github.com', owner: 'acme', repo: 'widgets',
    ref: 'dev', subPath: 'docs', cloneUrl: 'https://github.com/acme/widgets.git',
    webUrl: 'https://github.com/acme/widgets', fullName: 'acme/widgets'
  }
);

assert.strictEqual(isIngestibleRepoPath('src/index.js'), false);
assert.strictEqual(isIngestibleRepoPath('node_modules/pkg/README.md'), false);
assert.strictEqual(isIngestibleRepoPath('docs/guide.md'), true);
assert.strictEqual(isIngestibleRepoPath('openapi.yaml'), true);
assert.deepStrictEqual(
  ['README.md', 'docs/x.md', 'docs/api/y.md', 'pkg/z.md'].map(sectionForRepoPath),
  ['Overview', 'Documentation', 'api', 'pkg']
);

const repoFiles = {
  'README.md': '# Widgets\n\nWidgets is a service for managing widget inventory across regions.\n',
  'docs/guides/install.md': '# Install\n\nInstall the widgets CLI with your package manager of choice.\n',
  'openapi.json': JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Widgets API', version: '2.0.0' },
    servers: [{ url: 'https://api.acme.io/v2' }],
    paths: { '/widgets': { get: { summary: 'List widgets', tags: ['widgets'], responses: { 200: { description: 'ok' } } } } },
    components: { schemas: { Widget: { type: 'object', properties: { id: { type: 'string' } } } } }
  }),
  'src/index.js': 'export default 1;'
};

const fixtureFetcher = {
  capabilities: { canClone: false, canReadLocalFiles: false, isBrowser: true },
  async getJson(url) {
    if (url === 'https://api.github.com/repos/acme/widgets') {
      return { default_branch: 'main' };
    }
    if (url.startsWith('https://api.github.com/repos/acme/widgets/git/trees/main')) {
      return { tree: Object.keys(repoFiles).map(path => ({ path, type: 'blob' })), truncated: false };
    }
    throw new Error(`Unexpected JSON request: ${url}`);
  },
  async getText(url) {
    const prefix = 'https://raw.githubusercontent.com/acme/widgets/main/';
    if (url.startsWith(prefix)) {
      const path = decodeURIComponent(url.slice(prefix.length)).split('/').map(decodeURIComponent).join('/');
      if (repoFiles[path] !== undefined) return repoFiles[path];
    }
    throw new Error(`Unexpected text request: ${url}`);
  },
  async getBinary() { throw new Error('not used'); }
};

const gitResult = await ingestGit(
  { value: 'https://github.com/acme/widgets' },
  { fetcher: fixtureFetcher, options: { maxFiles: 100 } }
);

const gitTitles = gitResult.documents.map(d => d.title || d.url);
assert.strictEqual(gitResult.meta.sourceId, 'acmewidgets');
// Source files are skipped; markdown and the API spec are ingested
assert(!gitTitles.some(t => String(t).includes('index.js')), 'source code should be skipped');
const readme = gitResult.documents.find(d => d.url.endsWith('/README.md'));
assert(readme && readme.isRoot === true, 'root README should be the bundle root candidate');
assert.strictEqual(readme.section, 'Overview');
const installDoc = gitResult.documents.find(d => d.url.endsWith('docs/guides/install.md'));
assert.strictEqual(installDoc.section, 'guides');
// The detected openapi.json became endpoint + schema documents
assert(gitResult.documents.some(d => d.sourceType === 'openapi' && d.title.includes('GET /widgets')), 'endpoint doc missing');
assert(gitResult.documents.some(d => d.title === 'Widget Schema Model'), 'schema doc missing');
console.log('✅ 5. Git adapter verified: markdown + spec files ingested, source code skipped, sections assigned.');

// Rate limiting and missing repositories produce actionable guidance
const rateLimitedFetcher = {
  ...fixtureFetcher,
  async getJson() {
    const err = new Error('HTTP 403');
    err.status = 403;
    throw err;
  }
};
await assert.rejects(
  () => ingestGit({ value: 'https://github.com/acme/widgets' }, { fetcher: rateLimitedFetcher, options: {} }),
  /rate limit reached.*GitHub token/s
);

const notFoundFetcher = {
  ...fixtureFetcher,
  async getJson() {
    const err = new Error('HTTP 404');
    err.status = 404;
    throw err;
  }
};
await assert.rejects(
  () => ingestGit({ value: 'https://github.com/acme/missing' }, { fetcher: notFoundFetcher, options: {} }),
  /was not found, or it is private/
);

// A repo on an unsupported host cannot be cloned from the browser
await assert.rejects(
  () => ingestGit({ value: 'https://git.sr.ht/~me/thing' }, { fetcher: fixtureFetcher, options: {} }),
  (err) => err.isUnsupportedInRuntime === true && /DocGen server or the CLI/.test(err.message)
);
console.log('✅ 6. Error guidance verified: rate limits, missing repos and browser clone limits all explained.');

// -------------------------------------------------------------------------
// 7. Markdown adapter
// -------------------------------------------------------------------------
assert.strictEqual(
  toRawUrl('https://github.com/o/r/blob/main/docs/a.md'),
  'https://raw.githubusercontent.com/o/r/main/docs/a.md'
);

const mdResult = await ingestMarkdown(
  { value: 'https://raw.githubusercontent.com/o/r/main/docs/api/usage.md' },
  {
    fetcher: {
      ...fixtureFetcher,
      getText: async () => '# Usage\n\nCall the endpoint with a bearer token to receive results.\n'
    }
  }
);
assert.strictEqual(mdResult.documents.length, 1);
assert.strictEqual(mdResult.documents[0].section, 'api');
assert.strictEqual(mdResult.documents[0].sourceType, 'markdown');
console.log('✅ 7. Markdown adapter verified: blob URLs resolve to raw, section derived from path.');


// -------------------------------------------------------------------------
// 8. PDF text extraction and the upload adapter end to end
// -------------------------------------------------------------------------
function buildPdfFixture() {
  const enc = (str) => Buffer.from(str, 'latin1');
  const content = enc(
    'BT /F1 24 Tf 72 720 Td (Deployment Overview) Tj ET\n' +
    'BT /F1 11 Tf 72 690 Td (Roll out to the canary region before promoting to production.) Tj ET'
  );
  const objects = [
    enc('<< /Type /Catalog /Pages 2 0 R >>'),
    enc('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>'),
    Buffer.concat([enc(`<< /Length ${content.length} >>\nstream\n`), content, enc('\nendstream')]),
    enc('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  ];

  let out = enc('%PDF-1.4\n');
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out = Buffer.concat([out, enc(`${i + 1} 0 obj\n`), obj, enc('\nendobj\n')]);
  });

  const xrefStart = out.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(off => { xref += `${String(off).padStart(10, '0')} 00000 n \n`; });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.concat([out, enc(xref)]);
}

const pdfMarkdown = await pdfToMarkdown(buildPdfFixture());
assert(pdfMarkdown.includes('Deployment Overview'), `pdf title missing: ${pdfMarkdown}`);
assert(pdfMarkdown.includes('canary region'), 'pdf body text missing');
// The larger title run is inferred as a heading
assert(/^#{2,3} Deployment Overview/m.test(pdfMarkdown), `pdf heading not inferred: ${pdfMarkdown}`);
console.log('✅ 8. PDF extraction verified: text recovered and headings inferred from font size.');

// The upload adapter turns a file descriptor into a normalized document
const uploadResult = await ingestUpload(
  { value: { name: 'quarterly-runbook.docx', data: docxBuffer } },
  { fetcher: fixtureFetcher }
);
assert.strictEqual(uploadResult.documents.length, 1);
assert.strictEqual(uploadResult.documents[0].sourceType, 'upload');
assert.strictEqual(uploadResult.documents[0].url, 'upload://quarterly-runbook.docx');
assert.strictEqual(uploadResult.documents[0].section, 'Documents');
assert(uploadResult.documents[0].markdown.includes('Quarterly Runbook'));

// Unsupported extensions are refused before any parsing is attempted
await assert.rejects(
  () => ingestUpload({ value: { name: 'archive.zip', data: docxBuffer } }, { fetcher: fixtureFetcher }),
  /Unsupported upload type/
);
console.log('✅ 9. Upload adapter verified: documents normalized, unsupported types refused.');

console.log('\n🎉 ALL MULTI-SOURCE ADAPTER TESTS PASSED!\n');
