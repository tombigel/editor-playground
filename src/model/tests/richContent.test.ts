import { describe, expect, it } from 'vitest';
import type { Element as SlateElement, Text as SlateText } from 'slate';
import { createButtonTextNode, createLinkTextNode } from '../defaults';
import type {
  CodeBlockContent,
  ListBlockContent,
  RichContent,
  RichListBlock,
  RichTextLeaf,
  RichTextLink,
  TextBlockContent,
  TextDocumentBlock,
  TextDocumentContent,
} from '../types';
import {
  createRichCodeBlock,
  createRichListBlock,
  createRichListItem,
  getTextDocumentBlocks,
  isCodeBlockContent,
  isEmpty,
  isListBlockContent,
  isTextBlockContent,
  isTextDocumentBlock,
  isTextDocumentContent,
  mapLinks,
  normalizeTextDocumentContent,
  normalizeRichContent,
  prepareStandaloneBlockEditContent,
  validateTextDocumentContentStructure,
  validateTextSubtypeContentStructure,
  validateRichContentStructure,
  walkLinks,
} from '../richContent';

function makeLeaf(text: string, marks?: Partial<RichTextLeaf>): RichTextLeaf {
  return { text, ...marks };
}

function makeParagraph(children: Array<RichTextLeaf | RichTextLink>): RichContent[number] {
  return { type: 'paragraph', children };
}

function makeLink(href: string, text: string): RichTextLink {
  return {
    type: 'link',
    linkType: 'external',
    href,
    children: [{ text }],
  };
}

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type _TextBlockAssignableToSlate = Assert<IsAssignable<TextBlockContent, SlateElement>>;
type _CodeBlockAssignableToSlate = Assert<IsAssignable<CodeBlockContent, SlateElement>>;
type _ListBlockAssignableToSlate = Assert<IsAssignable<ListBlockContent, SlateElement>>;
type _TextDocumentBlockAssignableToSlate = Assert<IsAssignable<TextDocumentBlock, SlateElement>>;
type _LeafAssignableToSlate = Assert<IsAssignable<RichTextLeaf, SlateText>>;

