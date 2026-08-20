#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { generateBundle } from '../src/core/pipeline.js';
import { createNodeFetcher } from '../src/core/http.js';
import { describeSources, splitSourceList, SOURCE_TYPE_LABELS } from '../src/core/sources/registry.js';
import { saveBundleToDisk } from '../src/core/exporter.js';

const program = new Command();

/**
 * Expands raw CLI arguments into source descriptors, reading any local file
 * paths off disk so they route through the upload adapter.
 */
function resolveInputs(rawValues) {
  const inputs = [];

  for (const value of splitSourceList(rawValues)) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^git@/i.test(value)) {
      inputs.push(value);
      continue;
    }

    const candidate = path.resolve(value);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      inputs.push({
        type: 'upload',
        name: path.basename(candidate),
        value: { name: path.basename(candidate), data: fs.readFileSync(candidate) }
      });
      continue;
    }

    inputs.push(value);
  }

  return inputs;
}

program
  .name('docgen')
  .description('Ingest documentation from web pages, API specs, git repositories, markdown and documents, and generate Open Knowledge Format (OKF v0.2) bundles')
  .version('0.3.0')
  .option('-s, --source <sources...>', 'Documentation sources: URLs, OpenAPI specs, git repos, markdown URLs, or local .docx/.md/.txt/.pdf files')
  .option('-u, --url <urls...>', 'Alias for --source (kept for backwards compatibility)')
  .option('-o, --out <directory>', 'Output directory for generated OKF bundle', './okf-bundle')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl per web source (0 = unlimited)', '25')
  .option('-d, --max-depth <number>', 'Maximum crawl depth (0 = unlimited)', '3')
  .option('-f, --max-files <number>', 'Maximum documentation files to read per repository (0 = unlimited)', '100')
  .option('--unlimited', 'Remove every ingestion cap: pages, depth, files per repository and sections per document')
  .option('-c, --read-concurrency <number>', 'Files fetched in parallel per repository', '8')
  .option('--fetch-mode <mode>', 'Repository access: auto | clone | api', 'auto')
  .option('--scope <scope>', 'Crawl scope: subtree | domain', 'subtree')
  .option('--github-token <token>', 'GitHub / GitLab token used to raise API rate limits (defaults to $GITHUB_TOKEN)')
  .option('--no-split', 'Keep each source document as a single concept instead of splitting catalogue-style documents by section')
  .option('--min-sections <number>', 'Sections a document needs before it is split into separate concepts', '3')
  .option('--max-sections <number>', 'Above this many sections a document is left whole (0 = unlimited)', '50')
  .option('--no-computations', 'Disable extraction of Attested Computations')
  .action(async (options) => {
    const rawValues = [...(options.source || []), ...(options.url || [])];
    if (rawValues.length === 0) {
      console.error('\n❌ At least one source is required. Use --source <url|repo|file> (or --url).\n');
      process.exit(1);
    }

    // --unlimited is a convenience over the individual caps, all of which take 0.
    const limits = options.unlimited
      ? { maxPages: '0', maxDepth: '0', maxFiles: '0', maxSections: '0' }
      : {
          maxPages: options.maxPages,
          maxDepth: options.maxDepth,
          maxFiles: options.maxFiles,
          maxSections: options.maxSections
        };
    const describeLimit = (v) => (String(v) === '0' ? 'unlimited' : String(v));

    const inputs = resolveInputs(rawValues);
    const described = describeSources(inputs);

    console.log('\n======================================================');
    console.log('   OKF Documentation Bundle Generator (v0.2)');
    console.log('======================================================\n');
    console.log('Sources:');
    described.forEach(src => {
      console.log(`   - [${(SOURCE_TYPE_LABELS[src.type] || src.type).padEnd(22)}] ${src.value}`);
    });
    console.log(`\nOutput Dir:    ${path.resolve(options.out)}`);
    console.log(`Max Pages:     ${describeLimit(limits.maxPages)}`);
    console.log(`Max Depth:     ${describeLimit(limits.maxDepth)}`);
    console.log(`Max Files/Repo:${describeLimit(limits.maxFiles)}`);
    console.log(`Concurrency:   ${options.readConcurrency}`);
    console.log(`Fetch Mode:    ${options.fetchMode}`);
    console.log(`Scope:         ${options.scope}`);
    console.log(`Section split: ${options.split ? `on (>= ${options.minSections} sections, max ${describeLimit(limits.maxSections)})` : 'off'}\n`);

    try {
      console.log('🕷️  Ingesting sources...');

      const payload = await generateBundle(inputs, {
        fetcher: createNodeFetcher(),
        maxPages: limits.maxPages,
        maxDepth: limits.maxDepth,
        maxFiles: limits.maxFiles,
        readConcurrency: options.readConcurrency,
        fetchMode: options.fetchMode,
        filesAs: 'map',
        scope: options.scope,
        githubToken: options.githubToken || process.env.GITHUB_TOKEN || '',
        computations: options.computations,
        splitSections: options.split,
        minSections: options.minSections,
        maxSections: limits.maxSections,
        onProgress: (p) => {
          if (p.type === 'source_start') {
            console.log(`\n   ▸ ${p.message}`);
          } else if (p.type === 'page_crawled') {
            console.log(`     [${p.pagesCrawled}] depth ${p.depth} -> ${p.url}`);
          } else if (p.type === 'openapi_detected') {
            console.log(`     Detected API specification: ${p.title}`);
          } else if (p.type === 'cloning' || p.type === 'info') {
            console.log(`     ${p.message}`);
          } else if (p.type === 'page_error') {
            console.warn(`     [Warning] Failed to read ${p.url}: ${p.error}`);
          } else if (p.type === 'warning') {
            console.warn(`     [Warning] ${p.message}`);
          } else if (p.type === 'source_error') {
            console.warn(`   ⚠️  ${p.message}`);
          } else if (p.type === 'building_bundle' || p.type === 'validating') {
            console.log(`\n📦 ${p.message}`);
          }
        }
      });

      console.log('\n✅ Ingestion complete. Per-source summary:');
      payload.sources.forEach(src => {
        console.log(`   - ${(SOURCE_TYPE_LABELS[src.sourceType] || src.sourceType).padEnd(22)} ${src.input}: ${src.documentCount} document(s)`);
      });
      if (payload.sourceErrors.length > 0) {
        console.warn('\n⚠️  Sources that could not be ingested:');
        payload.sourceErrors.forEach(e => console.warn(`   - ${e.source}: ${e.error}`));
      }
      if (payload.warnings && payload.warnings.length > 0) {
        console.warn('\n⚠️  THIS BUNDLE IS INCOMPLETE:');
        payload.warnings.forEach(w => console.warn(`   - ${w}`));
      }

      const filePaths = payload.files instanceof Map
        ? Array.from(payload.files.keys())
        : Object.keys(payload.files);
      console.log(`\n   Created ${filePaths.length} bundle files across ${payload.folderCount} directories.`);

      console.log('\n🔍 OKF v0.2 Conformance Rules (§11):');
      if (payload.validation.isValid) {
        console.log('   🎉 OKF v0.2 Conformance: 100% PASS!');
      } else {
        console.warn('   ⚠️ OKF Conformance Warnings/Errors:');
        payload.validation.errors.forEach(e => console.error(`     - ${e}`));
      }

      console.log(`\n💾 Writing bundle files to disk at ${options.out}...`);
      const exportRes = await saveBundleToDisk(payload.files, options.out);
      console.log(`   Successfully wrote ${exportRes.filesCount} files to: ${exportRes.targetDir}\n`);

      // Listing every path is useful for a small bundle and noise for a large one.
      const LISTING_LIMIT = 60;
      console.log('Summary of generated concepts:');
      filePaths.slice(0, LISTING_LIMIT).forEach(relPath => console.log(`   - ${relPath}`));
      if (filePaths.length > LISTING_LIMIT) {
        console.log(`   ...and ${filePaths.length - LISTING_LIMIT} more (see ${path.resolve(options.out)}).`);
      }

      if (payload.warnings && payload.warnings.length > 0) {
        console.warn(`\n⚠️  Bundle generated, but INCOMPLETE - ${payload.warnings.length} warning(s) above.\n`);
      } else {
        console.log('\n✨ Bundle generation finished successfully!\n');
      }
    } catch (err) {
      console.error('\n❌ Error during bundle generation:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
