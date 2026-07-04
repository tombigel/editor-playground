import { describe, expect, it } from 'vitest';
import { createContainerNode, createTextNode, createInitialDocument } from '../../model/defaults';
import {
  createRichCodeBlock,
  createRichCodeLine,
  createRichListBlock,
  createRichListItemFromText,
  createRichTextBlock,
  createRichTextLeaf,
  createTextDocumentContent,
  getSingleListBlockContent,
  getTextContent,
  richListBlockToListContent,
} from '../../model/richContent';
import { isTextNode } from '../../model/types';
import { convertTextNodeDoc, flattenTextContent, switchTextSubtypeDoc } from '../textConversion';

function createDocumentWithTextNode(subtype: 'block' | 'rich' | 'code' | 'list') {
  const document = createInitialDocument();
  const root = document.nodes[document.rootId];
  if (root.contentType !== 'site') {
    throw new Error('Expected site root');
  }

  const section = createContainerNode('section', document.rootId);
  const text = createTextNode(subtype, section.id);
  document.nodes[section.id] = section;
  document.nodes[text.id] = text;
  root.children.push(section.id);
  section.children.push(text.id);
  return { document, textId: text.id, sectionId: section.id };
}

describe('api/textConversion no-op paths', () => {
  it('returns the same document for an unknown node id', () => {
    const { document } = createDocumentWithTextNode('rich');
    const next = convertTextNodeDoc(document, 'does-not-exist', 'block');
    expect(next).toBe(document);
  });

  it('returns the same document when the node is not a text node', () => {
    const { document, sectionId } = createDocumentWithTextNode('rich');
    const next = convertTextNodeDoc(document, sectionId, 'block');
    expect(next).toBe(document);
  });

  it('returns the same document when converting to the current subtype (identity no-op)', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const next = convertTextNodeDoc(document, textId, 'rich');
    expect(next).toBe(document);
  });

  it('switchTextSubtypeDoc delegates to convertTextNodeDoc and is a no-op for unknown ids', () => {
    const { document } = createDocumentWithTextNode('block');
    const next = switchTextSubtypeDoc(document, 'missing', 'list');
    expect(next).toBe(document);
  });
});

