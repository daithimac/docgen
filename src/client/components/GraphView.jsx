import React, { useRef, useEffect } from 'react';
import { X, Network, Tag, Sparkles } from 'lucide-react';

export default function GraphView({ graphData, onClose, onSelectConcept }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = canvas.parentElement.clientHeight;

    // Simulation nodes with physics
    const nodes = graphData.nodes.map((node, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      const radius = node.type === 'root-index' ? 0 : (node.folder ? 140 + Math.random() * 80 : 80);
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: node.type === 'root-index' ? 18 : (node.id.endsWith('index.md') ? 14 : 10),
        color: getNodeColor(node.type, node.folder)
      };
    });

    const links = graphData.links.map(link => {
      const sourceNode = nodes.find(n => n.id === link.source) || nodes[0];
      const targetNode = nodes.find(n => n.id === link.target) || nodes[1] || nodes[0];
      return { source: sourceNode, target: targetNode, type: link.type };
    });

    function getNodeColor(type, folder) {
      if (type === 'root-index') return '#06b6d4'; // Cyan
      if (type === 'Attested Computation') return '#10b981'; // Emerald
      if (folder === 'migrate-data') return '#f59e0b'; // Amber
      if (folder === 'load-data') return '#3b82f6'; // Blue
      if (folder === 'transform-data') return '#8b5cf6'; // Purple
      if (folder === 'export-data') return '#ec4899'; // Pink
      return '#6366f1'; // Indigo
    }

    // Force simulation step
    const simulate = () => {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.05;
            nodes[i].vx -= dx * force;
            nodes[i].vy -= dy * force;
            nodes[j].vx += dx * force;
            nodes[j].vy += dy * force;
          }
        }
      }

      // Attraction along links
      for (const link of links) {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = link.type === 'cross-link' ? 120 : 90;
        const force = (dist - targetDist) * 0.02;
        link.source.vx += dx / dist * force;
        link.source.vy += dy / dist * force;
        link.target.vx -= dx / dist * force;
        link.target.vy -= dy / dist * force;
      }

      // Center gravity & damping
      for (const node of nodes) {
        node.vx += (width / 2 - node.x) * 0.005;
        node.vy += (height / 2 - node.y) * 0.005;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.85;
        node.vy *= 0.85;

        // Keep inside bounds
        node.x = Math.max(30, Math.min(width - 30, node.x));
        node.y = Math.max(30, Math.min(height - 30, node.y));
      }

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw links
      for (const link of links) {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = link.type === 'cross-link' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = link.type === 'cross-link' ? 2 : 1;
        if (link.type === 'cross-link') {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}33`;
        ctx.fill();

        // Node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Labels
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        const label = node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label;
        ctx.fillText(label, node.x, node.y + node.radius + 12);
      }

      animationFrameId = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [graphData]);

  const handleCanvasClick = (e) => {
    // Click hit detection
    if (!canvasRef.current || !graphData) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // simple hit test
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '90%',
          maxWidth: '1000px',
          height: '650px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>OKF Knowledge Graph & Relationship Map</h3>
          </div>
          <button type="button" className="btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', background: '#070a12' }}>
          <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ width: '100%', height: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(11, 17, 31, 0.85)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '11px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Root Index</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Migrate Data</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Load Data</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Transform Data</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }} /> Export Data</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Attested Computation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
