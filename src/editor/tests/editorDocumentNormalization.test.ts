import { describe, expect, it } from 'vitest';
import {
  cloneDocument,
  isStructuralWrapper,
  normalizeDocument,
  normalizeTextHtmlTag,
} from '../editorDocumentNormalization';
import { createContainerNode, createInitialDocument, createTextNode } from '../../model/defaults';
import type { ContainerSubtype } from '../../model/types';
import { isContainerNode, isSiteNode, isTextNode } from '../../model/types';

describe('editor/editorDocumentNormalization', () => {
  describe('cloneDocument', () => {
    it('deep-clones nodes so mutating the clone does not affect the original', () => {
      const document = createInitialDocument();
      const clone = cloneDocument(document);

      expect(clone).not.toBe(document);
      expect(clone.nodes).not.toBe(document.nodes);

      const originalRoot = document.nodes[document.rootId];
      const clonedRoot = clone.nodes[document.rootId];
      expect(clonedRoot).not.toBe(originalRoot);
      expect(clonedRoot).toEqual(originalRoot);

      const clonedFirstChildId = clonedRoot?.children[0];
      if (!clonedFirstChildId) {
        throw new Error('Expected root to have children');
      }
      const clonedChild = clone.nodes[clonedFirstChildId];
      const originalChild = document.nodes[clonedFirstChildId];
      if (!clonedChild || !originalChild || !isContainerNode(clonedChild) || !isContainerNode(originalChild)) {
        throw new Error('Expected container child node');
      }

      // Mutate a nested field on the clone and verify no leak back to the original.
      clonedChild.style = { ...clonedChild.style, background: '#000000' };
      expect(originalChild.style?.background).not.toBe('#000000');

      clonedChild.children.push('mutated_child_id');
      expect(originalChild.children).not.toContain('mutated_child_id');
    });

    it('deep-clones optional document fields when present and omits them when absent', () => {
      const document = createInitialDocument();
      document.animationSettings = { enabled: true } as never;

      const clone = cloneDocument(document);

      expect(clone.fontLibrary).not.toBe(document.fontLibrary);
      expect(clone.fontLibrary).toEqual(document.fontLibrary);

      expect(clone.pages).not.toBe(document.pages);
      expect(clone.pages).toEqual(document.pages);

      expect(clone.sharedRegionIds).not.toBe(document.sharedRegionIds);
      expect(clone.sharedRegionIds).toEqual(document.sharedRegionIds);

      expect(clone.animationSettings).not.toBe(document.animationSettings);
      expect(clone.animationSettings).toEqual(document.animationSettings);

      const bare = createInitialDocument();
      delete bare.pages;
      delete bare.siteSettings;
      delete bare.sharedRegionIds;
      delete bare.animationSettings;
      const bareClone = cloneDocument(bare);

      expect(bareClone.pages).toBeUndefined();
      expect(bareClone.siteSettings).toBeUndefined();
      expect(bareClone.sharedRegionIds).toBeUndefined();
      expect(bareClone.animationSettings).toBeUndefined();
    });
  });

  describe('normalizeDocument', () => {
    it('normalizes invalid text node html tags to the paragraph default', () => {
      const document = createInitialDocument();
      const textNode = createTextNode('block', document.rootId);
      textNode.htmlTag = 'span' as never;
      document.nodes[textNode.id] = textNode;

      const normalized = normalizeDocument(document);
      expect(normalized.nodes[textNode.id]).toMatchObject({ htmlTag: 'p' });
    });

    it('normalizes sticky definitions, filling in defaults for partially-defined sticky nodes', () => {
      const document = createInitialDocument();
      const container = createContainerNode('container', document.rootId);
      container.sticky = { edges: { top: true } } as never;
      document.nodes[container.id] = container;

      const normalized = normalizeDocument(document);
      const normalizedNode = normalized.nodes[container.id];
      if (normalizedNode.contentType !== 'container') {
        throw new Error('Expected container node');
      }
      const normalizedSticky = normalizedNode.sticky;

      expect(normalizedSticky).toMatchObject({
        enabled: false,
        target: 'self',
        durationMode: 'auto',
      });
      expect(normalizedSticky?.duration).toBeDefined();
      expect(normalizedSticky?.durationTop).toBeDefined();
      expect(normalizedSticky?.durationBottom).toBeDefined();
    });

    it('resolves legacy sticky data with both edges pinned using the offset heuristic', () => {
      const document = createInitialDocument();
      const container = createContainerNode('container', document.rootId);
      container.sticky = {
        edges: { top: true, bottom: true },
        offsetTop: 0,
        offsetBottom: 20,
      } as never;
      document.nodes[container.id] = container;

      const normalized = normalizeDocument(document);
      const normalizedNode = normalized.nodes[container.id];
      if (normalizedNode.contentType !== 'container') {
        throw new Error('Expected container node');
      }
      // offsetTop falsy (0) and offsetBottom truthy -> top should be forced off
      expect(normalizedNode.sticky?.edges).toEqual({
        top: false,
        bottom: true,
      });
    });

    it('resets a "contentWrapper" sticky target back to "self" for plain container subtype nodes', () => {
      const document = createInitialDocument();
      const container = createContainerNode('container', document.rootId);
      container.sticky = { target: 'contentWrapper' } as never;
      document.nodes[container.id] = container;

      const normalized = normalizeDocument(document);
      const normalizedNode = normalized.nodes[container.id];
      if (normalizedNode.contentType !== 'container') {
        throw new Error('Expected container node');
      }
      expect(normalizedNode.sticky?.target).toBe('self');
    });

    it('forces opaque backgrounds on structural wrapper nodes (section/header/footer)', () => {
      const document = createInitialDocument();
      const root = document.nodes[document.rootId];
      if (!root || !isSiteNode(root)) {
        throw new Error('unexpected root shape');
      }
      const sectionId = root.children.find((id) => {
        const node = document.nodes[id];
        return node && isContainerNode(node) && node.subtype === 'section';
      });
      if (!sectionId) {
        throw new Error('Expected a section wrapper in the initial document');
      }
      const section = document.nodes[sectionId];
      if (!section || !isContainerNode(section)) {
        throw new Error('Expected container node');
      }
      section.style = { ...section.style, background: 'rgba(10, 20, 30, 0.4)' };

      const normalized = normalizeDocument(document);
      const normalizedSection = normalized.nodes[sectionId];
      if (!normalizedSection || !isContainerNode(normalizedSection)) {
        throw new Error('Expected container node');
      }
      expect(normalizedSection.style?.background).toBe('rgb(10, 20, 30)');
    });

    it('does not force opaque backgrounds on non-structural container subtypes', () => {
      const document = createInitialDocument();
      const container = createContainerNode('container', document.rootId);
      container.style = { ...container.style, background: 'rgba(10, 20, 30, 0.4)' };
      document.nodes[container.id] = container;
      const root = document.nodes[document.rootId];
      if (root && isSiteNode(root)) {
        root.children.push(container.id);
      }

      const normalized = normalizeDocument(document);
      const normalizedContainer = normalized.nodes[container.id];
      if (!normalizedContainer || !isContainerNode(normalizedContainer)) {
        throw new Error('Expected container node');
      }
      expect(normalizedContainer.style?.background).toBe('rgba(10, 20, 30, 0.4)');
    });

    it('ensures a default header and footer are present when missing from a site document', () => {
      const document = createInitialDocument();
      const root = document.nodes[document.rootId];
      if (!root || !isSiteNode(root)) {
        throw new Error('unexpected root shape');
      }

      // Remove existing header/footer wrappers so the document has neither.
      root.children = root.children.filter((id) => {
        const node = document.nodes[id];
        const isChrome = node && isContainerNode(node) && (node.subtype === 'header' || node.subtype === 'footer');
        if (isChrome) {
          delete document.nodes[id];
        }
        return !isChrome;
      });

      const normalized = normalizeDocument(document);
      const normalizedRoot = normalized.nodes[normalized.rootId];
      if (!normalizedRoot || !isSiteNode(normalizedRoot)) {
        throw new Error('unexpected root shape');
      }
      const subtypes = normalizedRoot.children.map((id) => {
        const node = normalized.nodes[id];
        return node && isContainerNode(node) ? node.subtype : undefined;
      });

      expect(subtypes).toContain('header');
      expect(subtypes).toContain('footer');
    });

    it('leaves an already-normalized document with existing header/footer untouched in shape', () => {
      const document = createInitialDocument();
      const normalized = normalizeDocument(document);
      const root = normalized.nodes[normalized.rootId];
      if (!root || !isSiteNode(root)) {
        throw new Error('unexpected root shape');
      }
      const subtypes = root.children.map((id) => {
        const node = normalized.nodes[id];
        return node && isContainerNode(node) ? node.subtype : undefined;
      });
      expect(subtypes.filter((s) => s === 'header')).toHaveLength(1);
      expect(subtypes.filter((s) => s === 'footer')).toHaveLength(1);
    });

    it('skips site nodes when normalizing text tags and sticky state', () => {
      const document = createInitialDocument();
      const normalized = normalizeDocument(document);
      const root = normalized.nodes[normalized.rootId];
      // The site root itself is not a text or container node; normalizeDocument should not throw
      // and should leave it as a site node.
      expect(root?.contentType).toBe('site');
    });

    it('renames the legacy starter "Product Title" text node heading tag to h1', () => {
      const document = createInitialDocument();
      const titleNode = createTextNode('block', document.rootId);
      titleNode.name = 'Product Title';
      titleNode.htmlTag = 'p';
      titleNode.content = {
        blocks: [
          {
            id: 'block_1',
            type: 'paragraph',
            direction: 'ltr',
            children: [{ text: 'Editor Playground' }],
          },
        ],
      } as never;
      document.nodes[titleNode.id] = titleNode;
      const root = document.nodes[document.rootId];
      if (root && isSiteNode(root)) {
        root.children.push(titleNode.id);
      }

      const normalized = normalizeDocument(document);
      const normalizedTitle = normalized.nodes[titleNode.id];
      if (!normalizedTitle || !isTextNode(normalizedTitle)) {
        throw new Error('Expected text node');
      }
      expect(normalizedTitle.htmlTag).toBe('h1');
    });

    it('renames the legacy starter "Footer Title" text node heading tag to h2', () => {
      const document = createInitialDocument();
      const footerTitleNode = createTextNode('block', document.rootId);
      footerTitleNode.name = 'Footer Title';
      footerTitleNode.htmlTag = 'p';
      footerTitleNode.content = {
        blocks: [
          {
            id: 'block_1',
            type: 'paragraph',
            direction: 'ltr',
            children: [{ text: 'Editor Playground' }],
          },
        ],
      } as never;
      document.nodes[footerTitleNode.id] = footerTitleNode;
      const root = document.nodes[document.rootId];
      if (root && isSiteNode(root)) {
        root.children.push(footerTitleNode.id);
      }

      const normalized = normalizeDocument(document);
      const normalizedFooterTitle = normalized.nodes[footerTitleNode.id];
      if (!normalizedFooterTitle || !isTextNode(normalizedFooterTitle)) {
        throw new Error('Expected text node');
      }
      expect(normalizedFooterTitle.htmlTag).toBe('h2');
    });

    it('replaces a legacy single starter section with the modern "post" template section', () => {
      const document = createInitialDocument();
      const root = document.nodes[document.rootId];
      if (!root || !isSiteNode(root)) {
        throw new Error('unexpected root shape');
      }

      const legacyText = createTextNode('block', document.rootId);
      legacyText.name = 'Text';
      legacyText.content = {
        blocks: [
          {
            id: 'block_1',
            type: 'paragraph',
            direction: 'ltr',
            children: [{ text: 'Edit text' }],
          },
        ],
      } as never;
      legacyText.rect = {
        x: { base: { raw: '32px', value: 32, unit: 'px' } },
        y: { base: { raw: '32px', value: 32, unit: 'px' } },
        width: { base: { raw: 'fit-content', value: 0, unit: 'fit-content' } },
        height: { base: { raw: 'auto', value: 0, unit: 'auto' } },
      } as never;

      const legacyButton = createTextNode('block', document.rootId);
      legacyButton.name = 'Button';
      legacyButton.link = { linkType: 'external', href: '#', openInNewTab: false };
      legacyButton.style = { ...legacyButton.style, background: '#111111' };
      legacyButton.content = {
        blocks: [
          {
            id: 'block_1',
            type: 'paragraph',
            direction: 'ltr',
            children: [{ text: 'Button' }],
          },
        ],
      } as never;
      legacyButton.rect = {
        x: { base: { raw: '32px', value: 32, unit: 'px' } },
        y: { base: { raw: '32px', value: 32, unit: 'px' } },
        width: { base: { raw: 'fit-content', value: 0, unit: 'fit-content' } },
        height: { base: { raw: 'auto', value: 0, unit: 'auto' } },
      } as never;

      const legacySection = createContainerNode('section', document.rootId);
      legacySection.name = 'Section';
      legacySection.rect = {
        x: { base: { raw: '0px', value: 0, unit: 'px' } },
        y: { base: { raw: '0px', value: 0, unit: 'px' } },
        width: { base: { raw: '100%', value: 100, unit: '%' } },
        height: { base: { raw: '480px', value: 480, unit: 'px' } },
      } as never;
      legacyText.parentId = legacySection.id;
      legacyButton.parentId = legacySection.id;
      legacySection.children = [legacyText.id, legacyButton.id];

      document.nodes[legacySection.id] = legacySection;
      document.nodes[legacyText.id] = legacyText;
      document.nodes[legacyButton.id] = legacyButton;

      // Replace the existing single section with only our legacy section, so the
      // "exactly one section" precondition holds.
      root.children = root.children.filter((id) => {
        const node = document.nodes[id];
        return !(node && isContainerNode(node) && node.subtype === 'section');
      });
      const insertIndex = root.children.findIndex((id) => {
        const node = document.nodes[id];
        return node && isContainerNode(node) && node.subtype === 'header';
      });
      root.children.splice(insertIndex + 1, 0, legacySection.id);

      const normalized = normalizeDocument(document);
      const normalizedRoot = normalized.nodes[normalized.rootId];
      if (!normalizedRoot || !isSiteNode(normalizedRoot)) {
        throw new Error('unexpected root shape');
      }

      expect(normalized.nodes[legacySection.id]).toBeUndefined();
      const newSectionId = normalizedRoot.children.find((id) => {
        const node = normalized.nodes[id];
        return node && isContainerNode(node) && node.subtype === 'section';
      });
      expect(newSectionId).toBeDefined();
      expect(newSectionId).not.toBe(legacySection.id);
    });

    it('upgrades a legacy "Primary Header" wrapper into the modern playground header', () => {
      const document = createInitialDocument();
      const root = document.nodes[document.rootId];
      if (!root || !isSiteNode(root)) {
        throw new Error('unexpected root shape');
      }
      const headerId = root.children.find((id) => {
        const node = document.nodes[id];
        return node && isContainerNode(node) && node.subtype === 'header';
      });
      if (!headerId) {
        throw new Error('Expected a header wrapper in the initial document');
      }
      const header = document.nodes[headerId];
      if (!header || !isContainerNode(header)) {
        throw new Error('Expected container node');
      }
      header.name = 'Primary Header';

      const normalized = normalizeDocument(document);
      const normalizedHeader = normalized.nodes[headerId];
      if (!normalizedHeader || !isContainerNode(normalizedHeader)) {
        throw new Error('Expected container node');
      }
      expect(normalizedHeader.name).toBe('Playground Header');
      expect(normalizedHeader.children.length).toBeGreaterThan(0);
    });

    it('upgrades a legacy "Footer" wrapper into the modern playground footer', () => {
      const document = createInitialDocument();
      const root = document.nodes[document.rootId];
      if (!root || !isSiteNode(root)) {
        throw new Error('unexpected root shape');
      }
      const footerId = root.children.find((id) => {
        const node = document.nodes[id];
        return node && isContainerNode(node) && node.subtype === 'footer';
      });
      if (!footerId) {
        throw new Error('Expected a footer wrapper in the initial document');
      }
      const footer = document.nodes[footerId];
      if (!footer || !isContainerNode(footer)) {
        throw new Error('Expected container node');
      }
      footer.name = 'Footer';

      const normalized = normalizeDocument(document);
      const normalizedFooter = normalized.nodes[footerId];
      if (!normalizedFooter || !isContainerNode(normalizedFooter)) {
        throw new Error('Expected container node');
      }
      expect(normalizedFooter.name).toBe('Playground Footer');
      expect(normalizedFooter.children.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeTextHtmlTag', () => {
    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'] as const)(
      'passes through valid tag %s',
      (tag) => {
        expect(normalizeTextHtmlTag(tag)).toBe(tag);
      },
    );

    it('falls back to "p" for invalid or undefined tags', () => {
      expect(normalizeTextHtmlTag(undefined)).toBe('p');
      expect(normalizeTextHtmlTag('span' as never)).toBe('p');
      expect(normalizeTextHtmlTag('div' as never)).toBe('p');
    });
  });

  describe('isStructuralWrapper', () => {
    const cases: Array<[ContainerSubtype, boolean]> = [
      ['section', true],
      ['header', true],
      ['footer', true],
      ['container', false],
      ['group', false],
    ];

    it.each(cases)('returns %s -> %s for subtype', (subtype, expected) => {
      expect(isStructuralWrapper(subtype)).toBe(expected);
    });
  });
});
