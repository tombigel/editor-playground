import { describe, expect, it } from 'vitest';
import { createRichEditor, fromSlateValue, insertLink, isLinkActive, isMarkActive, removeLink, toSlateValue, toggleMark } from '../richTextEditor';
import type { RichContent } from '../../model/types';
import { Transforms } from 'slate';

function makeEditor() {
  return createRichEditor();
}

describe('render/richTextEditor', () => {
  describe('toSlateValue / fromSlateValue', () => {
    it('round-trips plain text', () => {
      const content: RichContent = [{ text: 'hello' }];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips bold mark', () => {
      const content: RichContent = [{ text: 'bold', bold: true }];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });

    it('round-trips inline link', () => {
      const content: RichContent = [
        { text: 'visit ' },
        {
          type: 'link',
          linkType: 'external',
          href: 'https://example.com',
          openInNewTab: false,
          children: [{ text: 'here' }],
        },
        { text: '.' },
      ];
      expect(fromSlateValue(toSlateValue(content))).toEqual(content);
    });
  });

  describe('toggleMark', () => {
    it('adds bold when not active', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ text: 'hello' }]);
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
      editor.children = toSlateValue([{ text: 'hello', bold: true }]);
      Transforms.select(editor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 },
      });
      toggleMark(editor, 'bold');
      expect(isMarkActive(editor, 'bold')).toBe(false);
    });
  });

  describe('insertLink / removeLink / isLinkActive', () => {
    it('wraps selection in link node', () => {
      const editor = makeEditor();
      editor.children = toSlateValue([{ text: 'visit here now' }]);
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
        { text: 'visit ' },
        {
          type: 'link',
          linkType: 'external',
          href: 'https://example.com',
          openInNewTab: false,
          children: [{ text: 'here' }],
        },
        { text: '.' },
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
