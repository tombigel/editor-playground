import { describe, expect, it } from 'vitest';
import { getBundledGoogleFontsCatalog } from '../../fonts';
import { createLeaf, createSectionFromTemplate } from '../../model/defaults';
import {
  applyDocumentCommands,
  createInitialDocument,
  insertSectionTemplateBeforeFooter,
  parseDocumentJson,
  serializeDocumentJson,
  setNodeRect,
  setNodeSticky,
  setNodeTextField,
} from '../documentApi';

function firstEditableNodeId(document: ReturnType<typeof createInitialDocument>) {
  const id = Object.keys(document.nodes).find((nodeId) => document.nodes[nodeId]?.type !== 'site');
  if (!id) {
    throw new Error('Expected editable node');
  }
  return id;
}

describe('api/documentApi', () => {
  it('updates rect fields immutably', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }
    const image = createLeaf('image', section.id);
    const button = createLeaf('button', section.id);
    document.nodes[image.id] = image;
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(image.id, button.id);
    const nodeId = firstEditableNodeId(document);
    const before = document.nodes[nodeId];
    if (before.type === 'site') {
      throw new Error('Expected non-site node');
    }

    const next = setNodeRect(document, nodeId, 'x', '123px');
    expect(next).not.toBe(document);
    expect(next.nodes[nodeId].type).not.toBe('site');
    if (next.nodes[nodeId].type !== 'site') {
      expect(next.nodes[nodeId].rect.x.base.raw).toBe('123px');
    }
    expect(before.rect.x.base.raw).not.toBe('123px');
  });

  it('supports sticky patches through API helpers', () => {
    const document = createInitialDocument();
    const nodeId = firstEditableNodeId(document);
    const next = setNodeSticky(document, nodeId, { enabled: true, durationMode: 'custom' });
    const node = next.nodes[nodeId];
    if (node.type === 'site') {
      throw new Error('Expected non-site node');
    }
    expect(node.sticky?.enabled).toBe(true);
    expect(node.sticky?.durationMode).toBe('custom');
  });

  it('updates text html tag through API helpers', () => {
    const document = createInitialDocument();
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'leaf' && document.nodes[nodeId]?.role === 'text',
    );
    if (!textId) {
      throw new Error('Expected text node');
    }

    const next = setNodeTextField(document, textId, 'htmlTag', 'blockquote');
    const node = next.nodes[textId];
    if (node.type !== 'leaf' || node.role !== 'text') {
      throw new Error('Expected text node');
    }

    expect(node.htmlTag).toBe('blockquote');
  });

  it('updates design fields for leaves through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }
    const image = createLeaf('image', section.id);
    const button = createLeaf('button', section.id);
    document.nodes[image.id] = image;
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(image.id, button.id);
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'leaf' && document.nodes[nodeId]?.role === 'text',
    );
    const imageId = image.id;
    const buttonId = button.id;
    if (!textId || !imageId || !buttonId) {
      throw new Error('Expected text, image, and button nodes');
    }

    const withTextColor = setNodeTextField(document, textId, 'color', 'oklch(70% 0.2 250 / 0.7)');
    const withTextShadow = setNodeTextField(withTextColor, textId, 'shadowBlur', '14');
    const withImageBorder = setNodeTextField(withTextShadow, imageId, 'borderRadius', '24px');
    const withButtonBackground = setNodeTextField(
      withImageBorder,
      buttonId,
      'background',
      'color(display-p3 0.24 0.52 0.88 / 0.9)',
    );
    const withButtonShadow = setNodeTextField(withButtonBackground, buttonId, 'shadowSpread', '12');
    const withButtonTypography = setNodeTextField(withButtonShadow, buttonId, 'fontWeight', '700');
    const withButtonWrap = setNodeTextField(withButtonTypography, buttonId, 'textWrap', 'wrap');

    const textNode = withButtonWrap.nodes[textId];
    const imageNode = withButtonWrap.nodes[imageId];
    const buttonNode = withButtonWrap.nodes[buttonId];

    if (textNode.type !== 'leaf' || textNode.role !== 'text') {
      throw new Error('Expected text node');
    }
    if (imageNode.type !== 'leaf' || imageNode.role !== 'image') {
      throw new Error('Expected image node');
    }
    if (buttonNode.type !== 'leaf' || buttonNode.role !== 'button') {
      throw new Error('Expected button node');
    }

    expect(textNode.style?.color).toBe('oklch(70% 0.2 250 / 0.7)');
    expect(textNode.style?.shadowBlur).toBe(14);
    expect(imageNode.style?.borderRadius?.raw).toBe('24px');
    expect(buttonNode.style?.background).toBe('color(display-p3 0.24 0.52 0.88 / 0.9)');
    expect(buttonNode.style?.shadowSpread).toBe(12);
    expect(buttonNode.style?.fontWeight).toBe(700);
    expect(buttonNode.style?.textWrap).toBe('wrap');
  });

  it('updates navigation fields for links and buttons through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    const linkId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'leaf' && document.nodes[nodeId]?.role === 'link',
    );
    if (!section || section.type !== 'wrapper' || !linkId) {
      throw new Error('Expected section wrapper and link node');
    }

    const button = createLeaf('button', section.id);
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    const withLinkType = setNodeTextField(document, linkId, 'linkType', 'anchor');
    const withLinkAnchor = setNodeTextField(withLinkType, linkId, 'anchorTargetId', section.id);
    const withLinkHref = setNodeTextField(withLinkAnchor, linkId, 'href', 'https://example.com/docs');
    const withLinkTarget = setNodeTextField(withLinkHref, linkId, 'openInNewTab', 'true');
    const withButtonType = setNodeTextField(withLinkTarget, button.id, 'linkType', 'anchor');
    const withButtonAnchor = setNodeTextField(withButtonType, button.id, 'anchorTargetId', section.id);
    const withButtonHref = setNodeTextField(withButtonAnchor, button.id, 'href', 'https://example.com/start');
    const withButtonTarget = setNodeTextField(withButtonHref, button.id, 'openInNewTab', 'true');

    const linkNode = withButtonTarget.nodes[linkId];
    const buttonNode = withButtonTarget.nodes[button.id];

    if (linkNode.type !== 'leaf' || linkNode.role !== 'link') {
      throw new Error('Expected link node');
    }
    if (buttonNode.type !== 'leaf' || buttonNode.role !== 'button') {
      throw new Error('Expected button node');
    }

    expect(linkNode.linkType).toBe('anchor');
    expect(linkNode.anchorTargetId).toBe(section.id);
    expect(linkNode.href).toBe('https://example.com/docs');
    expect(linkNode.openInNewTab).toBe(true);
    expect(buttonNode.linkType).toBe('anchor');
    expect(buttonNode.anchorTargetId).toBe(section.id);
    expect(buttonNode.href).toBe('https://example.com/start');
    expect(buttonNode.openInNewTab).toBe(true);
  });

  it('preserves catalog metadata when applying an existing document font family', async () => {
    const document = createInitialDocument();
    const catalog = await getBundledGoogleFontsCatalog();
    const assistantFamily = catalog.families.find((family) => family.family === 'Assistant');
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'leaf' && document.nodes[nodeId]?.role === 'text',
    );
    if (!assistantFamily || !textId) {
      throw new Error('Expected bundled Assistant metadata and a text node');
    }

    const next = setNodeTextField(document, textId, 'fontFamily', 'Assistant');
    const node = next.nodes[textId];
    if (node.type !== 'leaf' || node.role !== 'text') {
      throw new Error('Expected text node');
    }

    expect(node.style?.fontFamily).toBe('Assistant');
    expect(next.fontLibrary.usedFamilies.find((family) => family.family === 'Assistant')).toMatchObject({
      family: assistantFamily.family,
      isVariable: assistantFamily.isVariable,
      variants: assistantFamily.variants,
      axes: assistantFamily.axes,
    });
  });

  it('returns original document when text field does not apply to node type', () => {
    const document = createInitialDocument();
    const wrapperId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'wrapper',
    );
    if (!wrapperId) {
      throw new Error('Expected wrapper node');
    }

    const unchanged = setNodeTextField(document, wrapperId, 'content', 'no-op');
    expect(unchanged).toBe(document);
  });

  it('chains commands and serializes/parses valid documents', () => {
    const document = createInitialDocument();
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'leaf' && document.nodes[nodeId]?.role === 'text',
    );
    if (!textId) {
      throw new Error('Expected text node');
    }

    const next = applyDocumentCommands(document, [
      { type: 'setRect', nodeId: textId, field: 'y', value: '777px' },
      { type: 'setText', nodeId: textId, field: 'content', value: 'Updated by command chain' },
      { type: 'setText', nodeId: textId, field: 'htmlTag', value: 'blockquote' },
    ]);

    const updatedText = next.nodes[textId];
    if (updatedText.type !== 'leaf' || updatedText.role !== 'text') {
      throw new Error('Expected text node');
    }
    expect(updatedText.rect.y.base.raw).toBe('777px');
    expect(updatedText.content).toBe('Updated by command chain');
    expect(updatedText.htmlTag).toBe('blockquote');

    const json = serializeDocumentJson(next);
    const reparsed = parseDocumentJson(json);
    expect(reparsed.nodes[textId]).toEqual(next.nodes[textId]);
  });

  it('serializes the document model shape only', () => {
    const document = createInitialDocument();
    const serialized = JSON.parse(serializeDocumentJson(document)) as Record<string, unknown>;

    expect(Object.keys(serialized).sort()).toEqual(['fontLibrary', 'nodes', 'rootId']);
    expect(serialized.rootId).toBe(document.rootId);
    expect(serialized.fontLibrary).toEqual(document.fontLibrary);
    expect(serialized.nodes).toEqual(document.nodes);
  });

  it('rejects invalid documents via parseDocumentJson', () => {
    const bad = {
      rootId: 'site_1',
      nodes: {
        site_1: {
          id: 'site_1',
          type: 'site',
          parentId: null,
          children: ['leaf_1'],
          name: 'Site',
          visible: true,
          locked: false,
        },
        leaf_1: {
          id: 'leaf_1',
          type: 'leaf',
          role: 'text',
          parentId: 'site_1',
          children: [],
          name: 'Bad leaf',
          visible: true,
          locked: false,
          rect: {
            x: { base: { raw: '0px', parsed: { value: 0, unit: 'px' } } },
            y: { base: { raw: '0px', parsed: { value: 0, unit: 'px' } } },
            width: { base: { raw: 'fit-content', parsed: { keyword: 'fit-content' } } },
            height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
          },
          content: 'bad',
        },
      },
    };

    expect(() => parseDocumentJson(JSON.stringify(bad))).toThrow('Invalid document');
  });

  it('inserts section templates before footer', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }
    const footerId = root.children[root.children.length - 1];

    const next = insertSectionTemplateBeforeFooter(document, 'blank');
    const nextRoot = next.nodes[next.rootId];
    if (!nextRoot || nextRoot.type !== 'site') {
      throw new Error('Expected site root');
    }

    expect(nextRoot.children[nextRoot.children.length - 1]).toBe(footerId);
    expect(nextRoot.children.length).toBe(root.children.length + 1);
  });

  it('seeds the default post link with product documentation copy', () => {
    const document = createInitialDocument();
    const postLink = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link',
    );

    if (!postLink || postLink.type !== 'leaf' || postLink.role !== 'link') {
      throw new Error('Expected post link node');
    }

    expect(postLink.label).toBe('Open playground spec');
    expect(postLink.label.toLowerCase()).not.toContain('maintenance');
  });

  it('seeds the initial post section with a 50vh height', () => {
    const document = createInitialDocument();
    const postSection = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    if (!postSection || postSection.type !== 'wrapper') {
      throw new Error('Expected post section wrapper');
    }

    expect(postSection.rect.height.base.raw).toBe('50vh');
  });

  it('seeds semantic heading tags for template titles', () => {
    const initialDocument = createInitialDocument();
    const headerTitle = Object.values(initialDocument.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Product Title',
    );
    const footerTitle = Object.values(initialDocument.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Footer Title',
    );
    const postTitle = Object.values(initialDocument.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!headerTitle || headerTitle.type !== 'leaf' || headerTitle.role !== 'text') {
      throw new Error('Expected header title text node');
    }

    expect(headerTitle.htmlTag).toBe('h1');

    if (!footerTitle || footerTitle.type !== 'leaf' || footerTitle.role !== 'text') {
      throw new Error('Expected footer title text node');
    }

    expect(footerTitle.htmlTag).toBe('h2');

    if (!postTitle || postTitle.type !== 'leaf' || postTitle.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    expect(postTitle.htmlTag).toBe('h1');

    const staggered = createSectionFromTemplate('stickyStaggeredImages', 'site_test');
    const staggeredHeading = Object.values(staggered.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Section Heading',
    );
    expect(staggeredHeading && staggeredHeading.type === 'leaf' && staggeredHeading.role === 'text' ? staggeredHeading.htmlTag : null).toBe('h2');

    const pinnedCards = createSectionFromTemplate('stickyPinnedCards', 'site_test');
    const pinnedLead = Object.values(pinnedCards.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Pinned Lead',
    );
    expect(pinnedLead && pinnedLead.type === 'leaf' && pinnedLead.role === 'text' ? pinnedLead.htmlTag : null).toBe('h2');

    const mediaReveal = createSectionFromTemplate('stickyMediaReveal', 'site_test');
    const mediaRevealHeading = Object.values(mediaReveal.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Section Heading',
    );
    expect(
      mediaRevealHeading && mediaRevealHeading.type === 'leaf' && mediaRevealHeading.role === 'text'
        ? mediaRevealHeading.htmlTag
        : null,
    ).toBe('h2');

    const stickySteps = createSectionFromTemplate('stickySteps', 'site_test');
    const stickyStepsHeading = Object.values(stickySteps.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Section Heading',
    );
    expect(
      stickyStepsHeading && stickyStepsHeading.type === 'leaf' && stickyStepsHeading.role === 'text'
        ? stickyStepsHeading.htmlTag
        : null,
    ).toBe('h2');
  });

  it('seeds the default footer repository link with the sticky-playground repo url', () => {
    const document = createInitialDocument();
    const repoLink = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Repository Link',
    );

    if (!repoLink || repoLink.type !== 'leaf' || repoLink.role !== 'link') {
      throw new Error('Expected repository link node');
    }

    expect(repoLink.label).toBe('github.com/tombigel/sticky-playground');
    expect(repoLink.href).toBe('https://github.com/tombigel/sticky-playground');
  });
});
