import { describe, expect, it } from 'vitest';
import {
  createUnorderedListContentFromLines,
  getListTextContent,
  listContentToMarkdown,
  normalizeListContent,
  validateListContentStructure,
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
      items: [{ text: 'Third', direction: 'rtl', link: { linkType: 'external', href: 'https://example.com' } }],
    })).toEqual({
      type: 'ol',
      start: 3,
      markerStyle: 'upper-roman',
      items: [{ text: 'Third', direction: 'rtl', link: { linkType: 'external', href: 'https://example.com' } }],
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
});
