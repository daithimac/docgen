import assert from 'assert';
import {
  parseOpenApiSpec,
  openApiToDocuments,
  buildOKFBundleFromOpenApi,
  describeSchemaType,
  endpointSlug,
  slugifyPath,
  parameterSchema
} from '../src/core/openapi-parser.js';
import { OKFBundleBuilder } from '../src/core/okf-builder.js';
import { validateOKFBundle } from '../src/core/validator.js';

console.log('🧪 Running Complex API Specification Tests...\n');

// -------------------------------------------------------------------------
// 1. Readable identifiers
// -------------------------------------------------------------------------
assert.strictEqual(
  slugifyPath('/conversations/{conversation_id}/messages/{message_id}'),
  'conversations-conversation-id-messages-message-id',
  'path separators and braces must not collapse into a run-on word'
);

// A spec-supplied operationId is the most readable name available
assert.strictEqual(
  endpointSlug({ hasExplicitOperationId: true, operationId: 'create_query_task', method: 'POST', path: '/query_tasks' }),
  'create-query-task'
);
// Without one, fall back to a properly separated path
assert.strictEqual(
  endpointSlug({ hasExplicitOperationId: false, method: 'GET', path: '/queries/{query_id}/run/{result_format}' }),
  'get-queries-query-id-run-result-format'
);
console.log('✅ 1. Identifiers verified: operationId preferred, path slugs keep their separators.');

// -------------------------------------------------------------------------
// 2. Schema type description
// -------------------------------------------------------------------------
assert.strictEqual(describeSchemaType({ $ref: '#/definitions/Query' }), '[Query](/schemas/query.md)');
assert.strictEqual(
  describeSchemaType({ type: 'array', items: { $ref: '#/definitions/HomepageItem' } }),
  'array of [HomepageItem](/schemas/homepageitem.md)',
  'an array of references must keep the element link'
);
assert.strictEqual(describeSchemaType({ type: 'array', items: { type: 'string' } }), 'array of `string`');
assert.strictEqual(describeSchemaType({ type: 'string', format: 'date-time' }), '`string (date-time)`');
assert(describeSchemaType({ type: 'string', enum: ['asc', 'desc'] }).includes('one of'), 'enums should be listed');
assert.strictEqual(
  describeSchemaType({ allOf: [{ $ref: '#/definitions/Base' }, { $ref: '#/definitions/Extra' }] }),
  '[Base](/schemas/base.md) & [Extra](/schemas/extra.md)'
);
// Deeply nested composition must not recurse without bound
assert(typeof describeSchemaType({ allOf: [{ allOf: [{ allOf: [{ allOf: [{ type: 'string' }] }] }] }] }) === 'string');
console.log('✅ 2. Schema typing verified: refs, arrays of refs, formats, enums and composition.');

// -------------------------------------------------------------------------
// 3. Body parameters - Swagger 2 and OpenAPI 3 shapes
// -------------------------------------------------------------------------
assert.deepStrictEqual(parameterSchema({ in: 'body', schema: { $ref: '#/definitions/Query' } }), { $ref: '#/definitions/Query' });
assert.deepStrictEqual(
  parameterSchema({ content: { 'application/json': { schema: { $ref: '#/components/schemas/Query' } } } }),
  { $ref: '#/components/schemas/Query' }
);
assert.strictEqual(parameterSchema({ in: 'query', type: 'string' }), null);
console.log('✅ 3. Body parameter resolution verified across Swagger 2 and OpenAPI 3 shapes.');

