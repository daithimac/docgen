import yaml from 'js-yaml';
import { slugify } from './okf-builder.js';

/**
 * Resolves local JSON schema refs ($ref: "#/definitions/Foo" or "#/components/schemas/Foo")
 */
export function resolveRef(spec, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let current = spec;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
}

/**
 * Parses an OpenAPI (v2 or v3) / Swagger specification into structured sections and endpoints.
 */
export function parseOpenApiSpec(spec, sourceUrl) {
  const isV3 = Boolean(spec.openapi);
  const info = spec.info || {};
  const title = info.title || 'API Reference';
  const description = info.description || 'API Documentation';
  const version = info.version || '1.0.0';

  // Base URL
  let baseUrl = '';
  if (isV3) {
    baseUrl = spec.servers?.[0]?.url || '';
  } else {
    const host = spec.host || '';
    const basePath = spec.basePath || '';
    const scheme = spec.schemes?.[0] || 'https';
    baseUrl = host ? `${scheme}://${host}${basePath}` : basePath;
  }
  if (!baseUrl && sourceUrl) {
    try {
      const parsed = new URL(sourceUrl);
      baseUrl = parsed.origin;
    } catch (e) {}
  }

  const sectionsMap = new Map(); // tagName -> Array<endpoint>
  const allEndpoints = [];
  const schemasMap = new Map(); // schemaName -> schemaObject

  // 1. Parse Paths & Endpoints
  const paths = spec.paths || {};
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const summary = operation.summary || operation.description?.split('\n')[0] || `${method.toUpperCase()} ${pathKey}`;
      const opDescription = operation.description || operation.summary || '';
      const tags = (operation.tags && operation.tags.length > 0) ? operation.tags : ['General'];
      const operationId = operation.operationId || `${method}-${slugify(pathKey)}`;

      // Resolve Parameters
      const rawParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
      const parameters = rawParams.map(param => {
        if (param.$ref) {
          const resolved = resolveRef(spec, param.$ref);
          return resolved || param;
        }
        return param;
      });

      // Responses
      const responses = [];
      for (const [code, respObj] of Object.entries(operation.responses || {})) {
        let resp = respObj;
        if (respObj.$ref) {
          resp = resolveRef(spec, respObj.$ref) || respObj;
        }
        responses.push({
          code,
          description: resp.description || 'Response',
          schema: resp.schema || resp.content?.['application/json']?.schema || null
        });
      }

      const endpoint = {
        method: method.toUpperCase(),
        path: pathKey,
        summary,
        description: opDescription,
        tags,
        operationId,
        parameters,
        responses,
        consumes: operation.consumes || spec.consumes || ['application/json'],
        produces: operation.produces || spec.produces || ['application/json'],
        baseUrl
      };

      allEndpoints.push(endpoint);

      tags.forEach(tag => {
        const tagKey = tag.trim();
        if (!sectionsMap.has(tagKey)) {
          sectionsMap.set(tagKey, []);
        }
        sectionsMap.get(tagKey).push(endpoint);
      });
    }
  }

  // 2. Parse Definitions / Schemas
  const rawSchemas = isV3 ? spec.components?.schemas : spec.definitions;
  if (rawSchemas && typeof rawSchemas === 'object') {
    for (const [schemaName, schemaObj] of Object.entries(rawSchemas)) {
      schemasMap.set(schemaName, schemaObj);
    }
  }

  return {
    isOpenApi: true,
    title,
    description,
    version,
    baseUrl,
    contact: info.contact || {},
    license: info.license || {},
    sectionsMap,
    endpoints: allEndpoints,
    schemasMap,
    rawSpec: spec
  };
}

/**
 * Builds a complete OKF v0.2 bundle from an OpenAPI specification.
 */
