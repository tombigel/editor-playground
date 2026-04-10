import { createEditor, Editor, Element, Transforms, type BaseEditor, type Descendant } from 'slate';
import { withHistory } from 'slate-history';
import { type ReactEditor, withReact } from 'slate-react';
import type {
  OrderedListMarkerStyle,
  RichCodeBlock,
  RichBlock,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichListItem,
  RichTextBlock,
  RichTextBlockType,
  RichTextLink,
  UnorderedListMarkerStyle,
} from '../model/types';
import {
  createRichCodeBlock,
  createRichListBlock,
  createRichTextBlock,
  createRichTextLeaf,
  normalizeRichContent,
} from '../model/richContent';
import { highlightCode } from './codeHighlight';

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
  if (blocks.length === 0) {
    return null;
  }

  const firstBlock = blocks[0];
  if (firstBlock.type !== 'ul' && firstBlock.type !== 'ol') {
    return null;
  }

  return blocks.every((block) => block.type === firstBlock.type) ? firstBlock.type : null;
}

export function getSelectedLineHeight(editor: BaseEditor): number {
  const blocks = getSelectedTopLevelBlocks(editor).filter(isNonListTextBlock);
  if (blocks.length === 0) {
    return DEFAULT_LINE_HEIGHT;
  }

  return blocks[0].lineHeight ?? DEFAULT_LINE_HEIGHT;
}

export function getSelectedCodeLanguage(editor: BaseEditor): string {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0 || !blocks.every((block) => block.type === 'code-block')) {
    return '';
  }

  return blocks[0].language ?? 'plaintext';
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

  replaceSelectedTopLevelBlocks(editor, blocks.map((block) => blockToTextBlock(block, blockType)));
}

export function convertSelectionToCodeBlock(editor: BaseEditor, language = 'plaintext'): void {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0) {
    return;
  }

  if (blocks.every((block) => block.type === 'code-block')) {
    setSelectedCodeBlockLanguage(editor, language);
    return;
  }

  replaceSelectedTopLevelBlocks(editor, blocks.map((block) => blockToCodeBlock(block, language)));
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

  const items = blocks.flatMap((block) => blockToListItems(block));
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

export function getSelectedTextAlign(editor: BaseEditor): 'left' | 'center' | 'right' {
  const blocks = getSelectedTopLevelBlocks(editor).filter(isNonListTextBlock);
  if (blocks.length === 0) {
    return 'left';
  }

  return (blocks[0] as RichTextBlock).style?.textAlign ?? 'left';
}

export function getSelectedDirection(editor: BaseEditor): 'ltr' | 'rtl' {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0) {
    return 'ltr';
  }

  return (blocks[0] as RichBlock).direction ?? 'ltr';
}

export function setSelectedBlocksTextAlign(
  editor: BaseEditor,
  textAlign: 'left' | 'center' | 'right',
): void {
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
      const currentStyle = (node as RichTextBlock).style ?? {};
      Transforms.setNodes(
        editor,
        { style: { ...currentStyle, textAlign } } as Partial<RichTextBlock>,
        { at: [index] },
      );
    }
  });
}

export function setSelectedBlocksDirection(
  editor: BaseEditor,
  direction: 'ltr' | 'rtl',
): void {
  const range = getSelectedTopLevelBlockRange(editor);
  if (!range) {
    return;
  }

  Editor.withoutNormalizing(editor, () => {
    for (let index = range.start; index <= range.end; index += 1) {
      if (!Element.isElement(editor.children[index])) {
        continue;
      }
      Transforms.setNodes(
        editor,
        { direction } as Partial<RichBlock>,
        { at: [index] },
      );
    }
  });
}

export function setSelectedCodeBlockLanguage(editor: BaseEditor, language: string): void {
  const range = getSelectedTopLevelBlockRange(editor);
  if (!range) {
    return;
  }

  Editor.withoutNormalizing(editor, () => {
    for (let index = range.start; index <= range.end; index += 1) {
      const node = editor.children[index];
      if (!Element.isElement(node) || (node as { type?: string }).type !== 'code-block') {
        continue;
      }
      const codeBlock = node as RichCodeBlock;
      const rawText = codeBlock.children
        .map((line) => line.children.map((leaf) => leaf.text).join(''))
        .join('\n');
      Transforms.setNodes(
        editor,
        {
          language,
          highlightedHtml: highlightCode(rawText, language),
        } as Partial<RichCodeBlock>,
        { at: [index] },
      );
    }
  });
}