describe('api/textConversion description-list and edge conversions', () => {
  it('converts a list node with no recognizable list block to plain text using a fallback block type', () => {
    const { document, textId } = createDocumentWithTextNode('list');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    // Force the list node's content into a shape with no recognizable ul/ol/dl block,
    // so getSingleListBlockContent returns undefined and the text fallback path runs.
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Not really a list')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'block');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    // With no recognizable ul/ol/dl block, convertToListContent cannot recover the
    // original paragraph text and falls back to a single empty list item/line.
    expect(getTextContent(converted.content.blocks)).toBe('');
  });

  it('converts a rich node with multiple blocks to code by flattening with newlines', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('First paragraph')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Second paragraph')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'code');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'code') {
      throw new Error('Expected code node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('First paragraph\nSecond paragraph');
  });

  it('converts a rich node with a single blockquote block to a standalone block node, preserving the blockquote content type', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('blockquote', [createRichTextLeaf('A quote')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'block');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    // The source rich node has no htmlTag of its own, so the target block node
    // falls back to the default 'p' htmlTag; the blockquote type is preserved
    // in the block content instead.
    expect(converted.htmlTag).toBe('p');
    expect(converted.content.blocks[0]?.type).toBe('blockquote');
    expect(getTextContent(converted.content.blocks)).toBe('A quote');
  });

  it('converts a block node with a non-paragraph htmlTag to rich, then back to block preserving the tag', () => {
    const { document, textId } = createDocumentWithTextNode('block');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    node.htmlTag = 'h3';
    node.content = createTextDocumentContent([
      createRichTextBlock('h3', [createRichTextLeaf('Heading text')]),
    ]);

    const richDoc = convertTextNodeDoc(document, textId, 'rich');
    const richNode = richDoc.nodes[textId];
    if (!isTextNode(richNode) || richNode.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    expect(richNode.content.blocks[0]?.type).toBe('h3');
    expect(richNode.htmlTag).toBeUndefined();

    // Converting back to block from rich re-derives the htmlTag from the block's
    // own type via getRichBlockTypeForTextNode, since the rich source has no htmlTag.
    const backToBlock = convertTextNodeDoc(richDoc, textId, 'block');
    const blockNode = backToBlock.nodes[textId];
    if (!isTextNode(blockNode) || blockNode.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    expect(blockNode.content.blocks[0]?.type).toBe('h3');
  });

  it('converts a code node with multi-line content to an unordered list, one item per line', () => {
    const { document, textId } = createDocumentWithTextNode('code');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'code') {
      throw new Error('Expected code node');
    }
    node.content = createTextDocumentContent([
      createRichCodeBlock('line one\nline two\nline three', { language: 'plaintext' }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    const listContent = richListBlockToListContent(getSingleListBlockContent(converted.content)!);
    expect(listContent).toMatchObject({
      type: 'ul',
      items: [
        { text: 'line one' },
        { text: 'line two' },
        { text: 'line three' },
      ],
    });
  });

  it('converts a rich code-block (single block) to a list, splitting lines into items', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichCodeBlock('alpha\nbeta', { language: 'plaintext' }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    const listContent = richListBlockToListContent(getSingleListBlockContent(converted.content)!);
    expect(listContent).toMatchObject({
      type: 'ul',
      items: [{ text: 'alpha' }, { text: 'beta' }],
    });
  });

  it('converts a rich code-block (single block) directly to code, preserving the block content', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichCodeBlock('const x = 1;', { language: 'javascript', theme: 'dark' }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'code');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'code') {
      throw new Error('Expected code node');
    }
    // Node-level code metadata is rebuilt from the source node's own `.code` field
    // (absent on a rich node), not from the converted block's language/theme.
    expect(converted.code?.language).toBe('plaintext');
    expect(getTextContent(converted.content.blocks)).toBe('const x = 1;');
  });

  it('converts a rich ol/ul single block directly to block by flattening list items with newlines', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichListBlock('ul', [
        createRichListItemFromText('Item one'),
        createRichListItemFromText('Item two'),
      ], { markerStyle: 'disc' }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'block');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('Item one\nItem two');
  });

  it('converts a multi-block rich node to a list by merging blocks into one list block', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Para one')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Para two')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    const listBlock = getSingleListBlockContent(converted.content);
    expect(listBlock?.type).toBe('ul');
    expect(listBlock?.children.length).toBe(2);
  });

  it('falls back to a paragraph block via getSingleTextBlockContent when converting a non-standard block type', () => {
    const { document, textId } = createDocumentWithTextNode('block');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    node.htmlTag = 'p';
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Just text')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'code');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'code') {
      throw new Error('Expected code node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('Just text');
  });

  it('derives blockquote as the rich block type when converting a blockquote-tagged block node to code', () => {
    const { document, textId } = createDocumentWithTextNode('block');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    node.htmlTag = 'blockquote';
    node.content = createTextDocumentContent([
      createRichTextBlock('blockquote', [createRichTextLeaf('Quoted text')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'code');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'code') {
      throw new Error('Expected code node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('Quoted text');
  });

  it('preserves a non-paragraph htmlTag (e.g. h2) when converting a block node to list', () => {
    const { document, textId } = createDocumentWithTextNode('block');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    node.htmlTag = 'h2';
    node.content = createTextDocumentContent([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    expect(richListBlockToListContent(getSingleListBlockContent(converted.content)!)).toMatchObject({
      type: 'ul',
      items: [{ text: 'Heading' }],
    });
  });

  it('converts a rich node with a single ordered-list block to code by flattening list item text', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichListBlock('ol', [
        createRichListItemFromText('First'),
        createRichListItemFromText('Second'),
      ], { start: 1 }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'code');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'code') {
      throw new Error('Expected code node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('First\nSecond');
  });

  it('converts a rich node with a single ordered-list block to a list node, preserving order metadata', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichListBlock('ol', [
        createRichListItemFromText('First'),
        createRichListItemFromText('Second'),
      ], { start: 4 }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    expect(richListBlockToListContent(getSingleListBlockContent(converted.content)!)).toMatchObject({
      type: 'ol',
      start: 4,
      items: [{ text: 'First' }, { text: 'Second' }],
    });
  });

  it('converts a rich node with an empty blocks array to a list using the list-content fallback', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([]);

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    // No blocks to convert, so the list content falls back to a single empty item.
    expect(richListBlockToListContent(getSingleListBlockContent(converted.content)!)).toMatchObject({
      type: 'ul',
      items: [{ text: '' }],
    });
  });

  it('converts a rich node with a single code-block to a standalone block node using the plain-text fallback', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichCodeBlock('const value = 1;', { language: 'typescript' }),
    ]);

    const next = convertTextNodeDoc(document, textId, 'block');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('const value = 1;');
  });

  it('flattens a multi-block rich node containing a code-block into a single block node, joining lines with newlines', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Intro')]),
      createRichCodeBlock('', { language: 'plaintext' }),
    ]);
    node.content.blocks[1] = {
      ...node.content.blocks[1],
      children: [createRichCodeLine('line a'), createRichCodeLine('line b')],
    } as typeof node.content.blocks[1];

    const next = convertTextNodeDoc(document, textId, 'block');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'block') {
      throw new Error('Expected block node');
    }
    expect(getTextContent(converted.content.blocks)).toBe('Intro\nline a\nline b');
  });

  it('splits multi-line code content into separate list items when converting code to list via a code-block rich source', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichCodeBlock('', { language: 'plaintext' }),
    ]);
    node.content.blocks[0] = {
      ...node.content.blocks[0],
      children: [createRichCodeLine('one'), createRichCodeLine('two'), createRichCodeLine('three')],
    } as typeof node.content.blocks[0];

    const next = convertTextNodeDoc(document, textId, 'list');
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    expect(richListBlockToListContent(getSingleListBlockContent(converted.content)!)).toMatchObject({
      type: 'ul',
      items: [{ text: 'one' }, { text: 'two' }, { text: 'three' }],
    });
  });
});

