import yaml from 'js-yaml';

/**
 * Validates a generated bundle against OKF v0.2 Specification (§11).
 */
export function validateOKFBundle(bundleFiles) {
  // bundleFiles can be a Map<string, string> or an Object { [path]: content }
  const filesMap = bundleFiles instanceof Map ? bundleFiles : new Map(Object.entries(bundleFiles));

  const results = {
    isValid: true,
    totalFiles: filesMap.size,
    conceptsCount: 0,
    errors: [],
    warnings: [],
    checks: [],
    trustSummary: {
      unverified: 0,
      machineConfirmed: 0,
      humanReviewed: 0
    },
    typesFound: {}
  };

  const addCheck = (name, passed, message) => {
    results.checks.push({ name, passed, message });
    if (!passed) {
      results.isValid = false;
      results.errors.push(`[${name}] ${message}`);
    }
  };

  const addWarning = (name, message) => {
    results.warnings.push(`[${name}] ${message}`);
  };

  let hasRootIndex = false;
  let hasLog = false;

  for (const [filePath, content] of filesMap.entries()) {
    const isRootIndex = (filePath === 'index.md');
    const isSubIndex = (filePath.endsWith('/index.md') && filePath !== 'index.md');
    const isLog = (filePath === 'log.md' || filePath.endsWith('/log.md'));

    if (isRootIndex) hasRootIndex = true;
    if (isLog) hasLog = true;

    // Rule 3: Reserved filenames validation (§8 and §9)
    if (isRootIndex) {
      // Root index may contain frontmatter with okf_version
      if (content.startsWith('---')) {
        const parts = content.split('---');
        if (parts.length >= 3) {
          try {
            const fm = yaml.load(parts[1]);
            if (fm && fm.okf_version && fm.okf_version !== '0.2' && fm.okf_version !== 0.2) {
              addWarning('Root index version', `Root index.md specifies okf_version '${fm.okf_version}', expected '0.2'.`);
            }
          } catch (e) {
            addCheck('Root index frontmatter', false, `Invalid YAML in root index.md: ${e.message}`);
          }
        }
      }
      continue;
    }

    if (isSubIndex) {
      // Subdirectory index.md should NOT have frontmatter
      if (content.startsWith('---')) {
        addWarning('Subdirectory index frontmatter', `Subdirectory index '${filePath}' should not contain frontmatter per §8.`);
      }
      continue;
    }

    if (isLog) {
      // log.md should have ISO date headings ## YYYY-MM-DD
      const hasDateHeading = /##\s+\d{4}-\d{2}-\d{2}/.test(content);
      if (!hasDateHeading) {
        addWarning('Log date headings', `log.md at '${filePath}' should contain ISO 8601 '## YYYY-MM-DD' headings.`);
      }
      continue;
    }

    // Concept Document Validation (§4, §11)
    results.conceptsCount++;

    if (!content.startsWith('---')) {
      addCheck('Concept Frontmatter', false, `File '${filePath}' is missing frontmatter block delimiters ('---').`);
      continue;
    }

    const parts = content.split('---');
    if (parts.length < 3) {
      addCheck('Concept Frontmatter Format', false, `File '${filePath}' has malformed frontmatter delimiter pairs.`);
      continue;
    }

    let fm = null;
    try {
      fm = yaml.load(parts[1]);
    } catch (e) {
      addCheck('Concept YAML Parsing', false, `File '${filePath}' contains unparseable YAML: ${e.message}`);
      continue;
    }

    if (!fm || typeof fm !== 'object') {
      addCheck('Concept YAML Object', false, `File '${filePath}' frontmatter is empty or not a valid object.`);
      continue;
    }

    // Rule 2: Mandatory `type` field (§4.1, §11)
    if (!fm.type || typeof fm.type !== 'string' || fm.type.trim() === '') {
      addCheck('Required type field', false, `File '${filePath}' is missing the required non-empty 'type' field.`);
    } else {
      results.typesFound[fm.type] = (results.typesFound[fm.type] || 0) + 1;
    }

    // Check Trust Tier (§5.3)
    let trustTier = 'unverified';
    if (fm.verified) {
      const verifiers = Array.isArray(fm.verified) ? fm.verified : [fm.verified];
      const hasHuman = verifiers.some(v => v && typeof v.by === 'string' && v.by.startsWith('human:'));
      trustTier = hasHuman ? 'humanReviewed' : 'machineConfirmed';
    }
    results.trustSummary[trustTier]++;

    // Provenance Check (§5.1)
    if (fm.sources) {
      if (!Array.isArray(fm.sources)) {
        addWarning('Sources array', `File '${filePath}' 'sources' field should be a list.`);
      } else {
        fm.sources.forEach((src, idx) => {
          if (!src || !src.resource) {
            addWarning('Source resource missing', `File '${filePath}' sources[${idx}] missing required 'resource' URI.`);
          }
        });
      }
    }

    // Attested Computation Check (§10)
    if (fm.type === 'Attested Computation') {
      if (!fm.runtime) {
        addCheck('Attested Computation Runtime', false, `File '${filePath}' of type 'Attested Computation' is missing required 'runtime' field.`);
      }
    }
  }

  addCheck('Root Index Exists', hasRootIndex, `Bundle contains root 'index.md' file.`);
  addCheck('Update Log Exists', hasLog, `Bundle contains 'log.md' file.`);

  return results;
}
