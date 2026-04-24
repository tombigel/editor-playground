import type {
  RichBlock,
  RichCodeLine,
  RichContent,
  RichInlineNode,
  RichListItem,
  RichTextLeaf,
  RichTextLink,
  StandaloneTextNodeSnapshot,
  TextDocumentContent,
} from '../types';
import {
  createParagraphBlock,
  createRichCodeLine,
  createRichListBlock,
  createRichListItem,
  createRichTextBlock,
  createRichTextLeaf,
} from './factories';
import { isRichListBlockType, isRichTextBlockType, isRichTextLink, isTextDocumentContent } from './guards';
import {
  isObjectRecord,
  normalizeBlockGap,
  normalizeDirection,
  normalizeLineHeight,
  normalizeLinkKind,
  normalizeListItemDirection,
  normalizeRichBlockStyle,
} from './shared';

function normalizeLeaf(node: unknown): RichTextLeaf | null {
  if (!isObjectRecord(node) || typeof node.text !== 'string') {
    return null;
  }

  return {
    text: node.text,
    ...(node.bold === true ? { bold: true } : {}),
    ...(node.italic === true ? { italic: true } : {}),
    ...(node.underline === true ? { underline: true } : {}),
    ...(node.strikethrough === true ? { strikethrough: true } : {}),
    ...(typeof node.color === 'string' ? { color: node.color } : {}),
    ...(typeof node.backgroundColor === 'string' ? { backgroundColor: node.backgroundColor } : {}),
    ...(typeof node.fontFamily === 'string' ? { fontFamily: node.fontFamily } : {}),
    ...(typeof node.fontSize === 'string' ? { fontSize: node.fontSize } : {}),
    ...(typeof node.fontWeight === 'number' && Number.isFinite(node.fontWeight) ? { fontWeight: node.fontWeight } : {}),
  };
}

function normalizeRichTextLink(node: unknown): RichTextLink | null {
  if (!isObjectRecord(node) || node.type !== 'link' || !Array.isArray(node.children)) {
    return null;
  }

  const children = node.children
    .map((child) => normalizeLeaf(child))
    .filter((child): child is RichTextLeaf => child !== null);

  return {
    type: 'link',
    linkType: normalizeLinkKind(node.linkType),
    children: children.length > 0 ? children : [createRichTextLeaf('')],
    ...(typeof node.href === 'string' ? { href: node.href } : {}),
    ...(typeof node.targetPageId === 'string' ? { targetPageId: node.targetPageId } : {}),
    ...(typeof node.pageAnchorId === 'string' ? { pageAnchorId: node.pageAnchorId } : {}),
    ...(typeof node.anchorTargetId === 'string' ? { anchorTargetId: node.anchorTargetId } : {}),
    ...(typeof node.openInNewTab === 'boolean' ? { openInNewTab: node.openInNewTab } : {}),
  };
}

function normalizeInlineNode(node: unknown): RichInlineNode | null {
  return normalizeRichTextLink(node) ?? normalizeLeaf(node);
}

function normalizeInlineChildren(children: unknown): RichInlineNode[] {
  if (!Array.isArray(children)) {
    return [createRichTextLeaf('')];
  }

  const normalized = children
    .map((child) => normalizeInlineNode(child))
    .filter((child): child is RichInlineNode => child !== null);

  return normalized.length > 0 ? normalized : [createRichTextLeaf('')];
}

function normalizeStandaloneTextNodeSnapshot(value: unknown): StandaloneTextNodeSnapshot | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const subtype = value.subtype;
  if (subtype !== 'block' && subtype !== 'code' && subtype !== 'list') {
    return undefined;
  }

  if (typeof value.name !== 'string'
    || typeof value.visible !== 'boolean'
    || typeof value.locked !== 'boolean'
    || !isObjectRecord(value.rect)) {
    return undefined;
  }

  const contentBlock = normalizeRichBlock(value.contentBlock);
  if (!contentBlock) {
    return undefined;
  }

  return {
    subtype,
    name: value.name,
    visible: value.visible,
    locked: value.locked,
    rect: structuredClone(value.rect) as StandaloneTextNodeSnapshot['rect'],
    contentBlock,
    ...(isObjectRecord(value.style) ? { style: structuredClone(value.style) as StandaloneTextNodeSnapshot['style'] } : {}),
    ...(typeof value.lang === 'string' ? { lang: value.lang } : {}),
    ...(value.htmlTag === 'p'
      || value.htmlTag === 'blockquote'
      || isRichTextBlockType(value.htmlTag)
      ? { htmlTag: value.htmlTag as NonNullable<StandaloneTextNodeSnapshot['htmlTag']> }
      : {}),
    ...(isObjectRecord(value.link) ? { link: structuredClone(value.link) as StandaloneTextNodeSnapshot['link'] } : {}),
    ...(isObjectRecord(value.code) && typeof value.code.language === 'string'
      ? {
          code: {
            language: value.code.language,
            ...(value.code.theme === 'light' || value.code.theme === 'dark' ? { theme: value.code.theme } : {}),
            ...(typeof value.code.highlightedHtml === 'string' ? { highlightedHtml: value.code.highlightedHtml } : {}),
          },
        }
      : {}),
    ...(isObjectRecord(value.sticky) ? { sticky: structuredClone(value.sticky) as StandaloneTextNodeSnapshot['sticky'] } : {}),
    ...(isObjectRecord(value.animation) ? { animation: structuredClone(value.animation) as StandaloneTextNodeSnapshot['animation'] } : {}),
  };
}

