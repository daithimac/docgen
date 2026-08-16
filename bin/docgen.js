#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { DocumentationCrawler } from '../src/core/crawler.js';
import { OKFBundleBuilder } from '../src/core/okf-builder.js';
import { buildOKFBundleFromOpenApi } from '../src/core/openapi-parser.js';
import { validateOKFBundle } from '../src/core/validator.js';
import { saveBundleToDisk } from '../src/core/exporter.js';

const program = new Command();

program
  .name('docgen')
  .description('Crawl documentation and generate Open Knowledge Format (OKF v0.2) bundles')
  .version('0.2.0')
  .requiredOption('-u, --url <urls...>', 'Base documentation or API URL(s) to crawl (comma or space separated)')
  .option('-o, --out <directory>', 'Output directory for generated OKF bundle', './okf-bundle')
  .option('-p, --max-pages <number>', 'Maximum pages to crawl', '25')
  .option('-d, --max-depth <number>', 'Maximum crawl depth', '3')
  .option('-s, --scope <scope>', 'Crawl scope: subtree | domain', 'subtree')
  .option('--no-computations', 'Disable extraction of Attested Computations')
  .action(async (options) => {
    // Flatten array of URLs and comma-separated tokens
    const rawUrls = Array.isArray(options.url) ? options.url.join(',') : options.url;
    const targetUrls = rawUrls.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

    console.log('\n======================================================');
    console.log('   OKF Documentation Bundle Generator (v0.2)');
    console.log('======================================================\n');
    console.log(`Target URL(s): ${targetUrls.join('\n               ')}`);
    console.log(`Output Dir:    ${path.resolve(options.out)}`);
    console.log(`Max Pages:     ${options.maxPages}`);
    console.log(`Max Depth:     ${options.maxDepth}`);
    console.log(`Scope:         ${options.scope}\n`);

    try {
      // 1. Crawler
      console.log('🕷️  Starting documentation crawler...');
      const crawler = new DocumentationCrawler({
        maxPages: parseInt(options.maxPages, 10),
        maxDepth: parseInt(options.maxDepth, 10),
        scope: options.scope,
        onProgress: (p) => {
          if (p.type === 'page_crawled') {
            console.log(`   [Crawled ${p.pagesCrawled}] Depth ${p.depth} -> ${p.url} (${p.linksFound} links found)`);
          } else if (p.type === 'page_error') {
            console.warn(`   [Warning] Failed to fetch ${p.url}: ${p.error}`);
          }
        }
      });

      const crawlResult = await crawler.crawl(targetUrls);
      console.log(`\n✅ Crawl complete: ${crawlResult.pages.length} pages collected.`);

      // 2. Build OKF Bundle
      console.log('\n📦 Transforming content into OKF v0.2 Bundle...');
      let bundle;
      if (crawlResult.isOpenApi) {
        console.log(`   Detected OpenAPI/Swagger Specification: ${crawlResult.openApiData.title} (v${crawlResult.openApiData.version})`);
        bundle = buildOKFBundleFromOpenApi(crawlResult.openApiData, crawlResult.startUrl, {
          actor: 'docgen/okf-api-parser-v0.2'
        });
      } else {
        const builder = new OKFBundleBuilder({
          includeAttestedComputations: options.computations,
          bundleTitle: 'Documentation Knowledge Bundle'
        });
        bundle = builder.buildBundle(crawlResult);
      }
      console.log(`   Created ${bundle.files.size} bundle files across ${bundle.folderCount} directories.`);

      // 3. Validate
      console.log('\n🔍 Validating against OKF v0.2 Conformance Rules (§11)...');
      const validation = validateOKFBundle(bundle.files);
      if (validation.isValid) {
        console.log('   🎉 OKF v0.2 Conformance: 100% PASS!');
      } else {
        console.warn('   ⚠️ OKF Conformance Warnings/Errors:');
        validation.errors.forEach(e => console.error(`     - ${e}`));
      }

      // 4. Save to disk
      console.log(`\n💾 Writing bundle files to disk at ${options.out}...`);
      const exportRes = await saveBundleToDisk(bundle.files, options.out);
      console.log(`   Successfully wrote ${exportRes.filesCount} files to: ${exportRes.targetDir}\n`);

      console.log('Summary of generated concepts:');
      for (const [relPath] of bundle.files.entries()) {
        console.log(`   - ${relPath}`);
      }

      console.log('\n✨ Bundle generation finished successfully!\n');
    } catch (err) {
      console.error('\n❌ Error during bundle generation:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