describe('model/richContent', () => {
  describe('canonical type guards', () => {
    it('identifies canonical block variants and wrapped text documents', () => {
      const paragraph = makeParagraph([makeLeaf('Paragraph')]);
      const code = createRichCodeBlock('const value = 1;');
      const list = createRichListBlock('ul', [createRichListItem('First')]);
      const wrapped: TextDocumentContent = { blocks: [paragraph], blockGap: 24 };

      expect(isTextBlockContent(paragraph)).toBe(true);
      expect(isCodeBlockContent(code)).toBe(true);
      expect(isListBlockContent(list)).toBe(true);
      expect(isTextDocumentBlock(paragraph)).toBe(true);
      expect(isTextDocumentBlock(code)).toBe(true);
      expect(isTextDocumentBlock(list)).toBe(true);
      expect(isTextDocumentContent(wrapped)).toBe(true);
      expect(getTextDocumentBlocks(wrapped)).toEqual([paragraph]);
      expect(getTextDocumentBlocks([paragraph])).toEqual([paragraph]);
    });
  });

  describe('prepareStandaloneBlockEditContent', () => {
    it('promotes a whole-node link into inline editable content while preserving marks', () => {
      const node = createLinkTextNode('section_1');
      node.link = { linkType: 'external', href: 'https://example.com/root', openInNewTab: true };
      node.content = {
        blocks: [
          {
            type: 'paragraph',
            children: [
              { text: 'Bold ', bold: true },
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com/inline',
                children: [{ text: 'inline', italic: true }],
              },
            ],
          },
        ],
      };

      const prepared = prepareStandaloneBlockEditContent(node);

      expect(prepared.promotedNodeLink).toBe(true);
      expect(prepared.content).toEqual({
        blocks: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                linkType: 'external',
                href: 'https://example.com/root',
                openInNewTab: true,
                children: [
                  { text: 'Bold ', bold: true },
                  { text: 'inline', italic: true },
                ],
              },
            ],
          },
        ],
      });
    });

    it('leaves button-like whole-node links unpromoted', () => {
      const node = createButtonTextNode('section_1');
      node.content = {
        blocks: [
          {
            type: 'paragraph',
            children: [{ text: 'Button', bold: true }],
          },
        ],
      };

      const prepared = prepareStandaloneBlockEditContent(node);

      expect(prepared.promotedNodeLink).toBe(false);
      expect(prepared.content.blocks[0]).toMatchObject({
        type: 'paragraph',
        children: [{ text: 'Button', bold: true }],
      });
    });
  });

  describe('isEmpty', () => {
    it('returns true when all text leaves are empty', () => {
      const content: RichContent = [makeParagraph([makeLeaf(''), makeLeaf('')])];
      expect(isEmpty(content)).toBe(true);
    });

    it('returns false when any leaf has non-empty text', () => {
      const content: RichContent = [makeParagraph([makeLeaf(''), makeLeaf('hello')])];
      expect(isEmpty(content)).toBe(false);
    });

    it('returns false when a code block line has non-empty text', () => {
      expect(isEmpty([createRichCodeBlock('const value = 1;')])).toBe(false);
    });

    it('returns false when a list item has non-empty text', () => {
      expect(isEmpty([createRichListBlock('ul', [createRichListItem('First item')])])).toBe(false);
    });
  });

  describe('walkLinks', () => {
    it('visits inline links in text blocks', () => {
      const link1 = makeLink('https://a.com', 'a');
      const link2 = makeLink('https://b.com', 'b');
      const content: RichContent = [makeParagraph([makeLeaf('text'), link1]), makeParagraph([makeLeaf('more'), link2])];
      const visited: RichTextLink[] = [];
      walkLinks(content, (l) => visited.push(l));
      expect(visited).toHaveLength(2);
    });

    it('visits inline links inside rich list items', () => {
      const link = makeLink('https://example.com', 'item');
      const content: RichContent = [
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [makeLeaf('before '), link] },
          ],
        } as RichListBlock,
      ];
      const visited: RichTextLink[] = [];
      walkLinks(content, (item) => visited.push(item));
      expect(visited).toEqual([link]);
    });
  });

  describe('mapLinks', () => {
    it('returns new content reference when a text-block link is replaced', () => {
      const link = makeLink('/old/', 'click');
      const content: RichContent = [makeParagraph([makeLeaf('before '), link, makeLeaf(' after')])];
      const result = mapLinks(content, (l) => ({ ...l, href: '/new/' }));
      expect(result).not.toBe(content);
      expect(((result[0]?.children ?? [])[1] as RichTextLink).href).toBe('/new/');
    });

    it('replaces links inside list items', () => {
      const link = makeLink('/old/', 'click');
      const content: RichContent = [
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [link] },
          ],
        } as RichListBlock,
      ];

      const result = mapLinks(content, (item) => ({ ...item, href: '/new/' }));

      expect((((result[0] as RichListBlock).children[0]?.children ?? [])[0] as RichTextLink).href).toBe('/new/');
    });
  });

  describe('normalizeRichContent', () => {
    it('wraps legacy flat inline arrays in a paragraph block', () => {
      const legacy = [makeLeaf('legacy'), makeLink('https://example.com', ' link')];
      expect(normalizeRichContent(legacy)).toEqual([
        makeParagraph([makeLeaf('legacy'), makeLink('https://example.com', ' link')]),
      ]);
    });

    it('normalizes text blocks with direction and lineHeight', () => {
      expect(normalizeRichContent([
        { type: 'h2', direction: 'rtl', lineHeight: 1.3, children: [makeLeaf('Heading')] },
      ])).toEqual([
        { type: 'h2', direction: 'rtl', lineHeight: 1.3, children: [makeLeaf('Heading')] },
      ]);
    });

    it('normalizes rich code blocks with code-line children', () => {
      expect(normalizeRichContent([
        {
          type: 'code-block',
          language: 'typescript',
          theme: 'auto',
          style: { tabSize: 4.9 },
          children: [
            { type: 'code-line', children: [makeLeaf('const value = 1;')] },
            { type: 'code-line', children: [makeLeaf('console.log(value);')] },
          ],
        },
      ])).toEqual([
        {
          type: 'code-block',
          language: 'typescript',
          theme: 'auto',
          style: { tabSize: 4 },
          children: [
            { type: 'code-line', children: [makeLeaf('const value = 1;')] },
            { type: 'code-line', children: [makeLeaf('console.log(value);')] },
          ],
        },
      ]);
    });

    it('normalizes code themes, wraps, and clamps tab size overrides', () => {
      expect(normalizeRichContent([
        {
          type: 'code-block',
          theme: 'light',
          style: { tabSize: 0, textWrap: 'single-line' },
          children: [{ type: 'code-line', children: [makeLeaf('light')] }],
        },
        {
          type: 'code-block',
          theme: 'dark',
          style: { tabSize: 99, textWrap: 'wrap' },
          children: [{ type: 'code-line', children: [makeLeaf('dark')] }],
        },
        {
          type: 'code-block',
          theme: 'solarized',
          style: { tabSize: Number.NaN, textWrap: 'sideways' },
          children: [{ type: 'code-line', children: [makeLeaf('invalid')] }],
        },
      ])).toEqual([
        {
          type: 'code-block',
          theme: 'light',
          style: { tabSize: 1, textWrap: 'single-line' },
          children: [{ type: 'code-line', children: [makeLeaf('light')] }],
        },
        {
          type: 'code-block',
          theme: 'dark',
          style: { tabSize: 8, textWrap: 'wrap' },
          children: [{ type: 'code-line', children: [makeLeaf('dark')] }],
        },
        {
          type: 'code-block',
          theme: 'auto',
          style: { textWrap: 'wrap' },
          children: [{ type: 'code-line', children: [makeLeaf('invalid')] }],
        },
      ]);
    });

    it('normalizes rich list blocks with flat list-item children', () => {
      expect(normalizeRichContent([
        {
          type: 'ol',
          start: 3,
          markerStyle: 'upper-alpha',
          children: [
            { type: 'list-item', children: [makeLeaf('Third')] },
            { type: 'list-item', children: [makeLeaf('Fourth')] },
          ],
        },
      ])).toEqual([
        {
          type: 'ol',
          start: 3,
          markerStyle: 'upper-alpha',
          children: [
            { type: 'list-item', children: [makeLeaf('Third')] },
            { type: 'list-item', children: [makeLeaf('Fourth')] },
          ],
        },
      ]);
    });

    it('normalizes rich list item depth with clamp and one-level jumps', () => {
      expect(normalizeRichContent([
        {
          type: 'ul',
          children: [
            { type: 'list-item', depth: 3, children: [makeLeaf('First')] },
            { type: 'list-item', depth: 8.9, children: [makeLeaf('Second')] },
            { type: 'list-item', depth: -1, children: [makeLeaf('Third')] },
            { type: 'list-item', depth: 99, children: [makeLeaf('Fourth')] },
          ],
        },
      ])).toEqual([
        {
          type: 'ul',
          children: [
            { type: 'list-item', depth: 1, children: [makeLeaf('First')] },
            { type: 'list-item', depth: 2, children: [makeLeaf('Second')] },
            { type: 'list-item', children: [makeLeaf('Third')] },
            { type: 'list-item', depth: 1, children: [makeLeaf('Fourth')] },
          ],
        },
      ]);
    });

    it('preserves standalone merge snapshots on canonical blocks', () => {
      expect(normalizeRichContent([
        {
          type: 'h2',
          standalone: {
            subtype: 'block',
            name: 'Title',
            visible: true,
            locked: false,
            rect: {
              x: { base: { raw: '24px', parsed: { value: 24, unit: 'px' } } },
              y: { base: { raw: '48px', parsed: { value: 48, unit: 'px' } } },
              width: { base: { raw: '320px', parsed: { value: 320, unit: 'px' } } },
              height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
            },
            contentBlock: { type: 'h2', children: [makeLeaf('Heading')] },
            htmlTag: 'h2',
            style: {
              color: '#c2410c',
            },
          },
          children: [makeLeaf('Heading')],
        },
      ])).toEqual([
        {
          type: 'h2',
          standalone: {
            subtype: 'block',
            name: 'Title',
            visible: true,
            locked: false,
            rect: {
              x: { base: { raw: '24px', parsed: { value: 24, unit: 'px' } } },
              y: { base: { raw: '48px', parsed: { value: 48, unit: 'px' } } },
              width: { base: { raw: '320px', parsed: { value: 320, unit: 'px' } } },
              height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
            },
            contentBlock: { type: 'h2', children: [makeLeaf('Heading')] },
            htmlTag: 'h2',
            style: {
              color: '#c2410c',
            },
          },
          children: [makeLeaf('Heading')],
        },
      ]);
    });
  });

  describe('normalizeTextDocumentContent', () => {
    it('wraps legacy rich block arrays in canonical content', () => {
      expect(normalizeTextDocumentContent([
        makeParagraph([makeLeaf('legacy')]),
      ])).toEqual({
        blocks: [makeParagraph([makeLeaf('legacy')])],
      });
    });

    it('normalizes canonical wrapped text documents', () => {
      expect(normalizeTextDocumentContent({
        blocks: [
          { type: 'h2', direction: 'rtl', children: [makeLeaf('Heading')] },
        ],
        blockGap: 16,
      })).toEqual({
        blocks: [
          { type: 'h2', direction: 'rtl', children: [makeLeaf('Heading')] },
        ],
        blockGap: 16,
      });
    });
  });

  describe('validateRichContentStructure', () => {
    it('reports free inline root content', () => {
      expect(validateRichContentStructure([makeLeaf('orphan')])).toEqual([
        'Rich content root item 0 must be a supported block.',
      ]);
    });

    it('reports unsupported root block types', () => {
      expect(validateRichContentStructure([
        { type: 'table', children: [] },
      ])).toEqual([
        'Rich content root item 0 must be a supported block.',
      ]);
    });

    it('reports invalid code block children', () => {
      expect(validateRichContentStructure([
        {
          type: 'code-block',
          children: [{ type: 'paragraph', children: [makeLeaf('nested')] }],
        },
      ])).toEqual([
        'Rich code block 0 child 0 must be a code-line element.',
      ]);
    });

    it('reports invalid list item children', () => {
      expect(validateRichContentStructure([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ type: 'paragraph', children: [makeLeaf('nested')] }] },
          ],
        },
      ])).toEqual([
        'Rich list item 0.0 child 0 must be a text leaf or link.',
      ]);
    });

    it('reports invalid rich list item depth', () => {
      expect(validateRichContentStructure([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [makeLeaf('First')] },
            { type: 'list-item', depth: 3, children: [makeLeaf('Invalid jump')] },
            { type: 'list-item', depth: 9, children: [makeLeaf('Invalid depth')] },
          ],
        },
      ])).toEqual([
        'Rich list item 0.1 depth cannot increase by more than one level.',
        'Rich list item 0.2 depth must be an integer from 0 to 8.',
      ]);
    });
  });

  describe('validateTextDocumentContentStructure', () => {
    it('accepts canonical wrapped content with blockGap', () => {
      expect(validateTextDocumentContentStructure({
        blocks: [makeParagraph([makeLeaf('One')])],
        blockGap: 12,
      })).toEqual([]);
    });

    it('rejects invalid wrapped blockGap', () => {
      expect(validateTextDocumentContentStructure({
        blocks: [makeParagraph([makeLeaf('One')])],
        blockGap: -1,
      })).toEqual([
        'Text document blockGap must be a non-negative number.',
      ]);
    });
  });

  describe('validateTextSubtypeContentStructure', () => {
    it('requires block subtype content to contain one text block', () => {
      expect(validateTextSubtypeContentStructure('block', {
        blocks: [createRichCodeBlock('const value = 1;')],
      })).toEqual([
        'Block subtype content must contain exactly one text block.',
      ]);
    });

    it('requires code subtype content to contain one code block', () => {
      expect(validateTextSubtypeContentStructure('code', {
        blocks: [makeParagraph([makeLeaf('Paragraph')])],
      })).toEqual([
        'Code subtype content must contain exactly one code block.',
      ]);
    });

    it('requires list subtype content to contain one list block', () => {
      expect(validateTextSubtypeContentStructure('list', {
        blocks: [makeParagraph([makeLeaf('Paragraph')])],
      })).toEqual([
        'List subtype content must contain exactly one list block.',
      ]);
    });

    it('rejects blockGap for non-rich subtype content', () => {
      expect(validateTextSubtypeContentStructure('code', {
        blocks: [createRichCodeBlock('const value = 1;')],
        blockGap: 12,
      })).toEqual([
        'Text subtype "code" cannot define blockGap.',
      ]);
    });

    it('requires rich subtype content to contain at least one block', () => {
      expect(validateTextSubtypeContentStructure('rich', {
        blocks: [],
      })).toEqual([
        'Rich subtype content must contain at least one block.',
      ]);
    });
  });
});
