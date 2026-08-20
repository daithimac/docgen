# DocGen - Open Knowledge Format (OKF v0.2) Bundle Generator

DocGen is an autonomous documentation ingester, knowledge extractor, and **Open Knowledge Format (OKF v0.2)** bundle generator. Point it at documentation sites, API specifications, git repositories, markdown pages, or uploaded Word/PDF documents, and it extracts structured technical concepts and outputs fully conformant OKF v0.2 knowledge bundles.

---

## Supported Sources

Sources are detected automatically - paste any mix of them, comma or newline separated, and they merge into a single bundle organized by shared topic folders.

| Source | Examples | Notes |
| --- | --- | --- |
| **Documentation sites** | `https://docs.cloud.google.com/bigquery/docs/...` | Section-aware crawl with configurable depth, page limit and scope |
| **Generic web pages** | any HTTP(S) page | Set *Max Pages* to 1 to ingest a single article without traversal |
| **OpenAPI / Swagger** | `.../swagger.json`, `.../openapi.yaml`, a SwaggerUI or Redoc page | v2 and v3, JSON or YAML; endpoints and schemas become concepts |
| **Git repositories** | `https://github.com/owner/repo`, `https://gitlab.com/group/project`, `git@host:owner/repo.git`, `https://host/owner/repo.git` | Reads `README`, `*.md`/`*.mdx` and any detected API spec files. GitHub/GitLab use their REST API; other hosts use a shallow `git clone` |
| **Markdown pages** | `https://raw.githubusercontent.com/.../README.md`, GitHub `/blob/` URLs | Frontmatter, headings and fenced code are all preserved |
| **Uploaded documents** | `.docx`, `.md`, `.mdx`, `.txt`, `.pdf` | Drag and drop in the UI, `--source ./path/to/file.docx` on the CLI, or `POST /api/upload` |
| **Google Docs** | `https://docs.google.com/document/d/<id>/edit` | Requires link sharing set to "Anyone with the link" - the doc is exported as `.docx`. No OAuth involved |

### Runtime parity and its one limitation

Every source type runs in all three entry points - the Node server, the CLI, and the standalone in-browser engine used by the GitHub Pages build. The browser uses a CORS-proxy fallback for cross-origin fetches.

The single exception: a shallow `git clone` cannot run in a browser. Repositories on hosts other than GitHub and GitLab therefore need the DocGen server or CLI; the static build reports this explicitly rather than failing silently. GitHub and GitLab repositories work everywhere, because they are read through their REST APIs.

Public GitHub/GitLab API access is rate limited. Supply a token via the **GitHub / GitLab Token** field in the UI, `--github-token` on the CLI, or the `GITHUB_TOKEN` environment variable to raise the limit. Tokens are never persisted.

---

## Key Features

1. **Pluggable Source Adapters**:
   - Each source type is a self-contained adapter in `src/core/sources/` producing one normalized document shape; the bundle builder is entirely source-agnostic.
   - Heterogeneous sources merge into shared topic directories, with collision-safe filenames (a second `guides/install.md` becomes `guides/install-<source>.md`).
   - The root `index.md` and `log.md` record every contributing source and its type.

2. **Section-Aware Crawler & Link Traversal**:
   - Discovers and prioritizes documentation hierarchies, active navigation subtrees, and in-article references (such as *Migrate data*, *Load data*, *Transform data*, *Export data*).
   - Intelligently follows internal documentation paths while filtering out external sites and media assets.
   - Configurable depth, maximum page limit, and crawl scope (subtree vs. domain).

3. **Full OKF v0.2 Specification Compliance**:
   - **Bundle Root & Subdirectory Indexes**: Generates root `index.md` with `okf_version: "0.2"` and progressive-disclosure sections, plus nested `index.md` files for subdirectories.
   - **Update Logs (`log.md`)**: Generates ISO 8601 dated changelog entries with creation and verification provenance.
   - **Rich Frontmatter Metadata**: Includes mandatory `type` (`Overview`, `Guide`, `Reference`, `Playbook`, `Attested Computation`), `title`, `description`, canonical `resource`, `tags`, `status: stable`, `generated: { by, at }`, `verified: { by, at }`, and `sources: [...]` with credibility signals.
   - **Source Footnotes & Provenance**: Attaches inline source-keyed footnotes (`[^source-id]`) matching frontmatter provenance entries.
   - **Bundle-Relative Cross-Linking**: Automatically transforms crawled web hyperlinks into bundle-relative markdown paths (e.g., `[Loading Data](/load-data/loading-data.md)`).
   - **Attested Computations**: Automatically extracts executable SQL queries and code snippets into standalone `type: Attested Computation` concepts with defined `runtime` and `parameters`.

