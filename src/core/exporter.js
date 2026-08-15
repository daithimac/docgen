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
export async function saveBundleToDisk(bundleFiles, targetDir) {
  const resolvedTarget = path.resolve(targetDir);
  await fs.mkdir(resolvedTarget, { recursive: true });

  const filesMap = bundleFiles instanceof Map ? bundleFiles : new Map(Object.entries(bundleFiles));
  const writtenFiles = [];

  for (const [filePath, content] of filesMap.entries()) {
    const fullPath = path.join(resolvedTarget, filePath);
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    writtenFiles.push(fullPath);
  }

  return {
    targetDir: resolvedTarget,
    filesCount: writtenFiles.length,
    files: writtenFiles
  };
}
