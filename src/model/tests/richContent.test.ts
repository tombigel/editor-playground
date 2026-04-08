import { describe, expect, it } from 'vitest';
import type { RichContent, RichListBlock, RichTextLeaf, RichTextLink } from '../types';
import {
  createRichCodeBlock,
  createRichListBlock,
  createRichListItem,
  isEmpty,
  mapLinks,
  normalizeRichContent,
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

describe('model/richContent', () => {
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
          theme: 'dark',
          children: [
            { type: 'code-line', children: [makeLeaf('const value = 1;')] },
            { type: 'code-line', children: [makeLeaf('console.log(value);')] },
          ],
        },
      ])).toEqual([
        {
          type: 'code-block',
          language: 'typescript',
          theme: 'dark',
          children: [
            { type: 'code-line', children: [makeLeaf('const value = 1;')] },
            { type: 'code-line', children: [makeLeaf('console.log(value);')] },
          ],
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
  });
});
