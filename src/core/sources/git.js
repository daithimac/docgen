import { parseOpenApiSpec, openApiToDocuments } from '../openapi-parser.js';
import { slugify } from '../okf-builder.js';
import { parseSpecText } from './openapi.js';
import { SOURCE_TYPES, UnsupportedInRuntimeError } from './types.js';

const DEFAULT_MAX_FILES = 100;
const MARKDOWN_RE = /\.mdx?$/i;
const SPEC_RE = /(^|\/)(openapi|swagger)[^/]*\.(json|ya?ml)$/i;

/**
 * Parses the many shapes of a repository reference into its parts.
 */
export function parseRepoUrl(input) {
  const raw = String(input || '').trim().replace(/\.git$/i, '');

  // scp-style: git@host:owner/repo
  const scp = raw.match(/^(?:git\+)?(?:ssh:\/\/)?git@([^:/]+)[:/](.+)$/i);
  if (scp) {
    const [owner, ...rest] = scp[2].split('/').filter(Boolean);
    return buildRepo(scp[1], owner, rest.join('/'), '', '', `git@${scp[1]}:${scp[2]}.git`);
  }

  let parsed;
  try {
    parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch (e) {
    throw new Error(`Not a recognizable repository URL: ${input}`);
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new Error(`Repository URL must include an owner and a repository name: ${input}`);
  }

  // Split off a /tree/<ref>/<subpath> or /-/tree/<ref>/<subpath> suffix
  let ref = '';
  let subPath = '';
  const treeIndex = segments.findIndex((s, i) => s === 'tree' && i >= 2);
  let repoSegments = segments;
  if (treeIndex > -1) {
    repoSegments = segments.slice(0, treeIndex).filter(s => s !== '-');
    ref = segments[treeIndex + 1] || '';
    subPath = segments.slice(treeIndex + 2).join('/');
  }

  const owner = repoSegments[0];
  const repo = repoSegments.slice(1).join('/');
  return buildRepo(parsed.hostname, owner, repo, ref, subPath, `${parsed.origin}/${owner}/${repo}.git`);
}

function buildRepo(hostname, owner, repo, ref, subPath, cloneUrl) {
  const host = /(^|\.)github\.com$/i.test(hostname)
    ? 'github'
    : /gitlab/i.test(hostname)
      ? 'gitlab'
      : 'other';
  return {
    host,
    hostname,
    owner,
    repo,
    ref,
    subPath,
    cloneUrl,
    webUrl: `https://${hostname}/${owner}/${repo}`,
    fullName: `${owner}/${repo}`
  };
}

/**
 * True when a path should become a bundle concept.
 */
export function isIngestibleRepoPath(path) {
  if (/(^|\/)(node_modules|vendor|\.git|dist|build|\.github\/ISSUE_TEMPLATE)\//i.test(path)) return false;
  return MARKDOWN_RE.test(path) || SPEC_RE.test(path);
}

/**
 * Orders candidate files so the most useful documentation survives the cap:
 * root README, then docs/, then everything else.
 */
export function prioritizeRepoPaths(paths) {
  const rank = (p) => {
    if (/^readme\.mdx?$/i.test(p)) return 0;
    if (/^docs?\//i.test(p)) return 1;
    if (SPEC_RE.test(p)) return 2;
    if (/readme\.mdx?$/i.test(p)) return 3;
    return 4;
  };
  return [...paths].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * Maps a repository file path to a bundle section name.
 */
export function sectionForRepoPath(path) {
  if (/^readme\.mdx?$/i.test(path)) return 'Overview';

  const parts = path.split('/');
  if (/^docs?$/i.test(parts[0])) {
    return parts.length > 2
      ? parts[1].replace(/[-_]+/g, ' ')
      : 'Documentation';
  }
  if (parts.length > 1) return parts[parts.length - 2].replace(/[-_]+/g, ' ');
  return 'Repository';
}

function authHeaders(repo, token) {
  if (!token) return {};
  return repo.host === 'gitlab'
    ? { 'PRIVATE-TOKEN': token }
    : { Authorization: `Bearer ${token}` };
}

function rateLimitMessage(repo, err) {
  if (err && (err.status === 403 || err.status === 429)) {
    const flag = repo.host === 'gitlab' ? 'a GitLab personal access token' : 'a GitHub token (GITHUB_TOKEN or the token field in the UI)';
    return new Error(
      `${repo.host === 'gitlab' ? 'GitLab' : 'GitHub'} API rate limit reached for ${repo.fullName}. ` +
      `Supply ${flag} to raise the limit, then try again.`
    );
  }
  if (err && err.status === 404) {
    return new Error(`Repository ${repo.fullName} was not found, or it is private. Public repositories only, unless you supply a token.`);
  }
  return err;
}

/**
 * Lists candidate documentation files via the GitHub or GitLab REST API.
 * Works in Node and in the browser - no clone required.
 */
export async function listRepoFilesViaApi(repo, ctx) {
  const { fetcher, options = {} } = ctx;
  const token = options.githubToken || options.gitToken;
  const headers = authHeaders(repo, token);

  if (repo.host === 'github') {
    let ref = repo.ref;
    if (!ref) {
      const meta = await fetcher.getJson(`https://api.github.com/repos/${repo.fullName}`, { headers })
        .catch(err => { throw rateLimitMessage(repo, err); });
      ref = meta.default_branch || 'main';
    }
    const tree = await fetcher.getJson(
      `https://api.github.com/repos/${repo.fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      { headers }
    ).catch(err => { throw rateLimitMessage(repo, err); });

    const paths = (tree.tree || [])
      .filter(node => node.type === 'blob')
      .map(node => node.path);

    return {
      ref,
      paths,
      readFile: (path) => fetcher.getText(
        `https://raw.githubusercontent.com/${repo.fullName}/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`,
        { headers, accept: 'text/plain, */*' }
      ),
      truncated: Boolean(tree.truncated)
    };
  }

  if (repo.host === 'gitlab') {
    const base = `https://${repo.hostname}/api/v4/projects/${encodeURIComponent(repo.fullName)}`;
    let ref = repo.ref;
    if (!ref) {
      const meta = await fetcher.getJson(base, { headers })
        .catch(err => { throw rateLimitMessage(repo, err); });
      ref = meta.default_branch || 'main';
    }

    const paths = [];
    const perPage = 100;
    const maxPages = Math.max(1, Math.ceil((options.maxFiles || DEFAULT_MAX_FILES) / 10));
    for (let page = 1; page <= maxPages; page++) {
      const batch = await fetcher.getJson(
        `${base}/repository/tree?recursive=true&per_page=${perPage}&page=${page}&ref=${encodeURIComponent(ref)}`,
        { headers }
      ).catch(err => { throw rateLimitMessage(repo, err); });
      if (!Array.isArray(batch) || batch.length === 0) break;
      batch.filter(n => n.type === 'blob').forEach(n => paths.push(n.path));
      if (batch.length < perPage) break;
    }

    return {
      ref,
      paths,
      readFile: (path) => fetcher.getText(
        `${base}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref)}`,
        { headers, accept: 'text/plain, */*' }
      ),
      truncated: false
    };
  }

  return null;
}

/**
 * Shallow-clones a repository into a temp directory and lists its files.
 * Node only - guarded by the fetcher's capabilities.
 */
export async function listRepoFilesViaClone(repo, ctx) {
  const { onProgress = () => {} } = ctx;
  const [{ execFile }, os, fs, path, { promisify }] = await Promise.all([
    import('child_process'),
    import('os'),
    import('fs/promises'),
    import('path'),
    import('util')
  ]);
  const run = promisify(execFile);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docgen-repo-'));
  onProgress({ type: 'cloning', url: repo.cloneUrl, message: `Shallow-cloning ${repo.fullName}...` });

  const args = ['clone', '--depth', '1', '--single-branch'];
  if (repo.ref) args.push('--branch', repo.ref);
  args.push(repo.cloneUrl, tmpDir);

  try {
    await run('git', args, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`git clone failed for ${repo.cloneUrl}: ${(err.stderr || err.message || '').toString().trim()}`);
  }

  const paths = [];
  const walk = async (dir, prefix = '') => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), rel);
      } else if (entry.isFile()) {
        paths.push(rel);
      }
    }
  };
  await walk(tmpDir);

  return {
    ref: repo.ref || 'HEAD',
    paths,
    readFile: (rel) => fs.readFile(path.join(tmpDir, rel), 'utf8'),
    cleanup: () => fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {}),
    truncated: false
  };
}