function normalizeCodeLine(node: unknown): RichCodeLine | null {
  if (!isObjectRecord(node) || node.type !== 'code-line') {
    return null;
  }

  return {
    type: 'code-line',
    children: normalizeInlineChildren(node.children)
      .flatMap((child) => (isRichTextLink(child) ? child.children : [child]))
      .map((child) => ({ ...child })),
  };
}

function normalizeCodeLines(children: unknown): RichCodeLine[] {
  if (!Array.isArray(children)) {
    return [createRichCodeLine('')];
  }

  const normalized = children
    .map((child) => normalizeCodeLine(child))
    .filter((child): child is RichCodeLine => child !== null);

  return normalized.length > 0 ? normalized : [createRichCodeLine('')];
}

function normalizeListItem(node: unknown): RichListItem | null {
  if (!isObjectRecord(node) || node.type !== 'list-item') {
    return null;
  }

  return {
    type: 'list-item',
    ...(normalizeListItemDirection(node.direction) ? { direction: normalizeListItemDirection(node.direction) } : {}),
    children: normalizeInlineChildren(node.children),
  };
}

function normalizeListItems(children: unknown): RichListItem[] {
  if (!Array.isArray(children)) {
    return [createRichListItem('')];
  }

  const normalized = children
    .map((child) => normalizeListItem(child))
    .filter((child): child is RichListItem => child !== null);

  return normalized.length > 0 ? normalized : [createRichListItem('')];
}

function normalizeRichBlock(node: unknown): RichBlock | null {
  if (!isObjectRecord(node) || typeof node.type !== 'string') {
    return null;
  }

  if (isRichTextBlockType(node.type)) {
    return createRichTextBlock(node.type, normalizeInlineChildren(node.children), {
      direction: normalizeDirection(node.direction),
      lineHeight: normalizeLineHeight(node.lineHeight),
      style: normalizeRichBlockStyle(node.style),
      standalone: normalizeStandaloneTextNodeSnapshot(node.standalone),
    });
  }

  if (node.type === 'code-block') {
    return {
      type: 'code-block',
      ...(normalizeDirection(node.direction) ? { direction: normalizeDirection(node.direction) } : {}),
      ...(typeof node.language === 'string' ? { language: node.language } : {}),
      ...(node.theme === 'light' || node.theme === 'dark' ? { theme: node.theme } : {}),
      ...(typeof node.highlightedHtml === 'string' ? { highlightedHtml: node.highlightedHtml } : {}),
      ...(normalizeRichBlockStyle(node.style) ? { style: normalizeRichBlockStyle(node.style) } : {}),
      ...(normalizeStandaloneTextNodeSnapshot(node.standalone) ? { standalone: normalizeStandaloneTextNodeSnapshot(node.standalone) } : {}),
      children: normalizeCodeLines(node.children),
    };
  }

  if (isRichListBlockType(node.type)) {
    return createRichListBlock(node.type, normalizeListItems(node.children), {
      direction: normalizeDirection(node.direction),
      style: normalizeRichBlockStyle(node.style),
      standalone: normalizeStandaloneTextNodeSnapshot(node.standalone),
      ...(node.type === 'ol' && typeof node.start === 'number' ? { start: node.start } : {}),
      ...(typeof node.markerStyle === 'string' ? { markerStyle: node.markerStyle } : {}),
    });
  }

  return null;
}

export function normalizeRichContent(content: unknown): RichContent {
  if (!Array.isArray(content)) {
    return [];
  }

  const blocks: RichContent = [];
  let inlineBuffer: RichInlineNode[] = [];

  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) {
      return;
    }
    blocks.push(createParagraphBlock(inlineBuffer));
    inlineBuffer = [];
  };

  for (const node of content) {
    const block = normalizeRichBlock(node);
    if (block) {
      flushInlineBuffer();
      blocks.push(block);
      continue;
    }

    const inlineNode = normalizeInlineNode(node);
    if (inlineNode) {
      inlineBuffer.push(inlineNode);
    }
  }

  flushInlineBuffer();
  return blocks;
}

export function normalizeTextDocumentContent(content: unknown): TextDocumentContent {
  if (isTextDocumentContent(content)) {
    const blockGap = normalizeBlockGap(content.blockGap);
    return {
      blocks: normalizeRichContent(content.blocks),
      ...(blockGap !== undefined ? { blockGap } : {}),
    };
  }

  return {
    blocks: normalizeRichContent(content),
  };
}
