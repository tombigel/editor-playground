import type {
  CodeBlockContent,
  ListBlockContent,
  ListContent,
  RichBlock,
  RichContent,
  RichInlineNode,
  RichListBlock,
  RichTextBlockType,
  RichTextLeaf,
  TextBlockContent,
  TextDocumentBlock,
  TextDocumentBlocks,
  TextDocumentContent,
  TextNode,
} from '../types';
import {
  createRichListBlock,
  createRichListItemFromText,
  createRichTextLeaf,
} from './factories';
import { isCodeBlockContent, isListBlockContent, isRichTextLink, isTextBlockContent, isTextDocumentContent } from './guards';
import type { NormalizeTextContentOptions } from './shared';

function blockText(block: RichBlock): string {
  if (block.type === 'code-block') {
    return block.children
      .map((line) => line.children.map((leaf) => leaf.text).join(''))
      .join('\n');
  }

  if (block.type === 'ul' || block.type === 'ol') {
    return block.children
      .map((item) =>
        item.children
          .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [node.text]))
          .join(''),
      )
      .join('\n');
  }

  return block.children
    .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [node.text]))
    .join('');
}

function flattenRichInlineChildren(children: RichInlineNode[]): string {
  return children
    .flatMap((node) => (isRichTextLink(node) ? node.children.map((leaf) => leaf.text) : [node.text]))
    .join('');
}

export function getTextContent(
  content: string | RichContent,
  options: NormalizeTextContentOptions = {},
): string {
  if (typeof content === 'string') return content;
  const blockSeparator = options.blockSeparator ?? '';
  return content.map((block) => blockText(block)).join(blockSeparator);
}

export function createParagraphRichText(text: string, marks?: Partial<RichTextLeaf>): RichContent {
  return [{
    type: 'paragraph',
    children: [createRichTextLeaf(text, marks)],
  }];
}

export function listContentToRichListBlock(
  content: ListContent,
  options: Pick<RichListBlock, 'direction' | 'style'> = {},
): RichListBlock {
  if (content.type === 'ol') {
    return createRichListBlock('ol', content.items.map((item) => createRichListItemFromText(item.text, {
      direction: item.direction,
      link: item.link,
    })), {
      direction: options.direction,
      style: options.style,
      start: content.start,
      markerStyle: content.markerStyle,
    });
  }

  return createRichListBlock('ul', content.items.map((item) => createRichListItemFromText('text' in item ? item.text : `${item.term}${item.description ? `: ${item.description}` : ''}`, {
    direction: item.direction,
    link: item.link,
  })), {
    direction: options.direction,
    style: options.style,
    markerStyle: content.type === 'ul' ? content.markerStyle : undefined,
  });
}

export function getTextDocumentBlockGap(content: RichContent | TextDocumentContent): number | undefined {
  return isTextDocumentContent(content) ? content.blockGap : undefined;
}

export function setTextDocumentBlockGap(
  content: TextDocumentContent,
  blockGap: number | undefined,
): TextDocumentContent {
  return {
    blocks: content.blocks,
    ...(typeof blockGap === 'number' ? { blockGap } : {}),
  };
}

export function getTextDocumentBlocks(content: RichContent | TextDocumentContent): TextDocumentBlocks {
  return isTextDocumentContent(content) ? content.blocks : content;
}

export function getFirstTextDocumentBlock(content: RichContent | TextDocumentContent): TextDocumentBlock | undefined {
  return getTextDocumentBlocks(content)[0];
}

export function getSingleTextBlockContent(content: RichContent | TextDocumentContent): TextBlockContent | undefined {
  const block = getFirstTextDocumentBlock(content);
  return block && isTextBlockContent(block) ? block : undefined;
}

export function getSingleCodeBlockContent(content: RichContent | TextDocumentContent): CodeBlockContent | undefined {
  const block = getFirstTextDocumentBlock(content);
  return block && isCodeBlockContent(block) ? block : undefined;
}

export function getSingleListBlockContent(content: RichContent | TextDocumentContent): ListBlockContent | undefined {
  const block = getFirstTextDocumentBlock(content);
  return block && isListBlockContent(block) ? block : undefined;
}

export function replaceTextDocumentBlocks(content: TextDocumentContent, blocks: TextDocumentBlocks): TextDocumentContent {
  return {
    blocks,
    ...(typeof content.blockGap === 'number' ? { blockGap: content.blockGap } : {}),
  };
}

export function textBlockTypeToHtmlTag(type: RichTextBlockType): TextNode['htmlTag'] {
  if (type === 'blockquote') {
    return 'blockquote';
  }
  if (type === 'paragraph') {
    return 'p';
  }
  if (type === 'div') {
    return 'div';
  }
  return type;
}

export function htmlTagToTextBlockType(htmlTag: TextNode['htmlTag']): RichTextBlockType {
  if (htmlTag === 'blockquote') {
    return 'blockquote';
  }
  if (htmlTag && htmlTag !== 'p') {
    return htmlTag;
  }
  return 'paragraph';
}

export function richListBlockToListContent(block: RichListBlock): ListContent {
  if (block.type === 'ol') {
    return {
      type: 'ol',
      start: block.start,
      markerStyle: block.markerStyle,
      items: block.children.map((item) => {
        const linkNode = item.children.find((child) => isRichTextLink(child));
        return {
          text: flattenRichInlineChildren(item.children),
          direction: item.direction ?? 'ltr',
          ...(linkNode ? {
            link: {
              linkType: linkNode.linkType,
              ...(typeof linkNode.href === 'string' ? { href: linkNode.href } : {}),
              ...(typeof linkNode.targetPageId === 'string' ? { targetPageId: linkNode.targetPageId } : {}),
              ...(typeof linkNode.pageAnchorId === 'string' ? { pageAnchorId: linkNode.pageAnchorId } : {}),
              ...(typeof linkNode.anchorTargetId === 'string' ? { anchorTargetId: linkNode.anchorTargetId } : {}),
              ...(typeof linkNode.openInNewTab === 'boolean' ? { openInNewTab: linkNode.openInNewTab } : {}),
            },
          } : {}),
        };
      }),
    };
  }

  return {
    type: 'ul',
    markerStyle: block.markerStyle,
    items: block.children.map((item) => {
      const linkNode = item.children.find((child) => isRichTextLink(child));
      return {
        text: flattenRichInlineChildren(item.children),
        direction: item.direction ?? 'ltr',
        ...(linkNode ? {
          link: {
            linkType: linkNode.linkType,
            ...(typeof linkNode.href === 'string' ? { href: linkNode.href } : {}),
            ...(typeof linkNode.targetPageId === 'string' ? { targetPageId: linkNode.targetPageId } : {}),
            ...(typeof linkNode.pageAnchorId === 'string' ? { pageAnchorId: linkNode.pageAnchorId } : {}),
            ...(typeof linkNode.anchorTargetId === 'string' ? { anchorTargetId: linkNode.anchorTargetId } : {}),
            ...(typeof linkNode.openInNewTab === 'boolean' ? { openInNewTab: linkNode.openInNewTab } : {}),
          },
        } : {}),
      };
    }),
  };
}

export function isEmpty(content: RichContent): boolean {
  return content.every((block) => blockText(block) === '');
}
