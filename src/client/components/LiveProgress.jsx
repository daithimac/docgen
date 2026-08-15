import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function LiveProgress({ progressLogs, isCrawling, pagesCrawled = 0, maxPages = 20 }) {
  if (!isCrawling && progressLogs.length === 0) return null;

  const percent = Math.min(100, Math.round((pagesCrawled / (maxPages || 1)) * 100));
  const latestLog = progressLogs[progressLogs.length - 1] || 'Processing...';

  return (
    <div className="progress-panel glass-panel">
      <div className="progress-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isCrawling ? (
            <Loader2 size={16} className="spin" color="#06b6d4" />
          ) : (
            <CheckCircle2 size={16} color="#10b981" />
          )}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>
            {isCrawling ? `Crawling & Generating Bundle (${pagesCrawled}/${maxPages} pages)` : 'Bundle Generation Complete'}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          {percent}%
        </span>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="live-log-box">
        {progressLogs.slice(-5).map((log, idx) => (
          <div key={idx} style={{ marginBottom: '2px', opacity: idx === progressLogs.length - 1 ? 1 : 0.7 }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