4. **Interactive Web Application & UI**:
   - Glassmorphic, dark-mode design with real-time SSE crawl streaming monitor.
   - Split-pane OKF Bundle Explorer (hierarchical File Tree + Frontmatter Inspector badges + Rendered Markdown preview + Raw YAML/Markdown toggle).
   - Interactive Concept Relationship Graph (dynamic canvas-based node-link diagram).
   - Live OKF v0.2 Conformance Test Suite with pass/fail diagnostic checks.
   - 1-Click ZIP Download and Local Disk Export.

5. **Headless CLI Tool**:
   - Run directly from the terminal or in CI/CD pipelines to crawl and generate bundles to any target directory.

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18 (Node.js 23 recommended)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Web Application
Start both the backend API server and the frontend UI:
```bash
# Terminal 1: Backend API server (runs on port 3001)
npm start

# Terminal 2: Vite Frontend (runs on port 3000)
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## Using the CLI

### Mixing source types in one bundle
Pass any combination of URLs, repositories and local files:
```bash
node bin/docgen.js \
  --source "https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro" \
           "https://github.com/anthropics/anthropic-sdk-typescript" \
           "https://api.oireachtas.ie/swagger.json" \
           ./runbooks/incident-response.docx \
  --out ./bundles/platform-knowledge
```
* **Automatic detection**: each source is classified and routed to its adapter; the resolved type is printed before the run starts.
* **Unified Knowledge Corpus**: all sources merge into shared topic directories with a single progressive-disclosure `index.md`.
* **Resilient**: a source that fails is reported and skipped, and the remaining sources still produce a bundle.

### CLI Options:
| Flag | Description | Default |
| --- | --- | --- |
| `-s, --source <sources...>` | Documentation URLs, API specs, git repos, markdown URLs, or local `.docx`/`.md`/`.txt`/`.pdf` files | *(Required)* |
| `-u, --url <urls...>` | Alias for `--source`, kept for backwards compatibility | |
| `-o, --out <path>` | Output directory path | `./okf-bundle` |
| `-p, --max-pages <n>` | Maximum pages to crawl per web source | `25` |
| `-d, --max-depth <n>` | Maximum link depth | `3` |
| `-f, --max-files <n>` | Maximum documentation files to read per repository | `100` |
| `--scope <scope>` | Crawl boundary (`subtree` or `domain`) | `subtree` |
| `--github-token <token>` | Token used to raise GitHub/GitLab API rate limits | `$GITHUB_TOKEN` |
| `--no-computations` | Disable Attested Computation extraction | `false` |

---

## HTTP API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/generate` | Canonical multi-source generation. Body: `{ sources, maxPages, maxDepth, scope, maxFiles, githubToken, computations, sessionId }` |
| `POST /api/upload` | Same as above, as `multipart/form-data` with `files` attached (25 MB per file) |
| `POST /api/describe-sources` | Classifies inputs without fetching - drives the UI's source-type chips |
| `POST /api/crawl` | Legacy alias for `/api/generate` |
| `GET /api/crawl/stream?sessionId=` | Server-sent events stream of ingestion progress |
| `POST /api/validate` | Validate an arbitrary OKF bundle |
| `POST /api/download-zip` | Download a bundle as a ZIP |
| `POST /api/export-disk` | Write a bundle to a local directory |

---

## Serving on GitHub Pages

The application is fully configured to run as a static GitHub Pages site:
* **Relative Base Paths**: `vite.config.js` sets `base: './'`, ensuring assets resolve correctly under any repository path prefix (`https://<username>.github.io/<repo>/`).
* **Standalone In-Browser Engine**: Runs the full ingestion pipeline - every source adapter, bundle assembly, conformance validation and ZIP download - directly in the browser, with no backend. See the parity note above for the one `git clone` limitation.
* **Automated CI/CD**: Includes [.github/workflows/deploy.yml](.github/workflows/deploy.yml) which automatically builds and deploys the site whenever you push to `main`.

### Enabling GitHub Pages on your repository:
1. Push your repository to GitHub.
2. In your GitHub repository, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Push to `main` (or run the workflow manually under the **Actions** tab). Your OKF Generator website will be live at `https://<username>.github.io/<repo>/`!

---

## Example Generated OKF Bundle Hierarchy

```text
bundles/bigquery-elt/
├── index.md                                      # Root progressive-disclosure index with okf_version: "0.2"
├── log.md                                        # Update history with ISO 8601 dates
├── overview.md                                   # Root overview concept
├── load-data/
│   ├── index.md                                  # Load Data section index
│   ├── loading-data.md                           # Concept document
│   └── load-data-console.md
├── transform-data/
│   ├── index.md                                  # Transform Data section index
│   ├── pipelines-introduction.md
│   └── data-prep-introduction.md
├── export-data/
│   ├── index.md                                  # Export Data section index
│   └── export-intro.md
├── migrate-data/
│   ├── index.md                                  # Migrate Data section index
│   └── migration-intro.md
└── computations/
    ├── index.md                                  # Attested Computations index
    └── comp-load-and-query-data.md               # Attested Computation (runtime: bigquery)
```
