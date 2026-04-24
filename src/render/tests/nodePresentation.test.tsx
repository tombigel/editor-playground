import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createInitialDocument, createLinkTextNode, createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createTextDocumentFromCode, createTextDocumentFromText, getTextContent, listContentToRichListBlock } from '../../model/richContent';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  getNodeTextContent,
  isBrandMark,
  renderLeafContent,
} from '../nodePresentation';

describe('render/nodePresentation', () => {
  it('formats shared node labels and aria labels', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    const title = Object.values(document.nodes).find((node) => node.contentType !== 'container' && node.contentType !== 'site' && node.name === 'Post Title');
    if (!section || section.contentType !== 'container' || !title || (title.contentType !== 'text' && title.contentType !== 'media')) {
      throw new Error('Expected wrapper and leaf nodes');
    }

    expect(formatNodeLabel(section)).toBe('Section');
    expect(formatNodeLabel(title)).toBe('Text');
    expect(getNodeAriaLabel(title)).toBe('Text: Post Title');
  });

  it('shares leaf text content and brand-mark detection', () => {
    const document = createInitialDocument();
    const image = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const link = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.link != null);
    if (!image || image.contentType !== 'media' || image.subtype !== 'image' || !link || link.contentType !== 'text') {
      throw new Error('Expected image and link leaves');
    }

    image.name = 'Brand Mark';

    expect(getNodeTextContent(image)).toBe(image.alt);
    expect(getNodeTextContent(link)).toBe(getTextContent(link.content.blocks));
    expect(isBrandMark(image)).toBe(true);
  });

  it('renders shared leaf content with stage-style options', () => {
    const document = createInitialDocument();
    const image = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const link = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.link != null);
    if (!image || image.contentType !== 'media' || image.subtype !== 'image' || !link || link.contentType !== 'text') {
      throw new Error('Expected image and link leaves');
    }

    image.src = '';

    const imageMarkup = renderToStaticMarkup(
      renderLeafContent(image, { imagePlaceholderClassName: 'image-placeholder' }),
    );
    const linkMarkup = renderToStaticMarkup(
      renderLeafContent(link, { disableTabNavigation: true, contentStyle: { color: '#1d4ed8' } }),
    );

    expect(imageMarkup).toContain('class="image-placeholder"');
    expect(linkMarkup).toContain('tabindex="-1"');
    expect(linkMarkup).toContain('color:#1d4ed8');
  });

  it('keeps block links on a single anchor wrapper', () => {
    const link = createLinkTextNode('root');
    link.htmlTag = 'h2';
    link.content = createTextDocumentFromText('Read more', { type: 'h2' });

    const linkMarkup = renderToStaticMarkup(renderLeafContent(link));

    expect(linkMarkup.startsWith('<h2')).toBe(true);
    expect(linkMarkup).toContain('<a');
    expect(linkMarkup).toContain('Read more');
    expect(linkMarkup).toContain('</a></h2>');
  });

  it('avoids nested anchors for legacy whole-node block links with inline links', () => {
    const link = createLinkTextNode('root');
    link.link = { linkType: 'external', href: 'https://example.com/root' };
    link.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Root ' },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com/inline',
            children: [{ text: 'inline' }],
          },
        ],
      },
    ]);

    const linkMarkup = renderToStaticMarkup(renderLeafContent(link));

    expect(linkMarkup.match(/<a\b/g)).toHaveLength(1);
    expect(linkMarkup).toContain('href="https://example.com/root"');
    expect(linkMarkup).not.toContain('href="https://example.com/inline"');
    expect(linkMarkup).toContain('Root inline');
  });

  it('wraps linked images in an anchor while keeping the image element inside', () => {
    const image = createInitialDocument();
    const node = Object.values(image.nodes).find((entry) => entry.contentType === 'media' && entry.subtype === 'image');

    if (!node || node.contentType !== 'media') {
      throw new Error('Expected image node');
    }

    node.link = { linkType: 'external', href: 'https://example.com/media' };

    const markup = renderToStaticMarkup(renderLeafContent(node));

    expect(markup).toContain('<a');
    expect(markup).toContain('href="https://example.com/media"');
    expect(markup).toContain('<img');
    expect(markup).toContain('</a>');
  });

  it('does not classify code nodes by legacy block-only link styling', () => {
    const code = createTextNode('code', 'root');
    code.link = { linkType: 'external', href: 'https://example.com' };
    code.style = { ...code.style, background: '#111827' };

    expect(formatNodeLabel(code)).toBe('Text');

    const markup = renderToStaticMarkup(renderLeafContent(code));
    expect(markup.startsWith('<div')).toBe(true);
    expect(markup).toContain('<pre');
    expect(markup).toContain('<code');
  });

  it('renders code blocks with a pre language class so prism theme chrome applies', () => {
    const code = createTextNode('code', 'root');
    code.content = createTextDocumentFromCode('const answer = 42;', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const answer = 42;',
    });
    code.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const answer = 42;',
    };

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup.startsWith('<div')).toBe(true);
    expect(markup).toContain('<pre');
    expect(markup).toContain('class="language-typescript"');
    expect(markup).toContain('data-code-theme="dark"');
    expect(markup).toContain('white-space:pre-wrap');
    expect(markup).toContain('word-break:break-word');
  });

  it('renders semantic ordered lists and flattens them for labels', () => {
    const list = createTextNode('list', 'root');
    list.content = createTextDocumentContent([
      listContentToRichListBlock({
        type: 'ol',
        start: 3,
        markerStyle: 'upper-alpha',
        items: [
          { text: 'Third', direction: 'rtl' },
          { text: 'Fourth', direction: 'ltr' },
        ],
      }),
    ]);

    const markup = renderToStaticMarkup(renderLeafContent(list, { contentStyle: { color: '#111827' } }));

    expect(getNodeTextContent(list)).toBe('Third\nFourth');
    expect(markup).toContain('<ol');
    expect(markup).toContain('start="3"');
    expect(markup).toContain('list-style-type:upper-alpha');
    expect(markup).toContain('list-style-position:outside');
    expect(markup).toContain('padding-inline-start:1.25em');
    expect(markup).toContain('dir="rtl"');
  });

  it('labels every text subtype explicitly', () => {
    const block = createTextNode('block', 'root');
    const rich = createTextNode('rich', 'root');
    const code = createTextNode('code', 'root');
    const list = createTextNode('list', 'root');

    expect(formatNodeLabel(block)).toBe('Text');
    expect(formatNodeLabel(rich)).toBe('Text');
    expect(formatNodeLabel(code)).toBe('Text');
    expect(formatNodeLabel(list)).toBe('Text');
  });

  it('renders rich code and list blocks through the shared rich renderer', () => {
    const rich = createTextNode('rich', 'root');
    rich.content = createTextDocumentContent([
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        highlightedHtml: 'const answer = 42;',
        children: [{ type: 'code-line', children: [{ text: 'const answer = 42;' }] }],
      },
      {
        type: 'ul',
        markerStyle: 'square',
        children: [
          { type: 'list-item', children: [{ text: 'Alpha' }] },
          { type: 'list-item', children: [{ text: 'Beta' }] },
        ],
      },
    ], { blockGap: 24 });

    const markup = renderToStaticMarkup(renderLeafContent(rich));

    expect(markup).toContain('row-gap:24px');
    expect(markup).toContain('language-typescript');
    expect(markup).toContain('data-code-theme="dark"');
    expect(markup).toContain('white-space:pre-wrap');
    expect(markup).toContain('word-break:break-word');
    expect(markup).toContain('<ul');
    expect(markup).toContain('list-style-type:square');
    expect(markup).toContain('list-style-position:outside');
    expect(markup).toContain('padding-inline-start:1.25em');
    expect(markup).toContain('<li dir="ltr">Beta</li>');
  });

  it('renders rich inline links with explicit link styling', () => {
    const rich = createTextNode('rich', 'root');
    rich.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Visit ' },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com/docs',
            children: [{ text: 'docs' }],
          },
          { text: ' today' },
        ],
      },
    ]);

    const markup = renderToStaticMarkup(renderLeafContent(rich));

    expect(markup).toContain('href="https://example.com/docs"');
    expect(markup).toContain('text-decoration:underline');
    expect(markup).toContain('color:#172033');
  });

  it('renders standalone block inline marks and links without inserting line breaks', () => {
    const block = createTextNode('block', 'root');
    block.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Line 1\n', bold: true },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com/docs',
            children: [{ text: 'docs', underline: true }],
          },
        ],
      },
    ]);

    const markup = renderToStaticMarkup(renderLeafContent(block));

    expect(markup).toContain('white-space:pre-wrap');
    expect(markup).toContain('font-weight:bold');
    expect(markup).toContain('href="https://example.com/docs"');
    expect(markup).toContain('Line 1\n');
    expect(markup).not.toContain('<br');
  });

  it('renders repeated rich inline nodes without React key warnings', () => {
    const rich = createTextNode('rich', 'root');
    rich.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'same' },
          { text: 'same' },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com/docs',
            children: [{ text: 'docs' }],
          },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com/docs',
            children: [{ text: 'docs' }],
          },
        ],
      },
    ]);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderToStaticMarkup(renderLeafContent(rich));

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Each child in a list should have a unique "key" prop.'),
      expect.anything(),
      expect.anything(),
    );
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toContain('Each child in a list should have a unique "key" prop.');
    consoleErrorSpy.mockRestore();
  });

  it('renders numeric rich leaf font weights', () => {
    const rich = createTextNode('rich', 'root');
    rich.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [{ text: 'Weighted copy', fontWeight: 600 }],
      },
    ]);

    const markup = renderToStaticMarkup(renderLeafContent(rich));

    expect(markup).toContain('font-weight:600');
  });
});