export function getSelectedStructureMode(editor: BaseEditor): 'block' | 'ul' | 'ol' | 'code-block' | null {
  const blocks = getSelectedTopLevelBlocks(editor);
  if (blocks.length === 0) {
    return null;
  }

  if (blocks.every((block) => block.type === 'code-block')) {
    return 'code-block';
  }

  if (blocks[0].type === 'ul' || blocks[0].type === 'ol') {
    return blocks.every((block) => block.type === blocks[0].type) ? blocks[0].type : null;
  }

  if (blocks.every(isNonListTextBlock)) {
    return 'block';
  }

  return null;
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
    const startPath: number[] = [range.start];
    const endPath: number[] = [range.start + blocks.length - 1];
    Transforms.select(editor, {
      anchor: Editor.start(editor, startPath),
      focus: Editor.end(editor, endPath),
    });
  });
}

function blockToTextBlock(block: RichBlock, blockType: RichTextBlockType): RichTextBlock {
  if (isNonListTextBlock(block)) {
    return createRichTextBlock(blockType, cloneInlineNodes(block.children), {
      direction: block.direction,
      lineHeight: block.lineHeight,
    });
  }

  return createRichTextBlock(blockType, [createRichTextLeaf(blockToPlainText(block))], {
    direction: block.direction,
  });
}

function blockToCodeBlock(block: RichBlock, language: string): RichCodeBlock {
  const text = blockToPlainText(block);
  const codeBlock = createRichCodeBlock(text, {
    direction: block.direction,
    language,
    highlightedHtml: highlightCode(text, language),
  });
  codeBlock.children = blockToPlainTextLines(block).map((line) => ({
    type: 'code-line',
    children: [createRichTextLeaf(line)],
  }));
  return codeBlock;
}

function blockToListItems(block: RichBlock): RichListItem[] {
  if (block.type === 'ul' || block.type === 'ol') {
    return block.children.flatMap((item) => inlineNodesToListItems(item.children));
  }

  if (block.type === 'code-block') {
    return block.children.map((line) => createRichListItemFromChildren(cloneInlineNodes(line.children)));
  }

  return inlineNodesToListItems(block.children);
}

function inlineNodesToListItems(nodes: RichInlineNode[]): RichListItem[] {
  return splitInlineNodesToLineGroups(nodes).map((children) => createRichListItemFromChildren(children));
}

function createRichListItemFromChildren(children: RichInlineNode[]): RichListItem {
  return {
    type: 'list-item',
    children: children.length > 0 ? children : [createRichTextLeaf('')],
  };
}

function splitInlineNodesToLineGroups(nodes: RichInlineNode[]): RichInlineNode[][] {
  const lines: RichInlineNode[][] = [[]];

  for (const node of nodes) {
    const nodeGroups = isLinkNode(node)
      ? splitLinkNodeToLineGroups(node)
      : splitLeafNodeToLineGroups(node);

    lines[lines.length - 1].push(...nodeGroups[0]);
    for (let index = 1; index < nodeGroups.length; index += 1) {
      lines.push([...nodeGroups[index]]);
    }
  }

  return lines.length > 0 ? lines : [[]];
}

function splitLeafNodeToLineGroups(node: Exclude<RichInlineNode, RichTextLink>): RichInlineNode[][] {
  return node.text.split('\n').map((part) => (part.length > 0 ? [{ ...node, text: part }] : []));
}

function splitLinkNodeToLineGroups(node: RichTextLink): RichInlineNode[][] {
  const lines: RichInlineNode[][] = [[]];
  let currentChildren: RichTextLink['children'] = [];

  function flushLink() {
    if (currentChildren.length === 0) {
      return;
    }
    lines[lines.length - 1].push({
      ...node,
      children: currentChildren,
    });
    currentChildren = [];
  }

  for (const child of node.children) {
    const parts = child.text.split('\n');
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part.length > 0) {
        currentChildren.push({ ...child, text: part });
      }
      if (index < parts.length - 1) {
        flushLink();
        lines.push([]);
      }
    }
  }

  flushLink();
  return lines;
}

function blockToPlainTextLines(block: RichBlock): string[] {
  if (block.type === 'ul' || block.type === 'ol') {
    return block.children.flatMap((item) => flattenInlineNodes(item.children).split('\n'));
  }

  if (block.type === 'code-block') {
    return block.children.map((line) => line.children.map((leaf) => leaf.text).join(''));
  }

  return flattenInlineNodes(block.children).split('\n');
}

function blockToPlainText(block: RichBlock): string {
  return blockToPlainTextLines(block).join('\n');
}

function cloneInlineNodes(nodes: RichInlineNode[]): RichInlineNode[] {
  const cloned = structuredClone(nodes) as RichInlineNode[];
  return cloned.length > 0 ? cloned : [createRichTextLeaf('')];
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
