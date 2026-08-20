import React, { useState, useMemo, useRef } from 'react';
import { Globe, Settings2, Sparkles, Play, RefreshCw, Upload, X, FileText } from 'lucide-react';
import { describeSources } from '../services/client-engine.js';

const PRESETS = [
  {
    name: 'Multi-Site: BigQuery ELT + Dataform',
    url: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro, https://docs.cloud.google.com/dataform/docs/overview',
    description: 'Combined BigQuery Data Integration & Dataform pipelines'
  },
  {
    name: 'Oireachtas Open Data APIs',
    url: 'https://api.oireachtas.ie/swagger.json',
    description: 'Houses of the Oireachtas Open Data REST APIs & Swagger Specification'
  },
  {
    name: 'GitHub Repo: FastAPI',
    url: 'https://github.com/tiangolo/fastapi',
    description: 'Markdown docs and API specs read straight from a git repository'
  },
  {
    name: 'Markdown Page: Node.js README',
    url: 'https://raw.githubusercontent.com/nodejs/node/main/README.md',
    description: 'A single standalone markdown document'
  },
  {
    name: 'Mixed: Docs + API + Repo',
    url: 'https://fastapi.tiangolo.com/tutorial/, https://api.oireachtas.ie/swagger.json, https://github.com/tiangolo/fastapi',
    description: 'Heterogeneous sources merged into one knowledge bundle'
  }
];

const TYPE_CHIP_LABELS = {
  webpage: 'Web',
  openapi: 'API Spec',
  git: 'Git Repo',
  markdown: 'Markdown',
  upload: 'Document'
};

const ACCEPTED_UPLOADS = '.docx,.md,.mdx,.markdown,.txt,.pdf';

export default function CrawlerControl({
  onStartCrawl,
  onLoadSample,
  isCrawling,
  currentUrl,
  setCurrentUrl
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxFiles, setMaxFiles] = useState(100);
  const [scope, setScope] = useState('subtree');
  const [githubToken, setGithubToken] = useState('');
  const [extractComputations, setExtractComputations] = useState(true);
  const [splitSections, setSplitSections] = useState(true);
  const [unlimited, setUnlimited] = useState(false);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Resolved source types, shown before a run so the user can confirm the
  // detector agrees with their intent.
  const detected = useMemo(() => {
    if (!currentUrl || !currentUrl.trim()) return [];
    try {
      return describeSources(currentUrl);
    } catch (e) {
      return [];
    }
  }, [currentUrl]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !names.has(f.name))];
    });
  };

  const removeFile = (name) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isCrawling) return;
    if (!currentUrl?.trim() && files.length === 0) return;

    onStartCrawl({
      url: currentUrl,
      files,
      maxPages,
      maxDepth,
      maxFiles,
      scope,
      githubToken,
      splitSections,
      unlimited,
      computations: extractComputations
    });
  };

  return (
    <div className="control-bar glass-panel">
      {/* Preset Buttons */}
      <div className="presets-row">
        <span className="preset-label">Quick Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className={`preset-pill ${currentUrl === preset.url ? 'active' : ''}`}
            onClick={() => setCurrentUrl(preset.url)}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
        <button
          type="button"
          className="btn-secondary"
          style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: '11px' }}
          onClick={onLoadSample}
          disabled={isCrawling}
        >
          <Sparkles size={12} /> Load Instant Demo Bundle
        </button>
      </div>

      {/* Main Source Input Row */}
      <form onSubmit={handleSubmit} className="url-input-row">
        <div className="url-input-wrapper">
          <Globe className="url-input-icon" size={18} />
          <input
            type="text"
            className="url-input"
            placeholder="Documentation URLs, OpenAPI specs, git repos, markdown pages or Google Docs links, separated by commas..."
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            disabled={isCrawling}
          />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCrawling}
          title="Upload Word, Markdown, text or PDF documents"
        >
          <Upload size={16} />
          <span>Upload</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Toggle Ingestion Settings"
        >
          <Settings2 size={16} />
          <span>Options</span>
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={isCrawling || (!currentUrl?.trim() && files.length === 0)}
        >
          {isCrawling ? (
            <>
              <RefreshCw size={16} className="spin" />
              <span>Ingesting...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Generate OKF Bundle</span>
            </>
          )}
        </button>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_UPLOADS}
        style={{ display: 'none' }}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Resolved source types */}
      {detected.length > 0 && (
        <div className="source-chips-row">
          {detected.map((src, i) => (
            <span key={`${src.value}-${i}`} className={`source-chip source-chip-${src.type}`} title={src.label}>
              <strong>{TYPE_CHIP_LABELS[src.type] || src.type}</strong>
              <span className="source-chip-value">{src.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      <div
        className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={14} />
        <span>
          Drop Word (.docx), Markdown, text or PDF documents here, or click to browse.
          Google Docs: paste a "Anyone with the link" share URL above.
        </span>
      </div>

      {files.length > 0 && (
        <div className="uploaded-files-row">
          {files.map((file) => (
            <span key={file.name} className="source-chip source-chip-upload">
              <FileText size={12} />
              <span className="source-chip-value">{file.name}</span>
              <button
                type="button"
                className="chip-remove"
                onClick={() => removeFile(file.name)}
                disabled={isCrawling}
                aria-label={`Remove ${file.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Advanced Options Bar */}
      {showAdvanced && (
        <div className="options-row">
          <div className="option-item">
            <label>
              <span>Max Pages per Web Source</span>
              <strong>{unlimited ? 'unlimited' : maxPages}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
              disabled={isCrawling || unlimited}
            />
          </div>

          <div className="option-item">
            <label>
              <span>Max Link Depth</span>
              <strong>{unlimited ? 'unlimited' : maxDepth}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
              disabled={isCrawling || unlimited}
            />
          </div>

          <div className="option-item">
            <label>
              <span>Max Files per Repository</span>
              <strong>{unlimited ? 'unlimited' : maxFiles}</strong>
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={maxFiles}
              onChange={(e) => setMaxFiles(parseInt(e.target.value, 10))}
              disabled={isCrawling || unlimited}
            />
          </div>

          <div className="option-item">
            <label>
              <span>Crawl Boundary Scope</span>
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={isCrawling}
            >
              <option value="subtree">Subtree / Section Root (Recommended)</option>
              <option value="domain">Entire Documentation Domain</option>
            </select>
          </div>

          <div className="option-item">
            <label>
              <span>GitHub / GitLab Token (optional)</span>
            </label>
            <input
              type="password"
              placeholder="Raises API rate limits. Never stored."
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              disabled={isCrawling}
              autoComplete="off"
            />
          </div>

          <div className="option-item" style={{ justifyContent: 'center' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={extractComputations}
                onChange={(e) => setExtractComputations(e.target.checked)}
                disabled={isCrawling}
              />
              <span>Extract Attested Computations (SQL/Code)</span>
            </label>
          </div>

          <div className="option-item" style={{ justifyContent: 'center' }}>
            <label
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              title="Ingest everything found, with no ceiling on pages, depth, files per repository or sections per document. Large repositories are cloned rather than fetched file by file."
            >
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
                disabled={isCrawling}
              />
              <span>Remove all ingestion limits</span>
            </label>
          </div>

          <div className="option-item" style={{ justifyContent: 'center' }}>
            <label
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              title="A document listing several sections becomes one concept per section, in a directory named after the document."
            >
              <input
                type="checkbox"
                checked={splitSections}
                onChange={(e) => setSplitSections(e.target.checked)}
                disabled={isCrawling}
              />
              <span>Split multi-section documents into separate concepts</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
