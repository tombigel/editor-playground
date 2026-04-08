import { describe, expect, it } from 'vitest';
import { createContainerNode, createTextNode } from '../../model/defaults';
import {
  createRichTextBlock,
  createRichTextLeaf,
} from '../../model/richContent';
import { createInitialDocument } from '../documentApi';
import {
  convertTextNodeDoc,
  mergeTextNodesToRichDoc,
  setNodeListContent,
  setNodeTextField,
  splitRichTextNodeDoc,
  switchSubtypeDoc,
} from '../documentApi';

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
    const withRichContent = setNodeTextField(document, richId, 'name', 'Story');
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

    let next = setNodeTextField(document, headingId, 'content', 'Heading');
    next = setNodeTextField(next, headingId, 'htmlTag', 'h2');
    next = setNodeTextField(next, codeId, 'content', 'const value = 1;');
    next = setNodeListContent(next, listId, {
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

    expect(survivor.content).toEqual([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('const value = 1;')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('First item')]),
    ]);
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

  it('keeps legacy switchSubtypeDoc aligned with the list subtype', () => {
    const document = createInitialDocument();
    const blockId = appendTextNode(document, createTextNode('block', sectionId(document)));
    const withContent = setNodeTextField(document, blockId, 'content', 'Line 1\nLine 2');

    const switched = switchSubtypeDoc(withContent, blockId, 'list');
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
