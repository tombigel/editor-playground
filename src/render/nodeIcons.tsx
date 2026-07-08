import type { LucideIcon } from 'lucide-react';
import {
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ImageIcon,
  Link2,
  List,
  ListOrdered,
  PanelBottom,
  PanelTop,
  PencilLine,
  MessageSquareQuote,
  RectangleEllipsis,
  Rows3,
  SquareStack,
  Table2,
  TextAlignStart,
  TextInitial,
} from 'lucide-react';
import { getSingleListBlockContent, getSingleTextBlockContent } from '../model/richContent';
import type { DocumentNode } from '../model/types';
import { isContainerNode, isMediaNode, isTextNode } from '../model/types';
import type { StageOrSiteNode } from './types';

export function getNodeIcon(node: StageOrSiteNode | Exclude<DocumentNode, { contentType: 'site' }>): LucideIcon {
  if (isContainerNode(node)) {
    if (node.subtype === 'header') {
      return PanelTop;
    }
    if (node.subtype === 'footer') {
      return PanelBottom;
    }
    if (node.subtype === 'section') {
      return Rows3;
    }
    return SquareStack;
  }

  if (isTextNode(node)) {
    if (node.subtype === 'code') {
      return CodeXml;
    }
    if (node.subtype === 'rich') {
      return PencilLine;
    }
    if (node.subtype === 'list') {
      const listBlock = getSingleListBlockContent(node.content);
      return listBlock?.type === 'ol' ? ListOrdered : List;
    }
    if (node.subtype === 'table') {
      return Table2;
    }
    if (node.link !== undefined) {
      return Link2;
    }

    const blockType = getSingleTextBlockContent(node.content)?.type;
    switch (blockType) {
      case 'h1':
        return Heading1;
      case 'h2':
        return Heading2;
      case 'h3':
        return Heading3;
      case 'h4':
        return Heading4;
      case 'h5':
        return Heading5;
      case 'h6':
        return Heading6;
      case 'blockquote':
        return MessageSquareQuote;
      case 'div':
        return TextAlignStart;
      case 'paragraph':
        return TextInitial;
      default:
        return TextInitial;
    }
  }

  if (isMediaNode(node)) {
    return ImageIcon;
  }

  return RectangleEllipsis;
}
