import { describe, expect, it } from 'vitest';
import {
  convertSelectionToBlockType,
  convertSelectionToCodeBlock,
  convertSelectionToList,
  createRichEditor,
  changeSelectedListItemDepth,
  fromSlateValue,
  getMarkValue,
  getSelectedCodeLanguage,
  getSelectedStructureMode,
  insertListItemBreak,
  insertListSoftBreak,
  insertLink,
  isLinkActive,
  isMarkActive,
  isSelectionAtListItemStart,
  isSelectionInListItem,
  mergeListItemBackward,
  removeLink,
  setMarkValue,
  setSelectedCodeBlockLanguage,
  toSlateValue,
  toggleMark,
} from '../richTextEditor';
import type { RichContent } from '../../model/types';
import { Transforms } from 'slate';

function makeEditor() {
  return createRichEditor();
}

describe('render/richTextEditor', () => {
  describe('toSlateValue / fromSlateValue', () => {
    it('round-trips plain text', () => {
      const content: RichContent = [{ type: 'paragraph', children: [{ text: 'hello' }] }];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips bold mark', () => {
      const content: RichContent = [{ type: 'paragraph', children: [{ text: 'bold', bold: true }] }];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips underline, strikethrough, and highlight marks', () => {
      const content: RichContent = [
        {
          type: 'paragraph',
          children: [{ text: 'styled', underline: true, strikethrough: true, backgroundColor: '#fff59d' }],
        },
      ];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips inline numeric font weight', () => {
      const content: RichContent = [
        {
          type: 'paragraph',
          children: [{ text: 'weighted', fontWeight: 600 }],
        },
      ];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips inline link', () => {
      const content: RichContent = [
        {
          type: 'paragraph',
          children: [
            { text: 'visit ' },
            {
              type: 'link',
              linkType: 'external',
              href: 'https://example.com',
              openInNewTab: false,
              children: [{ text: 'here' }],
            },
            { text: '.' },
          ],
        },
      ];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips rich code blocks', () => {
      const content: RichContent = [
        {
          type: 'code-block',
          direction: 'ltr',
          language: 'typescript',
          theme: 'dark',
          children: [
            { type: 'code-line', children: [{ text: 'const answer = 42;' }] },
            { type: 'code-line', children: [{ text: 'console.log(answer);' }] },
          ],
        },
      ];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips rich list blocks', () => {
      const content: RichContent = [
        {
          type: 'ol',
          direction: 'rtl',
          start: 2,
          markerStyle: 'upper-alpha',
          children: [
            { type: 'list-item', children: [{ text: 'Second' }] },
            { type: 'list-item', children: [{ text: 'Third' }] },
          ],
        },
      ];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });
  });

  describe('toggleMark', () => {
    it('adds bold when not active', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'hello' }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      });
      expect(isMarkActive(editor, 'bold')).toBe(false);
      toggleMark(editor, 'bold');
      expect(isMarkActive(editor, 'bold')).toBe(true);
    });

    it('removes bold when active', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'hello', bold: true }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      });
      toggleMark(editor, 'bold');
      expect(isMarkActive(editor, 'bold')).toBe(false);
    });
  });

  describe('setMarkValue', () => {
    it('sets and reads value marks', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'hello' }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      });
      setMarkValue(editor, 'fontSize', '24px');
      expect(getMarkValue(editor, 'fontSize')).toBe('24px');
    });

    it('stores numeric font weight marks as numbers and reads them back as strings', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'hello' }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      });
      setMarkValue(editor, 'fontWeight', '600');
      expect(getMarkValue(editor, 'fontWeight')).toBe('600');
    });
  });

  describe('block-scoped conversions', () => {
    it('converts the containing block without splitting around inline selection', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'text one two three' }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 9 },
        focus: { path: [0, 0], offset: 12 },
      });

      convertSelectionToBlockType(editor, 'h2');

      expect(fromSlateValue(editor.children as never)).toEqual([
        { type: 'h2', children: [{ text: 'text one two three' }] },
      ]);
    });

    it('preserves touched block boundaries when changing block type across a multi-block selection', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        { type: 'paragraph', children: [{ text: 'one two' }] },
        { type: 'h2', children: [{ text: 'three four' }] },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 4 },
        focus: { path: [1, 0], offset: 5 },
      });

      convertSelectionToBlockType(editor, 'h3');

      expect(fromSlateValue(editor.children as never)).toEqual([
        { type: 'h3', children: [{ text: 'one two' }] },
        { type: 'h3', children: [{ text: 'three four' }] },
      ]);
    });

    it('converts block hard breaks into one list item per line', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'one\ntwo\nthree' }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 13 },
      });

      convertSelectionToList(editor, 'ul');

      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'one' }] },
            { type: 'list-item', children: [{ text: 'two' }] },
            { type: 'list-item', children: [{ text: 'three' }] },
          ],
        },
      ]);
    });

    it('preserves inline marks and links when converting multiple blocks to a list', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'paragraph',
          children: [
            { text: 'Visit ' },
            {
              type: 'link',
              linkType: 'external',
              href: 'https://example.com',
              openInNewTab: false,
              children: [{ text: 'docs', bold: true }],
            },
          ],
        },
        {
          type: 'h2',
          children: [{ text: 'Title', italic: true }],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [1, 0], offset: 5 },
      });

      convertSelectionToList(editor, 'ol');

      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ol',
          children: [
            {
              type: 'list-item',
              children: [
                { text: 'Visit ' },
                {
                  type: 'link',
                  linkType: 'external',
                  href: 'https://example.com',
                  openInNewTab: false,
                  children: [{ text: 'docs', bold: true }],
                },
                { text: '' },
              ],
            },
            {
              type: 'list-item',
              children: [{ text: 'Title', italic: true }],
            },
          ],
        },
      ]);
    });

    it('converts each touched block into its own code block', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        { type: 'paragraph', children: [{ text: 'alpha' }] },
        { type: 'h2', children: [{ text: 'beta' }] },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [1, 0], offset: 4 },
      });

      convertSelectionToCodeBlock(editor, 'markdown');

      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'code-block',
          language: 'markdown',
          theme: 'auto',
          highlightedHtml: expect.any(String),
          children: [{ type: 'code-line', children: [{ text: 'alpha' }] }],
        },
        {
          type: 'code-block',
          language: 'markdown',
          theme: 'auto',
          highlightedHtml: expect.any(String),
          children: [{ type: 'code-line', children: [{ text: 'beta' }] }],
        },
      ]);
    });
  });

  describe('code block toolbar helpers', () => {
    it('reads the selected code block language', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'code-block',
          language: 'markdown',
          children: [{ type: 'code-line', children: [{ text: '# Heading' }] }],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0], offset: 9 },
      });

      expect(getSelectedStructureMode(editor)).toBe('code-block');
      expect(getSelectedCodeLanguage(editor)).toBe('markdown');
    });

    it('updates the selected rich code block language', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'code-block',
          language: 'plaintext',
          children: [{ type: 'code-line', children: [{ text: '# Heading' }] }],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0], offset: 9 },
      });

      setSelectedCodeBlockLanguage(editor, 'markdown');

      expect(fromSlateValue(editor.children as never)).toMatchObject([
        {
          type: 'code-block',
          language: 'markdown',
        },
      ]);
    });
  });

  describe('insertLink / removeLink / isLinkActive', () => {
    it('wraps selection in link node', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ type: 'paragraph', children: [{ text: 'visit here now' }] }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 6 },
        focus: { path: [0, 0], offset: 10 },
      });
      insertLink(editor, {
        type: 'link',
        linkType: 'external',
        href: 'https://example.com',
        openInNewTab: false,
      });
      expect(isLinkActive(editor)).toBe(true);
    });

    it('removeLink unwraps an existing link', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'paragraph',
          children: [
            { text: 'visit ' },
            {
              type: 'link',
              linkType: 'external',
              href: 'https://example.com',
              openInNewTab: false,
              children: [{ text: 'here' }],
            },
            { text: '.' },
          ],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 1, 0], offset: 0 },
        focus: { path: [0, 1, 0], offset: 4 },
      });
      expect(isLinkActive(editor)).toBe(true);
      removeLink(editor);
      expect(isLinkActive(editor)).toBe(false);
    });
  });

  describe('list item editing helpers', () => {
    it('detects whether the selection is inside a list item and at the item start', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'First' }] },
          ],
        },
      ]);

      Transforms.select(editor, {
        anchor: { path: [0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0], offset: 0 },
      });
      expect(isSelectionInListItem(editor)).toBe(true);
      expect(isSelectionAtListItemStart(editor)).toBe(true);

      Transforms.select(editor, {
        anchor: { path: [0, 0, 0], offset: 2 },
        focus: { path: [0, 0, 0], offset: 2 },
      });
      expect(isSelectionInListItem(editor)).toBe(true);
      expect(isSelectionAtListItemStart(editor)).toBe(false);
    });

    it('splits a list item at the selection and keeps the same depth', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'Root' }] },
            { type: 'list-item', depth: 1, children: [{ text: 'Alpha' }] },
          ],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 1, 0], offset: 2 },
        focus: { path: [0, 1, 0], offset: 2 },
      });

      expect(insertListItemBreak(editor)).toBe(true);

      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'Root' }] },
            { type: 'list-item', depth: 1, children: [{ text: 'Al' }] },
            { type: 'list-item', depth: 1, children: [{ text: 'pha' }] },
          ],
        },
      ]);
    });

    it('inserts a soft line break inside the selected list item', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'ol',
          children: [{ type: 'list-item', children: [{ text: 'Line' }] }],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 0, 0], offset: 2 },
        focus: { path: [0, 0, 0], offset: 2 },
      });

      expect(insertListSoftBreak(editor)).toBe(true);

      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ol',
          children: [{ type: 'list-item', children: [{ text: 'Li\nne' }] }],
        },
      ]);
    });

    it('merges the current list item into the previous item with a newline', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'First' }] },
            {
              type: 'list-item',
              children: [
                {
                  type: 'link',
                  linkType: 'external',
                  href: 'https://example.com',
                  openInNewTab: false,
                  children: [{ text: 'Second' }],
                },
              ],
            },
          ],
        },
      ]);
      Transforms.select(editor, {
        anchor: { path: [0, 1, 0, 0], offset: 0 },
        focus: { path: [0, 1, 0, 0], offset: 0 },
      });

      expect(mergeListItemBackward(editor)).toBe(true);

      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ul',
          children: [
            {
              type: 'list-item',
              children: [
                { text: 'First\n' },
                {
                  type: 'link',
                  linkType: 'external',
                  href: 'https://example.com',
                  openInNewTab: false,
                  children: [{ text: 'Second' }],
                },
                { text: '' },
              ],
            },
          ],
        },
      ]);
    });

    it('changes list depth only at the start of an item and clamps against the previous item', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'Root' }] },
            { type: 'list-item', children: [{ text: 'Child' }] },
          ],
        },
      ]);

      Transforms.select(editor, {
        anchor: { path: [0, 1, 0], offset: 2 },
        focus: { path: [0, 1, 0], offset: 2 },
      });
      expect(changeSelectedListItemDepth(editor, 1)).toBe(false);

      Transforms.select(editor, {
        anchor: { path: [0, 1, 0], offset: 0 },
        focus: { path: [0, 1, 0], offset: 0 },
      });
      expect(changeSelectedListItemDepth(editor, 8)).toBe(true);
      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'Root' }] },
            { type: 'list-item', depth: 1, children: [{ text: 'Child' }] },
          ],
        },
      ]);

      expect(changeSelectedListItemDepth(editor, -1)).toBe(true);
      expect(fromSlateValue(editor.children as never)).toEqual([
        {
          type: 'ul',
          children: [
            { type: 'list-item', children: [{ text: 'Root' }] },
            { type: 'list-item', children: [{ text: 'Child' }] },
          ],
        },
      ]);
    });
  });
});
