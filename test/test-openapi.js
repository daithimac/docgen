import assert from 'assert';
import { parseOpenApiSpec, buildOKFBundleFromOpenApi } from '../src/core/openapi-parser.js';
import { validateOKFBundle } from '../src/core/validator.js';

console.log('🧪 Running OpenAPI & Swagger OKF Bundle Generator Tests...\n');

// 1. Mock Swagger 2.0 Spec (similar to api.oireachtas.ie)
const mockSwaggerSpec = {
  swagger: '2.0',
  info: {
    title: 'Houses of the Oireachtas Open Data APIs',
    description: 'The Houses of the Oireachtas Open Data APIs allow retrieval of debates, legislation, and members.',
    version: '1.1.0'
  },
  host: 'api.oireachtas.ie',
  basePath: '/v1',
  schemes: ['https'],
  paths: {
    '/constituencies': {
      get: {
        summary: 'Constituencies Endpoint',
        description: 'Returns list of constituencies filtered by parameters.',
        tags: ['constituencies'],
        parameters: [
          { name: 'chamber_id', in: 'query', type: 'string', required: false, description: 'House URI' },
          { name: 'limit', in: 'query', type: 'integer', required: false, description: 'Limit count' }
        ],
        responses: {
          '200': { description: 'Success response' },
          '400': { description: 'Bad request' }
        }
      }
    },
    '/debates': {
      get: {
        summary: 'Debates Endpoint',
        description: 'Returns list of debates from Dáil and Seanad.',
        tags: ['debates'],
        parameters: [
          { name: 'date_start', in: 'query', type: 'string', required: false }
        ],
        responses: {
          '200': { description: 'Success' }
        }
      }
    },
    '/legislation': {
      get: {
        summary: 'Legislation Endpoint',
        description: 'Returns list of Bills and Acts.',
        tags: ['legislation'],
        responses: {
          '200': { description: 'Success' }
        }
      }
    }
  },
  definitions: {
    Constituency: {
      type: 'object',
      properties: {
        uri: { type: 'string', format: 'uri' },
        name: { type: 'string' }
      }
    }
  }
};

const parsedApi = parseOpenApiSpec(mockSwaggerSpec, 'https://api.oireachtas.ie/');
assert.strictEqual(parsedApi.title, 'Houses of the Oireachtas Open Data APIs');
assert.strictEqual(parsedApi.endpoints.length, 3);
assert.strictEqual(parsedApi.sectionsMap.has('constituencies'), true);
assert.strictEqual(parsedApi.sectionsMap.has('debates'), true);
assert.strictEqual(parsedApi.sectionsMap.has('legislation'), true);
console.log('✅ 1. OpenAPI Parser verified: Title, endpoints, sections, and definitions mapped.');

const bundle = buildOKFBundleFromOpenApi(parsedApi, 'https://api.oireachtas.ie/');
assert(bundle.files.has('index.md'), 'Root index.md must exist');
assert(bundle.files.has('log.md'), 'log.md must exist');
assert(bundle.files.has('constituencies/index.md'), 'constituencies/index.md must exist');
assert(bundle.files.has('constituencies/get-constituencies.md'), 'constituencies/get-constituencies.md must exist');
assert(bundle.files.has('schemas/constituency.md'), 'schemas/constituency.md must exist');
console.log('✅ 2. OKF Bundle structure verified: Endpoints, schemas, and section indexes built.');

const validation = validateOKFBundle(bundle.files);
assert.strictEqual(validation.isValid, true, `Validation failed: ${JSON.stringify(validation.errors)}`);
assert.strictEqual(validation.errors.length, 0);
console.log('✅ 3. OKF v0.2 Conformance: 100% PASS for generated API bundle.');

console.log('\n🎉 ALL OPENAPI TESTS PASSED!\n');
