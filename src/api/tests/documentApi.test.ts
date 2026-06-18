import { describe, expect, it } from 'vitest';
import { getBundledGoogleFontsCatalog } from '../../fonts';
import { createMediaNode, createButtonTextNode, createTextNode, createLinkTextNode, createContainerNode, createDefaultRect, createSectionFromTemplate } from '../../model/defaults';
import { createPage } from '../../model/pageDefaults';
import {
  createTextDocumentContent,
  createTextDocumentFromText,
  createTextDocumentFromCode,
  getSingleCodeBlockContent,
  getSingleListBlockContent,
  getSingleTextBlockContent,
  getTextContent,
  listContentToRichListBlock,
  richListBlockToListContent,
} from '../../model/richContent';
import {
  applyDocumentCommands,
  createNodeFromExternalClipboardDoc,
  createTextDocumentContentFromClipboardHtml,
  convertTextNodeDoc,
  createInitialDocument,
  duplicateNodesDoc,
  insertLeafDoc,
  insertSectionTemplateDoc,
  moveNodeInTreeDoc,
  moveNodeDoc,
  moveNodesDoc,
  parseDocumentJson,
  reparentNodeAtDoc,
  reparentNodesAtDoc,
  resolveContainerChildBoundary,
  serializeDocumentJson,
  normalizeTextNodeDoc,
  setContainerChildBoundaryDoc,
  setCodeBlockLanguageDoc,
  resetCodeBlockStyleDoc,
  setCodeBlockTabSizeDoc,
  setCodeBlockThemeDoc,
  setCodeBlockWrapDoc,
  setListContentDoc,
  setNodeVisibilityDoc,
  setNodeRect,
  setNodeSticky,
  setPageTopLevelWrapperPlacement,
  setRichListKindDoc,
  setRichListMarkerStyleDoc,
  setTextDocumentContentDoc,
  setTextDirectionDoc,
  setTextNodeContentDoc,
  setTopLevelWrapperVisibility,
  getTopLevelWrapperVisibilityState,
  expandParentHeightDoc,
  pasteNodesFromClipboardDoc,
  serializeNodesForClipboardDoc,
  switchTextSubtypeDoc,
  type LeafInsertionRole,
} from '../documentApi';

function firstEditableNodeId(document: ReturnType<typeof createInitialDocument>) {
  const id = Object.keys(document.nodes).find((nodeId) => document.nodes[nodeId]?.contentType !== 'site');
  if (!id) {
    throw new Error('Expected editable node');
  }
  return id;
}

function getRoot(document: ReturnType<typeof createInitialDocument>) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    throw new Error('Expected site root');
  }
  return root;
}

