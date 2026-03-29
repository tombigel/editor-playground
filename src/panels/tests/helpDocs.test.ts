import { describe, expect, it } from 'vitest';
import {
  getConfiguredHelpDocOrder,
  getMarkdownHelpEntries,
  HELP_BROWSER_DOC_PATH,
  resolveHelpLink,
  splitHelpEntryTitle,
  slugifyMarkdownHeading,
} from '../helpDocs';

describe('panels/helpDocs', () => {
  it('loads help markdown entries only from the docs folder in configured order with alphabetical fallback', () => {
    const entries = getMarkdownHelpEntries();
    const paths = entries.map((entry) => entry.path);
    const configuredOrder = getConfiguredHelpDocOrder().filter((path) => paths.includes(path));
    const configuredSlice = paths.slice(0, configuredOrder.length);
    const remainingSlice = paths.slice(configuredOrder.length);

    expect(configuredSlice).toEqual(configuredOrder);
    expect(remainingSlice).toEqual([...remainingSlice].sort((left, right) => left.localeCompare(right)));
    expect(paths).toContain('docs/API.md');
    expect(paths).toContain('docs/CONSOLE_TEST_GUIDE.md');
    expect(paths).toContain(HELP_BROWSER_DOC_PATH);
    expect(paths.every((path) => path.startsWith('docs/'))).toBe(true);
  });

  it('splits dashed titles into button title and subtitle while keeping filename separate', () => {
    const guide = getMarkdownHelpEntries().find((entry) => entry.path === 'docs/CONSOLE_TEST_GUIDE.md');

    expect(guide?.title).toBe('Animation API');
    expect(guide?.subtitle).toBe('Console Testing Guide');
    expect(guide?.fileName).toBe('CONSOLE_TEST_GUIDE.md');

    expect(splitHelpEntryTitle('API Reference')).toEqual({
      title: 'API Reference',
      subtitle: undefined,
    });
  });

  it('resolves relative doc links and hash links for in-panel navigation', () => {
    const docPaths = ['docs/API.md', 'docs/EDITOR_STYLE_GUIDE.md'];

    expect(resolveHelpLink('docs/API.md', '#architecture-overview', docPaths)).toEqual({
      kind: 'anchor',
      anchor: 'architecture-overview',
    });

    expect(resolveHelpLink('docs/API.md', './EDITOR_STYLE_GUIDE.md', docPaths)).toEqual({
      kind: 'document',
      path: 'docs/EDITOR_STYLE_GUIDE.md',
      anchor: null,
    });

    expect(resolveHelpLink('docs/API.md', '/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css', docPaths)).toEqual({
      kind: 'inert',
      href: '/Users/tombigel/Dev/Wix/sticky-playground/src/styles.css',
    });
  });

  it('matches github-style heading anchors used by the docs table of contents', () => {
    expect(slugifyMarkdownHeading('src/api/documentApi.ts')).toBe('srcapidocumentapits');
    expect(slugifyMarkdownHeading('Priority: Blocker')).toBe('priority-blocker');
  });
});
