import { createEditor, Editor, Element, Transforms, type BaseEditor, type Descendant } from 'slate';
import { withHistory } from 'slate-history';
import { type ReactEditor, withReact } from 'slate-react';
import type { RichContent, RichTextLink } from '../model/types';
import { normalizeRichContent } from '../model/richContent';

export function createRichEditor(): ReactEditor {
  return withInlines(withHistory(withReact(createEditor())));
}

function withInlines(editor: ReactEditor): ReactEditor {
  const { isInline } = editor;
  editor.isInline = (element) =>
    (element as { type?: string }).type === 'link' ? true : isInline(element);
  return editor;
}

export function toSlateValue(content: RichContent): Descendant[] {
  const normalized = normalizeRichContent(content);
  return normalized.length > 0
    ? normalized as unknown as Descendant[]
    : [{ type: 'paragraph', children: [{ text: '' }] } as unknown as Descendant];
}

export function fromSlateValue(value: Descendant[]): RichContent {
  return normalizeRichContent(value);
}

export function isMarkActive(editor: BaseEditor, mark: string): boolean {
  const marks = Editor.marks(editor);
  return marks ? (marks as Record<string, unknown>)[mark] === true : false;
}

export function toggleMark(editor: BaseEditor, mark: string): void {
  if (isMarkActive(editor, mark)) {
    Editor.removeMark(editor, mark);
  } else {
    Editor.addMark(editor, mark, true);
  }
}

export function insertLink(editor: BaseEditor, link: Omit<RichTextLink, 'children'>): void {
  if (editor.selection) {
    Transforms.wrapNodes(
      editor,
      { ...link, children: [] } as RichTextLink,
      { split: true },
    );
  }
}

export function removeLink(editor: BaseEditor): void {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && Element.isElement(n) && (n as { type?: string }).type === 'link',
  });
}

export function isLinkActive(editor: BaseEditor): boolean {
  const [link] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && Element.isElement(n) && (n as { type?: string }).type === 'link',
  });
  return !!link;
}
