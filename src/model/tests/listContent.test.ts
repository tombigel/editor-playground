import { describe, expect, it, vi } from 'vitest';
import type { LinkExtension, ListContent } from '../types';
import {
  createDescriptionListItem,
  createListTextItem,
  createUnorderedListContentFromLines,
  getListItemText,
  getListTextContent,
  listContentToLines,
  listContentToMarkdown,
  normalizeListContent,
  validateListContentStructure,
  walkListLinks,
} from '../listContent';

describe('model/listContent', () => {
  it('normalizes invalid payloads to a default unordered list', () => {
    expect(normalizeListContent(null)).toEqual({
      type: 'ul',
      markerStyle: 'disc',
      items: [{ text: 'List item', direction: 'ltr' }],
    });
  });

  it('normalizes ordered lists with marker style, start, direction, and links', () => {
    expect(normalizeListContent({
      type: 'ol',
      start: 3,
      markerStyle: 'upper-roman',
      items: [{ text: 'Third', direction: 'rtl', depth: 1, link: { linkType: 'external', href: 'https://example.com' } }],
    })).toEqual({
      type: 'ol',
      start: 3,
      markerStyle: 'upper-roman',
      items: [{ text: 'Third', direction: 'rtl', depth: 1, link: { linkType: 'external', href: 'https://example.com' } }],
    });
  });

  it('normalizes list item depth with clamp and one-level jumps', () => {
    expect(normalizeListContent({
      type: 'ul',
      items: [
        { text: 'First', depth: 4 },
        { text: 'Second', depth: 8.9 },
        { text: 'Third', depth: -1 },
        { text: 'Fourth', depth: 99 },
      ],
    })).toEqual({
      type: 'ul',
      markerStyle: 'disc',
      items: [
        { text: 'First', direction: 'ltr', depth: 1 },
        { text: 'Second', direction: 'ltr', depth: 2 },
        { text: 'Third', direction: 'ltr' },
        { text: 'Fourth', direction: 'ltr', depth: 1 },
      ],
    });
  });

  it('flattens description lists to readable plain text and markdown', () => {
    const content = normalizeListContent({
      type: 'dl',
      items: [{ term: 'API', description: 'Application Programming Interface', direction: 'ltr' }],
    });

    expect(getListTextContent(content)).toBe('API: Application Programming Interface');
    expect(listContentToMarkdown(content)).toBe('API: Application Programming Interface');
  });

  it('creates unordered list content from plain text lines', () => {
    expect(createUnorderedListContentFromLines(['One', 'Two'])).toEqual({
      type: 'ul',
      markerStyle: 'disc',
      items: [
        { text: 'One', direction: 'ltr' },
        { text: 'Two', direction: 'ltr' },
      ],
    });
  });

  it('reports structural errors for malformed items', () => {
    expect(validateListContentStructure({
      type: 'ul',
      items: [{ value: 'missing-text' }],
    })).toEqual([
      'List item 0 must define a string text value.',
    ]);
  });

  it('reports invalid list item depth', () => {
    expect(validateListContentStructure({
      type: 'ul',
      items: [
        { text: 'First' },
        { text: 'Invalid jump', depth: 3 },
        { text: 'Invalid depth', depth: 9 },
      ],
    })).toEqual([
      'List item 1 depth cannot increase by more than one level.',
      'List item 2 depth must be an integer from 0 to 8.',
    ]);
  });

  describe('normalizeListContent malformed inputs', () => {
    it('falls back to the default list for non-object content', () => {
      expect(normalizeListContent(null)).toEqual(createUnorderedListContentFromLines(['List item']));
      expect(normalizeListContent(undefined)).toEqual(createUnorderedListContentFromLines(['List item']));
      expect(normalizeListContent('a string')).toEqual(createUnorderedListContentFromLines(['List item']));
      expect(normalizeListContent(42)).toEqual(createUnorderedListContentFromLines(['List item']));
      expect(normalizeListContent(['not', 'an', 'object'])).toEqual(createUnorderedListContentFromLines(['List item']));
    });

    it('falls back to an unrecognized kind as unordered list', () => {
      expect(normalizeListContent({ type: 'weird-kind', items: [{ text: 'Hello' }] })).toEqual({
        type: 'ul',
        markerStyle: 'disc',
        items: [{ text: 'Hello', direction: 'ltr' }],
      });
    });

    it('falls back to a placeholder item when items is not an array', () => {
      expect(normalizeListContent({ type: 'ul', items: 'not-an-array' })).toEqual({
        type: 'ul',
        markerStyle: 'disc',
        items: [{ text: '', direction: 'ltr' }],
      });

      expect(normalizeListContent({ type: 'ol', items: null })).toEqual({
        type: 'ol',
        start: 1,
        markerStyle: 'decimal',
        items: [{ text: '', direction: 'ltr' }],
      });

      expect(normalizeListContent({ type: 'dl', items: {} })).toEqual({
        type: 'dl',
        items: [{ term: '', description: '', direction: 'ltr' }],
      });
    });

    it('normalizes malformed items within an array to safe defaults', () => {
      expect(normalizeListContent({
        type: 'ul',
        items: [null, 42, 'string-item', { text: 'Valid' }],
      })).toEqual({
        type: 'ul',
        markerStyle: 'disc',
        items: [
          { text: '', direction: 'ltr' },
          { text: '', direction: 'ltr' },
          { text: '', direction: 'ltr' },
          { text: 'Valid', direction: 'ltr' },
        ],
      });
    });

    it('normalizes malformed description list items to safe defaults', () => {
      expect(normalizeListContent({
        type: 'dl',
        items: [null, { term: 'Only term' }, { description: 'Only description' }],
      })).toEqual({
        type: 'dl',
        items: [
          { term: '', description: '', direction: 'ltr' },
          { term: 'Only term', description: '', direction: 'ltr' },
          { term: '', description: 'Only description', direction: 'ltr' },
        ],
      });
    });

    it('normalizes a valid description list input as-is', () => {
      const input = {
        type: 'dl',
        items: [
          { term: 'HTML', description: 'HyperText Markup Language', direction: 'rtl' },
          { term: 'CSS', description: 'Cascading Style Sheets', link: { linkType: 'external', href: 'https://example.com' } },
        ],
      };
      expect(normalizeListContent(input)).toEqual({
        type: 'dl',
        items: [
          { term: 'HTML', description: 'HyperText Markup Language', direction: 'rtl' },
          {
            term: 'CSS',
            description: 'Cascading Style Sheets',
            direction: 'ltr',
            link: { linkType: 'external', href: 'https://example.com' },
          },
        ],
      });
    });

    it('clamps invalid ordered list start values to 1', () => {
      expect(normalizeListContent({ type: 'ol', start: -5, items: [{ text: 'One' }] })).toMatchObject({
        type: 'ol',
        start: 1,
      });
      expect(normalizeListContent({ type: 'ol', start: 'NaN', items: [{ text: 'One' }] })).toMatchObject({
        type: 'ol',
        start: 1,
      });
    });

    it('falls back to default marker styles for invalid values', () => {
      expect(normalizeListContent({ type: 'ul', markerStyle: 'not-a-style', items: [{ text: 'One' }] })).toMatchObject({
        markerStyle: 'disc',
      });
      expect(normalizeListContent({ type: 'ol', markerStyle: 'not-a-style', items: [{ text: 'One' }] })).toMatchObject({
        markerStyle: 'decimal',
      });
    });

    it('drops link extensions with unrecognized linkType', () => {
      expect(normalizeListContent({
        type: 'ul',
        items: [{ text: 'Item', link: { linkType: 'bogus', href: 'https://example.com' } }],
      })).toEqual({
        type: 'ul',
        markerStyle: 'disc',
        items: [{ text: 'Item', direction: 'ltr' }],
      });
    });
  });

  describe('createListTextItem / createDescriptionListItem', () => {
    it('creates a text item with defaults and overrides', () => {
      expect(createListTextItem()).toEqual({ text: '', direction: 'ltr' });
      expect(createListTextItem('Hello', { direction: 'rtl', depth: 1 })).toEqual({
        text: 'Hello',
        direction: 'rtl',
        depth: 1,
      });
    });

    it('creates a description list item with defaults and overrides', () => {
      expect(createDescriptionListItem()).toEqual({ term: '', description: '', direction: 'ltr' });
      expect(createDescriptionListItem('Term', 'Description', { direction: 'rtl' })).toEqual({
        term: 'Term',
        description: 'Description',
        direction: 'rtl',
      });
    });
  });

  describe('getListItemText', () => {
    it('returns text for text items', () => {
      expect(getListItemText({ text: 'Plain text', direction: 'ltr' })).toBe('Plain text');
    });

    it('joins term and description when both present', () => {
      expect(getListItemText({ term: 'Term', description: 'Description', direction: 'ltr' })).toBe('Term: Description');
    });

    it('returns only term when description is empty', () => {
      expect(getListItemText({ term: 'Term only', description: '', direction: 'ltr' })).toBe('Term only');
    });

    it('returns only description when term is empty', () => {
      expect(getListItemText({ term: '', description: 'Description only', direction: 'ltr' })).toBe('Description only');
    });
  });

  describe('validateListContentStructure error classes', () => {
    it('reports non-object root', () => {
      expect(validateListContentStructure(null)).toEqual(['List content root must be an object.']);
      expect(validateListContentStructure('a string')).toEqual(['List content root must be an object.']);
      expect(validateListContentStructure([1, 2, 3])).toEqual(['List content root must be an object.']);
    });

    it('reports invalid root type', () => {
      expect(validateListContentStructure({ type: 'bogus', items: [] })).toEqual([
        'List content root type must be ul, ol, or dl.',
      ]);
    });

    it('reports missing items array', () => {
      expect(validateListContentStructure({ type: 'ul', items: 'not-an-array' })).toEqual([
        'List content must define an items array.',
      ]);
    });

    it('reports non-object items', () => {
      expect(validateListContentStructure({ type: 'ul', items: [null, 'string-item'] })).toEqual([
        'List item 0 must be an object.',
        'List item 1 must be an object.',
      ]);
    });

    it('reports missing string term/description for description lists', () => {
      expect(validateListContentStructure({
        type: 'dl',
        items: [{ term: 42, description: null }],
      })).toEqual([
        'Description list item 0 must define a string term.',
        'Description list item 0 must define a string description.',
      ]);
    });

    it('reports invalid direction values', () => {
      expect(validateListContentStructure({
        type: 'ul',
        items: [{ text: 'Hello', direction: 'sideways' }],
      })).toEqual([
        'List item 0 direction must be ltr or rtl.',
      ]);
    });

    it('reports invalid link objects', () => {
      expect(validateListContentStructure({
        type: 'ul',
        items: [{ text: 'Hello', link: { linkType: 'bogus' } }],
      })).toEqual([
        'List item 0 link must be a valid link object.',
      ]);
    });

    it('accepts a fully valid ordered list with links and depth', () => {
      expect(validateListContentStructure({
        type: 'ol',
        start: 1,
        markerStyle: 'decimal',
        items: [
          { text: 'First', direction: 'ltr' },
          { text: 'Second', direction: 'ltr', depth: 1, link: { linkType: 'anchor', anchorTargetId: 'a1' } },
        ],
      })).toEqual([]);
    });
  });

  describe('listContentToMarkdown', () => {
    it('renders unordered list markdown', () => {
      const content = normalizeListContent({
        type: 'ul',
        items: [{ text: 'One' }, { text: 'Two' }],
      });
      expect(listContentToMarkdown(content)).toBe('- One\n- Two');
    });

    it('renders ordered list markdown honoring start', () => {
      const content = normalizeListContent({
        type: 'ol',
        start: 5,
        items: [{ text: 'Five' }, { text: 'Six' }],
      });
      expect(listContentToMarkdown(content)).toBe('5. Five\n6. Six');
    });

    it('renders description list markdown with term/description pairs', () => {
      const content = normalizeListContent({
        type: 'dl',
        items: [
          { term: 'API', description: 'Application Programming Interface' },
          { term: 'OnlyTerm', description: '' },
          { term: '', description: 'OnlyDescription' },
        ],
      });
      expect(listContentToMarkdown(content)).toBe('API: Application Programming Interface\nOnlyTerm\nOnlyDescription');
    });
  });

  describe('walkListLinks', () => {
    it('invokes the visitor for each item link found', () => {
      const linkA: LinkExtension = { linkType: 'external', href: 'https://a.example.com' };
      const linkB: LinkExtension = { linkType: 'page', targetPageId: 'page-2' };
      const content: ListContent = {
        type: 'ul',
        markerStyle: 'disc',
        items: [
          createListTextItem('With link A', { link: linkA }),
          createListTextItem('No link'),
          createListTextItem('With link B', { link: linkB }),
        ],
      };

      const visitor = vi.fn();
      walkListLinks(content, visitor);

      expect(visitor).toHaveBeenCalledTimes(2);
      expect(visitor).toHaveBeenNthCalledWith(1, linkA);
      expect(visitor).toHaveBeenNthCalledWith(2, linkB);
    });

    it('does not invoke the visitor when no items have links', () => {
      const content = createUnorderedListContentFromLines(['One', 'Two']);
      const visitor = vi.fn();
      walkListLinks(content, visitor);
      expect(visitor).not.toHaveBeenCalled();
    });

    it('visits description list item links', () => {
      const link: LinkExtension = { linkType: 'anchor', anchorTargetId: 'anchor-1' };
      const content: ListContent = {
        type: 'dl',
        items: [createDescriptionListItem('Term', 'Description', { link })],
      };
      const visitor = vi.fn();
      walkListLinks(content, visitor);
      expect(visitor).toHaveBeenCalledTimes(1);
      expect(visitor).toHaveBeenCalledWith(link);
    });
  });

  describe('createUnorderedListContentFromLines / listContentToLines round trip', () => {
    it('round-trips a set of lines through both conversions', () => {
      const lines = ['First line', 'Second line', 'Third line'];
      const content = createUnorderedListContentFromLines(lines);
      expect(listContentToLines(content)).toEqual(lines);
    });

    it('falls back to a single empty line for an empty lines array', () => {
      const content = createUnorderedListContentFromLines([]);
      expect(content.items).toEqual([{ text: '', direction: 'ltr' }]);
      expect(listContentToLines(content)).toEqual(['']);
    });

    it('round-trips getListTextContent as newline-joined text', () => {
      const lines = ['Alpha', 'Beta'];
      const content = createUnorderedListContentFromLines(lines);
      expect(getListTextContent(content)).toBe('Alpha\nBeta');
    });
  });
});
