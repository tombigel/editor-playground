import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createInitialDocument, createLinkTextNode, createMediaNode, createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createTextDocumentFromCode, createTextDocumentFromText, getTextContent, listContentToRichListBlock } from '../../model/richContent';
import { CODE_THEME_SURFACE } from '../../model/textNodeDefaults';
import { parseFontSizeValue } from '../../model/units';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  getNodeTextContent,
  isBrandMark,
  renderLeafContent,
} from '../nodePresentation';

const maliciousHighlightHtml = '<span class="token keyword">const</span><script>alert(1)</script><img src=x onerror=alert(2)><svg onload=alert(3)></svg>';

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

  it('renders video nodes with playback attributes and fit styling', () => {
    const video = createMediaNode('video', 'section-1');
    video.src = 'https://example.com/clip.mp4';
    video.video = { ...video.video, poster: 'https://example.com/poster.jpg', autoplay: true, muted: false, loop: true, preload: 'metadata' };
    video.style = { ...video.style, objectFit: 'cover', objectPosition: 'left top' };

    const markup = renderToStaticMarkup(
      renderLeafContent(video, { videoClassName: 'sp-video' }),
    );

    expect(markup).toContain('<video');
    expect(markup).toContain('class="sp-video"');
    expect(markup).toContain('src="https://example.com/clip.mp4"');
    expect(markup).toContain('poster="https://example.com/poster.jpg"');
    expect(markup).toContain('controls');
    expect(markup.toLowerCase()).toContain('autoplay');
    expect(markup).toContain('loop');
    expect(markup).not.toContain('muted');
    expect(markup).toContain('preload="metadata"');
    expect(markup).toContain('object-fit:cover');
    expect(markup).toContain('object-position:left top');
  });

  it('renders a paused non-interactive video preview for the stage', () => {
    const video = createMediaNode('video', 'section-1');
    video.src = 'https://example.com/clip.mp4';
    video.video = { ...video.video, autoplay: true, controls: true };

    const markup = renderToStaticMarkup(
      renderLeafContent(video, { videoClassName: 'stage-video', videoPreviewOnly: true }),
    );

    expect(markup).toContain('<video');
    expect(markup.toLowerCase()).not.toContain('autoplay');
    expect(markup).not.toContain('controls');
    expect(markup).toContain('muted');
    expect(markup).toContain('preload="metadata"');
    expect(markup).toContain('pointer-events:none');
  });

  it('never wraps a video in an anchor even when a legacy link exists on the node', () => {
    const video = createMediaNode('video', 'section-1');
    video.src = 'https://example.com/clip.mp4';
    video.link = { linkType: 'external', href: 'https://example.com' };

    const markup = renderToStaticMarkup(renderLeafContent(video, { videoClassName: 'sp-video' }));

    expect(markup).toContain('<video');
    expect(markup).not.toContain('<a');
  });

  it('formats media node labels per subtype', () => {
    const video = createMediaNode('video', 'section-1');
    const image = createMediaNode('image', 'section-1');
    expect(formatNodeLabel(video)).toBe('Video');
    expect(formatNodeLabel(image)).toBe('Image');
  });

  it('renders inline svg with viewBox, decorative aria, and injected title', () => {
    const svg = createMediaNode('svg', 'section-1');
    svg.svg = {
      renderMode: 'inline',
      innerMarkup: '<circle r="5" fill="blue"/>',
      originalViewBox: '0 0 10 10',
      a11y: { hidden: true },
    };
    svg.style = { objectFit: 'cover', objectPosition: 'left top' };

    const markup = renderToStaticMarkup(renderLeafContent(svg, { svgClassName: 'sp-svg' }));

    expect(markup).toContain('<svg');
    expect(markup).toContain('class="sp-svg"');
    expect(markup).toContain('viewBox="0 0 10 10"');
    expect(markup).toContain('preserveAspectRatio="xMinYMin slice"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
    expect(markup).toContain('<circle r="5" fill="blue"');
    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain('aria-label');
  });

  it('renders labelled inline svg with role img, aria-describedby, and author viewBox override', () => {
    const svg = createMediaNode('svg', 'section-1');
    svg.svg = {
      renderMode: 'inline',
      innerMarkup: '<rect width="10" height="10"/>',
      originalViewBox: '0 0 10 10',
      viewBox: '2 2 6 6',
      a11y: { title: 'Company logo', desc: 'A <blue> square mark' },
      monochrome: { enabled: true, fill: 'rgba(255,0,0,0.5)' },
      stroke: { enabled: true, color: '#00ff00', width: 2 },
    };

    const markup = renderToStaticMarkup(renderLeafContent(svg, { svgClassName: 'sp-svg' }));

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Company logo"');
    expect(markup).toContain(`aria-describedby="sp-svg-desc-${svg.id}"`);
    expect(markup).toContain(`<desc id="sp-svg-desc-${svg.id}">A &lt;blue&gt; square mark</desc>`);
    expect(markup).toContain('viewBox="2 2 6 6"');
    expect(markup).toContain('sp-svg-mono');
    expect(markup).toContain('sp-svg-stroke');
    expect(markup).toContain('color:rgba(255,0,0,0.5)');
    expect(markup).not.toContain('--sp-svg-fill-opacity');
    expect(markup).toContain('--sp-svg-stroke-color:#00ff00');
    expect(markup).toContain('--sp-svg-stroke-width:2');
  });

  it('never emits aria-hidden together with an accessible name', () => {
    const svg = createMediaNode('svg', 'section-1');
    svg.svg = {
      renderMode: 'inline',
      innerMarkup: '<rect width="10" height="10"/>',
      originalViewBox: '0 0 10 10',
      // Decorative wins: a stale title must not leak into an aria-hidden element.
      a11y: { hidden: true, title: 'should be ignored' },
    };

    const markup = renderToStaticMarkup(renderLeafContent(svg, { svgClassName: 'sp-svg' }));
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-label');
    expect(markup).not.toContain('role="img"');
  });

  it('renders a placeholder for a video without a source', () => {
    const video = createMediaNode('video', 'section-1');
    video.src = undefined;

    const markup = renderToStaticMarkup(
      renderLeafContent(video, { imagePlaceholderClassName: 'image-placeholder' }),
    );

    expect(markup).toContain('class="image-placeholder"');
    expect(markup).toContain('Video');
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
    expect(markup).toContain('display:block');
    expect(markup).toContain('width:100%');
    expect(markup).toContain('white-space:pre-wrap');
    expect(markup).toContain('word-break:break-word');
    expect(markup).toContain('overflow-wrap:anywhere');
    expect(markup).toContain('word-wrap:break-word');
  });

  it('renders non-wrapped code blocks with horizontal overflow', () => {
    const code = createTextNode('code', 'root');
    code.style = { ...code.style, textWrap: 'single-line' };
    code.content = createTextDocumentFromCode('const answer = someVeryLongExpression();', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const answer = someVeryLongExpression();',
      style: { textWrap: 'single-line' },
    });

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup).toContain('white-space:pre');
    expect(markup).toContain('word-break:normal');
    expect(markup).toContain('overflow-x:auto');
  });

  it('renders auto themed code block markup', () => {
    const code = createTextNode('code', 'root');
    code.content = createTextDocumentFromCode('const answer = 42;', {
      language: 'typescript',
      theme: 'auto' as never,
      highlightedHtml: '<span class="token keyword">const</span> answer = 42;',
    });
    code.code = {
      language: 'typescript',
      theme: 'auto' as never,
      highlightedHtml: '<span class="token keyword">const</span> answer = 42;',
    };

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup).toContain('data-code-theme="auto"');
  });

  it('recomputes standalone code HTML instead of trusting highlightedHtml', () => {
    const code = createTextNode('code', 'root');
    code.content = createTextDocumentFromCode('const safe = 1;', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: maliciousHighlightHtml,
    });
    code.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: maliciousHighlightHtml,
    };

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup).toContain('<span class="token keyword">const</span>');
    expect(markup).not.toContain('<script');
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('onerror');
    expect(markup).not.toContain('<svg');
    expect(markup).not.toContain('onload');
  });

  it('recomputes rich code block HTML instead of trusting highlightedHtml', () => {
    const rich = createTextNode('rich', 'root');
    rich.content = createTextDocumentContent([
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        highlightedHtml: maliciousHighlightHtml,
        children: [{ type: 'code-line', children: [{ text: 'const safe = 1;' }] }],
      },
    ]);

    const markup = renderToStaticMarkup(renderLeafContent(rich));

    expect(markup).toContain('<span class="token keyword">const</span>');
    expect(markup).not.toContain('<script');
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('onerror');
    expect(markup).not.toContain('<svg');
    expect(markup).not.toContain('onload');
  });

  it('keeps explicit light and dark code block themes in markup', () => {
    const light = createTextNode('code', 'root');
    light.content = createTextDocumentFromCode('const light = true;', {
      language: 'typescript',
      theme: 'light',
      highlightedHtml: 'const light = true;',
    });
    light.code = {
      language: 'typescript',
      theme: 'light',
      highlightedHtml: 'const light = true;',
    };

    const dark = createTextNode('code', 'root');
    dark.content = createTextDocumentFromCode('const dark = true;', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const dark = true;',
    });
    dark.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const dark = true;',
    };

    expect(renderToStaticMarkup(renderLeafContent(light))).toContain('data-code-theme="light"');
    expect(renderToStaticMarkup(renderLeafContent(dark))).toContain('data-code-theme="dark"');
  });

  it('applies code tab size, typography, and authored color to the visible code surface', () => {
    const code = createTextNode('code', 'root');
    code.content = createTextDocumentFromCode('const answer = 42;', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: '<span class="token keyword">const</span> answer = 42;',
      style: {
        color: '#123456',
        fontFamily: 'JetBrains Mono',
        fontSize: '15px',
        fontWeight: 600,
        fontStyle: 'italic',
        textDecorationLine: 'underline',
        lineHeight: 1.6,
        tabSize: 4,
        textWrap: 'single-line',
      } as never,
    });

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup).toContain('data-code-color="author"');
    expect(markup).toContain('tab-size:4');
    expect(markup).toContain('color:#123456');
    expect(markup).toContain('font-family:JetBrains Mono');
    expect(markup).toContain('font-size:15px');
    expect(markup).toContain('font-weight:600');
    expect(markup).toContain('font-style:italic');
    expect(markup).toContain('text-decoration-line:underline');
    expect(markup).toContain('line-height:1.6');
    expect(markup).toContain('overflow-x:auto');
    expect(markup).toContain('<code class="language-typescript" style="');
  });

  it('keeps standalone code node styling when canonical code block style is partial', () => {
    const code = createTextNode('code', 'root');
    code.style = {
      ...code.style,
      color: CODE_THEME_SURFACE.light.color,
      background: '#101418',
      fontFamily: 'JetBrains Mono',
      fontSize: parseFontSizeValue('22px'),
      tabSize: 6,
      textWrap: 'single-line',
    };
    code.content = createTextDocumentFromCode('const answer = 42;', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: '<span class="token keyword">const</span> answer = 42;',
      style: {
        tabSize: 4,
        textWrap: 'wrap',
      } as never,
    });

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup).toContain('data-code-theme="dark"');
    expect(markup).not.toContain('background:#f5f2f0');
    expect(markup).not.toContain('color:#16202a');
    expect(markup).not.toContain('data-code-color="author"');
    expect(markup).toContain('background-color:#101418');
    expect(markup).toContain('JetBrains Mono');
    expect(markup).toContain('font-size:22px');
    expect(markup).toContain('tab-size:6');
    expect(markup).toContain('white-space:pre');
    expect(markup).toContain('overflow-x:auto');
  });

  it('lets standalone code theme, wrap, and tabs override stale embedded block style', () => {
    const code = createTextNode('code', 'root');
    code.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: '<span class="token keyword">const</span> answer = 42;',
    };
    code.style = {
      ...code.style,
      background: CODE_THEME_SURFACE.light.background,
      tabSize: 6,
      textWrap: 'single-line',
    };
    code.content = createTextDocumentFromCode('const answer = 42;', {
      language: 'typescript',
      theme: 'light',
      highlightedHtml: '<span class="token keyword">const</span> answer = 42;',
      style: {
        background: CODE_THEME_SURFACE.light.background,
        tabSize: 2,
        textWrap: 'wrap',
      } as never,
    });

    const markup = renderToStaticMarkup(renderLeafContent(code));

    expect(markup).toContain('data-code-theme="dark"');
    expect(markup).toContain('background:#272822');
    expect(markup).not.toContain('background:#f5f2f0');
    expect(markup).toContain('tab-size:6');
    expect(markup).toContain('white-space:pre');
    expect(markup).toContain('overflow-x:auto');
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

  it('renders standalone list inline content and depth from the canonical rich block', () => {
    const list = createTextNode('list', 'root');
    list.content = createTextDocumentContent([
      {
        type: 'ul',
        markerStyle: 'square',
        children: [
          {
            type: 'list-item',
            depth: 1,
            children: [
              { text: 'Styled ', bold: true, fontSize: '20px', color: '#d62246', backgroundColor: '#fff59d' },
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com/one',
                children: [{ text: 'one', underline: true }],
              },
              { text: ' and ' },
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com/two',
                children: [{ text: 'two', italic: true }],
              },
            ],
          },
        ],
      },
    ]);

    const markup = renderToStaticMarkup(renderLeafContent(list));

    expect(markup).toContain('<ul');
    expect(markup.match(/<ul/g)).toHaveLength(1);
    expect(markup).toContain('<li dir="ltr" style="margin-inline-start:1.25em">');
    expect(markup).toContain('font-weight:bold');
    expect(markup).toContain('font-size:20px');
    expect(markup).toContain('color:#d62246');
    expect(markup).toContain('background-color:#fff59d');
    expect(markup.match(/<a /g)).toHaveLength(2);
    expect(markup).toContain('href="https://example.com/one"');
    expect(markup).toContain('href="https://example.com/two"');
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
    expect(markup).toContain('overflow-wrap:anywhere');
    expect(markup).toContain('word-wrap:break-word');
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
