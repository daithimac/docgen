import yaml from 'js-yaml';
import { parseDocumentationHtml } from './parser.js';
import { htmlToMarkdown } from './markdown-converter.js';

/**
 * Creates a URL-safe slug from a string.
 */
export function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

/**
 * Derives a clean subdirectory and concept filename from URL, section, and title.
 */
export function getConceptPathInfo(pageData, isRoot = false) {
  const url = pageData.url;
  let section = pageData.section || 'general';
  let slug = '';

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      slug = parts[parts.length - 1].replace(/\.html?$/, '');
    }
  } catch (e) {}

  if (!slug) {
    slug = slugify(pageData.title);
  }

  // Determine category folder
  let folder = '';
  const lowerSec = section.toLowerCase();
  const lowerSlug = slug.toLowerCase();

  if (isRoot) {
    folder = '';
    slug = 'overview';
  } else if (lowerSec.includes('migrate') || lowerSlug.includes('migrat')) {
    folder = 'migrate-data';
  } else if (lowerSec.includes('load') || lowerSlug.includes('load') || lowerSlug.includes('transfer') || lowerSlug.includes('storage')) {
    folder = 'load-data';
  } else if (lowerSec.includes('transform') || lowerSlug.includes('dataform') || lowerSlug.includes('pipeline') || lowerSlug.includes('prep')) {
    folder = 'transform-data';
  } else if (lowerSec.includes('export') || lowerSlug.includes('reverse-etl') || lowerSlug.includes('extract')) {
    folder = 'export-data';
  } else if (lowerSec.includes('reference') || lowerSec.includes('api') || lowerSec.includes('schema')) {
    folder = 'reference';
  } else if (lowerSec && lowerSec !== 'general') {
    folder = slugify(lowerSec);
  } else {
    folder = 'guides';
  }

  const filename = `${slug}.md`;
  const relativePath = folder ? `${folder}/${filename}` : filename;
  const bundleRelativePath = `/${relativePath}`;

  return {
    folder,
    filename,
    relativePath,
    bundleRelativePath,
    conceptId: relativePath.replace(/\.md$/, '')
  };
}

/**
 * Derives a clean filename/bundle slug from the website name, URL, and page title.
 */
export function deriveBundleName(startUrl, rootTitle = '', siteName = '') {
  try {
    const parsed = new URL(startUrl);
    const host = parsed.hostname.replace(/^www\./, '').replace(/\.(com|org|io|net|dev|app|ai)$/, '');
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // If siteName is available and distinct
    let base = '';
    if (siteName && siteName.toLowerCase() !== 'documentation team') {
      base = slugify(siteName);
    }

    // Filter meaningful path parts (e.g. ['bigquery', 'docs', 'load-transform-export-intro'])
    const meaningfulParts = pathParts.filter(p => !['docs', 'doc', 'en', 'v1', 'v2', 'latest', 'index', 'html'].includes(p.toLowerCase()));

    if (meaningfulParts.length > 0) {
      const pathSlug = slugify(meaningfulParts.join('-'));
      if (base && !pathSlug.includes(base) && base.length < 25) {
        return `${base}-${pathSlug}`;
      }
      return pathSlug;
    }

    if (base) {
      return base;
    }

    if (rootTitle) {
      return slugify(rootTitle);
    }

    return slugify(host || 'okf-bundle');
  } catch (e) {
    return slugify(rootTitle || 'okf-bundle');
  }
}

/**
 * OKF v0.2 Bundle Builder
 */
export class OKFBundleBuilder {
  constructor(options = {}) {
    this.actor = options.actor || 'docgen/okf-parser-v0.2';
    this.includeAttestedComputations = options.includeAttestedComputations !== false;
    this.bundleTitle = options.bundleTitle || 'Documentation Knowledge Bundle';
    this.timestamp = options.timestamp || new Date().toISOString();
    this.dateString = this.timestamp.split('T')[0];
  }