export function buildOKFBundleFromOpenApi(parsedApi, sourceUrl, options = {}) {
  const actor = options.actor || 'docgen/okf-api-parser-v0.2';
  const timestamp = options.timestamp || new Date().toISOString();
  const dateString = timestamp.split('T')[0];
  const bundleFiles = new Map();
  const folders = new Set();
  const folderConceptsMap = new Map(); // folder -> Array<{ pathInfo, title, description }>
  const urlToPathMap = new Map();

  const sourceId = `src-${slugify(parsedApi.title).slice(0, 20)}`;
  const sources = [
    {
      id: sourceId,
      resource: sourceUrl,
      title: `${parsedApi.title} Specification (v${parsedApi.version})`,
      author: parsedApi.contact.name || 'API Provider',
      last_modified: dateString
    }
  ];

  // 1. Generate Endpoint Concept Documents
  for (const [tagName, endpoints] of parsedApi.sectionsMap.entries()) {
    const folder = slugify(tagName);
    folders.add(folder);
    if (!folderConceptsMap.has(folder)) {
      folderConceptsMap.set(folder, []);
    }

    endpoints.forEach(ep => {
      const slug = slugify(`${ep.method}-${ep.path}`);
      const filename = `${slug}.md`;
      const relativePath = `${folder}/${filename}`;
      const bundleRelativePath = `/${relativePath}`;

      urlToPathMap.set(`${ep.method} ${ep.path}`, bundleRelativePath);

      const pathInfo = {
        folder,
        filename,
        relativePath,
        bundleRelativePath,
        conceptId: relativePath.replace(/\.md$/, '')
      };

      folderConceptsMap.get(folder).push({
        pathInfo,
        title: `${ep.method} ${ep.path}`,
        description: ep.summary || ep.description
      });

      // Build Endpoint Markdown Body
      let body = `# ${ep.method} ${ep.path}\n\n`;
      body += `**${ep.summary}**\n\n`;
      if (ep.description && ep.description !== ep.summary) {
        body += `${ep.description}\n\n`;
      }

      body += `## Request Details\n\n`;
      body += `* **HTTP Method**: \`${ep.method}\`\n`;
      body += `* **Endpoint Path**: \`${ep.path}\`\n`;
      if (parsedApi.baseUrl) {
        body += `* **Full URL**: \`${parsedApi.baseUrl}${ep.path}\`\n`;
      }
      body += `* **Consumes**: \`${ep.consumes.join(', ')}\`\n`;
      body += `* **Produces**: \`${ep.produces.join(', ')}\`\n\n`;

      // Parameters Table
      if (ep.parameters.length > 0) {
        body += `## Parameters\n\n`;
        body += `| Parameter | In | Type | Required | Description |\n`;
        body += `| --- | --- | --- | --- | --- |\n`;
        ep.parameters.forEach(p => {
          const type = p.type || p.schema?.type || 'string';
          const req = p.required ? '**Yes**' : 'No';
          const desc = (p.description || '').replace(/[\r\n]+/g, ' ').trim() || '-';
          body += `| \`${p.name}\` | ${p.in} | \`${type}\` | ${req} | ${desc} |\n`;
        });
        body += `\n`;
      }

      // Responses Table
      if (ep.responses.length > 0) {
        body += `## Responses\n\n`;
        body += `| HTTP Status | Description |\n`;
        body += `| --- | --- |\n`;
        ep.responses.forEach(r => {
          body += `| \`${r.code}\` | ${r.description} |\n`;
        });
        body += `\n`;
      }

      // Example Code snippet
      body += `## Code Examples\n\n`;
      body += `### cURL\n\n`;
      body += `\`\`\`bash\ncurl -X ${ep.method} "${parsedApi.baseUrl || 'https://api.example.com'}${ep.path}" \\\n  -H "Accept: application/json"\n\`\`\`\n\n`;

      body += `### Python (requests)\n\n`;
      body += `\`\`\`python\nimport requests\n\nurl = "${parsedApi.baseUrl || 'https://api.example.com'}${ep.path}"\nheaders = {"Accept": "application/json"}\n\nresponse = requests.${ep.method.toLowerCase()}(url, headers=headers)\nprint(response.status_code)\nprint(response.json())\n\`\`\`\n\n`;

      body += `---\n\n[^${sourceId}]: [${parsedApi.title}](${sourceUrl}) - OpenAPI Specification\n`;

      // Build Frontmatter
      const frontmatterObj = {
        type: 'API Endpoint',
        title: `${ep.method} ${ep.path} - ${ep.summary}`,
        description: ep.summary || ep.description || `${ep.method} ${ep.path} API endpoint.`,
        resource: parsedApi.baseUrl ? `${parsedApi.baseUrl}${ep.path}` : sourceUrl,
        tags: ['api', 'endpoint', ...ep.tags.map(t => slugify(t))],
        status: 'stable',
        generated: {
          by: actor,
          at: timestamp
        },
        verified: {
          by: 'process:api-spec-parser',
          at: timestamp
        },
        sources
      };

      const frontmatterYaml = yaml.dump(frontmatterObj, { lineWidth: 100 }).trim();
      const completeDoc = `---\n${frontmatterYaml}\n---\n\n${body}`;

      bundleFiles.set(relativePath, completeDoc);
    });
  }

  // 2. Generate Schemas / Models Section
  if (parsedApi.schemasMap.size > 0) {
    const schemaFolder = 'schemas';
    folders.add(schemaFolder);
    folderConceptsMap.set(schemaFolder, []);

    for (const [schemaName, schemaObj] of parsedApi.schemasMap.entries()) {
      const filename = `${slugify(schemaName)}.md`;
      const relativePath = `${schemaFolder}/${filename}`;
      const pathInfo = {
        folder: schemaFolder,
        filename,
        relativePath,
        bundleRelativePath: `/${relativePath}`,
        conceptId: `${schemaFolder}/${slugify(schemaName)}`
      };

      folderConceptsMap.get(schemaFolder).push({
        pathInfo,
        title: schemaName,
        description: schemaObj.description || `${schemaName} data model definition.`
      });

      let body = `# ${schemaName}\n\n`;
      if (schemaObj.description) {
        body += `${schemaObj.description}\n\n`;
      }

      body += `## Schema Properties\n\n`;
      if (schemaObj.properties && typeof schemaObj.properties === 'object') {
        body += `| Property | Type | Format | Description |\n`;
        body += `| --- | --- | --- | --- |\n`;
        for (const [propName, propObj] of Object.entries(schemaObj.properties)) {
          const type = propObj.type || (propObj.$ref ? `[${propObj.$ref.split('/').pop()}](./${slugify(propObj.$ref.split('/').pop())}.md)` : 'object');
          const format = propObj.format || '-';
          const desc = (propObj.description || '').replace(/[\r\n]+/g, ' ').trim() || '-';
          body += `| \`${propName}\` | ${type} | \`${format}\` | ${desc} |\n`;
        }
        body += `\n`;
      } else {
        body += `\`\`\`json\n${JSON.stringify(schemaObj, null, 2)}\n\`\`\`\n\n`;
      }

      body += `---\n\n[^${sourceId}]: [${parsedApi.title}](${sourceUrl}) - Schema Model\n`;

      const fm = {
        type: 'Reference',
        title: `${schemaName} Schema Model`,
        description: schemaObj.description || `${schemaName} data model reference.`,
        resource: sourceUrl,
        tags: ['api', 'schema', 'model', slugify(schemaName)],
        status: 'stable',
        generated: { by: actor, at: timestamp },
        verified: { by: 'process:api-spec-parser', at: timestamp },
        sources
      };

      bundleFiles.set(relativePath, `---\n${yaml.dump(fm, { lineWidth: 100 }).trim()}\n---\n\n${body}`);
    }
  }

  // 3. Subdirectory index.md files
  folders.forEach(folder => {
    const concepts = folderConceptsMap.get(folder) || [];
    let indexContent = `# ${folder.toUpperCase()} API\n\n`;
    indexContent += `This directory contains API endpoint specifications for **${folder}**.\n\n`;
    indexContent += `## Endpoints & Concepts\n\n`;
    concepts.forEach(({ pathInfo, title, description }) => {
      indexContent += `* [${title}](./${pathInfo.filename}) - ${description}\n`;
    });
    bundleFiles.set(`${folder}/index.md`, indexContent);
  });

  // 4. Bundle Root index.md
  let rootIndex = `---\nokf_version: "0.2"\n---\n\n`;
  rootIndex += `# ${parsedApi.title} (v${parsedApi.version})\n\n`;
  rootIndex += `${parsedApi.description}\n\n`;
  if (parsedApi.baseUrl) {
    rootIndex += `* **Base URL**: \`${parsedApi.baseUrl}\`\n`;
  }
  if (parsedApi.license?.name) {
    rootIndex += `* **License**: [${parsedApi.license.name}](${parsedApi.license.url || '#'})\n`;
  }
  if (parsedApi.contact?.email) {
    rootIndex += `* **Contact**: ${parsedApi.contact.email}\n`;
  }
  rootIndex += `\n`;

  folders.forEach(folder => {
    const concepts = folderConceptsMap.get(folder) || [];
    rootIndex += `## ${folder.toUpperCase()} Section\n\n`;
    rootIndex += `* [${folder.toUpperCase()} Directory](${folder}/index.md) - Section index and overview.\n`;
    concepts.forEach(({ pathInfo, title, description }) => {
      rootIndex += `* [${title}](${pathInfo.relativePath}) - ${description}\n`;
    });
    rootIndex += `\n`;
  });

  bundleFiles.set('index.md', rootIndex);

  // 5. Bundle log.md
  const logContent = `# Directory Update Log\n\n## ${dateString}\n* **Creation**: Ingested OpenAPI / Swagger specification from [${sourceUrl}](${sourceUrl}) and generated OKF v0.2 bundle.\n* **Structure**: Created ${parsedApi.endpoints.length} API endpoint documents across ${folders.size} category sections.\n* **Verification**: Marked with automated process confirmation by \`${actor}\`.\n`;
  bundleFiles.set('log.md', logContent);

  const siteSlug = slugify(parsedApi.title || 'api');

  return {
    title: parsedApi.title,
    siteName: parsedApi.title,
    bundleName: `${siteSlug}-api`,
    startUrl: sourceUrl,
    conceptCount: bundleFiles.size - (folders.size + 2), // excluding index & log
    folderCount: folders.size,
    folders: Array.from(folders),
    files: bundleFiles
  };
}
