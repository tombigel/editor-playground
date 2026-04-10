import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHelpLink } from '../HelpMarkdownDocument';
import { resolveHelpAssetUrl } from '../helpDocs';

describe('panels/HelpMarkdownDocument', () => {
  it('renders internal markdown links as anchors instead of buttons', () => {
    const markup = renderToStaticMarkup(
      renderHelpLink({
        currentPath: 'docs/PLAYGROUND_ROADMAP.md',
        href: '#animation-undo-coverage',
        availableDocPaths: new Set(['docs/PLAYGROUND_ROADMAP.md']),
        onNavigate: vi.fn(),
        children: 'Animation undo coverage',
      }),
    );

    expect(markup).toContain('<a');
    expect(markup).not.toContain('<button');
    expect(markup).toContain('href="#animation-undo-coverage"');
    expect(markup).toContain('text-left');
  });

  it('renders relative markdown document links as anchors', () => {
    const markup = renderToStaticMarkup(
      renderHelpLink({
        currentPath: 'docs/API.md',
        href: './EDITOR_STYLE_GUIDE.md',
        availableDocPaths: new Set(['docs/API.md', 'docs/EDITOR_STYLE_GUIDE.md']),
        onNavigate: vi.fn(),
        children: 'Editor Style Guide',
      }),
    );

    expect(markup).toContain('<a');
    expect(markup).not.toContain('<button');
    expect(markup).toContain('href="./EDITOR_STYLE_GUIDE.md"');
  });

  it('resolves docs asset paths under the help-doc public asset tree', () => {
    expect(resolveHelpAssetUrl('docs/USAGE.md', './assets/help-browser-overview.svg')).toBe(
      '/assets/help-docs/assets/help-browser-overview.svg',
    );
  });
});
