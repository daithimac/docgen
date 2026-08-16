import React, { useState } from 'react';
import { Globe, ArrowRight, Settings2, Sparkles, Layers, Sliders, Play, RefreshCw } from 'lucide-react';

const PRESETS = [
  {
    name: 'Multi-Site: BigQuery ELT + Dataform',
    url: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro, https://docs.cloud.google.com/dataform/docs/overview',
    description: 'Combined BigQuery Data Integration & Dataform pipelines'
  },
  {
    name: 'Oireachtas Open Data APIs',
    url: 'https://api.oireachtas.ie/',
    description: 'Houses of the Oireachtas Open Data REST APIs & Swagger Specification'
  },
  {
    name: 'BigQuery ELT / ETL Intro',
    url: 'https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro',
    description: 'Migrate, Load, Transform, and Export documentation sections'
  },
  {
    name: 'BigQuery Dataform Guide',
    url: 'https://docs.cloud.google.com/dataform/docs/overview',
    description: 'Dataform SQL workflows and transformation pipelines'
  },
  {
    name: 'FastAPI Tutorial',
    url: 'https://fastapi.tiangolo.com/tutorial/',
    description: 'Python API framework documentation tree'
  }
];

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
  const [scope, setScope] = useState('subtree');
  const [extractComputations, setExtractComputations] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentUrl || isCrawling) return;
    onStartCrawl({
      url: currentUrl,
      maxPages,
      maxDepth,
      scope,
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

      {/* Main URL Input Row */}
      <form onSubmit={handleSubmit} className="url-input-row">
        <div className="url-input-wrapper">
          <Globe className="url-input-icon" size={18} />
          <input
            type="text"
            className="url-input"
            placeholder="Enter one or more documentation / API URLs separated by commas (e.g. https://site1.com/docs, https://site2.com/docs)..."
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            required
            disabled={isCrawling}
          />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Toggle Crawler Settings"
        >
          <Settings2 size={16} />
          <span>Options</span>
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={isCrawling || !currentUrl}
        >
          {isCrawling ? (
            <>
              <RefreshCw size={16} className="spin" />
              <span>Crawling...</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Generate OKF Bundle</span>
            </>
          )}
        </button>
      </form>

      {/* Advanced Options Bar */}
      {showAdvanced && (
        <div className="options-row">
          <div className="option-item">
            <label>
              <span>Max Pages to Crawl</span>
              <strong>{maxPages}</strong>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
              disabled={isCrawling}
            />
          </div>

          <div className="option-item">
            <label>
              <span>Max Link Depth</span>
              <strong>{maxDepth}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
              disabled={isCrawling}
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
        </div>
      )}
    </div>
  );
}