/**
 * Ingests a git repository: markdown/docs files plus any OpenAPI spec files.
 */
export async function ingest(input, ctx = {}) {
  const { fetcher, onProgress = () => {}, options = {} } = ctx;
  const repo = parseRepoUrl(input.value);
  const sourceId = input.sourceId || slugify(repo.fullName);
  const maxFiles = parseInt(options.maxFiles, 10) || DEFAULT_MAX_FILES;

  onProgress({ type: 'repo_start', url: repo.webUrl, message: `Reading repository ${repo.fullName}` });

  let listing = null;
  if (repo.host === 'github' || repo.host === 'gitlab') {
    listing = await listRepoFilesViaApi(repo, ctx);
  } else if (fetcher?.capabilities?.canClone) {
    listing = await listRepoFilesViaClone(repo, ctx);
  } else {
    throw new UnsupportedInRuntimeError(
      `Repositories on ${repo.hostname} require a shallow git clone, which the browser cannot perform. ` +
      'Run this source through the DocGen server or the CLI, or use a GitHub / GitLab URL.'
    );
  }

  try {
    let candidates = listing.paths.filter(isIngestibleRepoPath);
    if (repo.subPath) {
      const prefix = `${repo.subPath.replace(/\/$/, '')}/`;
      const scoped = candidates.filter(p => p.startsWith(prefix));
      if (scoped.length > 0) candidates = scoped;
    }

    candidates = prioritizeRepoPaths(candidates);
    const truncatedByCap = candidates.length > maxFiles;
    candidates = candidates.slice(0, maxFiles);

    if (candidates.length === 0) {
      throw new Error(`No markdown or API specification files found in ${repo.fullName}.`);
    }
    if (truncatedByCap || listing.truncated) {
      onProgress({
        type: 'warning',
        message: `${repo.fullName} contains more documentation files than the current limit (${maxFiles}); ingesting the highest-priority ${maxFiles}.`
      });
    }

    const documents = [];
    let processed = 0;

    for (const filePath of candidates) {
      let content;
      try {
        content = await listing.readFile(filePath);
      } catch (err) {
        onProgress({ type: 'page_error', url: `${repo.webUrl}/${filePath}`, error: err.message });
        continue;
      }

      processed++;
      const fileUrl = `${repo.webUrl}/blob/${listing.ref}/${filePath}`;

      if (SPEC_RE.test(filePath)) {
        const spec = parseSpecText(content);
        if (spec) {
          const parsedApi = parseOpenApiSpec(spec, fileUrl);
          documents.push(...openApiToDocuments(parsedApi, fileUrl, { sourceId, timestamp: ctx.timestamp }));
          onProgress({
            type: 'openapi_detected',
            specUrl: fileUrl,
            title: parsedApi.title,
            message: `Found API specification ${filePath} in ${repo.fullName}`
          });
          continue;
        }
        // Not actually a spec - fall through and treat it as a plain file.
      }

      if (!MARKDOWN_RE.test(filePath)) continue;

      documents.push({
        sourceId,
        sourceType: SOURCE_TYPES.GIT,
        url: fileUrl,
        markdown: content,
        section: sectionForRepoPath(filePath),
        isRoot: /^readme\.mdx?$/i.test(filePath),
        author: repo.owner,
        siteName: repo.fullName,
        tags: ['repository', slugify(repo.repo)],
        slugHint: slugify(filePath.replace(MARKDOWN_RE, '').split('/').pop())
      });

      onProgress({
        type: 'page_crawled',
        url: fileUrl,
        depth: 0,
        linksFound: 0,
        pagesCrawled: processed
      });
    }

    return {
      documents,
      meta: {
        sourceId,
        sourceType: SOURCE_TYPES.GIT,
        url: repo.webUrl,
        title: repo.fullName,
        ref: listing.ref,
        filesRead: processed
      }
    };
  } finally {
    if (listing?.cleanup) await listing.cleanup();
  }
}
