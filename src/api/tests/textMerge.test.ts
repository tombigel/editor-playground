import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContainerNode, createTextNode } from '../../model/defaults';
import { parseFontSizeValue } from '../../model/units';
import {
  createTextDocumentContent,
  createRichTextBlock,
  createRichTextLeaf,
  getSingleListBlockContent,
  getTextContent,
  getTextDocumentBlocks,
  richListBlockToListContent,
} from '../../model/richContent';
import type { RichContent } from '../../model/types';
import { createInitialDocument } from '../documentApi';
import {
  convertTextNodeDoc,
  mergeTextNodesToRichDoc,
  setListContentDoc,
  setTextNodeContentDoc,
  splitRichTextNodeDoc,
  switchTextSubtypeDoc,
} from '../documentApi';
import { renderLeafContent } from '../../render/nodePresentation';

function appendTextNode(document: ReturnType<typeof createInitialDocument>, node = createTextNode('block', sectionId(document))) {
  const sectionIdValue = sectionId(document);
  document.nodes[node.id] = node;
  document.nodes[sectionIdValue].children.push(node.id);
  return node.id;
}

function sectionId(document: ReturnType<typeof createInitialDocument>) {
  const section = Object.values(document.nodes).find(
    (node) => node.contentType === 'container' && node.subtype === 'section',
  );
  if (!section || section.contentType !== 'container') {
    throw new Error('Expected section node');
  }
  return section.id;
}

function roundTripComparable(node: ReturnType<typeof createInitialDocument>['nodes'][string]) {
  if (node.contentType !== 'text') {
    throw new Error('Expected text node');
  }

  return {
    subtype: node.subtype,
    name: node.name,
    visible: node.visible,
    locked: node.locked,
    rect: node.rect,
    content: node.content,
    style: node.style,
    lang: node.lang,
    htmlTag: node.htmlTag,
    link: node.link,
    code: node.code,
    sticky: node.sticky,
    animation: node.animation,
  };
}

