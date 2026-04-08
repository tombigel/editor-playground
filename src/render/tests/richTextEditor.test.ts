import { describe, expect, it } from 'vitest';
import {
  convertSelectionToBlockType,
  convertSelectionToList,
  createRichEditor,
  fromSlateValue,
  getMarkValue,
  insertLink,
  isLinkActive,
  isMarkActive,
  removeLink,
  setMarkValue,
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

    it('unifies touched blocks into one block conversion result', () => {
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
        { type: 'h3', children: [{ text: 'one two\nthree four' }] },
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
});
