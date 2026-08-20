import { scanHeadings } from './markdown-parser.js';

export const DEFAULT_SPLIT_OPTIONS = {
  // A document must look like a catalogue before it is broken apart: several
  // sibling sections, each carrying real content.
  minSections: 3,
  minSectionLength: 100,
  // Beyond this, splitting would explode the bundle (a long CHANGELOG has
  // hundreds of qualifying sections), so the document is left whole.
  maxSections: 50
};

/**
 * Weighs how much real prose a section carries.
 *
 * Raw length is a poor proxy: a section holding nothing but an image can carry
 * a 140-character absolutized URL and masquerade as content, while a genuine
 * paragraph of the same length is a real concept. Markup is stripped first so
 * the threshold measures what a reader would actually get.
 */
export function measureProse(body) {
  return (body || '')
    .replace(/^ {0,3}(`{3,}|~{3,})[\s\S]*?^ {0,3}\1[^\n]*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^ {0,3}#{1,6}\s+/gm, '')
    .replace(/[*_`~>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * Picks the heading level to split on: the shallowest level that appears often
 * enough to look like a list of siblings rather than a document title.
 */
export function chooseSplitLevel(headings, minSections) {
  const counts = new Map();
  for (const heading of headings) {
    counts.set(heading.level, (counts.get(heading.level) || 0) + 1);
  }

  for (const level of [...counts.keys()].sort((a, b) => a - b)) {
    if (counts.get(level) >= minSections) return level;
  }
  return null;
}

/**
 * Splits a markdown document into a preamble plus one entry per section.
 *
 * Returns null when the document does not look like a catalogue of concepts,
 * in which case the caller keeps it as a single concept.
 *
 * Sections whose bodies are too thin to stand alone (headings used as prose,
 * or as a divider above an image) are folded back into whatever preceded them,
 * so no content is lost and no stub concepts are created.
 */
export function splitMarkdownIntoSections(markdown, options = {}) {
  const { minSections, minSectionLength, maxSections } = { ...DEFAULT_SPLIT_OPTIONS, ...options };
  const body = (markdown || '').trim();
  if (!body) return null;

  const headings = scanHeadings(body);
  const splitLevel = chooseSplitLevel(headings, minSections);
  if (splitLevel === null) return null;

  // Any heading at or above the split level starts a new block, so a deeper
  // catalogue nested under an intervening h1 still breaks cleanly.
  const boundaries = headings.filter(h => h.level <= splitLevel);
  if (boundaries.length === 0) return null;

  const lines = body.split(/\r?\n/);
  const blocks = [];

  boundaries.forEach((heading, i) => {
    const start = heading.lineIndex + 1;
    const end = i + 1 < boundaries.length ? boundaries[i + 1].lineIndex : lines.length;
    blocks.push({
      title: heading.text,
      level: heading.level,
      raw: heading.raw,
      body: lines.slice(start, end).join('\n').trim()
    });
  });

  let preamble = lines.slice(0, boundaries[0].lineIndex).join('\n').trim();
  const sections = [];

  for (const block of blocks) {
    if (measureProse(block.body) >= minSectionLength) {
      sections.push({ title: block.title, level: block.level, body: block.body });
      continue;
    }

    // Too thin to stand alone - fold the heading and its body back in.
    // Drop the permitted leading indentation so folded headings sit flush.
    const folded = [block.raw.replace(/^ {1,3}(?=#)/, ''), block.body].filter(Boolean).join('\n\n');
    if (sections.length > 0) {
      const previous = sections[sections.length - 1];
      previous.body = [previous.body, folded].filter(Boolean).join('\n\n');
    } else {
      preamble = [preamble, folded].filter(Boolean).join('\n\n');
    }
  }

  if (sections.length < minSections) return null;
  // maxSections of 0 means "no ceiling".
  if (maxSections > 0 && sections.length > maxSections) return null;

  return { preamble: preamble.trim(), sections };
}