describe('api/documentApi', () => {
  function expectContainerHeight(document: ReturnType<typeof createInitialDocument>, nodeId: string, raw: string) {
    const node = document.nodes[nodeId];
    if (!node || node.contentType !== 'container') {
      throw new Error(`Expected container ${nodeId}`);
    }
    expect(node.rect.height.base.raw).toBe(raw);
  }

  describe('insertLeafDoc', () => {
    function firstSectionId(document: ReturnType<typeof createInitialDocument>) {
      const root = getRoot(document);
      const sectionId = root.children.find((childId) => {
        const node = document.nodes[childId];
        return node?.contentType === 'container' && node.subtype === 'section';
      });
      if (!sectionId) {
        throw new Error('Expected section');
      }
      return sectionId;
    }

    it('inserts every leaf role through the pure API', () => {
      const cases: Array<{
        role: LeafInsertionRole;
        expectedContentType: 'text' | 'media';
        expectedSubtype: string;
      }> = [
        { role: 'text', expectedContentType: 'text', expectedSubtype: 'block' },
        { role: 'heading', expectedContentType: 'text', expectedSubtype: 'block' },
        { role: 'list', expectedContentType: 'text', expectedSubtype: 'list' },
        { role: 'richtext', expectedContentType: 'text', expectedSubtype: 'rich' },
        { role: 'code', expectedContentType: 'text', expectedSubtype: 'code' },
        { role: 'image', expectedContentType: 'media', expectedSubtype: 'image' },
        { role: 'link', expectedContentType: 'text', expectedSubtype: 'block' },
        { role: 'button', expectedContentType: 'text', expectedSubtype: 'block' },
      ];

      for (const { role, expectedContentType, expectedSubtype } of cases) {
        const document = createInitialDocument();
        const sectionId = firstSectionId(document);
        const next = insertLeafDoc(document, role, sectionId);
        const insertedId = Object.keys(next.nodes).find((nodeId) => !document.nodes[nodeId]);
        if (!insertedId) {
          throw new Error(`Expected inserted ${role} node`);
        }
        const inserted = next.nodes[insertedId];
        if (inserted.contentType === 'site') {
          throw new Error(`Expected inserted ${role} leaf`);
        }

        expect(inserted.parentId).toBe(sectionId);
        expect(inserted.contentType).toBe(expectedContentType);
        expect(inserted.subtype).toBe(expectedSubtype);

        if (role === 'heading' && inserted.contentType === 'text') {
          expect(inserted.htmlTag).toBe('h2');
          expect(getTextContent(inserted.content.blocks)).toBe("I'm a Header Text");
        }
        if (role === 'link' && inserted.contentType === 'text') {
          expect(inserted.link).toMatchObject({ linkType: 'anchor', href: '#' });
          expect(inserted.htmlTag).toBe('div');
        }
        if (role === 'code' && inserted.contentType === 'text') {
          expect(inserted.code?.language).toBe('plaintext');
          expect(inserted.code?.highlightedHtml).toBeTruthy();
        }
      }
    });

    it('returns the original document for a missing parent', () => {
      const document = createInitialDocument();
      expect(insertLeafDoc(document, 'text', 'missing_parent')).toBe(document);
    });

    it('generates unique ids when inserting repeatedly', () => {
      const document = createInitialDocument();
      const sectionId = firstSectionId(document);
      const withFirst = insertLeafDoc(document, 'text', sectionId);
      const withSecond = insertLeafDoc(withFirst, 'text', sectionId);

      const insertedIds = Object.keys(withSecond.nodes).filter((nodeId) => !document.nodes[nodeId]);
      expect(insertedIds).toHaveLength(2);
      expect(new Set(insertedIds).size).toBe(2);
    });
  });

  describe('clipboard document API', () => {
    function firstSectionId(document: ReturnType<typeof createInitialDocument>) {
      const root = getRoot(document);
      const sectionId = root.children.find((childId) => {
        const node = document.nodes[childId];
        return node?.contentType === 'container' && node.subtype === 'section';
      });
      if (!sectionId) {
        throw new Error('Expected section');
      }
      return sectionId;
    }

    it('serializes top-level selected nodes with container descendants', () => {
      const document = createInitialDocument();
      const sectionId = firstSectionId(document);
      const container = createContainerNode('container', sectionId);
      const text = createTextNode('block', container.id);
      container.children = [text.id];
      document.nodes[container.id] = container;
      document.nodes[text.id] = text;
      document.nodes[sectionId].children.push(container.id);

      const payload = serializeNodesForClipboardDoc(document, [container.id, text.id]);

      expect(payload?.rootIds).toEqual([container.id]);
      expect(payload?.nodes[container.id]).toBeTruthy();
      expect(payload?.nodes[text.id]).toBeTruthy();
    });

    it('pastes a subtree with remapped ids and offsets the pasted root', () => {
      const document = createInitialDocument();
      const sectionId = firstSectionId(document);
      const container = createContainerNode('container', sectionId);
      const text = createTextNode('block', container.id);
      container.children = [text.id];
      document.nodes[container.id] = container;
      document.nodes[text.id] = text;
      document.nodes[sectionId].children.push(container.id);
      const payload = serializeNodesForClipboardDoc(document, [container.id]);
      if (!payload) throw new Error('Expected payload');

      const result = pasteNodesFromClipboardDoc(document, payload, { selectedId: sectionId, offset: true });
      const pasted = result.document.nodes[result.pastedIds[0]];
      if (!pasted || pasted.contentType !== 'container') throw new Error('Expected pasted container');
      const pastedChildId = pasted.children[0];

      expect(result.pastedIds).toHaveLength(1);
      expect(result.pastedIds[0]).not.toBe(container.id);
      expect(pasted.parentId).toBe(sectionId);
      expect(pasted.rect.x.base.raw).toBe('72px');
      expect(result.document.nodes[pastedChildId]?.parentId).toBe(pasted.id);
    });

    it('pastes structural wrappers at root as active-page sections', () => {
      const document = createInitialDocument();
      const root = getRoot(document);
      const headerId = root.children.find((childId) => {
        const node = document.nodes[childId];
        return node?.contentType === 'container' && node.subtype === 'header';
      });
      const pageId = document.pages?.[0]?.id;
      if (!headerId || !pageId) throw new Error('Expected header and page');
      const payload = serializeNodesForClipboardDoc(document, [headerId]);
      if (!payload) throw new Error('Expected payload');

      const result = pasteNodesFromClipboardDoc(document, payload, {
        selectedId: headerId,
        activePageId: pageId,
      });
      const pasted = result.document.nodes[result.pastedIds[0]];

      expect(pasted?.parentId).toBe(document.rootId);
      expect(pasted?.contentType).toBe('container');
      if (pasted?.contentType === 'container') {
        expect(pasted.subtype).toBe('section');
      }
      expect(result.document.pages?.[0]?.sectionIds).toContain(result.pastedIds[0]);
    });

    it('duplicates selected nodes with fresh ids and undoable selection target data', () => {
      const document = createInitialDocument();
      const sectionId = firstSectionId(document);
      const withText = insertLeafDoc(document, 'text', sectionId);
      const textId = Object.keys(withText.nodes).find((nodeId) => !document.nodes[nodeId]);
      if (!textId) throw new Error('Expected inserted text');

      const result = duplicateNodesDoc(withText, [textId], { activePageId: withText.pages?.[0]?.id });
      const pasted = result.document.nodes[result.pastedIds[0]];

      expect(result.pastedIds[0]).not.toBe(textId);
      expect(pasted?.parentId).toBe(sectionId);
      expect(result.document.nodes[textId]).toBeTruthy();
    });

    it('creates link and image nodes from external clipboard URLs', () => {
      const document = createInitialDocument();
      const sectionId = firstSectionId(document);

      const linkResult = createNodeFromExternalClipboardDoc(document, { text: 'https://example.com' }, { selectedId: sectionId });
      const linkNode = linkResult.document.nodes[linkResult.pastedIds[0]];
      expect(linkNode?.contentType).toBe('text');
      if (linkNode?.contentType === 'text') {
        expect(linkNode.htmlTag).toBe('div');
        expect(linkNode.link).toMatchObject({ linkType: 'external', href: 'https://example.com' });
      }

      const imageResult = createNodeFromExternalClipboardDoc(document, { text: 'https://example.com/image.png' }, { selectedId: sectionId });
      const imageNode = imageResult.document.nodes[imageResult.pastedIds[0]];
      expect(imageNode?.contentType).toBe('media');
      if (imageNode?.contentType === 'media') {
        expect(imageNode.src).toBe('https://example.com/image.png');
      }
    });

    it('converts styled clipboard HTML into rich text content', () => {
      const document = createInitialDocument();
      const content = createTextDocumentContentFromClipboardHtml(document, {
        html: `
          <h2 style="color: rgb(10, 20, 30); font-family: Inter; text-align: center;">Title</h2>
          <blockquote><strong>Bold</strong> <em>Italic</em> <a href="https://example.com">Link</a></blockquote>
          <p><span style="background-color: #fff000; font-size: 20px; font-weight: 700; text-decoration: underline line-through;">Styled</span></p>
        `,
        text: 'Fallback',
      });

      expect(content.blocks).toHaveLength(3);
      expect(content.blocks[0]).toMatchObject({
        type: 'h2',
        style: { color: 'rgb(10, 20, 30)', fontFamily: 'Inter', textAlign: 'center' },
      });
      expect(content.blocks[1]).toMatchObject({ type: 'blockquote' });
      const quote = content.blocks[1];
      if (quote.type === 'code-block' || quote.type === 'ul' || quote.type === 'ol') {
        throw new Error('Expected text block');
      }
      expect(quote.children[0]).toMatchObject({ text: 'Bold', bold: true });
      expect(quote.children[2]).toMatchObject({ text: 'Italic', italic: true });
      expect(quote.children[4]).toMatchObject({
        type: 'link',
        href: 'https://example.com',
        children: [{ text: 'Link' }],
      });
      const paragraph = content.blocks[2];
      if (paragraph.type === 'code-block' || paragraph.type === 'ul' || paragraph.type === 'ol') {
        throw new Error('Expected paragraph block');
      }
      expect(paragraph.children[0]).toMatchObject({
        text: 'Styled',
        backgroundColor: '#fff000',
        fontSize: '20px',
        fontWeight: 700,
        bold: true,
        underline: true,
        strikethrough: true,
      });
    });

    it('converts clipboard HTML lists into native rich list blocks', () => {
      const document = createInitialDocument();
      const content = createTextDocumentContentFromClipboardHtml(document, {
        html: '<ul style="list-style-type: square;"><li><strong>One</strong></li><li>Two</li></ul><ol start="3"><li>Three</li></ol>',
      });

      expect(content.blocks).toHaveLength(2);
      expect(content.blocks[0]).toMatchObject({
        type: 'ul',
        markerStyle: 'square',
        children: [
          { type: 'list-item', children: [{ text: 'One', bold: true }] },
          { type: 'list-item', children: [{ text: 'Two' }] },
        ],
      });
      expect(content.blocks[1]).toMatchObject({
        type: 'ol',
        start: 3,
        children: [{ type: 'list-item', children: [{ text: 'Three' }] }],
      });
    });

    it('preserves only installed pasted font families', () => {
      const document = createInitialDocument();
      const content = createTextDocumentContentFromClipboardHtml(document, {
        html: '<p><span style="font-family: Inter, sans-serif;">Installed</span><span style="font-family: Missing Font, serif;">Missing</span></p>',
      });
      const block = content.blocks[0];
      if (block.type === 'code-block' || block.type === 'ul' || block.type === 'ol') {
        throw new Error('Expected text block');
      }

      expect(block.children[0]).toMatchObject({ text: 'Installed', fontFamily: 'Inter' });
      expect(block.children[1]).toMatchObject({ text: 'Missing' });
      expect('fontFamily' in block.children[1]).toBe(false);
    });
  });

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

    const next = setTextNodeContentDoc(document, textId, 'htmlTag', 'blockquote');
    const node = next.nodes[textId];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    expect(node.htmlTag).toBe('blockquote');
  });

  it('sets standalone block content with inline marks and links through the document API', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const text = createTextNode('block', section.id);
    document.nodes[text.id] = text;
    document.nodes[section.id].children.push(text.id);

    const content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Marked ', bold: true },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com/docs',
            children: [{ text: 'docs', italic: true }],
          },
        ],
      },
    ]);

    const next = setTextDocumentContentDoc(document, text.id, content);
    const node = next.nodes[text.id];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    expect(node.content.blocks[0]).toMatchObject(content.blocks[0]);
    expect(node.content.blocks[0]).toMatchObject({ direction: 'ltr' });
    expect(node.htmlTag).toBe('p');
  });

  it('rejects multi-block content for standalone block text nodes', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const text = createTextNode('block', section.id);
    document.nodes[text.id] = text;
    document.nodes[section.id].children.push(text.id);

    const next = setTextDocumentContentDoc(document, text.id, createTextDocumentContent([
      { type: 'paragraph', children: [{ text: 'One' }] },
      { type: 'paragraph', children: [{ text: 'Two' }] },
    ]));

    expect(next).toBe(document);
  });

  it('clears whole-node links for standalone block text content when requested', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const link = createLinkTextNode(section.id);
    document.nodes[link.id] = link;
    document.nodes[section.id].children.push(link.id);

    const next = setTextDocumentContentDoc(
      document,
      link.id,
      createTextDocumentContent([
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              linkType: 'external',
              href: 'https://example.com/promoted',
              children: [{ text: 'Promoted', underline: true }],
            },
          ],
        },
      ]),
      { clearBlockNodeLink: true },
    );
    const node = next.nodes[link.id];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    expect(node.link).toBeUndefined();
    expect(node.content.blocks[0]).toMatchObject({
      type: 'paragraph',
      children: [
        {
          type: 'link',
          href: 'https://example.com/promoted',
          children: [{ text: 'Promoted', underline: true }],
        },
      ],
    });
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

    const withTextColor = setTextNodeContentDoc(document, textId, 'color', 'oklch(70% 0.2 250 / 0.7)');
    const withTextShadow = setTextNodeContentDoc(withTextColor, textId, 'shadowBlur', '14');
    const withImageBorder = setTextNodeContentDoc(withTextShadow, imageId, 'borderRadius', '24px');
    const withButtonBackground = setTextNodeContentDoc(
      withImageBorder,
      buttonId,
      'background',
      'color(display-p3 0.24 0.52 0.88 / 0.9)',
    );
    const withButtonShadow = setTextNodeContentDoc(withButtonBackground, buttonId, 'shadowSpread', '12');
    const withButtonTypography = setTextNodeContentDoc(withButtonShadow, buttonId, 'fontWeight', '700');
    const withButtonWrap = setTextNodeContentDoc(withButtonTypography, buttonId, 'textWrap', 'wrap');

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

    const withBackground = setTextNodeContentDoc(document, code.id, 'background', '#101418');
    const withBorderColor = setTextNodeContentDoc(withBackground, code.id, 'borderColor', '#4c6ef5');
    const withBorderWidth = setTextNodeContentDoc(withBorderColor, code.id, 'borderWidth', '2px');
    const withBorderRadius = setTextNodeContentDoc(withBorderWidth, code.id, 'borderRadius', '14px');

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

    const withInvalidLanguage = setCodeBlockLanguageDoc(document, code.id, 'unsupported-language');
    const withDarkTheme = setCodeBlockThemeDoc(withInvalidLanguage, code.id, 'dark');
    const withCustomBackground = setTextNodeContentDoc(withDarkTheme, code.id, 'background', '#123456');
    const withLightTheme = setCodeBlockThemeDoc(withCustomBackground, code.id, 'light');

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

  it('supports auto code theme, tab size, and style reset without changing code text or language', () => {
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

    let next = setTextNodeContentDoc(document, code.id, 'content', 'const value = 1;');
    next = setCodeBlockLanguageDoc(next, code.id, 'typescript');
    next = setCodeBlockThemeDoc(next, code.id, 'dark');
    next = setCodeBlockTabSizeDoc(next, code.id, 12);
    next = setCodeBlockWrapDoc(next, code.id, false);
    next = setTextNodeContentDoc(next, code.id, 'fontFamily', 'JetBrains Mono');
    next = setTextNodeContentDoc(next, code.id, 'fontSize', '18px');
    next = setTextNodeContentDoc(next, code.id, 'color', '#ffcc00');
    next = setTextNodeContentDoc(next, code.id, 'background', '#101418');

    const styled = next.nodes[code.id];
    if (styled.contentType !== 'text' || styled.subtype !== 'code') {
      throw new Error('Expected styled code node');
    }
    expect(styled.code?.theme).toBe('dark');
    expect(styled.style?.tabSize).toBe(8);
    expect(styled.style?.textWrap).toBe('single-line');
    expect(styled.style?.fontFamily).toBe('JetBrains Mono');
    expect(getSingleCodeBlockContent(styled.content)?.style?.tabSize).toBe(8);
    expect(getSingleCodeBlockContent(styled.content)?.style?.textWrap).toBe('single-line');

    const auto = setCodeBlockThemeDoc(next, code.id, 'auto');
    const autoNode = auto.nodes[code.id];
    if (autoNode.contentType !== 'text' || autoNode.subtype !== 'code') {
      throw new Error('Expected auto code node');
    }
    expect(autoNode.code?.theme).toBe('auto');
    expect(getSingleCodeBlockContent(autoNode.content)?.theme).toBe('auto');
    expect(autoNode.style?.background).toBe('#101418');
    expect(autoNode.style?.color).toBe('#ffcc00');

    const wrapped = setCodeBlockWrapDoc(auto, code.id, true);
    const wrappedNode = wrapped.nodes[code.id];
    if (wrappedNode.contentType !== 'text' || wrappedNode.subtype !== 'code') {
      throw new Error('Expected wrapped code node');
    }
    expect(wrappedNode.style?.textWrap).toBe('wrap');
    expect(getSingleCodeBlockContent(wrappedNode.content)?.style?.textWrap).toBe('wrap');

    const reset = resetCodeBlockStyleDoc(auto, code.id);
    const resetNode = reset.nodes[code.id];
    if (resetNode.contentType !== 'text' || resetNode.subtype !== 'code') {
      throw new Error('Expected reset code node');
    }
    const resetBlock = getSingleCodeBlockContent(resetNode.content);
    expect(getTextContent(resetNode.content.blocks, { blockSeparator: '\n' })).toBe('const value = 1;');
    expect(resetNode.code?.language).toBe('typescript');
    expect(resetNode.code?.theme).toBe('auto');
    expect(resetNode.style).toEqual({ direction: 'ltr', textAlign: 'left' });
    expect(resetBlock?.language).toBe('typescript');
    expect(resetBlock?.theme).toBe('auto');
    expect(resetBlock?.style).toBeUndefined();
  });

  it('updates navigation fields for links and buttons through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const image = Object.values(document.nodes).find(
      (node) => node.contentType === 'media' && node.subtype === 'image',
    );
    const linkId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType === 'text' && (document.nodes[nodeId] as { link?: unknown }).link != null,
    );
    if (!section || section.contentType !== 'container' || !linkId || !image || image.contentType !== 'media') {
      throw new Error('Expected section wrapper, link node, and image node');
    }

    const button = createButtonTextNode(section.id);
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    const withImageLink = setTextNodeContentDoc(document, image.id, 'linkEnabled', 'true');
    const withLinkType = setTextNodeContentDoc(withImageLink, linkId, 'linkType', 'anchor');
    const withLinkAnchor = setTextNodeContentDoc(withLinkType, linkId, 'anchorTargetId', section.id);
    const withLinkHref = setTextNodeContentDoc(withLinkAnchor, linkId, 'href', 'https://example.com/docs');
    const withLinkTarget = setTextNodeContentDoc(withLinkHref, linkId, 'openInNewTab', 'true');
    const withButtonType = setTextNodeContentDoc(withLinkTarget, button.id, 'linkType', 'anchor');
    const withButtonAnchor = setTextNodeContentDoc(withButtonType, button.id, 'anchorTargetId', section.id);
    const withButtonHref = setTextNodeContentDoc(withButtonAnchor, button.id, 'href', 'https://example.com/start');
    const withButtonTarget = setTextNodeContentDoc(withButtonHref, button.id, 'openInNewTab', 'true');
    const withImageType = setTextNodeContentDoc(withButtonTarget, image.id, 'linkType', 'anchor');
    const withImageAnchor = setTextNodeContentDoc(withImageType, image.id, 'anchorTargetId', section.id);
    const withImageHref = setTextNodeContentDoc(withImageAnchor, image.id, 'href', 'https://example.com/gallery');
    const withImageTarget = setTextNodeContentDoc(withImageHref, image.id, 'openInNewTab', 'true');

    const linkNode = withImageTarget.nodes[linkId];
    const buttonNode = withImageTarget.nodes[button.id];
    const imageNode = withImageTarget.nodes[image.id];

    if (linkNode.contentType !== 'text' || linkNode.link == null) {
      throw new Error('Expected link node');
    }
    if (buttonNode.contentType !== 'text' || buttonNode.subtype !== 'block') {
      throw new Error('Expected button node');
    }
    if (imageNode.contentType !== 'media' || imageNode.link == null) {
      throw new Error('Expected image node');
    }

    expect(linkNode.link?.linkType).toBe('anchor');
    expect(linkNode.link?.anchorTargetId).toBe(section.id);
    expect(linkNode.link?.href).toBe('https://example.com/docs');
    expect(linkNode.link?.openInNewTab).toBe(true);
    expect(buttonNode.link?.linkType).toBe('anchor');
    expect(buttonNode.link?.anchorTargetId).toBe(section.id);
    expect(buttonNode.link?.href).toBe('https://example.com/start');
    expect(buttonNode.link?.openInNewTab).toBe(true);
    expect(imageNode.link?.linkType).toBe('anchor');
    expect(imageNode.link?.anchorTargetId).toBe(section.id);
    expect(imageNode.link?.href).toBe('https://example.com/gallery');
    expect(imageNode.link?.openInNewTab).toBe(true);
  });

  it('updates page-link target fields for links and buttons through API helpers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const image = Object.values(document.nodes).find(
      (node) => node.contentType === 'media' && node.subtype === 'image',
    );
    const linkId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.contentType === 'text' && (document.nodes[nodeId] as { link?: unknown }).link != null,
    );
    if (!section || section.contentType !== 'container' || !linkId || !image || image.contentType !== 'media') {
      throw new Error('Expected section wrapper, link node, and image node');
    }

    const aboutPage = createPage({ displayName: 'About', slug: 'about' });
    const button = createButtonTextNode(section.id);
    document.pages = [...(document.pages ?? []), aboutPage];
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    const withImageLink = setTextNodeContentDoc(document, image.id, 'linkEnabled', 'true');
    const withLinkType = setTextNodeContentDoc(withImageLink, linkId, 'linkType', 'page');
    const withLinkTarget = setTextNodeContentDoc(withLinkType, linkId, 'targetPageId', aboutPage.id);
    const withLinkAnchor = setTextNodeContentDoc(withLinkTarget, linkId, 'pageAnchorId', section.id);
    const withButtonType = setTextNodeContentDoc(withLinkAnchor, button.id, 'linkType', 'page');
    const withButtonTarget = setTextNodeContentDoc(withButtonType, button.id, 'targetPageId', aboutPage.id);
    const withButtonAnchor = setTextNodeContentDoc(withButtonTarget, button.id, 'pageAnchorId', section.id);
    const withImageType = setTextNodeContentDoc(withButtonAnchor, image.id, 'linkType', 'page');
    const withImageTarget = setTextNodeContentDoc(withImageType, image.id, 'targetPageId', aboutPage.id);
    const withImageAnchor = setTextNodeContentDoc(withImageTarget, image.id, 'pageAnchorId', section.id);
    const withLinkReset = setTextNodeContentDoc(withImageAnchor, linkId, 'linkType', 'external');

    const linkNode = withLinkReset.nodes[linkId];
    const buttonNode = withLinkReset.nodes[button.id];
    const imageNode = withLinkReset.nodes[image.id];

    if (linkNode.contentType !== 'text' || linkNode.link == null) {
      throw new Error('Expected link node');
    }
    if (buttonNode.contentType !== 'text' || buttonNode.subtype !== 'block' || buttonNode.link == null) {
      throw new Error('Expected button node');
    }
    if (imageNode.contentType !== 'media' || imageNode.link == null) {
      throw new Error('Expected image node');
    }

    expect(linkNode.link.linkType).toBe('external');
    expect(linkNode.link.targetPageId).toBeUndefined();
    expect(linkNode.link.pageAnchorId).toBeUndefined();
    expect(buttonNode.link.linkType).toBe('page');
    expect(buttonNode.link.targetPageId).toBe(aboutPage.id);
    expect(buttonNode.link.pageAnchorId).toBe(section.id);
    expect(imageNode.link.linkType).toBe('page');
    expect(imageNode.link.targetPageId).toBe(aboutPage.id);
    expect(imageNode.link.pageAnchorId).toBe(section.id);
  });

  it('toggles link enablement for block text and images through the API', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.subtype === 'block' && node.link == null,
    );
    const imageNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'media' && node.subtype === 'image',
    );

    if (!textNode || textNode.contentType !== 'text' || !imageNode || imageNode.contentType !== 'media') {
      throw new Error('Expected block text node and image node');
    }

    const withTextLink = setTextNodeContentDoc(document, textNode.id, 'linkEnabled', 'true');
    const withImageLink = setTextNodeContentDoc(withTextLink, imageNode.id, 'linkEnabled', 'true');
    const withoutTextLink = setTextNodeContentDoc(withImageLink, textNode.id, 'linkEnabled', '');
    const withoutImageLink = setTextNodeContentDoc(withoutTextLink, imageNode.id, 'linkEnabled', '');

    expect((withTextLink.nodes[textNode.id] as typeof textNode).link).toMatchObject({ linkType: 'anchor', href: '#' });
    expect((withImageLink.nodes[imageNode.id] as typeof imageNode).link).toMatchObject({ linkType: 'anchor', href: '#' });
    expect((withoutTextLink.nodes[textNode.id] as typeof textNode).link).toBeUndefined();
    expect((withoutImageLink.nodes[imageNode.id] as typeof imageNode).link).toBeUndefined();
  });

  it('preserves div block semantics when editing plain text content', () => {
    const document = createInitialDocument();
    const text = createTextNode('block', 'section_1');
    text.htmlTag = 'div';
    text.content = createTextDocumentFromText('Original', { type: 'div' });

    const next = setTextNodeContentDoc({
      ...document,
      nodes: {
        ...document.nodes,
        [text.id]: text,
      },
    }, text.id, 'content', 'Updated');
    const updated = next.nodes[text.id];

    if (updated.contentType !== 'text' || updated.subtype !== 'block') {
      throw new Error('Expected block text node');
    }

    expect(updated.htmlTag).toBe('div');
    expect(updated.content.blocks[0]).toMatchObject({ type: 'div', children: [{ text: 'Updated' }] });
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

    const withContent = setTextNodeContentDoc(document, textId, 'content', 'Hello rich world');
    const next = convertTextNodeDoc(withContent, textId, 'rich');
    const node = next.nodes[textId];
    if (node.contentType !== 'text' || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(node.content.blocks).toMatchObject([{ type: 'h1', direction: 'ltr', children: [{ text: 'Hello rich world' }] }]);
    expect(node.code).toBeUndefined();
    expect(node.htmlTag).toBeUndefined();
  });

  it('preserves standalone block typography and inline leaves when converting to rich text', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const block = createTextNode('block', section.id);
    block.style = {
      ...(block.style ?? {}),
      fontSize: { raw: '28px', parsed: { value: 28, unit: 'px' } },
      fontStyle: 'italic',
    };
    block.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Styled ' },
          { text: 'inline', fontSize: '18px', underline: true },
        ],
      },
    ]);
    document.nodes[block.id] = block;
    section.children.push(block.id);

    const next = convertTextNodeDoc(document, block.id, 'rich');
    const node = next.nodes[block.id];
    if (node.contentType !== 'text' || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(node.style?.fontSize?.raw).toBe('28px');
    expect(node.style?.fontStyle).toBe('italic');
    expect(node.content.blocks).toMatchObject([
      {
        type: 'paragraph',
        children: [
          { text: 'Styled ' },
          { text: 'inline', fontSize: '18px', underline: true },
        ],
      },
    ]);
  });

  it('converts code blocks to rich code blocks through the explicit text conversion API', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const code = createTextNode('code', section.id);
    code.content = createTextDocumentFromCode('const total = 3;');
    code.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const total = 3;',
    };
    document.nodes[code.id] = code;
    document.nodes[section.id].children.push(code.id);

    const next = convertTextNodeDoc(document, code.id, 'rich');
    const node = next.nodes[code.id];
    if (node.contentType !== 'text' || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(node.content.blocks).toEqual([
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        highlightedHtml: 'const total = 3;',
        children: [{ type: 'code-line', children: [{ text: 'const total = 3;' }] }],
      },
    ]);
  });

  it('normalizes standalone list content through the pure document API', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const list = createTextNode('list', section.id);
    document.nodes[list.id] = list;
    document.nodes[section.id].children.push(list.id);

    const next = setListContentDoc(document, list.id, {
      type: 'ol',
      start: 0,
      markerStyle: 'upper-alpha',
      items: [{ text: 'First', direction: 'rtl' }],
    });
    const node = next.nodes[list.id];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    expect(richListBlockToListContent(getSingleListBlockContent(node.content)!)).toEqual({
      type: 'ol',
      start: 1,
      markerStyle: 'upper-alpha',
      items: [{ text: 'First', direction: 'rtl' }],
    });
  });

  it('rejects multi-block content for standalone list nodes', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const list = createTextNode('list', section.id);
    list.content = createTextDocumentContent([
      listContentToRichListBlock({ type: 'ul', markerStyle: 'disc', items: [{ text: 'First', direction: 'ltr' }] }),
    ]);
    document.nodes[list.id] = list;
    document.nodes[section.id].children.push(list.id);

    const next = setTextDocumentContentDoc(document, list.id, createTextDocumentContent([
      listContentToRichListBlock({ type: 'ul', markerStyle: 'disc', items: [{ text: 'First', direction: 'ltr' }] }),
      listContentToRichListBlock({ type: 'ul', markerStyle: 'disc', items: [{ text: 'Second', direction: 'ltr' }] }),
    ]));

    expect(next).toBe(document);
  });

  it('preserves rich list inline content when changing list kind and marker style', () => {
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
        type: 'ul',
        markerStyle: 'square',
        children: [
          {
            type: 'list-item',
            direction: 'rtl',
            depth: 1,
            children: [
              { text: 'Styled ', bold: true, fontSize: '20px' },
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
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const ordered = setRichListKindDoc(document, rich.id, 0, 'ol');
    const marked = setRichListMarkerStyleDoc(ordered, rich.id, 0, 'upper-roman');
    const node = marked.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(node.content.blocks).toMatchObject([
      {
        type: 'ol',
        markerStyle: 'upper-roman',
        children: [
          {
            type: 'list-item',
            direction: 'rtl',
            depth: 1,
            children: [
              { text: 'Styled ', bold: true, fontSize: '20px' },
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
  });

  it('converts block text to list through the explicit text conversion API', () => {
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

    const withContent = setTextNodeContentDoc(document, textId, 'content', 'First line\nSecond line');
    const next = convertTextNodeDoc(withContent, textId, 'list');
    const node = next.nodes[textId];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    expect(richListBlockToListContent(getSingleListBlockContent(node.content)!)).toEqual({
      type: 'ul',
      markerStyle: 'disc',
      items: [
        { text: 'First line', direction: 'ltr' },
        { text: 'Second line', direction: 'ltr' },
      ],
    });
  });

  it('converts styled block text to list without flattening inline content', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const text = createTextNode('block', section.id);
    text.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Styled', bold: true, fontFamily: 'Inter', fontSize: '20px' },
          { text: '\n' },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com',
            children: [{ text: 'Linked', underline: true, color: '#0044ff' }],
          },
        ],
      },
    ]);
    document.nodes[text.id] = text;
    document.nodes[section.id].children.push(text.id);

    const next = convertTextNodeDoc(document, text.id, 'list');
    const node = next.nodes[text.id];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    expect(getSingleListBlockContent(node.content)).toMatchObject({
      type: 'ul',
      markerStyle: 'disc',
      children: [
        {
          type: 'list-item',
          children: [{ text: 'Styled', bold: true, fontFamily: 'Inter', fontSize: '20px' }],
        },
        {
          type: 'list-item',
          children: [
            {
              type: 'link',
              href: 'https://example.com',
              children: [{ text: 'Linked', underline: true, color: '#0044ff' }],
            },
          ],
        },
      ],
    });
  });

  it('converts styled rich text to list without flattening inline content', () => {
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
        type: 'paragraph',
        children: [
          { text: 'First', italic: true, backgroundColor: '#ffeeaa' },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com',
            children: [{ text: '\nSecond', bold: true, fontSize: '28px' }],
          },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const next = convertTextNodeDoc(document, rich.id, 'list');
    const node = next.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    expect(getSingleListBlockContent(node.content)).toMatchObject({
      type: 'ul',
      markerStyle: 'disc',
      children: [
        {
          type: 'list-item',
          children: [{ text: 'First', italic: true, backgroundColor: '#ffeeaa' }],
        },
        {
          type: 'list-item',
          children: [
            {
              type: 'link',
              href: 'https://example.com',
              children: [{ text: 'Second', bold: true, fontSize: '28px' }],
            },
          ],
        },
      ],
    });
  });

  it('converts multiline code blocks to one list item per line', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const code = createTextNode('code', section.id);
    code.content = createTextDocumentFromCode('const total = 1;\n\nreturn total;');
    document.nodes[code.id] = code;
    document.nodes[section.id].children.push(code.id);

    const next = convertTextNodeDoc(document, code.id, 'list');
    const node = next.nodes[code.id];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    expect(richListBlockToListContent(getSingleListBlockContent(node.content)!)).toEqual({
      type: 'ul',
      markerStyle: 'disc',
      items: [
        { text: 'const total = 1;', direction: 'ltr' },
        { text: '', direction: 'ltr' },
        { text: 'return total;', direction: 'ltr' },
      ],
    });
  });

  it('converts standalone lists to rich list blocks without flattening inline content', () => {
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
        type: 'ol',
        start: 3,
        markerStyle: 'upper-alpha',
        children: [
          {
            type: 'list-item',
            direction: 'ltr',
            depth: 0,
            children: [
              { text: 'Third', bold: true, fontSize: '24px', color: '#123456' },
            ],
          },
          {
            type: 'list-item',
            direction: 'rtl',
            depth: 1,
            children: [
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com',
                children: [{ text: 'Fourth', italic: true, backgroundColor: '#ffeeaa' }],
              },
            ],
          },
        ],
      },
    ]);
    document.nodes[list.id] = list;
    document.nodes[section.id].children.push(list.id);

    const next = convertTextNodeDoc(document, list.id, 'rich');
    const node = next.nodes[list.id];
    if (node.contentType !== 'text' || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(node.content.blocks).toMatchObject([
      {
        type: 'ol',
        start: 3,
        markerStyle: 'upper-alpha',
        children: [
          { type: 'list-item', children: [{ text: 'Third', bold: true, fontSize: '24px', color: '#123456' }] },
          {
            type: 'list-item',
            direction: 'rtl',
            depth: 1,
            children: [
              {
                type: 'link',
                href: 'https://example.com',
                children: [{ text: 'Fourth', italic: true, backgroundColor: '#ffeeaa' }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('converts standalone lists to text blocks without flattening inline item content', () => {
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
          {
            type: 'list-item',
            children: [
              { text: 'Styled', bold: true, fontFamily: 'Inter', fontSize: '20px' },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com',
                children: [{ text: 'Linked', underline: true, color: '#0044ff' }],
              },
            ],
          },
        ],
      },
    ]);
    document.nodes[list.id] = list;
    document.nodes[section.id].children.push(list.id);

    const next = convertTextNodeDoc(document, list.id, 'block');
    const node = next.nodes[list.id];
    if (node.contentType !== 'text' || node.subtype !== 'block') {
      throw new Error('Expected block text node');
    }

    const block = getSingleTextBlockContent(node.content);
    expect(block).toMatchObject({
      type: 'paragraph',
      children: [
        { text: 'Styled', bold: true, fontFamily: 'Inter', fontSize: '20px' },
        { text: '\n' },
        {
          type: 'link',
          href: 'https://example.com',
          children: [{ text: 'Linked', underline: true, color: '#0044ff' }],
        },
      ],
    });
  });

  it('converts rich list blocks directly to standalone text blocks without flattening inline content', () => {
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
        type: 'ul',
        markerStyle: 'square',
        children: [
          {
            type: 'list-item',
            children: [
              { text: 'Styled', bold: true, fontFamily: 'Inter', fontSize: '20px' },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com',
                children: [{ text: 'Linked', underline: true, color: '#0044ff' }],
              },
            ],
          },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const next = convertTextNodeDoc(document, rich.id, 'block');
    const node = next.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'block') {
      throw new Error('Expected block text node');
    }

    expect(getSingleTextBlockContent(node.content)).toMatchObject({
      type: 'paragraph',
      children: [
        { text: 'Styled', bold: true, fontFamily: 'Inter', fontSize: '20px' },
        { text: '\n' },
        {
          type: 'link',
          href: 'https://example.com',
          children: [{ text: 'Linked', underline: true, color: '#0044ff' }],
        },
      ],
    });
  });

  it('converts rich list blocks directly to standalone lists without flattening inline content', () => {
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
        type: 'ol',
        start: 4,
        markerStyle: 'lower-roman',
        children: [
          {
            type: 'list-item',
            direction: 'rtl',
            children: [
              { text: 'Styled', italic: true, backgroundColor: '#ffeeaa' },
            ],
          },
          {
            type: 'list-item',
            depth: 1,
            children: [
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com',
                children: [{ text: 'Linked', bold: true, fontSize: '28px' }],
              },
            ],
          },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const next = convertTextNodeDoc(document, rich.id, 'list');
    const node = next.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    expect(getSingleListBlockContent(node.content)).toMatchObject({
      type: 'ol',
      start: 4,
      markerStyle: 'lower-roman',
      children: [
        {
          type: 'list-item',
          direction: 'rtl',
          children: [{ text: 'Styled', italic: true, backgroundColor: '#ffeeaa' }],
        },
        {
          type: 'list-item',
          depth: 1,
          children: [
            {
              type: 'link',
              href: 'https://example.com',
              children: [{ text: 'Linked', bold: true, fontSize: '28px' }],
            },
          ],
        },
      ],
    });
  });

  it('converts multi-block rich text to block and list without flattening compatible inline content', () => {
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
        type: 'paragraph',
        children: [{ text: 'First', bold: true, color: '#123456' }],
      },
      {
        type: 'ul',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com',
                children: [{ text: 'Second', underline: true }],
              },
            ],
          },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const blockDoc = convertTextNodeDoc(document, rich.id, 'block');
    const blockNode = blockDoc.nodes[rich.id];
    if (blockNode.contentType !== 'text' || blockNode.subtype !== 'block') {
      throw new Error('Expected block text node');
    }
    expect(getSingleTextBlockContent(blockNode.content)).toMatchObject({
      children: [
        { text: 'First', bold: true, color: '#123456' },
        { text: '\n' },
        {
          type: 'link',
          href: 'https://example.com',
          children: [{ text: 'Second', underline: true }],
        },
      ],
    });

    const listDoc = convertTextNodeDoc(document, rich.id, 'list');
    const listNode = listDoc.nodes[rich.id];
    if (listNode.contentType !== 'text' || listNode.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    expect(getSingleListBlockContent(listNode.content)).toMatchObject({
      type: 'ul',
      children: [
        { type: 'list-item', children: [{ text: 'First', bold: true, color: '#123456' }] },
        {
          type: 'list-item',
          children: [
            {
              type: 'link',
              href: 'https://example.com',
              children: [{ text: 'Second', underline: true }],
            },
          ],
        },
      ],
    });
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
    rich.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'const ' },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com',
            children: [{ text: 'answer' }],
          },
          { text: ' = 42;' },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    document.nodes[section.id].children.push(rich.id);

    const next = switchTextSubtypeDoc(document, rich.id, 'code', { mode: 'flatten' });
    const node = next.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'code') {
      throw new Error('Expected code node');
    }

    expect(getTextContent(node.content.blocks, { blockSeparator: '\n' })).toBe('const answer = 42;');
    expect(node.code?.language).toBe('plaintext');
    expect(node.code?.highlightedHtml).toContain('const');
    expect(node.htmlTag).toBeUndefined();
  });

  it('preserves compatible inline styling when converting one rich text block to standalone block text', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const rich = createTextNode('rich', section.id);
    rich.style = {
      ...(rich.style ?? {}),
      fontSize: { raw: '24px', parsed: { value: 24, unit: 'px' } },
    };
    rich.content = createTextDocumentContent([
      {
        type: 'h2',
        direction: 'rtl',
        lineHeight: 1.7,
        style: { textAlign: 'right' },
        children: [
          { text: 'Hello ', italic: true },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com',
            children: [{ text: 'world', color: '#d62246' }],
          },
        ],
      },
    ]);
    document.nodes[rich.id] = rich;
    section.children.push(rich.id);

    const next = switchTextSubtypeDoc(document, rich.id, 'block', { mode: 'flatten' });
    const node = next.nodes[rich.id];
    if (node.contentType !== 'text' || node.subtype !== 'block') {
      throw new Error('Expected block text node');
    }

    expect(node.style?.fontSize?.raw).toBe('24px');
    expect(node.content.blocks).toMatchObject([
      {
        type: 'h2',
        direction: 'rtl',
        lineHeight: 1.7,
        style: { textAlign: 'right' },
        children: [
          { text: 'Hello ', italic: true },
          {
            type: 'link',
            linkType: 'external',
            href: 'https://example.com',
            children: [{ text: 'world', color: '#d62246' }],
          },
        ],
      },
    ]);
  });

  it('clears matching inline overrides when inspector typography writes node-level text styles', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const block = createTextNode('block', section.id);
    block.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [{
          text: 'Styled',
          fontSize: '18px',
          color: '#d62246',
          backgroundColor: '#ffe680',
          fontWeight: 700,
          italic: true,
          underline: true,
        }],
      },
    ]);
    document.nodes[block.id] = block;
    section.children.push(block.id);

    const resized = setTextNodeContentDoc(document, block.id, 'fontSize', '32px');
    const resizedNode = resized.nodes[block.id];
    if (resizedNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(resizedNode.content.blocks[0]).toMatchObject({
      children: [{
        text: 'Styled',
        color: '#d62246',
        backgroundColor: '#ffe680',
        fontWeight: 700,
        italic: true,
        underline: true,
      }],
    });
    expect(resizedNode.content.blocks[0].children[0]).not.toHaveProperty('fontSize');

    const weighted = setTextNodeContentDoc(resized, block.id, 'fontWeight', '400');
    const weightedNode = weighted.nodes[block.id];
    if (weightedNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(weightedNode.content.blocks[0].children[0]).not.toHaveProperty('fontWeight');
    expect(weightedNode.content.blocks[0].children[0]).toHaveProperty('color', '#d62246');
  });

  it('drops list markers when converting standalone lists to code', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const list = createTextNode('list', section.id);
    list.content = createTextDocumentContent([
      listContentToRichListBlock({
        type: 'ol',
        start: 3,
        markerStyle: 'decimal',
        items: [
          { text: 'Third', direction: 'ltr' },
          { text: 'Fourth', direction: 'ltr' },
        ],
      }),
    ]);
    document.nodes[list.id] = list;
    document.nodes[section.id].children.push(list.id);

    const next = switchTextSubtypeDoc(document, list.id, 'code', { mode: 'flatten' });
    const node = next.nodes[list.id];
    if (node.contentType !== 'text' || node.subtype !== 'code') {
      throw new Error('Expected code node');
    }

    expect(getTextContent(node.content.blocks, { blockSeparator: '\n' })).toBe('Third\nFourth');
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

    const next = setTextNodeContentDoc(document, textId, 'fontFamily', 'Assistant');
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

    const unchanged = setTextNodeContentDoc(document, wrapperId, 'content', 'no-op');
    expect(unchanged).toBe(document);
  });

  it('normalizes code and direction through dedicated API helpers', () => {
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

    const withLanguage = setCodeBlockLanguageDoc(document, code.id, 'unsupported-language');
    const withDirection = setTextDirectionDoc(withLanguage, code.id, 'rtl');
    const normalized = normalizeTextNodeDoc(withDirection, code.id);
    const codeNode = normalized.nodes[code.id];
    if (codeNode.contentType !== 'text' || codeNode.subtype !== 'code') {
      throw new Error('Expected code node');
    }

    expect(codeNode.code?.language).toBe('plaintext');
    expect(codeNode.style?.direction).toBe('ltr');
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
    expect(getTextContent(updatedText.content.blocks, { blockSeparator: '\n' })).toBe('Updated by command chain');
    expect(updatedText.htmlTag).toBe('blockquote');

    const json = serializeDocumentJson(next);
    const reparsed = parseDocumentJson(json);
    expect(reparsed.nodes[textId]).toEqual(next.nodes[textId]);
  });

  it('serializes the document model shape only', () => {
    const document = createInitialDocument();
    const serialized = JSON.parse(serializeDocumentJson(document)) as Record<string, unknown>;

    expect(Object.keys(serialized).sort()).toEqual(['fontLibrary', 'nodes', 'pages', 'rootId', 'schemaVersion', 'sharedRegionIds', 'siteSettings']);
    expect(serialized.rootId).toBe(document.rootId);
    expect(serialized.fontLibrary).toEqual(document.fontLibrary);
    expect(serialized.nodes).toEqual(document.nodes);
  });

  it('stamps schemaVersion matching DOCUMENT_MODEL_VERSION', () => {
    const document = createInitialDocument();
    const serialized = JSON.parse(serializeDocumentJson(document)) as Record<string, unknown>;
    expect(typeof serialized.schemaVersion).toBe('string');
    expect(serialized.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('does not mutate the original document when serializing', () => {
    const document = createInitialDocument();
    serializeDocumentJson(document);
    expect(document.schemaVersion).toBeUndefined();
  });

  it('overwrites any pre-existing schemaVersion in the input', () => {
    const document = { ...createInitialDocument(), schemaVersion: '0.0.1' };
    const serialized = JSON.parse(serializeDocumentJson(document)) as Record<string, unknown>;
    expect(serialized.schemaVersion).not.toBe('0.0.1');
    expect(serialized.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('strips imported code highlight html while parsing document JSON', () => {
    const maliciousHighlightHtml = '<script>alert(1)</script><img src=x onerror=alert(2)><svg onload=alert(3)></svg>';
    const document = createInitialDocument();
    const root = getRoot(document);
    const sectionId = root.children.find((id) => document.nodes[id]?.contentType === 'container');
    if (!sectionId) {
      throw new Error('Expected section');
    }

    const code = createTextNode('code', sectionId);
    code.content = createTextDocumentFromCode('const value = 1;', {
      language: 'typescript',
      highlightedHtml: maliciousHighlightHtml,
    });
    code.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: maliciousHighlightHtml,
    };
    document.nodes[code.id] = code;
    const section = document.nodes[sectionId];
    if (section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    section.children.push(code.id);

    const parsed = parseDocumentJson(JSON.stringify(document));
    const parsedCode = parsed.nodes[code.id];
    if (parsedCode.contentType !== 'text') {
      throw new Error('Expected parsed code node');
    }

    expect(parsedCode.code?.highlightedHtml).toBeUndefined();
    expect(getSingleCodeBlockContent(parsedCode.content)?.highlightedHtml).toBeUndefined();
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
          content: createTextDocumentContent([{ type: 'paragraph', children: [{ text: 'bad' }] }]),
        },
      },
    };

    expect(() => parseDocumentJson(JSON.stringify(bad))).toThrow('Invalid document');
  });

  it('inserts section templates before footer by default', () => {
    const document = createInitialDocument();
    const root = getRoot(document);
    const footerId = root.children[root.children.length - 1];

    const next = insertSectionTemplateDoc(document, 'blank', {
      pageId: document.pages?.[0]?.id,
    });
    const nextRoot = getRoot(next);
    const insertedId = nextRoot.children.find((childId) => !document.nodes[childId]);
    const homePage = next.pages?.[0];
    if (!insertedId) {
      throw new Error('Expected inserted section');
    }
    if (!homePage) {
      throw new Error('Expected home page');
    }

    expect(nextRoot.children[nextRoot.children.length - 1]).toBe(footerId);
    expect(nextRoot.children.length).toBe(root.children.length + 1);
    expect(homePage.sectionIds[homePage.sectionIds.length - 1]).toBe(insertedId);
  });

  it('inserts section templates after the selected section ancestor', () => {
    const document = createInitialDocument();
    const root = getRoot(document);
    const section = root.children
      .map((childId) => document.nodes[childId])
      .find((node) => node && node.contentType === 'container' && node.subtype === 'section');
    if (!section || section.contentType !== 'container' || section.children.length === 0) {
      throw new Error('Expected section wrapper with content');
    }

    const next = insertSectionTemplateDoc(document, 'blank', {
      selectedId: section.children[0],
      pageId: document.pages?.[0]?.id,
    });
    const nextRoot = getRoot(next);
    const insertedId = nextRoot.children.find((childId) => !document.nodes[childId]);
    if (!insertedId) {
      throw new Error('Expected inserted section');
    }

    expect(nextRoot.children.indexOf(insertedId)).toBe(root.children.indexOf(section.id) + 1);
    expect(next.pages?.[0]?.sectionIds).toEqual([section.id, insertedId]);
  });

  it('inserts section templates before footer when the footer or one of its descendants is selected', () => {
    const document = createInitialDocument();
    const root = getRoot(document);
    const footer = root.children
      .map((childId) => document.nodes[childId])
      .find((node) => node && node.contentType === 'container' && node.subtype === 'footer');
    const section = root.children
      .map((childId) => document.nodes[childId])
      .find((node) => node && node.contentType === 'container' && node.subtype === 'section');
    if (!footer || footer.contentType !== 'container' || footer.children.length === 0) {
      throw new Error('Expected footer wrapper with content');
    }
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const next = insertSectionTemplateDoc(document, 'blank', {
      selectedId: footer.children[0],
      pageId: document.pages?.[0]?.id,
    });
    const nextRoot = getRoot(next);
    const insertedId = nextRoot.children.find((childId) => !document.nodes[childId]);
    if (!insertedId) {
      throw new Error('Expected inserted section');
    }

    expect(nextRoot.children.indexOf(insertedId)).toBe(root.children.indexOf(footer.id));
    expect(next.pages?.[0]?.sectionIds).toEqual([section.id, insertedId]);
  });

  it('seeds the default post link with product documentation copy', () => {
    const document = createInitialDocument();
    const postLink = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!postLink || postLink.contentType !== 'text' || postLink.link == null) {
      throw new Error('Expected post link node');
    }

    expect(getTextContent(postLink.content.blocks)).toBe('Open playground spec');
    expect(getTextContent(postLink.content.blocks).toLowerCase()).not.toContain('maintenance');
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

  it('seeds the default footer repository link with the editor-playground repo url', () => {
    const document = createInitialDocument();
    const repoLink = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Repository Link',
    );

    if (!repoLink || repoLink.contentType !== 'text' || repoLink.link == null) {
      throw new Error('Expected repository link node');
    }

    expect(getTextContent(repoLink.content.blocks)).toBe('github.com/tombigel/editor-playground');
    expect(repoLink.link?.href).toBe('https://github.com/tombigel/editor-playground');
  });

  it('moves and reparents positioned nodes through pure document APIs', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section');
    }

    const containerA = createContainerNode('container', section.id);
    const containerB = createContainerNode('container', section.id);
    const leafA = createTextNode('block', containerA.id);
    const leafB = createTextNode('block', containerA.id);
    containerA.children = [leafA.id, leafB.id];
    section.children.push(containerA.id, containerB.id);
    document.nodes[containerA.id] = containerA;
    document.nodes[containerB.id] = containerB;
    document.nodes[leafA.id] = leafA;
    document.nodes[leafB.id] = leafB;

    const moved = moveNodeDoc(document, leafA.id, { x: '40px', y: '48px' });
    const movedLeafA = moved.nodes[leafA.id];
    if (!movedLeafA || movedLeafA.contentType === 'site') {
      throw new Error('Expected moved leaf');
    }
    expect(movedLeafA.rect.x.base.raw).toBe('40px');
    expect(leafA.rect.x.base.raw).not.toBe('40px');

    const batchMoved = moveNodesDoc(moved, [
      { id: leafA.id, x: '50px', y: '58px' },
      { id: leafB.id, x: '140px', y: '58px' },
    ]);
    const batchMovedLeafA = batchMoved.nodes[leafA.id];
    const batchMovedLeafB = batchMoved.nodes[leafB.id];
    if (!batchMovedLeafA || batchMovedLeafA.contentType === 'site' || !batchMovedLeafB || batchMovedLeafB.contentType === 'site') {
      throw new Error('Expected batch moved leaves');
    }
    expect(batchMovedLeafA.rect.x.base.raw).toBe('50px');
    expect(batchMovedLeafB.rect.x.base.raw).toBe('140px');

    const reparented = reparentNodeAtDoc(batchMoved, leafA.id, containerB.id, { x: '12px', y: '16px' });
    expect(reparented.nodes[leafA.id].parentId).toBe(containerB.id);
    const reparentedLeafA = reparented.nodes[leafA.id];
    if (!reparentedLeafA || reparentedLeafA.contentType === 'site') {
      throw new Error('Expected reparented leaf');
    }
    expect(reparentedLeafA.rect.x.base.raw).toBe('12px');
    expect(reparented.nodes[containerA.id].children).not.toContain(leafA.id);
    expect(reparented.nodes[containerB.id].children).toContain(leafA.id);

    const batchReparented = reparentNodesAtDoc(reparented, containerB.id, [
      { id: leafB.id, x: '30px', y: '36px' },
    ]);
    expect(batchReparented.nodes[leafB.id].parentId).toBe(containerB.id);
    const batchReparentedLeafB = batchReparented.nodes[leafB.id];
    if (!batchReparentedLeafB || batchReparentedLeafB.contentType === 'site') {
      throw new Error('Expected batch reparented leaf');
    }
    expect(batchReparentedLeafB.rect.y.base.raw).toBe('36px');

    expect(resolveContainerChildBoundary(batchReparented, containerB.id)).toBe('anchor');
    const constrained = setContainerChildBoundaryDoc(batchReparented, containerB.id, 'box');
    expect(resolveContainerChildBoundary(constrained, containerB.id)).toBe('box');
    const unchangedContainerB = batchReparented.nodes[containerB.id];
    expect(unchangedContainerB.contentType === 'container' ? unchangedContainerB.layout : null).toBeUndefined();
  });

  it('can grow a parent in the same pure move or reparent operation', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section');
    }

    const containerA = createContainerNode('container', section.id);
    containerA.rect = createDefaultRect('0px', '0px', '240px', '120px');
    const containerB = createContainerNode('container', section.id);
    containerB.rect = createDefaultRect('260px', '0px', '240px', '100px');
    const leafA = createTextNode('block', containerA.id);
    const leafB = createTextNode('block', containerA.id);
    containerA.children = [leafA.id, leafB.id];
    section.children.push(containerA.id, containerB.id);
    document.nodes[containerA.id] = containerA;
    document.nodes[containerB.id] = containerB;
    document.nodes[leafA.id] = leafA;
    document.nodes[leafB.id] = leafB;

    const moved = moveNodeDoc(
      document,
      leafA.id,
      { x: '20px', y: '140px' },
      { parentExpansion: { parentId: containerA.id, minHeightPx: 188 } },
    );
    expectContainerHeight(moved, containerA.id, '188px');
    expectContainerHeight(document, containerA.id, '120px');

    const batchMoved = moveNodesDoc(
      moved,
      [{ id: leafB.id, x: '30px', y: '150px' }],
      { parentExpansion: { parentId: containerA.id, minHeightPx: 176 } },
    );
    expectContainerHeight(batchMoved, containerA.id, '188px');

    const reparented = reparentNodeAtDoc(
      batchMoved,
      leafA.id,
      containerB.id,
      { x: '12px', y: '130px' },
      { parentExpansion: { parentId: containerB.id, minHeightPx: 171 } },
    );
    expectContainerHeight(reparented, containerB.id, '171px');

    const batchReparented = reparentNodesAtDoc(
      reparented,
      containerB.id,
      [{ id: leafB.id, x: '20px', y: '160px' }],
      { parentExpansion: { parentId: containerB.id, minHeightPx: 205 } },
    );
    expectContainerHeight(batchReparented, containerB.id, '205px');

    const invalid = expandParentHeightDoc(batchReparented, { parentId: leafA.id, minHeightPx: 400 });
    expect(invalid).toBe(batchReparented);
  });

  it('preserves auto parent height when expansion is requested', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section');
    }
    const parent = createContainerNode('container', section.id);
    parent.rect = createDefaultRect('0px', '0px', '240px', 'auto');
    const leaf = createTextNode('block', parent.id);
    parent.children = [leaf.id];
    section.children.push(parent.id);
    document.nodes[parent.id] = parent;
    document.nodes[leaf.id] = leaf;

    const expanded = expandParentHeightDoc(document, { parentId: parent.id, minHeightPx: 320 });
    expect(expanded).toBe(document);

    const moved = moveNodeDoc(
      document,
      leaf.id,
      { x: '20px', y: '280px' },
      { parentExpansion: { parentId: parent.id, minHeightPx: 320 } },
    );
    expectContainerHeight(moved, parent.id, 'auto');
    const movedLeaf = moved.nodes[leaf.id];
    if (!movedLeaf || movedLeaf.contentType === 'site') {
      throw new Error('Expected moved leaf');
    }
    expect(movedLeaf.rect.y.base.raw).toBe('280px');
  });
});