  /**
   * Builds the entire OKF bundle from crawled page results.
   */
  buildBundle(crawlResult) {
    const { startUrl, pages } = crawlResult;
    const urlToPathMap = new Map(); // url -> bundleRelativePath
    const urlToConceptMap = new Map(); // url -> parsedData
    const parsedPages = [];

    // Step 1: Parse all pages and assign bundle paths
    pages.forEach((page, index) => {
      const parsed = parseDocumentationHtml(page.html, page.url);
      if (page.section) {
        parsed.section = page.section;
      }
      const isRoot = (index === 0 || page.url === startUrl);
      const pathInfo = getConceptPathInfo(parsed, isRoot);

      urlToPathMap.set(page.url, pathInfo.bundleRelativePath);
      // Also map without trailing slash or variants
      const norm = page.url.replace(/\/$/, '');
      urlToPathMap.set(norm, pathInfo.bundleRelativePath);

      parsedPages.push({
        raw: page,
        parsed,
        pathInfo
      });
      urlToConceptMap.set(page.url, { parsed, pathInfo });
    });

    const bundleFiles = new Map(); // relativePath -> fileContent
    const folders = new Set();
    const folderConceptsMap = new Map(); // folder -> Array<conceptInfo>
    const computations = [];

    // Step 2: Convert each page to OKF Markdown Concept Document
    parsedPages.forEach(({ raw, parsed, pathInfo }) => {
      const folder = pathInfo.folder;
      if (folder) folders.add(folder);

      if (!folderConceptsMap.has(folder)) {
        folderConceptsMap.set(folder, []);
      }
      folderConceptsMap.get(folder).push({
        pathInfo,
        parsed
      });

      // 2a. Convert HTML body to Markdown
      let bodyMarkdown = htmlToMarkdown(parsed.htmlBody);

      // 2b. Rewrite internal hyperlinks to bundle-relative OKF paths
      bodyMarkdown = this.rewriteLinks(bodyMarkdown, urlToPathMap, pathInfo);

      // 2c. Build Sources & Provenance Metadata
      const sourceId = `src-${slugify(parsed.title).slice(0, 20)}`;
      const sources = [
        {
          id: sourceId,
          resource: parsed.url,
          title: parsed.title,
          author: parsed.author,
          last_modified: parsed.lastModified
        }
      ];

      // 2d. Attach Footnotes for Provenance
      bodyMarkdown += `\n\n---\n\n[^${sourceId}]: [${parsed.title}](${parsed.url}) - ${parsed.author}`;

      // 2e. Check for Attested Computations
      if (this.includeAttestedComputations && parsed.codeBlocks.length > 0) {
        const sqlSnippet = parsed.codeBlocks.find(b => b.isExecutable && b.language === 'sql');
        if (sqlSnippet) {
          const compSlug = `comp-${slugify(parsed.title).slice(0, 25)}`;
          const compPathInfo = {
            folder: 'computations',
            filename: `${compSlug}.md`,
            relativePath: `computations/${compSlug}.md`,
            bundleRelativePath: `/computations/${compSlug}.md`,
            conceptId: `computations/${compSlug}`
          };
          folders.add('computations');

          const compDoc = this.generateAttestedComputation({
            title: `Computation for ${parsed.title}`,
            description: `Sanctioned SQL execution logic derived from ${parsed.title}.`,
            runtime: 'bigquery',
            code: sqlSnippet.code,
            parentSource: sources[0],
            sourceId
          });

          bundleFiles.set(compPathInfo.relativePath, compDoc);
          computations.push({ pathInfo: compPathInfo, title: `Computation: ${parsed.title}` });

          // Link computation from parent guide
          bodyMarkdown = `> [!TIP]\n> This guide includes a sanctioned executable computation: [${parsed.title} Computation](${compPathInfo.bundleRelativePath})\n\n` + bodyMarkdown;
        }
      }

      // 2f. Build YAML Frontmatter
      const frontmatterObj = {
        type: parsed.type || 'Guide',
        title: parsed.title,
        description: parsed.description || `${parsed.title} reference documentation.`,
        resource: parsed.url,
        tags: parsed.tags && parsed.tags.length ? parsed.tags : ['documentation', 'cloud'],
        status: 'stable',
        generated: {
          by: this.actor,
          at: this.timestamp
        },
        verified: {
          by: 'process:crawler',
          at: this.timestamp
        },
        sources
      };

      const frontmatterYaml = yaml.dump(frontmatterObj, { lineWidth: 100 }).trim();
      const completeDocument = `---\n${frontmatterYaml}\n---\n\n# ${parsed.title}\n\n${bodyMarkdown}\n`;

      bundleFiles.set(pathInfo.relativePath, completeDocument);
    });

    // Step 3: Generate Subdirectory index.md files
    folders.forEach(folder => {
      const concepts = folderConceptsMap.get(folder) || [];
      let indexContent = `# ${this.formatFolderTitle(folder)}\n\n`;
      indexContent += `This directory contains curated knowledge documents related to **${this.formatFolderTitle(folder)}**.\n\n`;
      indexContent += `## Concepts\n\n`;

      concepts.forEach(({ pathInfo, parsed }) => {
        indexContent += `* [${parsed.title}](./${pathInfo.filename}) - ${parsed.description || parsed.title}\n`;
      });

      if (folder === 'computations' && computations.length > 0) {
        computations.forEach(({ pathInfo, title }) => {
          indexContent += `* [${title}](./${pathInfo.filename}) - Sanctioned executable computation.\n`;
        });
      }

      bundleFiles.set(`${folder}/index.md`, indexContent);
    });

    // Step 4: Generate Bundle Root index.md (with okf_version: "0.2")
    const rootIndexContent = this.generateRootIndex(folderConceptsMap, folders, computations, parsedPages[0]?.parsed);
    bundleFiles.set('index.md', rootIndexContent);

    // Step 5: Generate log.md
    const logContent = this.generateLogFile(parsedPages.length, folders.size, startUrl);
    bundleFiles.set('log.md', logContent);

    const rootParsed = parsedPages[0]?.parsed;
    const siteName = rootParsed?.siteName || '';
    const bundleName = deriveBundleName(startUrl, rootParsed?.title, siteName);

    return {
      title: rootParsed?.title || this.bundleTitle,
      siteName: siteName || rootParsed?.title || 'Knowledge Base',
      bundleName: bundleName || 'okf-knowledge-bundle',
      startUrl,
      conceptCount: parsedPages.length + computations.length,
      folderCount: folders.size,
      folders: Array.from(folders),
      files: bundleFiles, // Map<relativePath, content>
      pages: parsedPages
    };
  }