describe('api/textMerge', () => {
  it('splits a multi-block rich node into sibling block text nodes', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const withRichContent = setTextNodeContentDoc(document, richId, 'name', 'Story');
    const richNode = withRichContent.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Body copy')]),
    ]);

    const split = splitRichTextNodeDoc(withRichContent, richId);
    const parent = split.nodes[sectionId(split)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-2);
    expect(splitChildren[0]).toBe(richId);
    const first = split.nodes[splitChildren[0]];
    const second = split.nodes[splitChildren[1]];
    if (first.contentType !== 'text' || second.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    expect(first.id).toBe(richId);
    expect(first.subtype).toBe('block');
    expect(first.htmlTag).toBe('h2');
    expect(getTextContent(first.content.blocks)).toBe('Heading');
    expect(second.subtype).toBe('block');
    expect(second.htmlTag).toBe('p');
    expect(getTextContent(second.content.blocks)).toBe('Body copy');
    expect(second.rect.y.base.raw).not.toBe(first.rect.y.base.raw);
  });

  it('splits rich code and list blocks into matching standalone text subtypes', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        highlightedHtml: 'const value = 1;',
        children: [{ type: 'code-line', children: [{ text: 'const value = 1;' }] }],
      },
      {
        type: 'ul',
        markerStyle: 'square',
        children: [
          { type: 'list-item', children: [{ text: 'First item' }] },
          { type: 'list-item', children: [{ text: 'Second item' }] },
        ],
      },
    ]);

    const split = splitRichTextNodeDoc(document, richId);
    const parent = split.nodes[sectionId(split)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-2);
    const first = split.nodes[splitChildren[0]];
    const second = split.nodes[splitChildren[1]];
    if (first.contentType !== 'text' || second.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    expect(first.subtype).toBe('code');
    expect(getTextContent(first.content.blocks, { blockSeparator: '\n' })).toBe('const value = 1;');
    expect(first.code).toMatchObject({ language: 'typescript', theme: 'dark' });
    expect(second.subtype).toBe('list');
    expect(richListBlockToListContent(getSingleListBlockContent(second.content)!)).toEqual({
      type: 'ul',
      markerStyle: 'square',
      items: [
        { text: 'First item', direction: 'ltr' },
        { text: 'Second item', direction: 'ltr' },
      ],
    });
  });

  it('converts a single-block rich node in place when splitting', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('blockquote', [createRichTextLeaf('Quoted line')]),
    ]);

    const split = splitRichTextNodeDoc(document, richId);
    const nextNode = split.nodes[richId];
    if (nextNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    expect(nextNode.subtype).toBe('block');
    expect(nextNode.htmlTag).toBe('blockquote');
    expect(getTextContent(nextNode.content.blocks)).toBe('Quoted line');
    expect(document.nodes[richId]).not.toBe(nextNode);
  });

  it('preserves per-block styling when splitting rich text back into standalone nodes', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')], {
        lineHeight: 1.2,
        style: {
          color: '#c2410c',
          fontSize: '32px',
          fontWeight: 700,
          textAlign: 'center',
        },
      }),
      createRichTextBlock('paragraph', [createRichTextLeaf('Body copy')], {
        lineHeight: 1.45,
        style: {
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: 400,
          textAlign: 'left',
        },
      }),
    ]);

    const split = splitRichTextNodeDoc(document, richId);
    const parent = split.nodes[sectionId(split)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-2);
    const first = split.nodes[splitChildren[0]];
    const second = split.nodes[splitChildren[1]];
    if (first.contentType !== 'text' || second.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    const firstMarkup = renderToStaticMarkup(renderLeafContent(first));
    const secondMarkup = renderToStaticMarkup(renderLeafContent(second));

    expect(firstMarkup).toContain('<h2');
    expect(firstMarkup).toContain('color:#c2410c');
    expect(firstMarkup).toContain('font-size:32px');
    expect(firstMarkup).toContain('font-weight:700');
    expect(firstMarkup).toContain('line-height:1.2');
    expect(firstMarkup).toContain('text-align:center');
    expect(secondMarkup).toContain('<p');
    expect(secondMarkup).toContain('color:#0f172a');
    expect(secondMarkup).toContain('font-size:18px');
    expect(secondMarkup).toContain('font-weight:400');
    expect(secondMarkup).toContain('line-height:1.45');
    expect(secondMarkup).toContain('text-align:left');
  });

  it('preserves source rich styling with block-local overrides when splitting', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.rect.y.base.raw = '40px';
    richNode.rect.y.base.parsed.value = 40;
    richNode.style = {
      ...richNode.style,
      color: '#112233',
      fontFamily: 'Inter',
      fontSize: parseFontSizeValue('22px'),
      fontWeight: 500,
      lineHeight: 1.6,
      textAlign: 'center',
      textDecorationLine: 'underline',
    };
    richNode.content = createTextDocumentContent([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')], {
        lineHeight: 1.1,
        style: {
          fontSize: '34px',
          fontWeight: 800,
          textAlign: 'left',
        },
      }),
      createRichTextBlock('paragraph', [createRichTextLeaf('Body\nCopy')]),
      {
        type: 'ul',
        children: [
          { type: 'list-item', children: [{ text: 'First' }] },
          { type: 'list-item', children: [{ text: 'Second\nSoft' }] },
        ],
      },
      {
        type: 'code-block',
        language: 'typescript',
        children: [
          { type: 'code-line', children: [{ text: 'const first = 1;' }] },
          { type: 'code-line', children: [{ text: 'const second = 2;' }] },
        ],
      },
    ], { blockGap: 24 });

    const split = splitRichTextNodeDoc(document, richId);
    const parent = split.nodes[sectionId(split)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-4);
    const [heading, paragraph, list, code] = splitChildren.map((childId) => split.nodes[childId]);
    if (
      heading.contentType !== 'text' ||
      paragraph.contentType !== 'text' ||
      list.contentType !== 'text' ||
      code.contentType !== 'text'
    ) {
      throw new Error('Expected split text nodes');
    }

    expect(heading.style).toMatchObject({
      color: '#112233',
      fontFamily: 'Inter',
      fontWeight: 800,
      lineHeight: 1.1,
      textAlign: 'left',
      textDecorationLine: 'underline',
    });
    expect(heading.style?.fontSize?.raw).toBe('34px');
    expect(paragraph.style).toMatchObject({
      color: '#112233',
      fontFamily: 'Inter',
      fontWeight: 500,
      lineHeight: 1.6,
      textAlign: 'center',
      textDecorationLine: 'underline',
    });
    expect(paragraph.style?.fontSize?.raw).toBe('22px');
    expect(list.style?.fontFamily).toBe('Inter');
    expect(list.style?.textDecorationLine).toBe('underline');
    expect(code.style?.fontFamily).toBe('Inter');
    expect(code.style?.textDecorationLine).toBe('underline');
    expect(splitChildren[0]).toBe(richId);
    expect(paragraph.rect.x.base.raw).toBe(heading.rect.x.base.raw);
    expect(paragraph.rect.width.base.raw).toBe(heading.rect.width.base.raw);
    expect(Number.parseFloat(paragraph.rect.y.base.raw)).toBeGreaterThan(Number.parseFloat(heading.rect.y.base.raw));
    expect(Number.parseFloat(list.rect.y.base.raw)).toBeGreaterThan(Number.parseFloat(paragraph.rect.y.base.raw));
    expect(Number.parseFloat(code.rect.y.base.raw)).toBeGreaterThan(Number.parseFloat(list.rect.y.base.raw));
  });

  it('merges sibling text nodes into one rich node using tree order for content', () => {
    const document = createInitialDocument();
    const parentId = sectionId(document);
    const headingId = appendTextNode(document, createTextNode('block', parentId));
    const codeId = appendTextNode(document, createTextNode('code', parentId));
    const listId = appendTextNode(document, createTextNode('list', parentId));

    let next = setTextNodeContentDoc(document, headingId, 'content', 'Heading');
    next = setTextNodeContentDoc(next, headingId, 'htmlTag', 'h2');
    next = setTextNodeContentDoc(next, codeId, 'content', 'const value = 1;');
    next = setListContentDoc(next, listId, {
      type: 'ul',
      markerStyle: 'disc',
      items: [{ text: 'First item', direction: 'ltr' }],
    });

    const merged = mergeTextNodesToRichDoc(next, [listId, headingId, codeId], { survivorNodeId: listId });
    const parent = merged.nodes[parentId];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const mergedChildren = parent.children.filter((childId) => [headingId, codeId, listId].includes(childId));
    expect(mergedChildren).toEqual([listId]);
    const survivor = merged.nodes[listId];
    if (survivor.contentType !== 'text' || survivor.subtype !== 'rich') {
      throw new Error('Expected merged rich node');
    }

    expect(survivor.content.blocks).toMatchObject([
      {
        type: 'h2',
        children: [{ text: 'Heading' }],
      },
      {
        type: 'code-block',
        language: 'plaintext',
        theme: 'auto',
        highlightedHtml: 'const value = 1;',
        children: [{ type: 'code-line', children: [{ text: 'const value = 1;' }] }],
      },
      {
        type: 'ul',
        markerStyle: 'disc',
        children: [{ type: 'list-item', children: [{ text: 'First item' }] }],
      },
    ]);
  });

  it('preserves per-block inline styling when merging standalone text nodes', () => {
    const document = createInitialDocument();
    const parentId = sectionId(document);
    const headingId = appendTextNode(document, createTextNode('block', parentId));
    const bodyId = appendTextNode(document, createTextNode('block', parentId));

    let next = setTextNodeContentDoc(document, headingId, 'content', 'Heading');
    next = setTextNodeContentDoc(next, headingId, 'htmlTag', 'h2');
    next = setTextNodeContentDoc(next, headingId, 'color', '#c2410c');
    next = setTextNodeContentDoc(next, headingId, 'fontSize', '32px');
    next = setTextNodeContentDoc(next, headingId, 'fontWeight', '700');
    next = setTextNodeContentDoc(next, headingId, 'lineHeight', '1.2');
    next = setTextNodeContentDoc(next, headingId, 'textAlign', 'center');
    next = setTextNodeContentDoc(next, bodyId, 'content', 'Body copy');
    next = setTextNodeContentDoc(next, bodyId, 'color', '#0f172a');
    next = setTextNodeContentDoc(next, bodyId, 'fontSize', '18px');
    next = setTextNodeContentDoc(next, bodyId, 'fontWeight', '400');
    next = setTextNodeContentDoc(next, bodyId, 'lineHeight', '1.45');
    next = setTextNodeContentDoc(next, bodyId, 'textAlign', 'left');

    const merged = mergeTextNodesToRichDoc(next, [headingId, bodyId], { survivorNodeId: headingId });
    const survivor = merged.nodes[headingId];
    if (survivor.contentType !== 'text' || survivor.subtype !== 'rich') {
      throw new Error('Expected merged rich node');
    }

    expect(survivor.style?.color).toBe('#16202a');
    expect(survivor.style?.fontSize?.raw).toBe('18px');

    const [headingBlock, bodyBlock] = survivor.content.blocks as RichContent;
    if (headingBlock.type === 'code-block' || headingBlock.type === 'ul' || headingBlock.type === 'ol') {
      throw new Error('Expected heading text block');
    }
    if (bodyBlock.type === 'code-block' || bodyBlock.type === 'ul' || bodyBlock.type === 'ol') {
      throw new Error('Expected body text block');
    }

    expect(headingBlock.style).toMatchObject({
      color: '#c2410c',
      fontSize: '32px',
      fontWeight: 700,
      textAlign: 'center',
    });
    expect(headingBlock.lineHeight).toBe(1.2);
    expect(bodyBlock.style).toMatchObject({
      color: '#0f172a',
      fontSize: '18px',
      fontWeight: 400,
      textAlign: 'left',
    });
    expect(bodyBlock.lineHeight).toBe(1.45);

    const markup = renderToStaticMarkup(renderLeafContent(survivor));
    expect(markup).toContain('<h2');
    expect(markup).toContain('color:#c2410c');
    expect(markup).toContain('font-size:32px');
    expect(markup).toContain('text-align:center');
    expect(markup).toContain('Body copy');
    expect(markup).toContain('color:#0f172a');
    expect(markup).toContain('font-size:18px');
    expect(markup).toContain('text-align:left');
  });

  it('round-trips standalone node data through merge then split', () => {
    const document = createInitialDocument();
    const parentId = sectionId(document);
    const headingId = appendTextNode(document, createTextNode('block', parentId));
    const bodyId = appendTextNode(document, createTextNode('block', parentId));

    const heading = document.nodes[headingId];
    const body = document.nodes[bodyId];
    if (heading.contentType !== 'text' || body.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    heading.name = 'Hero Title';
    heading.htmlTag = 'h2';
    heading.link = { linkType: 'external', href: 'https://example.com', openInNewTab: true };
    heading.rect.y.base = { raw: '40px', parsed: { value: 40, unit: 'px' } };
    heading.style = {
      ...heading.style,
      color: '#c2410c',
      fontSize: { raw: '32px', parsed: { value: 32, unit: 'px' } },
      fontWeight: 700,
      lineHeight: 1.2,
      textAlign: 'center',
      shadowColor: 'rgba(0,0,0,0.2)',
      shadowBlur: 4,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
    };
    heading.content = createTextDocumentContent([
      createRichTextBlock('h2', [
        createRichTextLeaf('Hello ', { bold: true }),
        createRichTextLeaf('world', { color: '#c2410c' }),
      ], {
        lineHeight: 1.2,
        style: {
          color: '#c2410c',
          fontSize: '32px',
          fontWeight: 700,
          textAlign: 'center',
        },
      }),
    ]);

    body.name = 'Hero Body';
    body.rect.y.base = { raw: '110px', parsed: { value: 110, unit: 'px' } };
    body.style = {
      ...body.style,
      color: '#0f172a',
      fontSize: { raw: '18px', parsed: { value: 18, unit: 'px' } },
      fontWeight: 400,
      lineHeight: 1.45,
      textAlign: 'left',
    };
    body.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [
        createRichTextLeaf('Body copy'),
      ], {
        lineHeight: 1.45,
        style: {
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: 400,
          textAlign: 'left',
        },
      }),
    ]);

    const originalHeading = structuredClone(roundTripComparable(heading));
    const originalBody = structuredClone(roundTripComparable(body));

    const merged = mergeTextNodesToRichDoc(document, [headingId, bodyId], { survivorNodeId: headingId });
    const mergedRich = merged.nodes[headingId];
    if (mergedRich.contentType !== 'text' || mergedRich.subtype !== 'rich') {
      throw new Error('Expected merged rich node');
    }
    const firstMergedContent = structuredClone(mergedRich.content);

    const split = splitRichTextNodeDoc(merged, headingId);
    const parent = split.nodes[parentId];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }
    const splitChildren = parent.children.slice(-2);
    const [firstId, secondId] = splitChildren;
    const splitHeading = split.nodes[firstId];
    const splitBody = split.nodes[secondId];
    if (splitHeading.contentType !== 'text' || splitBody.contentType !== 'text') {
      throw new Error('Expected split text nodes');
    }

    expect(roundTripComparable(splitHeading)).toEqual(originalHeading);
    expect(roundTripComparable(splitBody)).toEqual(originalBody);

    const mergedAgain = mergeTextNodesToRichDoc(split, [firstId, secondId], { survivorNodeId: firstId });
    const mergedAgainNode = mergedAgain.nodes[firstId];
    if (mergedAgainNode.contentType !== 'text' || mergedAgainNode.subtype !== 'rich') {
      throw new Error('Expected rich node after re-merge');
    }

    expect(mergedAgainNode.content).toEqual(firstMergedContent);
  });

  it('rejects merge requests that span multiple parents', () => {
    const document = createInitialDocument();
    const parentId = sectionId(document);
    const firstId = appendTextNode(document, createTextNode('block', parentId));
    const secondParent = createContainerNode('container', parentId);
    document.nodes[secondParent.id] = secondParent;
    document.nodes[parentId].children.push(secondParent.id);
    const nestedId = appendTextNode(document, createTextNode('block', secondParent.id));

    const merged = mergeTextNodesToRichDoc(document, [firstId, nestedId], { survivorNodeId: firstId });
    expect(merged).toBe(document);
  });

  it('routes split conversion mode through the pure rich split helper', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('h3', [createRichTextLeaf('Alpha')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Beta')]),
    ]);

    const converted = convertTextNodeDoc(document, richId, 'block', { mode: 'split' });
    const parent = converted.nodes[sectionId(converted)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-2);
    expect(splitChildren[0]).toBe(richId);
    expect(converted.nodes[splitChildren[0]].contentType).toBe('text');
    expect(converted.nodes[splitChildren[1]].contentType).toBe('text');
  });

  it('preserves unsupported rich blocks when split mode targets block text', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Alpha')]),
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        children: [{ type: 'code-line', children: [{ text: 'const value = 1;' }] }],
      },
      {
        type: 'ul',
        children: [
          { type: 'list-item', children: [{ text: 'First item' }] },
        ],
      },
    ]);

    const converted = convertTextNodeDoc(document, richId, 'block', { mode: 'split' });
    const parent = converted.nodes[sectionId(converted)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-3);
    const [first, second, third] = splitChildren.map((childId) => converted.nodes[childId]);
    if (first.contentType !== 'text' || second.contentType !== 'text' || third.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    expect(splitChildren[0]).toBe(richId);
    expect(first.subtype).toBe('block');
    expect(getTextContent(first.content.blocks)).toBe('Alpha');
    expect(second.subtype).toBe('rich');
    expect(getTextDocumentBlocks(second.content)[0]).toMatchObject({ type: 'code-block', language: 'typescript' });
    expect(third.subtype).toBe('rich');
    expect(getTextDocumentBlocks(third.content)[0]).toMatchObject({ type: 'ul' });
  });

  it('preserves unsupported rich blocks when split mode targets code', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Alpha')]),
      {
        type: 'code-block',
        language: 'markdown',
        children: [{ type: 'code-line', children: [{ text: '# Title' }] }],
      },
      {
        type: 'ol',
        start: 3,
        children: [
          { type: 'list-item', children: [{ text: 'First item' }] },
        ],
      },
    ]);

    const converted = convertTextNodeDoc(document, richId, 'code', { mode: 'split' });
    const parent = converted.nodes[sectionId(converted)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const [first, second, third] = parent.children.slice(-3).map((childId) => converted.nodes[childId]);
    if (first.contentType !== 'text' || second.contentType !== 'text' || third.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    expect(first.subtype).toBe('rich');
    expect(getTextDocumentBlocks(first.content)[0]).toMatchObject({ type: 'paragraph' });
    expect(second.subtype).toBe('code');
    expect(getTextContent(second.content.blocks, { blockSeparator: '\n' })).toBe('# Title');
    expect(second.code).toMatchObject({ language: 'markdown' });
    expect(third.subtype).toBe('rich');
    expect(getTextDocumentBlocks(third.content)[0]).toMatchObject({ type: 'ol', start: 3 });
  });

  it('preserves unsupported rich blocks when split mode targets list', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Alpha')]),
      {
        type: 'code-block',
        language: 'typescript',
        children: [{ type: 'code-line', children: [{ text: 'const value = 1;' }] }],
      },
      {
        type: 'ul',
        children: [
          { type: 'list-item', children: [{ text: 'First item' }] },
        ],
      },
    ]);

    const converted = convertTextNodeDoc(document, richId, 'list', { mode: 'split' });
    const parent = converted.nodes[sectionId(converted)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const [first, second, third] = parent.children.slice(-3).map((childId) => converted.nodes[childId]);
    if (first.contentType !== 'text' || second.contentType !== 'text' || third.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    expect(first.subtype).toBe('rich');
    expect(getTextDocumentBlocks(first.content)[0]).toMatchObject({ type: 'paragraph' });
    expect(second.subtype).toBe('rich');
    expect(getTextDocumentBlocks(second.content)[0]).toMatchObject({ type: 'code-block', language: 'typescript' });
    expect(third.subtype).toBe('list');
    expect(richListBlockToListContent(getSingleListBlockContent(third.content)!)).toMatchObject({
      type: 'ul',
      items: [{ text: 'First item' }],
    });
  });

  it('keeps switchTextSubtypeDoc aligned with the list subtype', () => {
    const document = createInitialDocument();
    const blockId = appendTextNode(document, createTextNode('block', sectionId(document)));
    const withContent = setTextNodeContentDoc(document, blockId, 'content', 'Line 1\nLine 2');

    const switched = switchTextSubtypeDoc(withContent, blockId, 'list');
    const node = switched.nodes[blockId];
    if (node.contentType !== 'text' || node.subtype !== 'list') {
      throw new Error('Expected list text node');
    }

    expect(richListBlockToListContent(getSingleListBlockContent(node.content)!)).toMatchObject({
      type: 'ul',
      items: [
        { text: 'Line 1' },
        { text: 'Line 2' },
      ],
    });
  });
});
