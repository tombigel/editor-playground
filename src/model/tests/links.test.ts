import { describe, expect, it } from 'vitest';
import { createInitialDocument, createLeaf } from '../defaults';
import { getSectionAnchorOptions, isBrokenAnchorLink } from '../links';

describe('model/links', () => {
  it('lists top-level sections as anchor options with human-readable labels', () => {
    const document = createInitialDocument();
    const header = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );
    const footer = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'footer',
    );

    if (
      !header || header.type !== 'wrapper' ||
      !section || section.type !== 'wrapper' ||
      !footer || footer.type !== 'wrapper'
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
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link',
    );

    if (!link || link.type !== 'leaf' || link.role !== 'link') {
      throw new Error('Expected link node');
    }

    link.linkType = 'anchor';
    link.anchorTargetId = 'missing-section';

    expect(isBrokenAnchorLink(document, link)).toBe(true);
  });

  it('does not flag default internal links without an explicit target as broken', () => {
    const document = createInitialDocument();
    const link = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link',
    );

    if (!link || link.type !== 'leaf' || link.role !== 'link') {
      throw new Error('Expected link node');
    }

    link.linkType = 'anchor';
    link.anchorTargetId = undefined;
    link.href = '#';

    expect(isBrokenAnchorLink(document, link)).toBe(false);
  });

  it('flags anchor buttons whose section targets no longer exist', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section node');
    }

    const button = createLeaf('button', section.id);
    document.nodes[button.id] = button;
    section.children.push(button.id);

    if (button.type !== 'leaf' || button.role !== 'button') {
      throw new Error('Expected button node');
    }

    button.linkType = 'anchor';
    button.anchorTargetId = 'missing-section';

    expect(isBrokenAnchorLink(document, button)).toBe(true);
  });
});
