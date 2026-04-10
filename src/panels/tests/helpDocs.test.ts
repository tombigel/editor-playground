import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildHelpTreeRows,
  extractMarkdownHeadings,
  getHelpBreadcrumbs,
  getHelpChildEntries,
  getHelpEntryById,
  getHelpInitialExpandedIds,
  getHelpRootEntries,
  HELP_BROWSER_DOC_PATH,
  type MarkdownHelpEntry,
  resolveHelpAssetUrl,
  resolveHelpLink,
  slugifyMarkdownHeading,
} from '../helpDocs';

describe('panels/helpDocs', () => {
  it('builds the configured root IA in the expected order', () => {
    const roots = getHelpRootEntries().map((entry) => entry.title);

    expect(roots).toEqual(['About', 'Usage', 'Reference', 'Developers', 'Keyboard shortcuts']);
  });

  it('nests reference and developers content under the expected parents', () => {
    expect(getHelpChildEntries('doc:docs/REFERENCE.md').map((entry) => entry.title)).toContain('API Reference');
    expect(getHelpChildEntries('doc:docs/DEVELOPERS.md').map((entry) => entry.title)).toEqual([
      'Architecture',
      'Workflows',
      'Planning',
    ]);
    expect(
      getHelpChildEntries('section:developers-workflows')
        .filter((entry): entry is MarkdownHelpEntry => entry.kind === 'markdown')
        .map((entry) => entry.path),
    ).toContain(HELP_BROWSER_DOC_PATH);
  });

  it('builds breadcrumbs and initial expansion state for nested entries', () => {
    const breadcrumbs = getHelpBreadcrumbs('doc:docs/API_TEXT.md').map((entry) => entry.title);
    const expandedIds = getHelpInitialExpandedIds('doc:docs/API_TEXT.md');

    expect(breadcrumbs).toEqual(['Reference', 'API Reference', 'Text']);
    expect(expandedIds.has('doc:docs/REFERENCE.md')).toBe(true);
    expect(expandedIds.has('doc:docs/API.md')).toBe(true);
  });

  it('resolves relative doc links, aliases, and hash links for in-panel navigation', () => {
    const docPaths = [
      'docs/API.md',
      'docs/API_TEXT.md',
      'docs/EDITOR_STYLE_GUIDE.md',
      'docs/USAGE.md',
    ];

    expect(resolveHelpLink('docs/API.md', '#api-reference', docPaths)).toEqual({
      kind: 'anchor',
      anchor: 'api-reference',
    });

    expect(resolveHelpLink('docs/API.md', './API_TEXT.md', docPaths)).toEqual({
      kind: 'document',
      path: 'docs/API_TEXT.md',
      anchor: null,
    });

    expect(resolveHelpLink('docs/USAGE.md', './API.md#text-content', docPaths)).toEqual({
      kind: 'document',
      path: 'docs/API_TEXT.md',
      anchor: 'text-content',
    });

    expect(resolveHelpLink('docs/API.md', '/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css', docPaths)).toEqual({
      kind: 'inert',
      href: '/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css',
    });
  });

  it('resolves docs assets relative to markdown paths', () => {
    expect(resolveHelpAssetUrl('docs/USAGE.md', './assets/help-browser-overview.svg')).toBe(
      '/assets/help-docs/assets/help-browser-overview.svg',
    );
    expect(resolveHelpAssetUrl('docs/USAGE.md', 'https://example.com/demo.png')).toBe('https://example.com/demo.png');
  });

  it('extracts heading toc items while ignoring fenced code headings', () => {
    const headings = extractMarkdownHeadings([
      '# Usage',
      '',
      '## Getting Started',
      '',
      '```markdown',
      '## Fake heading',
      '```',
      '',
      '### Preview And Export',
    ].join('\n'));

    expect(headings).toEqual([
      { depth: 1, text: 'Usage', anchor: 'usage' },
      { depth: 2, text: 'Getting Started', anchor: 'getting-started' },
      { depth: 3, text: 'Preview And Export', anchor: 'preview-and-export' },
    ]);
  });

  it('matches github-style heading anchors used by the docs table of contents', () => {
    expect(slugifyMarkdownHeading('src/api/documentApi.ts')).toBe('srcapidocumentapits');
    expect(slugifyMarkdownHeading('Priority: Blocker')).toBe('priority-blocker');
  });

  it('builds tree rows with nested entries expanded under their roots', () => {
    const rows = buildHelpTreeRows('doc:docs/API_TEXT.md', new Set(['doc:docs/REFERENCE.md', 'doc:docs/API.md']));
    const rowTitles = rows.map((row) => row.entry.title);

    expect(rowTitles).toContain('Reference');
    expect(rowTitles).toContain('API Reference');
    expect(rowTitles).toContain('Text');
    expect(rows.find((row) => row.entry.id === 'doc:docs/API_TEXT.md')?.depth).toBe(2);
  });

  it('keeps the roadmap summary table in markdown so help docs do not need raw html rendering', () => {
    const roadmap = readFileSync(resolve(process.cwd(), 'docs/PLAYGROUND_ROADMAP.md'), 'utf8');

    expect(roadmap).toContain('| Raw intake id | Short name | Priority | Type | Status | Owner lane | Notes / dependencies |');
    expect(roadmap).not.toContain('<table>');
    expect(roadmap).not.toContain('<span style=');
  });

  it('finds registered markdown entries by id', () => {
    const usage = getHelpEntryById('doc:docs/USAGE.md');

    expect(usage?.kind).toBe('markdown');
    expect(usage?.title).toBe('Usage');
  });
});
