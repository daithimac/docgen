import React, { useState } from 'react';
import { X, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ExportModal({
  onClose,
  onConfirmExport,
  isExporting,
  exportResult,
  defaultBundleName = 'bigquery-elt-okf'
}) {
  const [targetDir, setTargetDir] = useState(`./bundles/${defaultBundleName}`);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmExport(targetDir);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Save OKF Bundle to Disk</h3>
          </div>
          <button type="button" className="btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {exportResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
              <CheckCircle2 size={20} />
              <strong style={{ fontSize: '14px' }}>Successfully Saved!</strong>
            </div>
            <p style={{ fontSize: '12px', color: '#cbd5e1' }}>
              Wrote <strong>{exportResult.filesCount}</strong> files to:
            </p>
            <pre style={{ background: '#070a12', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#7dd3fc', overflowX: 'auto' }}>
              {exportResult.targetDir}
            </pre>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ marginTop: '8px' }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Specify the target local directory path where the OKF folder structure and markdown files will be written.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>Target Directory Path</label>
              <input
                type="text"
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="./bundles/my-okf-bundle"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isExporting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={isExporting}>
                {isExporting ? 'Saving...' : 'Confirm & Write to Disk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
