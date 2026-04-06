import type { LucideIcon } from 'lucide-react';
import {
  ImageIcon,
  Link2,
  PanelBottom,
  PanelTop,
  RectangleEllipsis,
  Rows3,
  SquareStack,
  Type,
} from 'lucide-react';
import type { DocumentNode } from '../model/types';
import { isContainerNode, isTextNode, isMediaNode } from '../model/types';

export function getLayersNodeIcon(node: Exclude<DocumentNode, { contentType: 'site' }>): LucideIcon {
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
    if (node.link !== undefined) {
      return Link2;
    }
    return Type;
  }
  if (isMediaNode(node)) {
    return ImageIcon;
  }
  return RectangleEllipsis;
}
