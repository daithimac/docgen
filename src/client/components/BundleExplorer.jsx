import React, { useState } from 'react';
import {
  Folder,
  FileText,
  Code2,
  FileCode,
  ShieldCheck,
  Tag,
  ExternalLink,
  Download,
  HardDrive,
  Copy,
  Check,
  Search,
  BookOpen,
  Calendar,
  UserCheck,
  Cpu,
  Layers,
  Network
} from 'lucide-react';
import yaml from 'js-yaml';

export default function BundleExplorer({
  bundle,
  activeFilePath,
  setActiveFilePath,
  onOpenGraph,
  onDownloadZip,
  onExportDisk
}) {
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' | 'raw'
  const [searchFilter, setSearchFilter] = useState('');
  const [copied, setCopied] = useState(false);

  if (!bundle || !bundle.files) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
        <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
        <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '8px' }}>No Knowledge Bundle Loaded</h3>
        <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto' }}>
          Enter a documentation starting URL above and click <strong>Generate OKF Bundle</strong> to crawl, extract, and assemble an Open Knowledge Format bundle.
        </p>
      </div>
    );
  }

  const files = bundle.files;
  const filePaths = Object.keys(files).sort((a, b) => {
    // index.md and log.md first
    if (a === 'index.md') return -1;
    if (b === 'index.md') return 1;
    if (a === 'log.md') return -1;
    if (b === 'log.md') return 1;
    return a.localeCompare(b);
  });

  const filteredPaths = filePaths.filter(p =>
    p.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const activeContent = files[activeFilePath] || '';

  // Parse Frontmatter & Body for active file
  let frontmatter = null;
  let markdownBody = activeContent;

  if (activeContent.startsWith('---')) {
    const parts = activeContent.split('---');
    if (parts.length >= 3) {
      try {
        frontmatter = yaml.load(parts[1]);
        markdownBody = parts.slice(2).join('---').trim();
      } catch (e) {
        // frontmatter parse error
      }
    }
  }

  // Derive Trust Tier
  let trustTier = 'unverified';
  let trustLabel = 'Unverified';
  if (frontmatter && frontmatter.verified) {
    const verifiers = Array.isArray(frontmatter.verified) ? frontmatter.verified : [frontmatter.verified];
    const isHuman = verifiers.some(v => v && typeof v.by === 'string' && v.by.startsWith('human:'));
    if (isHuman) {
      trustTier = 'humanReviewed';
      trustLabel = 'Human-Reviewed (Tier 3)';
    } else {
      trustTier = 'machineConfirmed';
      trustLabel = 'Machine-Confirmed (Tier 2)';
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper for internal link clicking
  const handleMarkdownLinkClick = (e) => {
    const target = e.target.closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href) return;

    // Check if it is a bundle-relative link
    let targetPath = href;
    if (targetPath.startsWith('/')) targetPath = targetPath.slice(1);
    if (targetPath.startsWith('./')) {
      const currentFolder = activeFilePath.includes('/') ? activeFilePath.split('/')[0] : '';
      targetPath = currentFolder ? `${currentFolder}/${targetPath.slice(2)}` : targetPath.slice(2);
    }
    // Remove hash
    targetPath = targetPath.split('#')[0];

    if (files[targetPath]) {
      e.preventDefault();
      setActiveFilePath(targetPath);
    }
  };

  const getFileIcon = (filePath) => {
    if (filePath === 'index.md') return <BookOpen size={14} color="#06b6d4" />;
    if (filePath.endsWith('/index.md')) return <Folder size={14} color="#6366f1" />;
    if (filePath === 'log.md') return <Calendar size={14} color="#a855f7" />;
    if (filePath.startsWith('computations/')) return <Code2 size={14} color="#10b981" />;
    return <FileText size={14} color="#94a3b8" />;
  };

  return (
    <div className="explorer-container">
      {/* 1. Left Sidebar: File Tree */}
      <div className="tree-sidebar glass-panel">
        <div className="tree-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#06b6d4" />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Bundle Tree</span>
          </div>
          <span className="version-pill" style={{ padding: '2px 8px', fontSize: '10px' }}>
            {filePaths.length} files
          </span>
        </div>

        <div className="tree-search">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search concepts..."
              style={{ paddingLeft: '30px' }}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="tree-content">
          {filteredPaths.map((filePath) => {
            const isFolderHeader = filePath.endsWith('/index.md') && filePath !== 'index.md';
            const isActive = activeFilePath === filePath;
            let displayName = filePath;
            if (filePath === 'index.md') displayName = 'index.md (Root)';
            else if (filePath === 'log.md') displayName = 'log.md (Changelog)';

            return (
              <div
                key={filePath}
                className={`tree-node ${isActive ? 'active' : ''} ${isFolderHeader ? 'folder' : ''}`}
                onClick={() => setActiveFilePath(filePath)}
              >
                <span className="tree-node-icon">{getFileIcon(filePath)}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
                {filePath.startsWith('computations/') && (
                  <span className="tree-node-badge" style={{ color: '#6ee7b7' }}>attestation</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Center Panel: Document Viewer */}
      <div className="doc-viewer-panel glass-panel">
        <div className="viewer-header">
          <div className="doc-title-info">
            <h2>{frontmatter?.title || activeFilePath}</h2>
            <div className="doc-path">{activeFilePath}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="view-tabs">
              <button
                type="button"
                className={`view-tab-btn ${viewMode === 'rendered' ? 'active' : ''}`}
                onClick={() => setViewMode('rendered')}
              >
                Rendered Preview
              </button>
              <button
                type="button"
                className={`view-tab-btn ${viewMode === 'raw' ? 'active' : ''}`}
                onClick={() => setViewMode('raw')}
              >
                Raw Markdown & YAML
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handleCopy}
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Frontmatter Inspector Card (when frontmatter exists) */}
        {frontmatter && (
          <div className="frontmatter-card">
            <div className="frontmatter-badges">
              {frontmatter.type && (
                <span className="badge-pill badge-type">
                  <Tag size={11} /> {frontmatter.type}
                </span>
              )}

              {trustTier === 'humanReviewed' && (
                <span className="badge-pill badge-trust-human">
                  <UserCheck size={11} /> {trustLabel}
                </span>
              )}
              {trustTier === 'machineConfirmed' && (
                <span className="badge-pill badge-trust-machine">
                  <Cpu size={11} /> {trustLabel}
                </span>
              )}
              {trustTier === 'unverified' && (
                <span className="badge-pill badge-trust-unverified">
                  <ShieldCheck size={11} /> {trustLabel}
                </span>
              )}

              {frontmatter.status && (
                <span className="badge-pill badge-status">
                  ● {frontmatter.status}
                </span>
              )}

              {frontmatter.runtime && (
                <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <Code2 size={11} /> runtime: {frontmatter.runtime}
                </span>
              )}
            </div>

            {frontmatter.sources && frontmatter.sources.length > 0 && (
              <div className="frontmatter-provenance">
                <strong>Provenance & Source:</strong>
                {frontmatter.sources.map((src, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>• {src.title || src.id}:</span>
                    <a
                      href={src.resource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="provenance-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      {src.resource} <ExternalLink size={10} />
                    </a>
                    {src.author && <span style={{ color: '#64748b' }}>({src.author})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="doc-body-scroll" onClick={handleMarkdownLinkClick}>
          {viewMode === 'rendered' ? (
            <div className="markdown-rendered">
              {renderMarkdownToHtml(markdownBody)}
            </div>
          ) : (
            <textarea
              readOnly
              className="raw-source-view"
              value={activeContent}
            />
          )}
        </div>
      </div>

      {/* 3. Right Sidebar: Actions & Conformance Suite */}
      <div className="explorer-right-panel">
        {/* Export Card */}
        <div className="export-card glass-panel">
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>Export Bundle</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            Download the complete OKF v0.2 repository package or save directly to disk.
          </p>
          <div className="export-actions">
            <button type="button" className="btn-primary" onClick={onDownloadZip} style={{ justifyContent: 'center' }}>
              <Download size={15} />
              <span>Download ZIP Bundle</span>
            </button>
            <button type="button" className="btn-secondary" onClick={onExportDisk} style={{ justifyContent: 'center' }}>
              <HardDrive size={15} />
              <span>Save to Local Disk</span>
            </button>
            <button type="button" className="btn-secondary" onClick={onOpenGraph} style={{ justifyContent: 'center' }}>
              <Network size={15} />
              <span>View Concept Graph</span>
            </button>
          </div>
        </div>

        {/* Conformance Report Card */}
        <div className="conformance-card glass-panel">
          <div className="conformance-header">
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>OKF v0.2 Conformance</h3>
            <div className="status-indicator pass">
              <ShieldCheck size={14} /> PASS
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {bundle.validation?.checks?.map((check, idx) => (
              <div key={idx} className={`check-item ${check.passed ? 'pass' : 'fail'}`}>
                {check.passed ? <Check size={13} color="#10b981" /> : <ShieldCheck size={13} color="#f43f5e" />}
                <span>{check.name}</span>
              </div>
            ))}
          </div>

          {bundle.validation?.trustSummary && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: '#94a3b8' }}>
              <strong>Trust Distribution:</strong>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span>Machine-Confirmed:</span>
                <strong style={{ color: '#67e8f9' }}>{bundle.validation.trustSummary.machineConfirmed}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Human-Reviewed:</span>
                <strong style={{ color: '#6ee7b7' }}>{bundle.validation.trustSummary.humanReviewed}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple client-side Markdown rendering helper for tables, code blocks, alerts, and links.
 */
function renderMarkdownToHtml(markdownText) {
  if (!markdownText) return <p>Empty document.</p>;

  // Convert basic elements into React JSX
  const lines = markdownText.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`}>
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      );
      codeBuffer = [];
    }
    inCodeBlock = false;
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(2); // Skip separator row

      elements.push(
        <table key={`table-${elements.length}`}>
          <thead>
            <tr>
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      tableRows = [];
    }
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    }
    // Alerts / Blockquotes
    else if (line.startsWith('> [!TIP]')) {
      elements.push(<blockquote key={i} style={{ borderLeftColor: '#10b981' }}><strong>TIP:</strong> {line.slice(8)}</blockquote>);
    } else if (line.startsWith('> [!NOTE]')) {
      elements.push(<blockquote key={i} style={{ borderLeftColor: '#6366f1' }}><strong>NOTE:</strong> {line.slice(9)}</blockquote>);
    } else if (line.startsWith('> [!WARNING]')) {
      elements.push(<blockquote key={i} style={{ borderLeftColor: '#f59e0b' }}><strong>WARNING:</strong> {line.slice(12)}</blockquote>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{line.slice(2)}</blockquote>);
    }
    // Lists
    else if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push(
        <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.slice(2)) }} />
      );
    }
    // Horizontal Rule
    else if (line.trim() === '---') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />);
    }
    // Paragraph
    else if (line.trim().length > 0) {
      elements.push(
        <p key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
      );
    }
  }

  if (inCodeBlock) flushCode();
  if (inTable) flushTable();

  return elements;
}

function formatInlineMarkdown(text) {
  if (!text) return '';
  return text
    // Markdown Links [text](href)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic *text* or _text_
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Footnotes [^source-id]
    .replace(/\[\^([^\]]+)\]/g, '<sup style="color: #06b6d4; font-weight: bold;">[$1]</sup>');
}
