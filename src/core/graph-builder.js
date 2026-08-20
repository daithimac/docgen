/**
 * Builds the concept-relationship graph rendered by GraphView.
 * Extracted from the server and browser engine, which previously carried
 * identical copies of this logic.
 */
export function buildBundleGraph(bundleFiles) {
  const filesMap = bundleFiles instanceof Map ? bundleFiles : new Map(Object.entries(bundleFiles || {}));

  const nodes = [{ id: 'index.md', label: 'Root Index (v0.2)', type: 'root-index', folder: '' }];
  const links = [];

  for (const [filePath, content] of filesMap.entries()) {
    if (filePath === 'index.md' || filePath === 'log.md') continue;

    let docType = 'Concept';
    let title = filePath;
    if (typeof content === 'string' && content.startsWith('---')) {
      const typeMatch = content.match(/type:\s*([^\n\r]+)/);
      if (typeMatch) docType = typeMatch[1].trim();
      const titleMatch = content.match(/title:\s*([^\n\r]+)/);
      if (titleMatch) title = titleMatch[1].trim();
    }

    nodes.push({
      id: filePath,
      label: title,
      type: docType,
      folder: filePath.includes('/') ? filePath.split('/')[0] : 'root'
    });

    if (filePath.endsWith('/index.md')) {
      links.push({ source: 'index.md', target: filePath, type: 'hierarchy' });
    } else {
      const folder = filePath.includes('/') ? filePath.split('/')[0] : '';
      const parentIndex = folder ? `${folder}/index.md` : 'index.md';
      links.push({ source: parentIndex, target: filePath, type: 'contains' });
    }

    // Cross-links between concepts that resolve inside the bundle
    if (typeof content === 'string') {
      for (const match of content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        let targetHref = match[2];
        if (targetHref.startsWith('/')) targetHref = targetHref.slice(1);
        if (targetHref.startsWith('./')) {
          const folder = filePath.includes('/') ? filePath.split('/')[0] : '';
          targetHref = folder ? `${folder}/${targetHref.slice(2)}` : targetHref.slice(2);
        }
        if (filesMap.has(targetHref) && targetHref !== filePath) {
          links.push({ source: filePath, target: targetHref, type: 'cross-link' });
        }
      }
    }
  }

  return { nodes, links };
}
