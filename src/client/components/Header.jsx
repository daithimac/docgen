import React from 'react';
import { BookOpen, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Header({ isHealthy = true }) {
  return (
    <header className="app-header glass-panel">
      <div className="logo-group">
        <div className="logo-badge">
          <BookOpen size={22} color="#ffffff" />
        </div>
        <div className="logo-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>DocGen OKF</h1>
            <span className="version-pill">
              <Sparkles size={11} /> OKF v0.2
            </span>
          </div>
          <p>Autonomous Documentation Scraper & Open Knowledge Format Generator</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="status-indicator pass" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '9999px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <ShieldCheck size={14} /> Spec v0.2 Compliant
        </div>
      </div>
    </header>
  );
}
