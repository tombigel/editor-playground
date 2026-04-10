import { describe, expect, it } from 'vitest';
import {
  CodeXml,
  Heading2,
  Link2,
  List,
  ListOrdered,
  MessageSquareQuote,
  PencilLine,
  TextAlignStart,
  TextInitial,
} from 'lucide-react';
import { createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createRichTextBlock, createRichTextLeaf, listContentToRichListBlock } from '../../model/richContent';
import { getLayersNodeIcon } from '../layersIcons';

describe('panels/layersIcons', () => {
  it('maps text subtypes to subtype-specific icons', () => {
    const heading = createTextNode('block', 'root');
    heading.content = createTextDocumentContent([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')]),
    ]);

    const paragraph = createTextNode('block', 'root');
    const plainDiv = createTextNode('block', 'root');
    plainDiv.content = createTextDocumentContent([
      createRichTextBlock('div', [createRichTextLeaf('Plain div')]),
    ]);
    const quote = createTextNode('block', 'root');
    quote.content = createTextDocumentContent([
      createRichTextBlock('blockquote', [createRichTextLeaf('Quote')]),
    ]);

    const code = createTextNode('code', 'root');
    const rich = createTextNode('rich', 'root');
    rich.link = { linkType: 'external', href: 'https://example.com/rich' };
    const link = createTextNode('block', 'root');
    link.link = { linkType: 'external', href: 'https://example.com' };

    const unorderedList = createTextNode('list', 'root');
    unorderedList.link = { linkType: 'external', href: 'https://example.com/list' };
    unorderedList.content = createTextDocumentContent([
      listContentToRichListBlock({
        type: 'ul',
        markerStyle: 'disc',
        items: [{ text: 'One', direction: 'ltr' }],
      }),
    ]);

    const orderedList = createTextNode('list', 'root');
    orderedList.content = createTextDocumentContent([
      listContentToRichListBlock({
        type: 'ol',
        markerStyle: 'decimal',
        items: [{ text: 'One', direction: 'ltr' }],
      }),
    ]);

    expect(getLayersNodeIcon(heading)).toBe(Heading2);
    expect(getLayersNodeIcon(paragraph)).toBe(TextInitial);
    expect(getLayersNodeIcon(plainDiv)).toBe(TextAlignStart);
    expect(getLayersNodeIcon(quote)).toBe(MessageSquareQuote);
    expect(getLayersNodeIcon(link)).toBe(Link2);
    expect(getLayersNodeIcon(code)).toBe(CodeXml);
    expect(getLayersNodeIcon(rich)).toBe(PencilLine);
    expect(getLayersNodeIcon(unorderedList)).toBe(List);
    expect(getLayersNodeIcon(orderedList)).toBe(ListOrdered);
  });
});
