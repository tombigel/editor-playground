import { describe, expect, it } from 'vitest';
import { createInitialDocument, createButtonTextNode } from '../defaults';
import { createPage } from '../pageDefaults';
import { getSectionAnchorOptions, isBrokenAnchorLink, getLinkHref } from '../links';

function appendPage(document: ReturnType<typeof createInitialDocument>, displayName: string, slug: string) {
  const page = createPage({ displayName, slug });
  document.pages = [...(document.pages ?? []), page];
  return { document, page };
}

describe('model/links', () => {
  it('lists top-level sections as anchor options with human-readable labels', () => {
    const document = createInitialDocument();
    const header = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'header',
    );
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );
    const footer = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'footer',
    );

    if (
      !header || header.contentType !== 'container' ||
      !section || section.contentType !== 'container' ||
      !footer || footer.contentType !== 'container'
    ) {
      throw new Error('Expected top-level header, section, and footer');
    }

    expect(getSectionAnchorOptions(document)).toEqual([
      {
        id: header.id,
        name: 'Top',
        href: '#',
        label: 'Top',
      },
      {
        id: section.id,
        name: section.name,
        href: `#${section.id}`,
        label: section.name,
        detail: `#${section.id}`,
      },
      {
        id: footer.id,
        name: 'Bottom',
        href: `#${footer.id}`,
        label: 'Bottom',
      },
    ]);
  });

  it('flags anchor links whose section targets no longer exist', () => {
    const document = createInitialDocument();
    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected link node');
    }

    link.link = { ...link.link, linkType: 'anchor', anchorTargetId: 'missing-section' };

    expect(isBrokenAnchorLink(document, link)).toBe(true);
  });

  it('does not flag default internal links without an explicit target as broken', () => {
    const document = createInitialDocument();
    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected link node');
    }

    link.link = { ...link.link, linkType: 'anchor', anchorTargetId: undefined, href: '#' };

    expect(isBrokenAnchorLink(document, link)).toBe(false);
  });

  it('flags anchor buttons whose section targets no longer exist', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section node');
    }

    const button = createButtonTextNode(section.id);
    document.nodes[button.id] = button;
    section.children.push(button.id);

    if (button.contentType !== 'text' || button.link == null) {
      throw new Error('Expected button node');
    }

    button.link = { ...button.link, linkType: 'anchor', anchorTargetId: 'missing-section' };

    expect(isBrokenAnchorLink(document, button)).toBe(true);
  });

  it('returns page URL for page links with linkType "page"', () => {
    const { document, page: aboutPage } = appendPage(createInitialDocument(), 'About', 'about');

    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected link node');
    }

    link.link = { ...link.link, linkType: 'page', targetPageId: aboutPage.id };

    const url = getLinkHref(link.link, document);
    expect(url).toBe('/about/');
  });

  it('appends anchor to page URL for page links with pageAnchorId', () => {
    const { document, page: aboutPage } = appendPage(createInitialDocument(), 'About', 'about');

    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected link node');
    }

    link.link = { ...link.link, linkType: 'page', targetPageId: aboutPage.id, pageAnchorId: 'section-1' };

    const url = getLinkHref(link.link, document);
    expect(url).toBe('/about/#section-1');
  });

  it('flags page links whose target page does not exist', () => {
    const document = createInitialDocument();
    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected link node');
    }

    link.link = { ...link.link, linkType: 'page', targetPageId: 'missing-page' };

    expect(isBrokenAnchorLink(document, link)).toBe(true);
  });
});
