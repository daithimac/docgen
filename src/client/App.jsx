import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import CrawlerControl from './components/CrawlerControl.jsx';
import LiveProgress from './components/LiveProgress.jsx';
import BundleExplorer from './components/BundleExplorer.jsx';
import GraphView from './components/GraphView.jsx';
import ExportModal from './components/ExportModal.jsx';
import {
  getStaticDemoBundle,
  downloadZipInBrowser,
  generateBundleInBrowser,
  filesToSourceInputs
} from './services/client-engine.js';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(
    'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro'
  );
  const [isCrawling, setIsCrawling] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [targetMaxPages, setTargetMaxPages] = useState(20);

  const [bundle, setBundle] = useState(null);
  const [activeFilePath, setActiveFilePath] = useState('index.md');

  const [showGraph, setShowGraph] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  // Load sample demo bundle on initial load
  useEffect(() => {
    loadSampleBundle();
  }, []);

  const loadSampleBundle = async () => {
    try {
      const res = await fetch('/api/sample');
      if (res.ok) {
        const data = await res.json();
        setBundle(data);
        setActiveFilePath('index.md');
        return;
      }
    } catch (err) {
      console.warn('Backend sample not reachable, using in-browser static demo:', err);
    }
    // Static fallback for GitHub Pages
    const staticData = getStaticDemoBundle();
    setBundle(staticData);
    setActiveFilePath('index.md');
  };

  const handleStartCrawl = async ({ url, files = [], maxPages, maxDepth, scope, computations, maxFiles, githubToken, splitSections = true }) => {
    const urlList = (url || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const describedInputs = [...urlList, ...files.map((f) => f.name)];

    setIsCrawling(true);
    setProgressLogs([`Starting ingestion for ${describedInputs.length} source(s): ${describedInputs.join(', ')}`]);
    setPagesCrawled(0);
    setTargetMaxPages(maxPages);

    const sessionId = `crawl-${Date.now()}`;
    let eventSource = null;

    try {
      // Connect to SSE stream for live updates
      eventSource = new EventSource(`/api/crawl/stream?sessionId=${sessionId}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'page_crawled') {
            setPagesCrawled(data.pagesCrawled);
            setProgressLogs((prev) => [
              ...prev,
              `Crawled [${data.pagesCrawled}/${maxPages}] depth ${data.depth}: ${data.url}`
            ]);
          } else if (data.type === 'crawling' || data.type === 'fetching') {
            setProgressLogs((prev) => [...prev, `Fetching: ${data.url}`]);
          } else if (data.type === 'source_start' || data.type === 'source_complete' || data.type === 'converting' || data.type === 'cloning') {
            setProgressLogs((prev) => [...prev, `📥 ${data.message}`]);
          } else if (data.type === 'openapi_detected') {
            setProgressLogs((prev) => [...prev, `🧩 ${data.message || `Detected API specification: ${data.title}`}`]);
          } else if (data.type === 'source_error' || data.type === 'warning') {
            setProgressLogs((prev) => [...prev, `⚠️ ${data.message}`]);
          } else if (data.type === 'building_bundle') {
            setProgressLogs((prev) => [...prev, `🔨 Building OKF v0.2 concept files and index trees...`]);
          } else if (data.type === 'validating') {
            setProgressLogs((prev) => [...prev, `🔍 Running OKF v0.2 conformance validation checks...`]);
          } else if (data.type === 'done') {
            setProgressLogs((prev) => [...prev, `✅ ${data.message}`]);
          } else if (data.type === 'error' || data.type === 'page_error') {
            setProgressLogs((prev) => [...prev, `⚠️ Error on ${data.url}: ${data.error}`]);
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn('SSE not available, falling back to direct request:', e);
    }

    const requestOptions = {
      sources: urlList,
      maxPages,
      maxDepth,
      scope,
      computations,
      maxFiles,
      githubToken,
      splitSections,
      sessionId
    };

    try {
      let response;
      if (files.length > 0) {
        // Uploads need multipart, so the options ride along as form fields.
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        Object.entries(requestOptions).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          formData.append(key, Array.isArray(value) ? value.join(',') : String(value));
        });
        response = await fetch('/api/upload', { method: 'POST', body: formData });
      } else {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestOptions)
        });
      }

      if (response.ok) {
        const bundleData = await response.json();
        setBundle(bundleData);
        setActiveFilePath('index.md');
        setProgressLogs((prev) => [
          ...prev,
          ...(bundleData.sourceErrors || []).map((e) => `⚠️ Skipped ${e.source}: ${e.error}`),
          `🎉 Successfully generated ${bundleData.conceptCount} concepts in OKF v0.2 format!`
        ]);
        return;
      }
    } catch (err) {
      console.warn('Backend crawl unavailable, attempting client-side in-browser generation:', err);
    }

    // Client-side fallback for GitHub Pages - same adapters, browser fetcher
    try {
      setProgressLogs((prev) => [...prev, '⚡ Running in browser mode: ingesting sources locally...']);
      const uploads = await filesToSourceInputs(files);
      const clientBundle = await generateBundleInBrowser([...urlList, ...uploads], {
        maxPages,
        maxDepth,
        scope,
        computations,
        maxFiles,
        githubToken,
        splitSections,
        onProgress: (data) => {
          if (data.message) {
            setProgressLogs((prev) => [...prev, data.message]);
          }
          if (data.type === 'page_crawled') {
            setPagesCrawled(data.pagesCrawled);
          }
        }
      });
      setBundle(clientBundle);
      setActiveFilePath('index.md');
      setProgressLogs((prev) => [
        ...prev,
        ...(clientBundle.sourceErrors || []).map((e) => `⚠️ Skipped ${e.source}: ${e.error}`),
        `🎉 Successfully generated ${clientBundle.conceptCount} concepts in OKF v0.2 format (In-Browser)!`
      ]);
    } catch (clientErr) {
      setProgressLogs((prev) => [...prev, `❌ Error: ${clientErr.message}`]);
      alert(`Generation failed: ${clientErr.message}`);
    } finally {
      if (eventSource) {
        eventSource.close();
      }
      setIsCrawling(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!bundle || !bundle.files) return;

    // Derive site name for ZIP filename
    let siteSlug = bundle.bundleName || '';
    if (!siteSlug && bundle.startUrl) {
      try {
        const parsed = new URL(bundle.startUrl);
        const host = parsed.hostname.replace(/^www\./, '');
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const parts = [host, ...pathParts.filter((p) => !['docs', 'doc', 'en'].includes(p))];
        siteSlug = parts
          .join('-')
          .toLowerCase()
          .replace(/[^\w-]/g, '-')
          .replace(/-+/g, '-');
      } catch (e) {}
    }
    if (!siteSlug && bundle.title) {
      siteSlug = bundle.title
        .toLowerCase()
        .replace(/[^\w-]/g, '-')
        .replace(/-+/g, '-');
    }
    if (!siteSlug) {
      siteSlug = 'okf-knowledge-bundle';
    }

    const zipFilename = `${siteSlug}-okf.zip`;

    try {
      const response = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: bundle.files,
          bundleName: `${siteSlug}-okf`
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = zipFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return;
      }
    } catch (err) {
      console.warn('Backend download endpoint not reachable, falling back to client JSZip:', err);
    }

    // In-browser fallback for GitHub Pages
    try {
      await downloadZipInBrowser(bundle.files, `${siteSlug}-okf`);
    } catch (clientZipErr) {
      alert(`Download failed: ${clientZipErr.message}`);
    }
  };

  const handleExportDisk = async (targetDir) => {
    if (!bundle || !bundle.files) return;
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-disk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: bundle.files,
          targetDir
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Disk export failed');

      setExportResult(data);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-container">
      <Header />

      <CrawlerControl
        onStartCrawl={handleStartCrawl}
        onLoadSample={loadSampleBundle}
        isCrawling={isCrawling}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrl}
      />

      <LiveProgress
        progressLogs={progressLogs}
        isCrawling={isCrawling}
        pagesCrawled={pagesCrawled}
        maxPages={targetMaxPages}
      />

      <BundleExplorer
        bundle={bundle}
        activeFilePath={activeFilePath}
        setActiveFilePath={setActiveFilePath}
        onOpenGraph={() => setShowGraph(true)}
        onDownloadZip={handleDownloadZip}
        onExportDisk={() => {
          setExportResult(null);
          setShowExportModal(true);
        }}
      />

      {showGraph && bundle?.graph && (
        <GraphView
          graphData={bundle.graph}
          onClose={() => setShowGraph(false)}
          onSelectConcept={(path) => {
            setActiveFilePath(path);
            setShowGraph(false);
          }}
        />
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onConfirmExport={handleExportDisk}
          isExporting={isExporting}
          exportResult={exportResult}
          defaultBundleName={bundle?.bundleName || 'bigquery-elt-okf'}
        />
      )}
    </div>
  );
}