describe('api/textConversion split mode edge cases', () => {
  it('falls back to a flatten conversion when the rich node has one or zero blocks', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Single block only')]),
    ]);

    const next = convertTextNodeDoc(document, textId, 'block', { mode: 'split' });
    const converted = next.nodes[textId];
    if (!isTextNode(converted) || converted.subtype !== 'block') {
      throw new Error('Expected block node (flattened, not split)');
    }
    expect(getTextContent(converted.content.blocks)).toBe('Single block only');
  });

  it('is a no-op when the rich node has no parentId to anchor the split', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('First')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Second')]),
    ]);
    // Simulate a detached rich node with no parent to anchor the split against.
    (node as { parentId?: string }).parentId = undefined;

    const next = convertTextNodeDoc(document, textId, 'block', { mode: 'split' });
    expect(next).toBe(document);
  });

  it('is a no-op when the recorded parent node cannot be found in the document', () => {
    const { document, textId, sectionId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('First')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Second')]),
    ]);
    // Simulate a document where the parent record has been removed.
    delete document.nodes[sectionId];

    const next = convertTextNodeDoc(document, textId, 'block', { mode: 'split' });
    expect(next).toBe(document);
  });

  it('is a no-op when the node is not listed among its parent\'s children', () => {
    const { document, textId, sectionId } = createDocumentWithTextNode('rich');
    const node = document.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('First')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Second')]),
    ]);
    const parent = document.nodes[sectionId];
    if (parent.contentType !== 'container') {
      throw new Error('Expected container parent');
    }
    // Simulate a document where the parent's children array no longer references this node.
    parent.children = parent.children.filter((childId) => childId !== textId);

    const next = convertTextNodeDoc(document, textId, 'block', { mode: 'split' });
    expect(next).toBe(document);
  });
});

describe('api/textConversion flattenTextContent', () => {
  it('flattens multi-block rich content joined by newlines', () => {
    const content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Line one')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Line two')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Line three')]),
    ]);

    expect(flattenTextContent(content)).toBe('Line one\nLine two\nLine three');
  });

  it('flattens a single block to its own text with no separators added', () => {
    const content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('Solo block')]),
    ]);

    expect(flattenTextContent(content)).toBe('Solo block');
  });

  it('flattens code block content into raw lines', () => {
    const content = createTextDocumentContent([
      createRichCodeBlock('', { language: 'plaintext' }),
    ]);
    content.blocks[0] = {
      ...content.blocks[0],
      children: [createRichCodeLine('code line 1'), createRichCodeLine('code line 2')],
    } as typeof content.blocks[0];

    expect(flattenTextContent(content)).toBe('code line 1\ncode line 2');
  });
});
