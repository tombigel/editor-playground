import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialDocument, createLinkTextNode, createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createTextDocumentFromCode, getTextContent, listContentToRichListBlock } from '../../model/richContent';
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
    expect(formatNodeLabel(title)).toBe('Text: block');
    expect(getNodeAriaLabel(title)).toBe('Text: block: Post Title');
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
    expect(linkMarkup).toContain('style="color:#1d4ed8"');
  });

  it('keeps block links on a single anchor wrapper', () => {
    const link = createLinkTextNode('root');
    link.htmlTag = 'h2';

    const linkMarkup = renderToStaticMarkup(renderLeafContent(link));

    expect(linkMarkup.startsWith('<a')).toBe(true);
    expect(linkMarkup).toContain('Read more');
    expect(linkMarkup).not.toContain('<h2');
    expect(linkMarkup).not.toContain('<p');
  });

  it('does not classify code nodes by legacy block-only link styling', () => {
    const code = createTextNode('code', 'root');
    code.link = { linkType: 'external', href: 'https://example.com' };
    code.style = { ...code.style, background: '#111827' };

    expect(formatNodeLabel(code)).toBe('Text: code');

    const markup = renderToStaticMarkup(renderLeafContent(code));
    expect(markup.startsWith('<pre')).toBe(true);
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

    expect(markup).toContain('class="language-typescript"');
    expect(markup).toContain('data-code-theme="dark"');
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
    expect(markup).toContain('dir="rtl"');
  });

  it('labels every text subtype explicitly', () => {
    const block = createTextNode('block', 'root');
    const rich = createTextNode('rich', 'root');
    const code = createTextNode('code', 'root');
    const list = createTextNode('list', 'root');

    expect(formatNodeLabel(block)).toBe('Text: block');
    expect(formatNodeLabel(rich)).toBe('Text: rich');
    expect(formatNodeLabel(code)).toBe('Text: code');
    expect(formatNodeLabel(list)).toBe('Text: list');
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
    expect(markup).toContain('<ul');
    expect(markup).toContain('list-style-type:square');
    expect(markup).toContain('<li dir="ltr">Beta</li>');
  });
});
