import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

/**
 * Creates a downloadable ZIP archive containing the entire OKF bundle.
 */
export async function createBundleZip(bundleFiles) {
  const zip = new JSZip();
  const filesMap = bundleFiles instanceof Map ? bundleFiles : new Map(Object.entries(bundleFiles));

  for (const [filePath, content] of filesMap.entries()) {
    zip.file(filePath, content);
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  return zipBuffer;
}

/**
 * Writes the OKF bundle directly to a local directory on disk.
 */
export async function saveBundleToDisk(bundleFiles, targetDir, options = {}) {
  const concurrency = options.concurrency || 16;
  const resolvedTarget = path.resolve(targetDir);
  await fs.mkdir(resolvedTarget, { recursive: true });

  const filesMap = bundleFiles instanceof Map ? bundleFiles : new Map(Object.entries(bundleFiles));
  const entries = Array.from(filesMap.entries());
  const writtenFiles = [];

  // One mkdir per directory rather than per file, and bounded parallel writes -
  // a large bundle is tens of thousands of small files.
  const ensuredDirs = new Set();
  const ensureDir = async (dir) => {
    if (ensuredDirs.has(dir)) return;
    await fs.mkdir(dir, { recursive: true });
    ensuredDirs.add(dir);
  };

  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, entries.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= entries.length) return;
      const [filePath, content] = entries[index];
      const fullPath = path.join(resolvedTarget, filePath);
      await ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      writtenFiles.push(fullPath);
    }
  });
  await Promise.all(runners);

  return {
    targetDir: resolvedTarget,
    filesCount: writtenFiles.length,
    files: writtenFiles
  };
}
