import yaml from 'js-yaml';
import { parseDocumentationHtml } from './parser.js';
import { parseMarkdownDocument } from './markdown-parser.js';
import { htmlToMarkdown } from './markdown-converter.js';
import { SOURCE_TYPE_LABELS } from './sources/types.js';

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
export function getConceptPathInfo(pageData, isRoot = false, hints = {}) {
  const url = pageData.url || '';
  let section = pageData.section || 'general';
  let slug = hints.slugHint ? slugify(hints.slugHint) : '';

  // Synthetic URLs (upload://, text://) carry no meaningful path.
  if (!slug && /^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        slug = slugify(parts[parts.length - 1].replace(/\.(html?|mdx?|markdown)$/i, ''));
      }
    } catch (e) {}
  }

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
  } else if (lowerSec && lowerSec !== 'general' && lowerSec !== 'overview') {
    folder = slugify(lowerSec);
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
   * Accepts either the modern `{ documents, sources }` shape produced by the
   * source adapters, or the legacy `{ pages: [{ url, html }] }` crawl result.
   */
  normalizeInput(input) {
    const startUrl = input.startUrl || '';

    if (Array.isArray(input.documents)) {
      return {
        startUrl,
        sources: input.sources || [],
        documents: input.documents
      };
    }

    // Legacy crawl-result shape: every page is a webpage document.
    const pages = input.pages || [];
    return {
      startUrl,
      sources: input.sources || [],
      documents: pages.map((page, index) => ({
        sourceId: 'crawl',
        sourceType: 'webpage',
        url: page.url,
        html: page.html,
        section: page.section,
        isRoot: index === 0 || page.url === startUrl
      }))
    };
  }

  /**
   * Turns one normalized source document into a parsed concept, regardless of
   * whether the adapter supplied HTML or markdown.
   */
  parseDocument(doc) {
    const parsed = typeof doc.markdown === 'string'
      ? parseMarkdownDocument(doc.markdown, doc.url, {
          section: doc.section,
          title: doc.title,
          description: doc.description,
          type: doc.type,
          tags: doc.tags,
          author: doc.author,
          siteName: doc.siteName,
          lastModified: doc.lastModified,
          absolutizeLinks: doc.absolutizeLinks
        })
      : parseDocumentationHtml(doc.html || '', doc.url);

    // Adapter-supplied metadata always wins over inferred metadata.
    if (doc.section) parsed.section = doc.section;
    if (doc.title) parsed.title = doc.title;
    if (doc.description) parsed.description = doc.description;
    if (doc.type) parsed.type = doc.type;
    if (doc.author) parsed.author = doc.author;
    if (doc.siteName) parsed.siteName = doc.siteName;
    if (doc.lastModified) parsed.lastModified = doc.lastModified;
    if (doc.tags && doc.tags.length) {
      parsed.tags = Array.from(new Set([...(parsed.tags || []), ...doc.tags]));
    }

    return parsed;
  }

  /**
   * Builds the entire OKF bundle from normalized source documents.
   */
  buildBundle(input) {
    const { startUrl, documents, sources } = this.normalizeInput(input);
    const urlToPathMap = new Map(); // url -> bundleRelativePath
    const parsedPages = [];

    // Reserved relative paths, so heterogeneous sources merging into shared
    // topic folders never overwrite one another.
    const takenPaths = new Set();
    const reservePath = (folder, filename, sourceId) => {
      const build = (name) => (folder ? `${folder}/${name}` : name);
      let candidate = build(filename);
      if (takenPaths.has(candidate)) {
        const stem = filename.replace(/\.md$/, '');
        const suffixed = `${stem}-${slugify(sourceId || 'source')}.md`;
        candidate = build(suffixed);
        let n = 2;
        while (takenPaths.has(candidate)) {
          candidate = build(`${stem}-${slugify(sourceId || 'source')}-${n++}.md`);
        }
      }
      takenPaths.add(candidate);
      const parts = candidate.split('/');
      return {
        folder,
        filename: parts[parts.length - 1],
        relativePath: candidate,
        bundleRelativePath: `/${candidate}`,
        conceptId: candidate.replace(/\.md$/, '')
      };
    };

    // Step 1: Parse all documents and assign collision-safe bundle paths
    let rootClaimed = false;
    documents.forEach((doc, index) => {
      const parsed = this.parseDocument(doc);
      const isRoot = !rootClaimed && (doc.isRoot === true || (doc.isRoot === undefined && index === 0));
      if (isRoot) rootClaimed = true;

      const draft = getConceptPathInfo(parsed, isRoot, { slugHint: doc.slugHint });
      const pathInfo = reservePath(draft.folder, draft.filename, doc.sourceId);

      if (doc.url) {
        urlToPathMap.set(doc.url, pathInfo.bundleRelativePath);
        urlToPathMap.set(doc.url.replace(/\/$/, ''), pathInfo.bundleRelativePath);
      }

      parsedPages.push({ raw: doc, parsed, pathInfo });
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

      // 2a. Use pre-rendered markdown when the adapter supplied it, otherwise convert HTML
      let bodyMarkdown = typeof parsed.markdownBody === 'string'
        ? parsed.markdownBody
        : htmlToMarkdown(parsed.htmlBody);

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
          const compPathInfo = reservePath('computations', `${compSlug}.md`, raw.sourceId);
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
    const rootParsed = parsedPages.find(p => !p.pathInfo.folder)?.parsed || parsedPages[0]?.parsed;
    const rootIndexContent = this.generateRootIndex(folderConceptsMap, folders, computations, rootParsed, sources);
    bundleFiles.set('index.md', rootIndexContent);

    // Step 5: Generate log.md
    const logContent = this.generateLogFile(bundleFiles.size, folders.size, startUrl, sources);
    bundleFiles.set('log.md', logContent);

    const siteName = rootParsed?.siteName || '';
    const bundleName = sources.length > 1
      ? `${slugify(sources[0].title || sources[0].sourceId || 'multi-source')}-knowledge-bundle`
      : deriveBundleName(startUrl || sources[0]?.url || '', rootParsed?.title, siteName);

    return {
      title: rootParsed?.title || this.bundleTitle,
      siteName: siteName || rootParsed?.title || 'Knowledge Base',
      bundleName: bundleName || 'okf-knowledge-bundle',
      startUrl: startUrl || sources.map(src => src.url).filter(Boolean).join(', '),
      sources,
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
  generateRootIndex(folderConceptsMap, folders, computations, rootPageData, sources = []) {
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

    // Provenance roll-up: only meaningful once more than one source contributed.
    if (sources.length > 1) {
      content += `## Sources\n\n`;
      content += `This bundle merges knowledge from ${sources.length} sources.\n\n`;
      sources.forEach(src => {
        const label = SOURCE_TYPE_LABELS[src.sourceType] || src.sourceType || 'Source';
        const name = src.title || src.input || src.url || src.sourceId;
        const link = src.url && /^https?:\/\//i.test(src.url) ? `[${name}](${src.url})` : `\`${name}\``;
        content += `* ${link} - ${label}, ${src.documentCount || 0} concept document(s).\n`;
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
  generateLogFile(conceptCount, sectionCount, startUrl, sources = []) {
    const origin = sources.length > 0
      ? sources.map(src => {
          const label = SOURCE_TYPE_LABELS[src.sourceType] || src.sourceType || 'source';
          const name = src.title || src.input || src.url || src.sourceId;
          return src.url && /^https?:\/\//i.test(src.url)
            ? `[${name}](${src.url}) (${label})`
            : `${name} (${label})`;
        }).join(', ')
      : `[${startUrl}](${startUrl})`;

    let log = `# Directory Update Log\n\n## ${this.dateString}\n`;
    log += `* **Creation**: Ingested documentation from ${origin} and generated conformant OKF v0.2 bundle.\n`;
    log += `* **Structure**: Created ${conceptCount} concept documents across ${sectionCount} domain categories.\n`;
    if (sources.length > 1) {
      log += `* **Sources**: Merged ${sources.length} heterogeneous sources into shared topic directories.\n`;
    }
    log += `* **Attestation**: Extracted executable code snippets as Attested Computations where applicable.\n`;
    log += `* **Verification**: Marked with automated process confirmation by \`${this.actor}\`.\n`;
    return log;
  }

  formatFolderTitle(folder) {
    if (!folder) return 'Overview';
    return folder
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
