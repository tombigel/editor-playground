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

export function getLayersNodeIcon(node: Exclude<DocumentNode, { type: 'site' }>): LucideIcon {
  if (node.type === 'wrapper') {
    if (node.role === 'header') {
      return PanelTop;
    }
    if (node.role === 'footer') {
      return PanelBottom;
    }
    if (node.role === 'section') {
      return Rows3;
    }
    return SquareStack;
  }

  if (node.role === 'text') {
    return Type;
  }
  if (node.role === 'image') {
    return ImageIcon;
  }
  if (node.role === 'link') {
    return Link2;
  }
  return RectangleEllipsis;
}
