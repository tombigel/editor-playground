import { describe, expect, it } from 'vitest';
import { createContainerNode, createTextNode, createInitialDocument } from '../../model/defaults';
import { normalizeListContent } from '../../model/listContent';
import { getSingleListBlockContent, getTextContent, richListBlockToListContent } from '../../model/richContent';
import { isTextNode } from '../../model/types';
import { applyMarkdownToTextNodeDoc, serializeTextNodeMarkdownDoc } from '../documentApi';
import { parseMarkdownForTextSubtype, parseMarkdownToRichContent, serializeRichContentToMarkdown } from '../textMarkdown';

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
  return { document, textId: text.id };
}

describe('api/textMarkdown', () => {
  it('parses GFM blocks into the supported rich subset', () => {
    const content = parseMarkdownToRichContent('# Title\n\n> Quote\n\n- One\n- Two\n\n```markdown\n## Code\n```');
    expect(content.map((block) => block.type)).toEqual(['h1', 'blockquote', 'ul', 'code-block']);
  });

  it('serializes rich code and list blocks to markdown', () => {
    const content = parseMarkdownToRichContent('1. First\n2. Second\n\n```markdown\n# Heading\n```');
    const markdown = serializeRichContentToMarkdown(content);
    expect(markdown).toContain('1. First');
    expect(markdown).toContain('```markdown');
  });

  it('imports markdown into a rich node through the document api', () => {
    const { document, textId } = createDocumentWithTextNode('rich');
    const next = applyMarkdownToTextNodeDoc(document, textId, '# Title\n\n- One\n- Two');
    const node = next.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(node.content.blocks.map((block) => block.type)).toEqual(['h1', 'ul']);
    expect(serializeTextNodeMarkdownDoc(next, textId)).toContain('# Title');
  });

  it('imports a single heading into a standalone block node without flattening it away', () => {
    const { document, textId } = createDocumentWithTextNode('block');
    const next = applyMarkdownToTextNodeDoc(document, textId, '## Section title');
    const node = next.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'block') {
      throw new Error('Expected block node');
    }

    expect(node.htmlTag).toBe('h2');
    expect(getTextContent(node.content.blocks)).toBe('Section title');
  });

  it('imports non-fenced markdown into code nodes as markdown-highlighted source', () => {
    const { document, textId } = createDocumentWithTextNode('code');
    const markdown = '# Title\n\nParagraph';
    const next = applyMarkdownToTextNodeDoc(document, textId, markdown);
    const node = next.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'code') {
      throw new Error('Expected code node');
    }

    expect(getTextContent(node.content.blocks, { blockSeparator: '\n' })).toBe(markdown);
    expect(node.code?.language).toBe('markdown');
    expect(node.code?.highlightedHtml).toContain('token');
  });

  it('preserves fenced code block language when importing into code nodes', () => {
    const parsed = parseMarkdownForTextSubtype('```typescript\nconst answer: number = 42;\n```', 'code');
    expect(parsed.code?.language).toBe('typescript');
    expect(getTextContent(parsed.content.blocks, { blockSeparator: '\n' })).toBe('const answer: number = 42;');
  });

  it('flattens mixed markdown into unordered list items for standalone list nodes', () => {
    const { document, textId } = createDocumentWithTextNode('list');
    const next = applyMarkdownToTextNodeDoc(document, textId, '# Title\n\nParagraph\n\n> Quote');
    const node = next.nodes[textId];
    if (!isTextNode(node) || node.subtype !== 'list') {
      throw new Error('Expected list node');
    }

    const content = normalizeListContent(richListBlockToListContent(getSingleListBlockContent(node.content)!));
    expect(content.type).toBe('ul');
    expect(content.items.map((item) => ('text' in item ? item.text : ''))).toEqual(['Title', 'Paragraph', 'Quote']);
  });
});