// -------------------------------------------------------------------------
// 4. A spec shaped like a real-world API
// -------------------------------------------------------------------------
const SPEC = {
  swagger: '2.0',
  info: { title: 'Widget Platform API', version: '4.0.1', description: 'Inventory and reporting API.' },
  host: 'api.widgets.io',
  basePath: '/v4',
  schemes: ['https'],
  paths: {
    '/queries': {
      post: {
        operationId: 'create_query',
        summary: 'Create Query',
        tags: ['Query'],
        parameters: [
          { name: 'body', in: 'body', required: true, description: 'Query', schema: { $ref: '#/definitions/Query' } },
          { name: 'fields', in: 'query', type: 'string', description: 'Requested fields.' },
          { name: 'sort', in: 'query', type: 'string', enum: ['asc', 'desc'] }
        ],
        responses: {
          200: { description: 'Query', schema: { $ref: '#/definitions/Query' } },
          400: { description: 'Bad Request', schema: { $ref: '#/definitions/Error' } }
        }
      }
    },
    '/reports/{report_id}/sections/{section_id}': {
      get: {
        operationId: 'report_section',
        summary: 'Get Report Section',
        tags: ['Report'],
        parameters: [{ name: 'report_id', in: 'path', type: 'string', required: true }],
        responses: { 200: { description: 'Section', schema: { type: 'array', items: { $ref: '#/definitions/Section' } } } }
      }
    }
  },
  definitions: {
    Query: {
      type: 'object',
      required: ['model'],
      properties: {
        id: { type: 'string', readOnly: true, description: 'Unique Id' },
        model: { type: 'string', description: 'Model name' },
        created_at: { type: 'string', format: 'date-time' },
        sections: { type: 'array', items: { $ref: '#/definitions/Section' }, description: 'Sections in the query' },
        owner: { $ref: '#/definitions/User' }
      }
    },
    Section: { type: 'object', properties: { name: { type: 'string' } } },
    User: { allOf: [{ $ref: '#/definitions/Actor' }, { type: 'object', properties: { email: { type: 'string' } } }] },
    Actor: { type: 'object', properties: { id: { type: 'string' } } },
    Error: { type: 'object', properties: { message: { type: 'string' } } }
  }
};

const parsedApi = parseOpenApiSpec(SPEC, 'https://api.widgets.io/swagger.json');
assert.strictEqual(parsedApi.endpoints.length, 2);
assert.strictEqual(parsedApi.endpoints[0].hasExplicitOperationId, true);

const docs = openApiToDocuments(parsedApi, 'https://api.widgets.io/swagger.json', { sourceId: 'widget-api' });
// Generated concepts carry their own internal headings and must never be split
assert(docs.every(d => d.splittable === false), 'API concepts must be exempt from section splitting');

const bundle = new OKFBundleBuilder().buildBundle({
  documents: docs,
  sources: [{
    sourceId: 'widget-api', sourceType: 'openapi', url: 'https://api.widgets.io/swagger.json',
    title: 'Widget Platform API (v4.0.1)', description: 'Inventory and reporting API.',
    input: 'https://api.widgets.io/swagger.json', documentCount: docs.length
  }]
});
const paths = Array.from(bundle.files.keys());

// Endpoint concepts are named after their operationId, not a mangled path
assert(bundle.files.has('query/create-query.md'), `expected query/create-query.md, got: ${paths.join(', ')}`);
assert(bundle.files.has('report/report-section.md'));
assert(!paths.some(p => /sectionssection/.test(p)), 'no run-on path slugs');

// Endpoint documents are whole, not fragmented into their own headings
assert(!paths.some(p => p.endsWith('/parameters.md') || p.endsWith('/responses.md')), 'API concepts must not be split by section');

const endpoint = bundle.files.get('query/create-query.md');
assert(endpoint.includes('## Request Body'), 'body parameters get their own section');
assert(endpoint.includes('[Query](/schemas/query.md)'), 'the request body links to its schema');
assert(endpoint.includes('| HTTP Status | Returns | Description |'), 'responses carry their type');
assert(endpoint.includes('| `400` | [Error](/schemas/error.md) | Bad Request |'), 'error responses link too');
assert(endpoint.includes('one of `asc`, `desc`'), 'enum parameters list their values');
assert(!endpoint.includes('| `body` | body |'), 'the body must not appear as an untyped row');

const arrayResponse = bundle.files.get('report/report-section.md');
assert(arrayResponse.includes('array of [Section](/schemas/section.md)'), 'array responses keep their element type');

