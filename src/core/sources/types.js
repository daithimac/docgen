/**
 * Normalized source-document contract.
 *
 * Every source adapter - web crawler, OpenAPI spec, git repo, markdown page,
 * uploaded file - produces an array of these. Everything downstream of the
 * adapters is format-agnostic.
 *
 * @typedef {Object} SourceDocument
 * @property {string}  sourceId     Slug of the input that produced this document.
 * @property {string}  sourceType   One of SOURCE_TYPES.
 * @property {string}  url          Canonical resource URL (may be synthetic: upload://, git://).
 * @property {string}  [section]    Section / category name used for folder routing.
 * @property {boolean} [isRoot]     Candidate for the bundle's root overview concept.
 * @property {string}  [html]       Raw HTML body (parsed with parseDocumentationHtml), OR
 * @property {string}  [markdown]   Ready markdown body (parsed with parseMarkdownDocument).
 * @property {string}  [title]      Overrides the parsed title.
 * @property {string}  [description]
 * @property {string}  [type]       Overrides the classified OKF concept type.
 * @property {string[]}[tags]
 * @property {string}  [author]
 * @property {string}  [lastModified]
 * @property {string}  [slugHint]   Preferred filename stem.
 */

export const SOURCE_TYPES = {
  WEBPAGE: 'webpage',
  OPENAPI: 'openapi',
  GIT: 'git',
  MARKDOWN: 'markdown',
  UPLOAD: 'upload'
};

export const SOURCE_TYPE_LABELS = {
  webpage: 'Web page / docs site',
  openapi: 'OpenAPI / Swagger spec',
  git: 'Git repository',
  markdown: 'Markdown page',
  upload: 'Uploaded document'
};

/**
 * Applies defaults to an adapter-produced document.
 */
export function createDocument(doc) {
  return {
    section: 'General',
    isRoot: false,
    tags: [],
    ...doc
  };
}

/**
 * Raised when a source cannot be handled in the current runtime (for example a
 * git clone attempted from the static browser build). Carries a remediation
 * message rather than a bare stack trace.
 */
export class UnsupportedInRuntimeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedInRuntimeError';
    this.isUnsupportedInRuntime = true;
  }
}
