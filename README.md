# DocGen - Open Knowledge Format (OKF v0.2) Bundle Generator

DocGen is an autonomous documentation scraper, knowledge extractor, and **Open Knowledge Format (OKF v0.2)** bundle generator. Given a documentation URL (e.g. Google Cloud BigQuery docs, FastAPI, Docusaurus, etc.), DocGen traverses the topic tree and referenced sub-links, extracts structured technical concepts, and outputs fully conformant OKF v0.2 knowledge bundles.

---

## Key Features

1. **Section-Aware Crawler & Link Traversal**:
   - Discovers and prioritizes documentation hierarchies, active navigation subtrees, and in-article references (such as *Migrate data*, *Load data*, *Transform data*, *Export data*).
   - Intelligently follows internal documentation paths while filtering out external sites and media assets.
   - Configurable depth, maximum page limit, and crawl scope (subtree vs. domain).

2. **Full OKF v0.2 Specification Compliance**:
   - **Bundle Root & Subdirectory Indexes**: Generates root `index.md` with `okf_version: "0.2"` and progressive-disclosure sections, plus nested `index.md` files for subdirectories.
   - **Update Logs (`log.md`)**: Generates ISO 8601 dated changelog entries with creation and verification provenance.
   - **Rich Frontmatter Metadata**: Includes mandatory `type` (`Overview`, `Guide`, `Reference`, `Playbook`, `Attested Computation`), `title`, `description`, canonical `resource`, `tags`, `status: stable`, `generated: { by, at }`, `verified: { by, at }`, and `sources: [...]` with credibility signals.
   - **Source Footnotes & Provenance**: Attaches inline source-keyed footnotes (`[^source-id]`) matching frontmatter provenance entries.
   - **Bundle-Relative Cross-Linking**: Automatically transforms crawled web hyperlinks into bundle-relative markdown paths (e.g., `[Loading Data](/load-data/loading-data.md)`).
   - **Attested Computations**: Automatically extracts executable SQL queries and code snippets into standalone `type: Attested Computation` concepts with defined `runtime` and `parameters`.

3. **Interactive Web Application & UI**:
   - Glassmorphic, dark-mode design with real-time SSE crawl streaming monitor.
   - Split-pane OKF Bundle Explorer (hierarchical File Tree + Frontmatter Inspector badges + Rendered Markdown preview + Raw YAML/Markdown toggle).
   - Interactive Concept Relationship Graph (dynamic canvas-based node-link diagram).
   - Live OKF v0.2 Conformance Test Suite with pass/fail diagnostic checks.
   - 1-Click ZIP Download and Local Disk Export.

4. **Headless CLI Tool**:
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

Run the `docgen` CLI command to crawl a documentation website and write the OKF bundle to disk:

```bash
# Basic usage
node bin/docgen.js --url https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro --out ./bundles/bigquery-elt

# With options
node bin/docgen.js \
  --url https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro \
  --out ./bundles/bigquery-elt \
  --max-pages 25 \
  --max-depth 3 \
  --scope subtree
```

### CLI Options:
| Flag | Description | Default |
| --- | --- | --- |
| `-u, --url <url>` | Target documentation starting URL | *(Required)* |
| `-o, --out <path>` | Output directory path | `./okf-bundle` |
| `-p, --max-pages <n>` | Maximum pages to crawl | `25` |
| `-d, --max-depth <n>` | Maximum link depth | `3` |
| `-s, --scope <scope>` | Crawl boundary (`subtree` or `domain`) | `subtree` |
| `--no-computations` | Disable Attested Computation extraction | `false` |

---

## Serving on GitHub Pages

The application is fully configured to run as a static GitHub Pages site:
* **Relative Base Paths**: `vite.config.js` sets `base: './'`, ensuring assets resolve correctly under any repository path prefix (`https://<username>.github.io/<repo>/`).
* **Standalone In-Browser Engine**: Runs OpenAPI/Swagger parsing, bundle structure assembly, progressive disclosure rendering, and ZIP downloads directly in the browser via `JSZip`.
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
