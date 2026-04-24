import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createSectionFromTemplate, createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createTextDocumentFromCode } from '../../model/richContent';
import { parseUnitValue } from '../../model/units';
import { SiteRenderer } from '../SiteRenderer';

describe('site/SiteRenderer', () => {
  it('renders text leaves using their configured html tag', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!target || target.contentType !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.htmlTag = 'h2';

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain('<h2');
    expect(markup).toContain('Plan sticky behavior before building scroll-driven animations');
  });

  it('renders self sticky nodes inside a sticky track with a spacer', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!target || target.contentType !== 'text') {
      throw new Error('Expected text leaf');
    }

    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true },
      durationMode: 'custom',
      duration: parseUnitValue('40vh'),
      durationTop: parseUnitValue('40vh'),
      durationBottom: parseUnitValue('40vh'),
      offsetTop: parseUnitValue('10vh'),
    };

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-track-for="${target.id}"`);
    expect(markup).toContain(`class="sp-sticky-spacer sp-sticky-spacer-top sp-node-${target.id}-top-spacer"`);
  });

  it('renders content-wrapper sticky wrappers with a flow spacer', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!target || target.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    target.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true },
      durationMode: 'custom',
      duration: parseUnitValue('60vh'),
      durationTop: parseUnitValue('60vh'),
      durationBottom: parseUnitValue('60vh'),
      offsetTop: parseUnitValue('12vh'),
    };

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`class="sp-wrapper-content sp-node-${target.id}-content"`);
    expect(markup).toContain(`class="sp-content-spacer sp-node-${target.id}-content-spacer"`);
  });

  it('renders bottom-edge sticky nodes with the spacer before the node content', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!target || target.contentType !== 'text') {
      throw new Error('Expected link leaf');
    }

    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { bottom: true },
      durationMode: 'custom',
      duration: parseUnitValue('40vh'),
      durationTop: parseUnitValue('40vh'),
      durationBottom: parseUnitValue('40vh'),
      offsetBottom: parseUnitValue('24px'),
    };

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);
    const spacerIndex = markup.indexOf(`sp-node-${target.id}-bottom-spacer`);
    const nodeIndex = markup.indexOf(`data-node-id="${target.id}"`);

    expect(spacerIndex).toBeGreaterThan(-1);
    expect(nodeIndex).toBeGreaterThan(spacerIndex);
  });

  it('renders auto self-sticky leaves without a synthetic track wrapper', () => {
    const document = structuredClone(createInitialDocument());
    const stickyPinnedCards = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    document.nodes = {
      ...document.nodes,
      ...stickyPinnedCards.nodes,
    };
    document.nodes[document.rootId].children.push(stickyPinnedCards.wrapper.id);

    const pinnedLead = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Pinned Lead',
    );

    if (!pinnedLead || pinnedLead.contentType !== 'text') {
      throw new Error('Expected pinned lead text node');
    }

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-id="${pinnedLead.id}"`);
    expect(markup).not.toContain(`data-node-track-for="${pinnedLead.id}"`);
  });

  it('omits hidden wrappers and their descendants from site output', () => {
    const document = structuredClone(createInitialDocument());
    const hiddenSection = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!hiddenSection || hiddenSection.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const hiddenChildId = hiddenSection.children[0];
    hiddenSection.visible = false;

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).not.toContain(`id="${hiddenSection.id}"`);
    expect(markup).not.toContain(`data-node-id="${hiddenChildId}"`);
  });

  it('marks current-page links with aria-current', () => {
    const document = structuredClone(createInitialDocument());
    const homePage = document.pages?.find((page) => page.pageRole === 'home');
    const pageLink = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!homePage || !pageLink || pageLink.contentType !== 'text' || pageLink.link == null) {
      throw new Error('Expected home page and link node');
    }

    pageLink.link = { ...(pageLink.link ?? { linkType: 'page' }), linkType: 'page' };
    pageLink.link = { ...(pageLink.link ?? { linkType: 'page' }), targetPageId: homePage.id };

    const markup = renderToStaticMarkup(<SiteRenderer document={document} pageId={homePage.id} />);

    expect(markup).toContain(`data-node-id="${pageLink.id}"`);
    expect(markup).toContain('aria-current="page"');
  });

  it('renders rich text with a div wrapper and semantic inner blocks', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const rich = createTextNode('rich', section.id);
    rich.content = createTextDocumentContent([
      { type: 'h2', children: [{ text: 'Heading' }] },
      { type: 'paragraph', children: [{ text: 'Paragraph copy' }] },
    ]);
    document.nodes[rich.id] = rich;
    section.children.push(rich.id);

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-id="${rich.id}"`);
    expect(markup).toContain('<h2');
    expect(markup).toContain('>Heading</h2>');
    expect(markup).toContain('<p');
    expect(markup).toContain('>Paragraph copy</p>');
  });

  it('renders semantic list wrappers for standalone list nodes', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const list = createTextNode('list', section.id);
    list.content = createTextDocumentContent([
      {
        type: 'ul',
        markerStyle: 'square',
        children: [
          { type: 'list-item', children: [{ text: 'Alpha' }] },
          {
            type: 'list-item',
            direction: 'rtl',
            depth: 1,
            children: [
              { text: 'Beta ', fontSize: '22px' },
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com',
                children: [{ text: 'link', color: '#d62246' }],
              },
            ],
          },
        ],
      },
    ]);
    document.nodes[list.id] = list;
    section.children.push(list.id);

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-id="${list.id}"`);
    expect(markup).toContain('<ul');
    expect(markup).toContain('list-style-type:square');
    expect(markup).toContain('<li dir="rtl" style="margin-inline-start:1.25em">');
    expect(markup).toContain('font-size:22px');
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain('color:#d62246');
  });

  it('reuses shared code rendering semantics in site output', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const code = createTextNode('code', section.id);
    code.content = createTextDocumentFromCode('const total = 3;', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const total = 3;',
    });
    code.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const total = 3;',
    };
    document.nodes[code.id] = code;
    section.children.push(code.id);

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-id="${code.id}"`);
    expect(markup).toContain('language-typescript');
    expect(markup).toContain('data-code-theme="dark"');
  });

  it('renders rich code and list blocks with the shared rich-content semantics', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const rich = createTextNode('rich', section.id);
    rich.content = createTextDocumentContent([
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        highlightedHtml: 'const total = 3;',
        children: [{ type: 'code-line', children: [{ text: 'const total = 3;' }] }],
      },
      {
        type: 'ol',
        start: 4,
        markerStyle: 'upper-alpha',
        children: [
          { type: 'list-item', children: [{ text: 'Fourth' }] },
          { type: 'list-item', children: [{ text: 'Fifth' }] },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    section.children.push(rich.id);

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-id="${rich.id}"`);
    expect(markup).toContain('language-typescript');
    expect(markup).toContain('data-code-theme="dark"');
    expect(markup).toContain('white-space:pre-wrap');
    expect(markup).toContain('word-break:break-word');
    expect(markup).toContain('<ol');
    expect(markup).toContain('start="4"');
    expect(markup).toContain('list-style-type:upper-alpha');
  });
});
