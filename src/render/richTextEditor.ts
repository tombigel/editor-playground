import { createEditor, Editor, Element, Transforms, type BaseEditor, type Descendant } from 'slate';
import { withHistory } from 'slate-history';
import { type ReactEditor, withReact } from 'slate-react';
import type {
  OrderedListMarkerStyle,
  RichBlock,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichTextBlock,
  RichTextBlockType,
  RichTextLink,
  UnorderedListMarkerStyle,
} from '../model/types';
import {
  createRichListBlock,
  createRichListItem,
  createRichTextBlock,
  createRichTextLeaf,
  normalizeRichContent,
} from '../model/richContent';

type RichMarkName = 'bold' | 'italic' | 'underline' | 'strikethrough';
type RichValueMarkName = 'color' | 'backgroundColor' | 'fontFamily' | 'fontSize';

const DEFAULT_LINE_HEIGHT = 1.2;

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

export function isMarkActive(editor: BaseEditor, mark: RichMarkName): boolean {
  const marks = Editor.marks(editor);
  return marks ? (marks as Record<string, unknown>)[mark] === true : false;
}

export function getMarkValue(editor: BaseEditor, mark: RichValueMarkName): string {
  const marks = Editor.marks(editor);
  const value = marks ? (marks as Record<string, unknown>)[mark] : undefined;
  return typeof value === 'string' ? value : '';
}

export function toggleMark(editor: BaseEditor, mark: RichMarkName): void {
  if (isMarkActive(editor, mark)) {
    Editor.removeMark(editor, mark);
  } else {
    Editor.addMark(editor, mark, true);
  }
}

export function setMarkValue(editor: BaseEditor, mark: RichValueMarkName, value: string): void {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    Editor.addMark(editor, mark, trimmedValue);
    return;
  }
  Editor.removeMark(editor, mark);
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

export function getSelectedBlockType(editor: BaseEditor): RichTextBlockType | null {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0) {
    return null;
  }

  const block = blocks[0];
  return block.type === 'code-block' || block.type === 'ul' || block.type === 'ol' ? null : block.type;
}

export function getSelectedListKind(editor: BaseEditor): 'ul' | 'ol' | null {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length !== 1) {
    return null;
  }

  const block = blocks[0];
  return block.type === 'ul' || block.type === 'ol' ? block.type : null;
}

export function getSelectedLineHeight(editor: BaseEditor): number {
  const blocks = getSelectedTopLevelBlocks(editor).filter(isNonListTextBlock);
  if (blocks.length === 0) {
    return DEFAULT_LINE_HEIGHT;
  }

  return blocks[0].lineHeight ?? DEFAULT_LINE_HEIGHT;
}

export function convertSelectionToBlockType(editor: BaseEditor, blockType: RichTextBlockType): void {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0) {
    return;
  }

  if (blocks.length === 1 && isNonListTextBlock(blocks[0])) {
    Transforms.setNodes(editor, { type: blockType } as Partial<RichTextBlock>, { at: [getSelectedTopLevelBlockRange(editor)?.start ?? 0] });
    return;
  }

  const lines = flattenBlocksToLines(blocks);
  replaceSelectedTopLevelBlocks(editor, [
    createRichTextBlock(blockType, [createRichTextLeaf(lines.join('\n'))]),
  ]);
}

export function convertSelectionToList(editor: BaseEditor, listKind: 'ul' | 'ol'): void {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0) {
    return;
  }

  if (blocks.length === 1 && (blocks[0].type === 'ul' || blocks[0].type === 'ol')) {
    Transforms.setNodes(editor, { type: listKind } as Partial<RichListBlock>, { at: [getSelectedTopLevelBlockRange(editor)?.start ?? 0] });
    return;
  }

  const items = flattenBlocksToLines(blocks).map((line) => createRichListItem(line));
  replaceSelectedTopLevelBlocks(editor, [createRichListBlock(listKind, items)]);
}

