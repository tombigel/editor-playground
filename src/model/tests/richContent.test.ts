import { describe, expect, it } from 'vitest';
import type { RichContent, RichTextLeaf, RichTextLink } from '../types';
import {
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
    it('returns true when all leaves have empty text', () => {
      const content: RichContent = [makeParagraph([makeLeaf(''), makeLeaf('')])];
      expect(isEmpty(content)).toBe(true);
    });

    it('returns false when any leaf has non-empty text', () => {
      const content: RichContent = [makeParagraph([makeLeaf(''), makeLeaf('hello')])];
      expect(isEmpty(content)).toBe(false);
    });

    it('returns true for an empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('returns false when a link child has non-empty text', () => {
      const content: RichContent = [makeParagraph([makeLink('https://example.com', 'click')])];
      expect(isEmpty(content)).toBe(false);
    });

    it('returns true when all link children have empty text', () => {
      const content: RichContent = [
        makeParagraph([{ type: 'link', linkType: 'external', href: '#', children: [{ text: '' }] }]),
      ];
      expect(isEmpty(content)).toBe(true);
    });
  });

  describe('walkLinks', () => {
    it('visits every RichTextLink and skips plain leaves', () => {
      const link1 = makeLink('https://a.com', 'a');
      const link2 = makeLink('https://b.com', 'b');
      const content: RichContent = [makeParagraph([makeLeaf('text'), link1]), makeParagraph([makeLeaf('more'), link2])];
      const visited: RichTextLink[] = [];
      walkLinks(content, (l) => visited.push(l));
      expect(visited).toHaveLength(2);
      expect(visited[0]).toBe(link1);
      expect(visited[1]).toBe(link2);
    });

    it('visits nothing when there are no links', () => {
      const content: RichContent = [makeParagraph([makeLeaf('hello'), makeLeaf('world')])];
      const visited: RichTextLink[] = [];
      walkLinks(content, (l) => visited.push(l));
      expect(visited).toHaveLength(0);
    });

    it('visits nothing for an empty content array', () => {
      const visited: RichTextLink[] = [];
      walkLinks([], (l) => visited.push(l));
      expect(visited).toHaveLength(0);
    });
  });

  describe('mapLinks', () => {
    it('returns new content reference when a link is replaced', () => {
      const link = makeLink('/old/', 'click');
      const content: RichContent = [makeParagraph([makeLeaf('before '), link, makeLeaf(' after')])];
      const result = mapLinks(content, (l) => ({ ...l, href: '/new/' }));
      expect(result).not.toBe(content);
      expect(((result[0]?.children ?? [])[1] as RichTextLink).href).toBe('/new/');
    });

    it('returns original reference when mapper returns the same link object', () => {
      const link = makeLink('/same/', 'click');
      const content: RichContent = [makeParagraph([link])];
      const result = mapLinks(content, (l) => l);
      expect(result).toBe(content);
    });

    it('returns original reference when content has no links', () => {
      const content: RichContent = [makeParagraph([makeLeaf('no links here')])];
      const result = mapLinks(content, (l) => ({ ...l, href: '/changed/' }));
      expect(result).toBe(content);
    });

    it('does not mutate the original content', () => {
      const link = makeLink('/old/', 'click');
      const content: RichContent = [makeParagraph([link])];
      mapLinks(content, (l) => ({ ...l, href: '/new/' }));
      expect(link.href).toBe('/old/');
    });
  });

  describe('normalizeRichContent', () => {
    it('wraps legacy flat inline arrays in a paragraph block', () => {
      const legacy = [makeLeaf('legacy'), makeLink('https://example.com', ' link')];
      expect(normalizeRichContent(legacy)).toEqual([
        makeParagraph([makeLeaf('legacy'), makeLink('https://example.com', ' link')]),
      ]);
    });

    it('splits mixed root inline content into paragraph blocks around existing blocks', () => {
      const mixed = [
        makeLeaf('before'),
        { type: 'h2', children: [makeLeaf('heading')] },
        makeLeaf('after'),
      ];
      expect(normalizeRichContent(mixed)).toEqual([
        makeParagraph([makeLeaf('before')]),
        { type: 'h2', children: [makeLeaf('heading')] },
        makeParagraph([makeLeaf('after')]),
      ]);
    });
  });

  describe('validateRichContentStructure', () => {
    it('reports free inline root content', () => {
      expect(validateRichContentStructure([makeLeaf('orphan')])).toEqual([
        'Rich content root item 0 must be a block.',
      ]);
    });

    it('reports nested block children', () => {
      expect(validateRichContentStructure([
        {
          type: 'paragraph',
          children: [{ type: 'paragraph', children: [makeLeaf('nested')] }],
        },
      ])).toEqual([
        'Rich content block 0 cannot contain nested blocks.',
      ]);
    });
  });
});
