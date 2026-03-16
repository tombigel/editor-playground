import type { CSSProperties } from 'react';
import type { DocumentNode } from '../../model/types';

export type StageOrSiteNode = Extract<DocumentNode, { type: 'wrapper' | 'leaf' }>;
export type PresentationLeafNode = Extract<DocumentNode, { type: 'leaf' }>;

export type RenderLeafContentOptions = {
  textStyle?: CSSProperties;
  imageClassName?: string;
  imagePlaceholderClassName?: string;
  imageDraggable?: boolean;
  disableTabNavigation?: boolean;
};