export function setSelectedListMarkerStyle(
  editor: BaseEditor,
  markerStyle: OrderedListMarkerStyle | UnorderedListMarkerStyle,
): void {
  const range = getSelectedTopLevelBlockRange(editor);
  if (!range) {
    return;
  }

  Editor.withoutNormalizing(editor, () => {
    for (let index = range.start; index <= range.end; index += 1) {
      const node = editor.children[index];
      const nodeType = Element.isElement(node) ? (node as { type?: string }).type : undefined;
      if (nodeType !== 'ul' && nodeType !== 'ol') {
        continue;
      }
      Transforms.setNodes(
        editor,
        { markerStyle } as Partial<RichListBlock>,
        { at: [index] },
      );
    }
  });
}

export function getSelectedListMarkerStyle(editor: BaseEditor): string {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length !== 1) {
    return '';
  }

  const block = blocks[0];
  if (block.type !== 'ul' && block.type !== 'ol') {
    return '';
  }

  return block.markerStyle ?? (block.type === 'ol' ? 'decimal' : 'disc');
}

export function setSelectedBlocksLineHeight(editor: BaseEditor, lineHeight: number): void {
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return;
  }

  const range = getSelectedTopLevelBlockRange(editor);
  if (!range) {
    return;
  }

  Editor.withoutNormalizing(editor, () => {
    for (let index = range.start; index <= range.end; index += 1) {
      const node = editor.children[index];
      const nodeType = Element.isElement(node) ? (node as { type?: string }).type : undefined;
      if (nodeType === 'code-block' || nodeType === 'ul' || nodeType === 'ol' || nodeType == null) {
        continue;
      }
      Transforms.setNodes(editor, { lineHeight } as Partial<RichTextBlock>, { at: [index] });
    }
  });
}

function getSelectedTopLevelBlocks(editor: BaseEditor): RichBlock[] {
  const range = getSelectedTopLevelBlockRange(editor);
  if (!range) {
    return [];
  }

  return editor.children.slice(range.start, range.end + 1)
    .filter((node): node is RichBlock => Element.isElement(node)) as RichBlock[];
}

function getSelectedTopLevelBlockRange(editor: BaseEditor): { start: number; end: number } | null {
  if (!editor.selection) {
    return null;
  }

  const start = Math.min(editor.selection.anchor.path[0] ?? 0, editor.selection.focus.path[0] ?? 0);
  const end = Math.max(editor.selection.anchor.path[0] ?? 0, editor.selection.focus.path[0] ?? 0);
  return { start, end };
}

function replaceSelectedTopLevelBlocks(editor: BaseEditor, blocks: RichBlock[]): void {
  const range = getSelectedTopLevelBlockRange(editor);
  if (!range) {
    return;
  }

  Editor.withoutNormalizing(editor, () => {
    for (let index = range.end; index >= range.start; index -= 1) {
      Transforms.removeNodes(editor, { at: [index] });
    }
    Transforms.insertNodes(editor, blocks as unknown as Descendant[], { at: [range.start] });
    Transforms.select(editor, Editor.start(editor, [range.start]));
  });
}

function flattenBlocksToLines(blocks: RichBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === 'ul' || block.type === 'ol') {
      return block.children.map((item) => flattenInlineNodes(item.children));
    }
    if (block.type === 'code-block') {
      return block.children.map((line) => line.children.map((leaf) => leaf.text).join(''));
    }
    return flattenInlineNodes(block.children).split('\n');
  });
}

function flattenInlineNodes(nodes: RichInlineNode[]): string {
  return nodes
    .map((node) => (isLinkNode(node) ? node.children.map((leaf) => leaf.text).join('') : node.text))
    .join('');
}

function isLinkNode(node: RichInlineNode): node is RichTextLink {
  return Element.isElement(node) && node.type === 'link';
}

function isNonListTextBlock(block: RichBlock): block is RichTextBlock {
  return block.type !== 'code-block' && block.type !== 'ul' && block.type !== 'ol';
}
