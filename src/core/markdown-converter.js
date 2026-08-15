import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * Creates a configured TurndownService for documentation to markdown conversion.
 */
export function createMarkdownConverter() {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '*',
    codeBlockStyle: 'fenced',
    emDelimiter: '_'
  });

  // Use GitHub Flavored Markdown (tables, tasklists, strikethrough)
  turndownService.use(gfm);

  // Custom rule for code snippets
  turndownService.addRule('fencedCodeBlocksWithLang', {
    filter: (node) => {
      return (
        node.nodeName === 'PRE' ||
        (node.nodeName === 'DIV' && node.classList && node.classList.contains('code-block'))
      );
    },
    replacement: (content, node) => {
      const codeElement = node.querySelector('code') || node;
      const rawText = codeElement.textContent || '';
      
      // Determine language
      let lang = '';
      const classAttr = node.getAttribute('class') || codeElement.getAttribute('class') || '';
      const langMatch = classAttr.match(/(?:lang|language)-([a-zA-Z0-9_-]+)/);
      if (langMatch) {
        lang = langMatch[1];
      } else if (/SELECT|FROM|WHERE|JOIN|GROUP BY|INSERT|UPDATE|CREATE TABLE/i.test(rawText)) {
        lang = 'sql';
      } else if (/def |import |print\(|class /i.test(rawText)) {
        lang = 'python';
      } else if (/bq |gcloud |curl |npm |git |pip /i.test(rawText)) {
        lang = 'bash';
      } else if (rawText.trim().startsWith('{') && rawText.trim().endsWith('}')) {
        lang = 'json';
      }

      return `\n\n\`\`\`${lang}\n${rawText.trim()}\n\`\`\`\n\n`;
    }
  });

  // Custom rule for callout/alert blocks (Notes, Tips, Cautions)
  turndownService.addRule('calloutNotes', {
    filter: (node) => {
      if (node.classList) {
        return (
          node.classList.contains('note') ||
          node.classList.contains('tip') ||
          node.classList.contains('caution') ||
          node.classList.contains('warning') ||
          node.classList.contains('devsite-notification')
        );
      }
      return false;
    },
    replacement: (content, node) => {
      let calloutType = 'NOTE';
      const classAttr = node.getAttribute('class') || '';
      if (classAttr.includes('tip')) calloutType = 'TIP';
      if (classAttr.includes('warning') || classAttr.includes('caution')) calloutType = 'WARNING';
      if (classAttr.includes('important')) calloutType = 'IMPORTANT';

      const lines = content.trim().split('\n');
      const quoted = lines.map(line => `> ${line}`).join('\n');
      return `\n\n> [!${calloutType}]\n${quoted}\n\n`;
    }
  });

  // Remove empty links or useless span wrappers
  turndownService.addRule('cleanLinks', {
    filter: (node) => node.nodeName === 'A' && !node.getAttribute('href'),
    replacement: (content) => content
  });

  return turndownService;
}

/**
 * Converts cleaned HTML to clean structural markdown.
 */
export function htmlToMarkdown(html) {
  if (!html || typeof html !== 'string') return '';
  const converter = createMarkdownConverter();
  let md = converter.turndown(html);

  // Clean excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n');

  // Strip empty headers
  md = md.replace(/^#+\s*$/gm, '');

  return md.trim();
}