  /**
   * Rewrites web URLs in markdown to bundle-relative paths when target pages exist in the bundle.
   */
  rewriteLinks(markdown, urlToPathMap, currentPathInfo) {
    return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, href) => {
      // Split anchor hash if any
      const [baseUrlPart, hash] = href.split('#');
      const normalized = baseUrlPart ? baseUrlPart.replace(/\/$/, '') : '';

      // Direct match in urlToPathMap
      for (const [crawledUrl, bundlePath] of urlToPathMap.entries()) {
        const crawledNorm = crawledUrl.replace(/\/$/, '');
        if (normalized === crawledNorm || href === crawledUrl || href.endsWith(crawledNorm.replace(/^https?:\/\/[^\/]+/, ''))) {
          const hashSuffix = hash ? `#${hash}` : '';
          return `[${linkText}](${bundlePath}${hashSuffix})`;
        }
      }

      // Check if href is a root relative path like /bigquery/docs/loading-data
      if (href.startsWith('/')) {
        for (const [crawledUrl, bundlePath] of urlToPathMap.entries()) {
          try {
            const parsed = new URL(crawledUrl);
            if (parsed.pathname === href || parsed.pathname === baseUrlPart) {
              const hashSuffix = hash ? `#${hash}` : '';
              return `[${linkText}](${bundlePath}${hashSuffix})`;
            }
          } catch (e) {}
        }
      }

      return match;
    });
  }

  /**
   * Generates Root index.md with okf_version frontmatter and progressive disclosure groups.
   */
  generateRootIndex(folderConceptsMap, folders, computations, rootPageData) {
    const frontmatter = `---\nokf_version: "0.2"\n---\n\n`;
    let content = frontmatter;
    content += `# ${rootPageData?.title || 'Open Knowledge Bundle'}\n\n`;
    content += `${rootPageData?.description || 'Curated knowledge bundle automatically generated from documentation.'}\n\n`;

    // Root concepts
    const rootConcepts = folderConceptsMap.get('') || [];
    if (rootConcepts.length > 0) {
      content += `## Overview\n\n`;
      rootConcepts.forEach(({ pathInfo, parsed }) => {
        content += `* [${parsed.title}](./${pathInfo.filename}) - ${parsed.description}\n`;
      });
      content += `\n`;
    }

    // Folders
    folders.forEach(folder => {
      const concepts = folderConceptsMap.get(folder) || [];
      content += `## ${this.formatFolderTitle(folder)}\n\n`;
      content += `* [${this.formatFolderTitle(folder)} Directory](${folder}/index.md) - Section overview and index.\n`;

      concepts.forEach(({ pathInfo, parsed }) => {
        content += `* [${parsed.title}](${pathInfo.relativePath}) - ${parsed.description || parsed.title}\n`;
      });
      content += `\n`;
    });

    if (computations.length > 0) {
      content += `## Attested Computations\n\n`;
      content += `* [Computations Directory](computations/index.md) - Sanctioned executable logic and queries.\n`;
      computations.forEach(({ pathInfo, title }) => {
        content += `* [${title}](${pathInfo.relativePath}) - Executable SQL / code computation.\n`;
      });
      content += `\n`;
    }

    return content;
  }

  /**
   * Generates an Attested Computation concept file.
   */
  generateAttestedComputation({ title, description, runtime, code, parentSource, sourceId }) {
    const frontmatterObj = {
      type: 'Attested Computation',
      title,
      description,
      status: 'stable',
      runtime,
      parameters: [
        { name: 'project_id', type: 'string', required: false },
        { name: 'dataset_id', type: 'string', required: false }
      ],
      executor: {
        resource: 'references/skills/run-on-bq.md',
        receipt: ['job_id', 'executed_sql', 'result']
      },
      attester: {
        resource: 'references/attesters/sql-equality.py'
      },
      generated: {
        by: this.actor,
        at: this.timestamp
      },
      verified: {
        by: 'process:crawler',
        at: this.timestamp
      },
      sources: [parentSource]
    };

    const frontmatterYaml = yaml.dump(frontmatterObj, { lineWidth: 100 }).trim();
    return `---\n${frontmatterYaml}\n---\n\n# Computation\n\n\`\`\`${runtime}\n${code}\n\`\`\`\n\nThis computation represents sanctioned execution logic extracted from the documentation.[^${sourceId}]\n\n[^${sourceId}]: [${parentSource.title}](${parentSource.resource})\n`;
  }

  /**
   * Generates log.md
   */
  generateLogFile(conceptCount, sectionCount, startUrl) {
    return `# Directory Update Log\n\n## ${this.dateString}\n* **Creation**: Ingested documentation from [${startUrl}](${startUrl}) and generated conformant OKF v0.2 bundle.\n* **Structure**: Created ${conceptCount} concept documents across ${sectionCount} domain categories.\n* **Attestation**: Extracted executable code snippets as Attested Computations where applicable.\n* **Verification**: Marked with automated process confirmation by \`${this.actor}\`.\n`;
  }

  formatFolderTitle(folder) {
    if (!folder) return 'Overview';
    return folder
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
