import { describe, expect, it } from 'vitest';
import { getBundledGoogleFontsCatalog } from '../../fonts';
import { createMediaNode, createButtonTextNode, createTextNode, createLinkTextNode, createContainerNode, createSectionFromTemplate } from '../../model/defaults';
import { createPage } from '../../model/pageDefaults';
import {
  applyDocumentCommands,
  convertTextNodeDoc,
  createInitialDocument,
  insertSectionTemplateBeforeFooter,
  moveNodeInTreeDoc,
  parseDocumentJson,
  serializeDocumentJson,
  setNodeVisibilityDoc,
  setNodeRect,
  setNodeSticky,
  setNodeTextField,
  setPageTopLevelWrapperPlacement,
  setTopLevelWrapperVisibility,
  getTopLevelWrapperVisibilityState,
  switchTextSubtypeDoc,
} from '../documentApi';

function firstEditableNodeId(document: ReturnType<typeof createInitialDocument>) {
  const id = Object.keys(document.nodes).find((nodeId) => document.nodes[nodeId]?.contentType !== 'site');
  if (!id) {
    throw new Error('Expected editable node');
  }
  return id;
}

describe('api/documentApi', () => {
  it('updates rect fields immutably', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const image = createMediaNode('image', section.id);
    const button = createButtonTextNode(section.id);
    document.nodes[image.id] = image;
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(image.id, button.id);
    const nodeId = firstEditableNodeId(document);
    const before = document.nodes[nodeId];
    if (before.contentType === 'site') {
      throw new Error('Expected non-site node');
    }

    const next = setNodeRect(document, nodeId, 'x', '123px');
    expect(next).not.toBe(document);
    expect(next.nodes[nodeId].contentType).not.toBe('site');
    if (next.nodes[nodeId].contentType !== 'site') {
      expect(next.nodes[nodeId].rect.x.base.raw).toBe('123px');
    }
    expect(before.rect.x.base.raw).not.toBe('123px');
  });

  it('supports sticky patches through API helpers', () => {
    const document = createInitialDocument();
    const nodeId = firstEditableNodeId(document);
    const next = setNodeSticky(document, nodeId, { enabled: true, durationMode: 'custom' });
    const node = next.nodes[nodeId];
    if (node.contentType === 'site') {
      throw new Error('Expected non-site node');
    }
    expect(node.sticky?.enabled).toBe(true);
    expect(node.sticky?.durationMode).toBe('custom');
  });

  it('updates text html tag through API helpers', () => {
    const document = createInitialDocument();
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType !== 'container' && document.nodes[nodeId]?.contentType !== 'site' && document.nodes[nodeId]?.subtype === 'block',
    );
    if (!textId) {
      throw new Error('Expected text node');
    }

    const next = setNodeTextField(document, textId, 'htmlTag', 'blockquote');
    const node = next.nodes[textId];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    expect(node.htmlTag).toBe('blockquote');
  });

  it('updates design fields for leaves through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const image = createMediaNode('image', section.id);
    const button = createButtonTextNode(section.id);
    document.nodes[image.id] = image;
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(image.id, button.id);
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType !== 'container' && document.nodes[nodeId]?.contentType !== 'site' && document.nodes[nodeId]?.subtype === 'block',
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

    if (textNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    if (imageNode.contentType !== 'media' || imageNode.subtype !== 'image') {
      throw new Error('Expected image node');
    }
    if (buttonNode.contentType !== 'text' || buttonNode.subtype !== 'block') {
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

  it('updates code design fields through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const code = createTextNode('code', section.id);
    document.nodes[code.id] = code;
    document.nodes[section.id].children.push(code.id);

    const withBackground = setNodeTextField(document, code.id, 'background', '#101418');
    const withBorderColor = setNodeTextField(withBackground, code.id, 'borderColor', '#4c6ef5');
    const withBorderWidth = setNodeTextField(withBorderColor, code.id, 'borderWidth', '2px');
    const withBorderRadius = setNodeTextField(withBorderWidth, code.id, 'borderRadius', '14px');

    const codeNode = withBorderRadius.nodes[code.id];
    if (codeNode.contentType !== 'text' || codeNode.subtype !== 'code') {
      throw new Error('Expected code node');
    }

    expect(codeNode.style?.background).toBe('#101418');
    expect(codeNode.style?.borderColor).toBe('#4c6ef5');
    expect(codeNode.style?.borderWidth?.raw).toBe('2px');
    expect(codeNode.style?.borderRadius?.raw).toBe('14px');
  });

  it('normalizes unsupported code languages and reapplies theme-owned code surfaces', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const code = createTextNode('code', section.id);
    document.nodes[code.id] = code;
    document.nodes[section.id].children.push(code.id);

    const withInvalidLanguage = setNodeTextField(document, code.id, 'codeLanguage', 'unsupported-language');
    const withDarkTheme = setNodeTextField(withInvalidLanguage, code.id, 'codeTheme', 'dark');
    const withCustomBackground = setNodeTextField(withDarkTheme, code.id, 'background', '#123456');
    const withLightTheme = setNodeTextField(withCustomBackground, code.id, 'codeTheme', 'light');

    const darkNode = withDarkTheme.nodes[code.id];
    const lightNode = withLightTheme.nodes[code.id];
    if (darkNode.contentType !== 'text' || darkNode.subtype !== 'code') {
      throw new Error('Expected dark code node');
    }
    if (lightNode.contentType !== 'text' || lightNode.subtype !== 'code') {
      throw new Error('Expected light code node');
    }

    expect(darkNode.code?.language).toBe('plaintext');
    expect(darkNode.style?.background).toBe('#272822');
    expect(darkNode.style?.color).toBe('#f8f8f2');
    expect(lightNode.style?.background).toBe('#123456');
    expect(lightNode.style?.color).toBe('#16202a');
  });

  it('updates navigation fields for links and buttons through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const linkId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType === 'text' && (document.nodes[nodeId] as { link?: unknown }).link != null,
    );
    if (!section || section.contentType !== 'container' || !linkId) {
      throw new Error('Expected section wrapper and link node');
    }

    const button = createButtonTextNode(section.id);
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

    if (linkNode.contentType !== 'text' || linkNode.link == null) {
      throw new Error('Expected link node');
    }
    if (buttonNode.contentType !== 'text' || buttonNode.subtype !== 'block') {
      throw new Error('Expected button node');
    }

    expect(linkNode.link?.linkType).toBe('anchor');
    expect(linkNode.link?.anchorTargetId).toBe(section.id);
    expect(linkNode.link?.href).toBe('https://example.com/docs');
    expect(linkNode.link?.openInNewTab).toBe(true);
    expect(buttonNode.link?.linkType).toBe('anchor');
    expect(buttonNode.link?.anchorTargetId).toBe(section.id);
    expect(buttonNode.link?.href).toBe('https://example.com/start');
    expect(buttonNode.link?.openInNewTab).toBe(true);
  });

  it('updates page-link target fields for links and buttons through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const linkId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType === 'text' && (document.nodes[nodeId] as { link?: unknown }).link != null,
    );
    if (!section || section.contentType !== 'container' || !linkId) {
      throw new Error('Expected section wrapper and link node');
    }

    const aboutPage = createPage({ displayName: 'About', slug: 'about' });
    const button = createButtonTextNode(section.id);
    document.pages = [...(document.pages ?? []), aboutPage];
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    const withLinkType = setNodeTextField(document, linkId, 'linkType', 'page');
    const withLinkTarget = setNodeTextField(withLinkType, linkId, 'targetPageId', aboutPage.id);
    const withLinkAnchor = setNodeTextField(withLinkTarget, linkId, 'pageAnchorId', section.id);
    const withButtonType = setNodeTextField(withLinkAnchor, button.id, 'linkType', 'page');
    const withButtonTarget = setNodeTextField(withButtonType, button.id, 'targetPageId', aboutPage.id);
    const withButtonAnchor = setNodeTextField(withButtonTarget, button.id, 'pageAnchorId', section.id);
    const withLinkReset = setNodeTextField(withButtonAnchor, linkId, 'linkType', 'external');

    const linkNode = withLinkReset.nodes[linkId];
    const buttonNode = withLinkReset.nodes[button.id];

    if (linkNode.contentType !== 'text' || linkNode.link == null) {
      throw new Error('Expected link node');
    }
    if (buttonNode.contentType !== 'text' || buttonNode.subtype !== 'block' || buttonNode.link == null) {
      throw new Error('Expected button node');
    }

    expect(linkNode.link.linkType).toBe('external');
    expect(linkNode.link.targetPageId).toBeUndefined();
    expect(linkNode.link.pageAnchorId).toBeUndefined();
    expect(buttonNode.link.linkType).toBe('page');
    expect(buttonNode.link.targetPageId).toBe(aboutPage.id);
    expect(buttonNode.link.pageAnchorId).toBe(section.id);
  });

  it('converts block text to rich through the explicit text conversion API', () => {
    const document = createInitialDocument();
    const textId = Object.keys(document.nodes).find(
      (nodeId) =>
        document.nodes[nodeId]?.contentType === 'text' &&
        document.nodes[nodeId]?.subtype === 'block' &&
        document.nodes[nodeId]?.link == null,
    );
    if (!textId) {
      throw new Error('Expected block text node');
    }

    const withContent = setNodeTextField(document, textId, 'content', 'Hello rich world');
    const next = convertTextNodeDoc(withContent, textId, 'rich');
    const node = next.nodes[textId];
    if (node.contentType !== 'text' || node.subtype !== 'rich' || !Array.isArray(node.content)) {
      throw new Error('Expected rich text node');
    }

    expect(node.content).toEqual([{ text: 'Hello rich world' }]);
    expect(node.code).toBeUndefined();
    expect(node.htmlTag).toBeUndefined();
  });

  it('flattens rich text to code through the explicit text conversion API', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const rich = createTextNode('rich', section.id);
    rich.content = [
      { text: 'const ' },
      {
        type: 'link',
        linkType: 'external',
        href: 'https://example.com',
        children: [{ text: 'answer' }],
      },
      { text: ' = 42;' },
    ];
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const next = switchTextSubtypeDoc(document, rich.id, 'code', { mode: 'flatten' });
    const node = next.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'code') {
      throw new Error('Expected code node');
    }

    expect(node.content).toBe('const answer = 42;');
    expect(node.code?.language).toBe('plaintext');
    expect(node.code?.highlightedHtml).toContain('const');
    expect(node.htmlTag).toBeUndefined();
  });

  it('preserves catalog metadata when applying an existing document font family', async () => {
    const document = createInitialDocument();
    const catalog = await getBundledGoogleFontsCatalog();
    const assistantFamily = catalog.families.find((family) => family.family === 'Assistant');
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType !== 'container' && document.nodes[nodeId]?.contentType !== 'site' && document.nodes[nodeId]?.subtype === 'block',
    );
    if (!assistantFamily || !textId) {
      throw new Error('Expected bundled Assistant metadata and a text node');
    }

    const next = setNodeTextField(document, textId, 'fontFamily', 'Assistant');
    const node = next.nodes[textId];
    if (node.contentType !== 'text') {
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
      (nodeId) => document.nodes[nodeId]?.contentType === 'container',
    );
    if (!wrapperId) {
      throw new Error('Expected wrapper node');
    }

    const unchanged = setNodeTextField(document, wrapperId, 'content', 'no-op');
    expect(unchanged).toBe(document);
  });

  it('updates node visibility immutably', () => {
    const document = createInitialDocument();
    const nodeId = firstEditableNodeId(document);

    const next = setNodeVisibilityDoc(document, nodeId, false);

    expect(next).not.toBe(document);
    expect(next.nodes[nodeId]?.visible).toBe(false);
    expect(document.nodes[nodeId]?.visible).toBe(true);
  });

  it('moves a top-level wrapper between current page ownership and global placement', () => {
    const document = createInitialDocument();
    const homePage = document.pages?.[0];
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!homePage || !section || section.contentType !== 'container') {
      throw new Error('Expected home page and section wrapper');
    }

    const aboutPage = createPage({ displayName: 'About', slug: 'about' });
    const withAbout = {
      ...document,
      pages: [...(document.pages ?? []), aboutPage],
    };

    const global = setPageTopLevelWrapperPlacement(withAbout, homePage.id, section.id, 'global');
    expect(global.sharedRegionIds).toContain(section.id);
    expect(global.pages?.find((page) => page.id === homePage.id)?.sectionIds).not.toContain(section.id);

    const current = setPageTopLevelWrapperPlacement(global, aboutPage.id, section.id, 'currentPage');
    expect(current.sharedRegionIds ?? []).not.toContain(section.id);
    expect(current.pages?.find((page) => page.id === aboutPage.id)?.sectionIds).toContain(section.id);
    expect(current.pages?.find((page) => page.id === homePage.id)?.sectionIds ?? []).not.toContain(section.id);
    expect(getTopLevelWrapperVisibilityState(current, section.id)).toEqual({
      mode: 'currentPage',
      pageIds: [],
    });
  });

  it('supports hidden and custom page visibility for top-level wrappers', () => {
    const document = createInitialDocument();
    const homePage = document.pages?.[0];
    const aboutPage = createPage({ displayName: 'About', slug: 'about' });
    const contactPage = createPage({ displayName: 'Contact', slug: 'contact' });
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!homePage || !section || section.contentType !== 'container') {
      throw new Error('Expected home page and section wrapper');
    }

    const withPages = {
      ...document,
      pages: [...(document.pages ?? []), aboutPage, contactPage],
    };

    const hidden = setTopLevelWrapperVisibility(withPages, homePage.id, section.id, 'hidden');
    expect(hidden.nodes[section.id].visible).toBe(false);
    expect(getTopLevelWrapperVisibilityState(hidden, section.id)).toEqual({
      mode: 'hidden',
      pageIds: [],
    });

    const custom = setTopLevelWrapperVisibility(hidden, homePage.id, section.id, 'customPages', [
      homePage.id,
      aboutPage.id,
      contactPage.id,
      aboutPage.id,
    ]);

    const customNode = custom.nodes[section.id];
    if (customNode.contentType !== 'container') {
      throw new Error('Expected wrapper node');
    }

    expect(customNode.visible).toBe(true);
    expect(customNode.pageTargetIds).toEqual([homePage.id, aboutPage.id, contactPage.id]);
    expect(custom.sharedRegionIds ?? []).not.toContain(section.id);
    expect(custom.pages?.every((page) => !page.sectionIds.includes(section.id))).toBe(true);
    expect(getTopLevelWrapperVisibilityState(custom, section.id)).toEqual({
      mode: 'customPages',
      pageIds: [homePage.id, aboutPage.id, contactPage.id],
    });
  });

  it('moves nodes to an exact tree index', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const first = createTextNode('block', section.id);
    const second = createButtonTextNode(section.id);
    const third = createLinkTextNode(section.id);
    document.nodes[first.id] = first;
    document.nodes[second.id] = second;
    document.nodes[third.id] = third;
    document.nodes[section.id].children.push(first.id, second.id, third.id);

    const next = moveNodeInTreeDoc(document, third.id, section.id, section.children.indexOf(first.id));

    expect(next.nodes[section.id]?.children.slice(-3)).toEqual([third.id, first.id, second.id]);
  });

  it('promotes the first root structural wrapper to header during tree moves', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const sectionId = root.children.find((childId) => {
      const node = document.nodes[childId];
      return node?.contentType === 'container' && node.subtype === 'section';
    });
    if (!sectionId) {
      throw new Error('Expected section wrapper');
    }

    const previousHeaderId = root.children[0];
    const next = moveNodeInTreeDoc(document, sectionId, document.rootId, 0);
    const movedSection = next.nodes[sectionId];
    const previousHeader = next.nodes[previousHeaderId];

    if (movedSection?.contentType !== 'container' || previousHeader?.contentType !== 'container') {
      throw new Error('Expected structural wrappers');
    }

    expect(next.nodes[next.rootId]?.contentType).toBe('site');
    expect((next.nodes[next.rootId]?.contentType === 'site' && next.nodes[next.rootId].children[0]) || null).toBe(sectionId);
    expect(movedSection.subtype).toBe('header');
    expect(previousHeader.subtype).toBe('section');
  });

  it('promotes the last root structural wrapper to footer during tree moves', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const sectionId = root.children.find((childId) => {
      const node = document.nodes[childId];
      return node?.contentType === 'container' && node.subtype === 'section';
    });
    const previousFooterId = root.children[root.children.length - 1];
    if (!sectionId) {
      throw new Error('Expected section wrapper');
    }

    const next = moveNodeInTreeDoc(document, sectionId, document.rootId, root.children.length);
    const movedSection = next.nodes[sectionId];
    const previousFooter = next.nodes[previousFooterId];

    if (movedSection?.contentType !== 'container' || previousFooter?.contentType !== 'container') {
      throw new Error('Expected structural wrappers');
    }

    expect(next.nodes[next.rootId]?.contentType).toBe('site');
    expect(
      (next.nodes[next.rootId]?.contentType === 'site' &&
        next.nodes[next.rootId].children[next.nodes[next.rootId].children.length - 1]) ||
        null,
    ).toBe(sectionId);
    expect(movedSection.subtype).toBe('footer');
    expect(previousFooter.subtype).toBe('section');
  });

  it('demotes a dragged header to section when moved into a middle root slot', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const headerId = root.children.find((childId) => {
      const node = document.nodes[childId];
      return node?.contentType === 'container' && node.subtype === 'header';
    });
    if (!headerId) {
      throw new Error('Expected header wrapper');
    }

    const extraSection = createContainerNode('section', root.id);
    document.nodes[extraSection.id] = extraSection;
    root.children.splice(root.children.length - 1, 0, extraSection.id);

    const next = moveNodeInTreeDoc(document, headerId, document.rootId, 2);
    const movedHeader = next.nodes[headerId];
    const promotedFirst = next.nodes[next.nodes[next.rootId]?.contentType === 'site' ? next.nodes[next.rootId].children[0] : ''];

    if (movedHeader?.contentType !== 'container' || promotedFirst?.contentType !== 'container') {
      throw new Error('Expected structural wrappers');
    }

    expect(movedHeader.subtype).toBe('section');
    expect(promotedFirst.subtype).toBe('header');
  });

  it('rejects invalid structural drops into section children', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const header = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'header',
    );

    if (!section || section.contentType !== 'container' || !header || header.contentType !== 'container') {
      throw new Error('Expected section and header wrappers');
    }

    expect(moveNodeInTreeDoc(document, header.id, section.id, 0)).toBe(document);
  });

  it('chains commands and serializes/parses valid documents', () => {
    const document = createInitialDocument();
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType !== 'container' && document.nodes[nodeId]?.contentType !== 'site' && document.nodes[nodeId]?.subtype === 'block',
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
    if (updatedText.contentType !== 'text') {
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

    expect(Object.keys(serialized).sort()).toEqual(['fontLibrary', 'nodes', 'pages', 'rootId', 'sharedRegionIds', 'siteSettings']);
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
          contentType: 'site', type: 'site',
          parentId: null,
          children: ['leaf_1'],
          name: 'Site',
          visible: true,
          locked: false,
        },
        leaf_1: {
          id: 'leaf_1',
          contentType: 'text',
          subtype: 'block',
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
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }
    const footerId = root.children[root.children.length - 1];

    const next = insertSectionTemplateBeforeFooter(document, 'blank');
    const nextRoot = next.nodes[next.rootId];
    if (!nextRoot || nextRoot.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    expect(nextRoot.children[nextRoot.children.length - 1]).toBe(footerId);
    expect(nextRoot.children.length).toBe(root.children.length + 1);
  });

  it('seeds the default post link with product documentation copy', () => {
    const document = createInitialDocument();
    const postLink = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!postLink || postLink.contentType !== 'text' || postLink.link == null) {
      throw new Error('Expected post link node');
    }

    expect(postLink.content).toBe('Open playground spec');
    expect((postLink.content as string).toLowerCase()).not.toContain('maintenance');
  });

  it('seeds the initial post section with a 50vh height', () => {
    const document = createInitialDocument();
    const postSection = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );

    if (!postSection || postSection.contentType !== 'container') {
      throw new Error('Expected post section wrapper');
    }

    expect(postSection.rect.height.base.raw).toBe('50vh');
  });

  it('seeds semantic heading tags for template titles', () => {
    const initialDocument = createInitialDocument();
    const headerTitle = Object.values(initialDocument.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Product Title',
    );
    const footerTitle = Object.values(initialDocument.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Footer Title',
    );
    const postTitle = Object.values(initialDocument.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!headerTitle || headerTitle.contentType !== 'text') {
      throw new Error('Expected header title text node');
    }

    expect(headerTitle.htmlTag).toBe('h1');

    if (!footerTitle || footerTitle.contentType !== 'text') {
      throw new Error('Expected footer title text node');
    }

    expect(footerTitle.htmlTag).toBe('h2');

    if (!postTitle || postTitle.contentType !== 'text') {
      throw new Error('Expected post title text node');
    }

    expect(postTitle.htmlTag).toBe('h1');

    const staggered = createSectionFromTemplate('stickyStaggeredImages', 'site_test');
    const staggeredHeading = Object.values(staggered.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Section Heading',
    );
    expect(staggeredHeading && staggeredHeading.contentType === 'text' ? staggeredHeading.htmlTag : null).toBe('h2');

    const pinnedCards = createSectionFromTemplate('stickyPinnedCards', 'site_test');
    const pinnedLead = Object.values(pinnedCards.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Pinned Lead',
    );
    expect(pinnedLead && pinnedLead.contentType === 'text' ? pinnedLead.htmlTag : null).toBe('h2');

    const mediaReveal = createSectionFromTemplate('stickyMediaReveal', 'site_test');
    const mediaRevealHeading = Object.values(mediaReveal.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Section Heading',
    );
    expect(
      mediaRevealHeading && mediaRevealHeading.contentType === 'text'
        ? mediaRevealHeading.htmlTag
        : null,
    ).toBe('h2');

    const stickySteps = createSectionFromTemplate('stickySteps', 'site_test');
    const stickyStepsHeading = Object.values(stickySteps.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Section Heading',
    );
    expect(
      stickyStepsHeading && stickyStepsHeading.contentType === 'text'
        ? stickyStepsHeading.htmlTag
        : null,
    ).toBe('h2');
  });

  it('seeds the default footer repository link with the sticky-playground repo url', () => {
    const document = createInitialDocument();
    const repoLink = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Repository Link',
    );

    if (!repoLink || repoLink.contentType !== 'text' || repoLink.link == null) {
      throw new Error('Expected repository link node');
    }

    expect(repoLink.content).toBe('github.com/tombigel/sticky-playground');
    expect(repoLink.link?.href).toBe('https://github.com/tombigel/sticky-playground');
  });
});
