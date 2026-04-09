import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContainerNode, createTextNode } from '../../model/defaults';
import {
  createRichTextBlock,
  createRichTextLeaf,
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

describe('api/textMerge', () => {
  it('splits a multi-block rich node into sibling block text nodes', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const withRichContent = setTextNodeContentDoc(document, richId, 'name', 'Story');
    const richNode = withRichContent.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = [
      createRichTextBlock('h2', [createRichTextLeaf('Heading')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Body copy')]),
    ];

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
    expect(first.content).toBe('Heading');
    expect(second.subtype).toBe('block');
    expect(second.htmlTag).toBe('p');
    expect(second.content).toBe('Body copy');
    expect(second.rect.y.base.raw).not.toBe(first.rect.y.base.raw);
  });

  it('splits rich code and list blocks into matching standalone text subtypes', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = [
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
    ];

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
    expect(first.content).toBe('const value = 1;');
    expect(first.code).toMatchObject({ language: 'typescript', theme: 'dark' });
    expect(second.subtype).toBe('list');
    expect(second.content).toEqual({
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
    richNode.content = [
      createRichTextBlock('blockquote', [createRichTextLeaf('Quoted line')]),
    ];

    const split = splitRichTextNodeDoc(document, richId);
    const nextNode = split.nodes[richId];
    if (nextNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    expect(nextNode.subtype).toBe('block');
    expect(nextNode.htmlTag).toBe('blockquote');
    expect(nextNode.content).toBe('Quoted line');
    expect(document.nodes[richId]).not.toBe(nextNode);
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

    expect(survivor.content).toMatchObject([
      {
        type: 'h2',
        children: [{ text: 'Heading' }],
      },
      {
        type: 'code-block',
        language: 'plaintext',
        theme: 'light',
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

    const [headingBlock, bodyBlock] = survivor.content as RichContent;
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
    richNode.content = [
      createRichTextBlock('h3', [createRichTextLeaf('Alpha')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Beta')]),
    ];

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

  it('splits rich nodes into requested simple list nodes when split mode targets list', () => {
    const document = createInitialDocument();
    const richId = appendTextNode(document, createTextNode('rich', sectionId(document)));
    const richNode = document.nodes[richId];
    if (richNode.contentType !== 'text' || richNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    richNode.content = [
      createRichTextBlock('paragraph', [createRichTextLeaf('Alpha\nBeta')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Gamma')]),
    ];

    const converted = convertTextNodeDoc(document, richId, 'list', { mode: 'split' });
    const parent = converted.nodes[sectionId(converted)];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitChildren = parent.children.slice(-2);
    const first = converted.nodes[splitChildren[0]];
    const second = converted.nodes[splitChildren[1]];
    if (first.contentType !== 'text' || second.contentType !== 'text') {
      throw new Error('Expected text nodes');
    }

    expect(first.subtype).toBe('list');
    expect(first.content).toMatchObject({
      type: 'ul',
      items: [{ text: 'Alpha' }, { text: 'Beta' }],
    });
    expect(second.subtype).toBe('list');
    expect(second.content).toMatchObject({
      type: 'ul',
      items: [{ text: 'Gamma' }],
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

    expect(node.content).toMatchObject({
      type: 'ul',
      items: [
        { text: 'Line 1' },
        { text: 'Line 2' },
      ],
    });
  });
});