// Schema concepts resolve refs, arrays of refs, requiredness and composition
const querySchema = bundle.files.get('schemas/query.md');
assert(querySchema.includes('| `sections` | array of [Section](/schemas/section.md) |'), 'array-of-ref property');
assert(querySchema.includes('| `owner` | [User](/schemas/user.md) |'), 'ref property');
assert(querySchema.includes('`string (date-time)`'), 'formats are shown');
assert(querySchema.includes('| `model` | `string` | **Yes**'), 'required properties are marked');
assert(querySchema.includes('read-only'), 'readOnly properties are marked');

const userSchema = bundle.files.get('schemas/user.md');
assert(userSchema.includes('**Composed of**'), 'allOf composition is named');
assert(userSchema.includes('| `email` |'), 'properties inside an allOf branch are surfaced');
assert(userSchema.includes('| `id` |'), 'inherited properties are surfaced');

// The bundle is titled after the API, not after whichever endpoint came first
const rootIndex = bundle.files.get('index.md');
assert(rootIndex.includes('# Widget Platform API (v4.0.1)'), `bundle should be titled after the API:\n${rootIndex.slice(0, 200)}`);
assert(!rootIndex.includes('# POST /queries'), 'the first endpoint must not become the bundle title');

assert.strictEqual(validateOKFBundle(bundle.files).isValid, true, JSON.stringify(validateOKFBundle(bundle.files).errors));
console.log('✅ 4. Complex spec verified: linked bodies, typed responses, composed schemas, correct bundle title.');

// -------------------------------------------------------------------------
// 5. Progressive disclosure at scale
// -------------------------------------------------------------------------
const bigSpec = {
  swagger: '2.0',
  info: { title: 'Large API', version: '1.0' },
  host: 'api.large.io',
  paths: Object.fromEntries(
    Array.from({ length: 40 }, (_, i) => [`/things/${i}`, {
      get: { operationId: `get_thing_${i}`, summary: `Get thing ${i}`, tags: ['Things'], responses: { 200: { description: 'ok' } } }
    }])
  ),
  definitions: {}
};
const bigDocs = openApiToDocuments(parseOpenApiSpec(bigSpec, 'https://api.large.io/spec.json'), 'https://api.large.io/spec.json');
const bigBundle = new OKFBundleBuilder().buildBundle({ documents: bigDocs, sources: [] });

// Every concept still exists, and the section index lists them all
const thingConcepts = Array.from(bigBundle.files.keys()).filter(p => p.startsWith('things/') && p !== 'things/index.md');
assert.strictEqual(thingConcepts.length, 40);
assert.strictEqual((bigBundle.files.get('things/index.md').match(/^\* \[/gm) || []).length, 40, 'the section index lists everything');

// The root index defers to the section rather than reproducing all 40
const rootEntries = (bigBundle.files.get('index.md').match(/^\* \[/gm) || []).length;
assert(rootEntries < 40, `root index should not list every concept, listed ${rootEntries}`);
assert(bigBundle.files.get('index.md').includes('and 28 more'), 'root index should say how many it deferred');
assert.strictEqual(validateOKFBundle(bigBundle.files).isValid, true);
console.log(`✅ 5. Scale verified: 40 concepts kept, root index lists ${rootEntries} and defers the rest.`);

// -------------------------------------------------------------------------
// 6. The standalone API bundle builder still works
// -------------------------------------------------------------------------
const standalone = buildOKFBundleFromOpenApi(parsedApi, 'https://api.widgets.io/swagger.json');
assert(standalone.files.has('index.md') && standalone.files.has('log.md'));
assert(standalone.files.has('query/create-query.md'), 'the standalone builder uses the same identifiers');
assert.strictEqual(validateOKFBundle(standalone.files).isValid, true);
console.log('✅ 6. Standalone API bundle builder verified against the same spec.');

console.log('\n🎉 ALL COMPLEX API TESTS PASSED!\n');
