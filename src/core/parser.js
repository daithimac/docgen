import * as cheerio from 'cheerio';

/**
 * Clean and extract content from an HTML documentation page.
 */
export function parseDocumentationHtml(html, url = '') {
  const $ = cheerio.load(html);

  // 1. Extract Title
  let title = $('h1').first().text().trim();
  if (!title) {
    title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
    // Strip common site suffixes
    title = title.replace(/\s*\|.*$/, '').replace(/\s*-\s*Google Cloud.*$/i, '').trim();
  }

  // 2. Extract Description / Summary
  let description = $('meta[name="description"]').attr('content') ||
                    $('meta[property="og:description"]').attr('content') || '';
  if (!description) {
    // Look for the first meaningful paragraph
    const firstP = $('article, main, .devsite-article-body, body').find('p').first().text().trim();
    if (firstP && firstP.length > 20) {
      description = firstP.split('.')[0] + '.';
    }
  }
  description = description.replace(/\s+/g, ' ').trim();

  // 3. Extract Breadcrumbs / Hierarchy
  const breadcrumbs = [];
  $('.devsite-breadcrumb-item, .breadcrumb, .breadcrumbs li, [aria-label="Breadcrumb"] li, .breadcrumbs__link').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text !== '/' && text !== '>') {
      breadcrumbs.push(text);
    }
  });

  // 4. Extract Section / Category
  let section = '';
  if (breadcrumbs.length > 1) {
    section = breadcrumbs[breadcrumbs.length - 2];
  }
  if (!section) {
    // Check devsite active heading or parent category
    const activeNavHeading = $('.devsite-nav-heading, .devsite-nav-title-no-path').first().text().trim();
    if (activeNavHeading) {
      section = activeNavHeading;
    }
  }
  if (!section && url) {
    // Derive from URL pathname
    try {
      const parsedUrl = new URL(url);
      const parts = parsedUrl.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        section = parts[parts.length - 2].replace(/[-_]/g, ' ');
      }
    } catch (e) {}
  }
  if (!section) {
    section = 'General';
  }

  // 5. Extract Tags / Keywords
  const tags = new Set();
  const keywordsMeta = $('meta[name="keywords"]').attr('content');
  if (keywordsMeta) {
    keywordsMeta.split(',').forEach(k => {
      const trimmed = k.trim().toLowerCase();
      if (trimmed) tags.add(trimmed);
    });
  }
  breadcrumbs.forEach(b => {
    if (b.length > 2 && b.length < 30) {
      tags.add(b.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
  });
  if (section) {
    tags.add(section.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  }

  // Derive concept tags from title words
  const titleWords = title.toLowerCase().split(/[\s,–—\(\):;]+/);
  ['bigquery', 'dataform', 'sql', 'migration', 'export', 'load', 'transform', 'elt', 'etl', 'pipeline', 'storage', 'dataset', 'table'].forEach(keyword => {
    if (titleWords.includes(keyword) || (description && description.toLowerCase().includes(keyword))) {
      tags.add(keyword);
    }
  });

  // 6. Extract Site Name, Author and Last Modified
  let siteName = $('meta[property="og:site_name"]').attr('content') ||
                 $('meta[name="application-name"]').attr('content') || '';

  let author = $('meta[name="author"]').attr('content') ||
               $('meta[property="article:author"]').attr('content') ||
               siteName ||
               'Documentation Team';
  
  let lastModified = $('meta[name="last-modified"]').attr('content') ||
                     $('meta[property="article:modified_time"]').attr('content') ||
                     $('time').attr('datetime') ||
                     new Date().toISOString().split('T')[0];
  // Ensure date is formatted as YYYY-MM-DD
  if (lastModified && lastModified.includes('T')) {
    lastModified = lastModified.split('T')[0];
  }

  // 7. Extract Main Content Area & Clean Clutter
  // Candidates for main body:
  let contentContainer = null;
  const contentSelectors = [
    '.devsite-article-body',
    'article',
    'main',
    '[itemprop="articleBody"]',
    '.markdown-body',
    '.theme-doc-markdown',
    '.content',
    '#content',
    '.documentation',
    'body'
  ];

  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 100) {
      contentContainer = el.first().clone();
      break;
    }
  }

  if (!contentContainer) {
    contentContainer = $('body').clone();
  }

  // Remove unwanted elements from content
  contentContainer.find(`
    script, style, noscript, iframe, svg,
    nav, header, footer,
    .devsite-hats-survey, .devsite-feedback, .devsite-thumb-rating,
    .devsite-nav, .devsite-toc, .devsite-banner,
    .breadcrumbs, .breadcrumb,
    .button, button, [role="button"]:not(pre [role="button"]),
    .feedback, .survey, .cookie-notice, .modal,
    [aria-hidden="true"]
  `).remove();

  // 8. Extract Code Blocks (attested computations candidate)
  const codeBlocks = [];
  contentContainer.find('pre, code-snippet, devsite-code').each((i, elem) => {
    const codeElem = $(elem).is('pre') ? $(elem) : $(elem).find('pre, code');
    const codeText = codeElem.text().trim();
    const classAttr = codeElem.attr('class') || $(elem).attr('class') || '';
    let language = 'text';

    const langMatch = classAttr.match(/(?:lang|language)-([a-zA-Z0-9_-]+)/);
    if (langMatch) {
      language = langMatch[1].toLowerCase();
    } else if (/SELECT|FROM|WHERE|JOIN|GROUP BY|INSERT|UPDATE|CREATE TABLE/i.test(codeText)) {
      language = 'sql';
    } else if (/def |import |print\(|class /i.test(codeText)) {
      language = 'python';
    } else if (/bq |gcloud |curl |npm |git /i.test(codeText)) {
      language = 'bash';
    } else if (/\{[\s\S]*\}|\[[\s\S]*\]/.test(codeText) && codeText.startsWith('{')) {
      language = 'json';
    } else if (/^[a-zA-Z0-9_-]+:\s+/m.test(codeText)) {
      language = 'yaml';
    }

    if (codeText.length > 10) {
      codeBlocks.push({
        id: `snippet-${i + 1}`,
        language,
        code: codeText,
        isExecutable: ['sql', 'python', 'bash', 'sh'].includes(language)
      });
    }
  });

  // 9. Extract Headings for Structure
  const headings = [];
  contentContainer.find('h1, h2, h3, h4').each((_, elem) => {
    const level = parseInt(elem.tagName.replace('h', ''), 10);
    const text = $(elem).text().trim();
    if (text) {
      headings.push({ level, text });
    }
  });

  // 10. Classify Concept Type
  let type = 'Guide';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('introduction') || lowerTitle.includes('overview') || lowerTitle.includes('concept')) {
    type = 'Overview';
  } else if (lowerTitle.includes('reference') || lowerTitle.includes('syntax') || lowerTitle.includes('schema') || lowerTitle.includes('api')) {
    type = 'Reference';
  } else if (lowerTitle.includes('how to') || lowerTitle.includes('step') || lowerTitle.includes('playbook') || lowerTitle.includes('triage') || lowerTitle.includes('incident')) {
    type = 'Playbook';
  } else if (lowerTitle.includes('table') || lowerTitle.includes('dataset')) {
    type = 'BigQuery Table';
  } else if (codeBlocks.some(c => c.isExecutable && c.language === 'sql')) {
    type = 'Guide';
  }

  return {
    url,
    title,
    siteName,
    description,
    section,
    breadcrumbs,
    tags: Array.from(tags),
    type,
    author,
    lastModified,
    headings,
    codeBlocks,
    htmlBody: contentContainer.html() || ''
  };
}
