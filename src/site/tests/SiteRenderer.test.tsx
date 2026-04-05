import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createSectionFromTemplate } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import { SiteRenderer } from '../SiteRenderer';

describe('site/SiteRenderer', () => {
  it('renders text leaves using their configured html tag', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
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
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf') {
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
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!target || target.type !== 'wrapper') {
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
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link',
    );

    if (!target || target.type !== 'leaf') {
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
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Pinned Lead',
    );

    if (!pinnedLead || pinnedLead.type !== 'leaf' || pinnedLead.role !== 'text') {
      throw new Error('Expected pinned lead text node');
    }

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain(`data-node-id="${pinnedLead.id}"`);
    expect(markup).not.toContain(`data-node-track-for="${pinnedLead.id}"`);
  });

  it('omits hidden wrappers and their descendants from site output', () => {
    const document = structuredClone(createInitialDocument());
    const hiddenSection = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!hiddenSection || hiddenSection.type !== 'wrapper') {
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
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link',
    );

    if (!homePage || !pageLink || pageLink.type !== 'leaf' || pageLink.role !== 'link') {
      throw new Error('Expected home page and link node');
    }

    pageLink.linkType = 'page';
    pageLink.targetPageId = homePage.id;

    const markup = renderToStaticMarkup(<SiteRenderer document={document} pageId={homePage.id} />);

    expect(markup).toContain(`data-node-id="${pageLink.id}"`);
    expect(markup).toContain('aria-current="page"');
  });
});
