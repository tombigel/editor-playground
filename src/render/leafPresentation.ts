import type { CSSProperties } from 'react';
import type { DocumentNode, ImageLeaf, LinkLeaf, TextLeaf, ButtonLeaf, TypographyStyle } from '../model/types';
import {
  DEFAULT_BUTTON_BACKGROUND,
  DEFAULT_BUTTON_BORDER_RADIUS,
  DEFAULT_BUTTON_PADDING_BLOCK,
  DEFAULT_BUTTON_PADDING_INLINE,
  DEFAULT_BUTTON_TEXT_COLOR,
  DEFAULT_BUTTON_SHADOW_BLUR_PX,
  DEFAULT_BUTTON_SHADOW_COLOR,
  DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
  DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_RADIUS,
  DEFAULT_IMAGE_BORDER_WIDTH,
  DEFAULT_IMAGE_SHADOW_BLUR_PX,
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
  DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
  DEFAULT_LINK_COLOR,
  DEFAULT_TEXT_COLOR,
} from '../model/styleDefaults';
import { formatValue } from '../model/units';
import { buildBorderStyle, buildBoxShadow, buildFilterShadow, hasBorderStyle, hasShadowStyle } from './styleHelpers';
import type { SharedCssRule, StyleRecord } from './types';
export type { SharedCssRule, StyleRecord, StyleValue } from './types';

type LeafNode = Extract<DocumentNode, { type: 'leaf' }>;

export function getLeafInlineStyle(node: LeafNode): StyleRecord {
  if (node.role === 'text') {
    return getTextLeafStyle(node);
  }

  if (node.role === 'link') {
    return getLinkLeafStyle(node);
  }

  if (node.role === 'image') {
    return getImageLeafStyle(node);
  }

  if (node.role === 'button') {
    return getButtonLeafStyle(node);
  }

  return {};
}

export function getTextLeafStyle(node: TextLeaf): StyleRecord {
  return getTypographyStyle(node.style, {
    color: DEFAULT_TEXT_COLOR,
    fontSize: '18px',
    fontWeight: '500',
    letterSpacing: '-0.02em',
    textDecorationLine: 'none',
    lineHeight: 1.24,
    direction: 'ltr',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    maxWidth: '100%',
    margin: 0,
  });
}

export function getLinkLeafStyle(node: LinkLeaf): StyleRecord {
  return {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    ...getTypographyStyle(node.style, {
      color: DEFAULT_LINK_COLOR,
      fontWeight: '500',
      textDecorationLine: 'underline',
      lineHeight: 1.24,
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: node.style?.textWrap === 'wrap' ? 'normal' : 'nowrap',
    }),
  };
}

export function getImageLeafStyle(node: ImageLeaf): StyleRecord {
  const useImageDefaults = node.name !== 'Brand Mark';
  const style: StyleRecord =
    node.name === 'Brand Mark'
      ? {
          minWidth: 0,
          minHeight: 0,
        }
      : {};

  if (!hasBorderStyle(node.style) && !hasShadowStyle(node.style)) {
    return style;
  }

  Object.assign(
    style,
    buildBorderStyle(node.style, useImageDefaults
      ? {
          color: DEFAULT_IMAGE_BORDER_COLOR,
          width: DEFAULT_IMAGE_BORDER_WIDTH,
          radius: DEFAULT_IMAGE_BORDER_RADIUS,
        }
      : {}),
  );
  const boxShadow = buildBoxShadow(
    node.style,
    useImageDefaults
      ? {
          color: DEFAULT_IMAGE_SHADOW_COLOR,
          blur: DEFAULT_IMAGE_SHADOW_BLUR_PX,
          offsetX: DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
          offsetY: DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
        }
      : {},
  );
  if (boxShadow) {
    style.boxShadow = boxShadow;
  }
  return style;
}

export function getButtonLeafStyle(node: ButtonLeaf): StyleRecord {
  const style: StyleRecord = {
    ...getTypographyStyle(node.style, {
      color: DEFAULT_BUTTON_TEXT_COLOR,
      fontSize: '18px',
      fontWeight: '500',
      letterSpacing: '-0.01em',
      textDecorationLine: 'none',
      lineHeight: 1.24,
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: node.style?.textWrap === 'wrap' ? 'normal' : 'nowrap',
    }),
    ...(node.style?.background ? { background: node.style.background } : { background: DEFAULT_BUTTON_BACKGROUND }),
    ...(node.style?.paddingBlock ? { paddingBlock: formatValue(node.style.paddingBlock.parsed) } : {}),
    ...(node.style?.paddingInline ? { paddingInline: formatValue(node.style.paddingInline.parsed) } : {}),
  };
  if (hasBorderStyle(node.style)) {
    Object.assign(
      style,
      buildBorderStyle(node.style, {
        radius: DEFAULT_BUTTON_BORDER_RADIUS,
      }),
    );
  }
  if (hasShadowStyle(node.style)) {
    const boxShadow = buildBoxShadow(node.style, {
      color: DEFAULT_BUTTON_SHADOW_COLOR,
      blur: DEFAULT_BUTTON_SHADOW_BLUR_PX,
      offsetX: DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
      offsetY: DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
    });
    if (boxShadow) {
      style.boxShadow = boxShadow;
    }
  }
  return style;
}

export function styleRecordToReactStyle(style: StyleRecord): CSSProperties {
  return style as CSSProperties;
}

export function styleRecordToCssDeclarations(style: StyleRecord): string[] {
  return Object.entries(style).map(([property, value]) => `${toKebabCase(property)}: ${String(value)}`);
}

export function getSiteLeafBaseRules(selectors: {
  text: string;
  blockquoteText: string;
  link: string;
  imageRole: string;
  image: string;
  brandMarkImage: string;
  imagePlaceholder: string;
  button: string;
}): SharedCssRule[] {
  return [
    {
      selector: selectors.text,
      style: {
        margin: 0,
        font: 'inherit',
        color: 'inherit',
        maxWidth: '100%',
        textAlign: 'inherit',
        textDecoration: 'inherit',
        quotes: 'none',
        whiteSpace: 'pre-wrap',
      },
    },
    {
      selector: selectors.blockquoteText,
      style: {
        margin: 0,
      },
    },
    {
      selector: selectors.link,
      style: {
        color: '#172033',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        fontWeight: 500,
      },
    },
    {
      selector: selectors.imageRole,
      style: {
        border: 0,
        background: 'transparent',
        boxShadow: 'none',
      },
    },
    {
      selector: selectors.image,
      style: {
        display: 'block',
        maxWidth: '100%',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        overflow: 'hidden',
        border: '1px solid #d8e0ea',
        borderRadius: '16px',
        background: '#f4f6fa',
        boxShadow: '0 12px 28px rgba(18, 32, 51, 0.12)',
      },
    },
    {
      selector: selectors.brandMarkImage,
      style: {
        objectFit: 'contain',
        border: 0,
        borderRadius: 0,
        background: 'transparent',
        boxShadow: 'none',
      },
    },
    {
      selector: selectors.imagePlaceholder,
      style: {
        minHeight: '100px',
        display: 'grid',
        placeItems: 'center',
        borderRadius: '16px',
        border: '1px solid #d8e0ea',
        background: '#f4f6fa',
        boxShadow: '0 12px 28px rgba(18, 32, 51, 0.12)',
      },
    },
    {
      selector: selectors.button,
      style: {
        appearance: 'none',
        display: 'block',
        width: '100%',
        minWidth: 'min-content',
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: '#05070a',
        border: 0,
        font: 'inherit',
        color: '#fff',
        borderRadius: '999px',
        paddingBlock: DEFAULT_BUTTON_PADDING_BLOCK,
        paddingInline: DEFAULT_BUTTON_PADDING_INLINE,
        fontSize: '18px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        boxShadow: '0 10px 18px rgba(5, 7, 10, 0.16)',
        textAlign: 'inherit',
        cursor: 'pointer',
      },
    },
  ];
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function getTypographyStyle(
  style: (TypographyStyle & { textWrap?: 'single-line' | 'wrap' } & { shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number }) | undefined,
  defaults: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    letterSpacing?: string;
    textDecorationLine?: string;
    lineHeight?: number;
    direction?: 'ltr' | 'rtl';
    textAlign?: 'left' | 'center' | 'right';
    whiteSpace?: 'normal' | 'nowrap' | 'pre-wrap';
    maxWidth?: string;
    margin?: number;
  },
): StyleRecord {
  const filter = buildFilterShadow(style);
  return {
    ...(defaults.margin !== undefined ? { margin: defaults.margin } : {}),
    ...(defaults.maxWidth ? { maxWidth: defaults.maxWidth } : {}),
    ...(defaults.whiteSpace ? { whiteSpace: defaults.whiteSpace } : {}),
    ...(style?.color || defaults.color ? { color: style?.color ?? defaults.color } : {}),
    ...(style?.fontSize || defaults.fontSize
      ? { fontSize: style?.fontSize ? formatValue(style.fontSize.parsed) : defaults.fontSize }
      : {}),
    ...(style?.fontWeight || defaults.fontWeight ? { fontWeight: style?.fontWeight ?? defaults.fontWeight } : {}),
    ...(style?.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(defaults.letterSpacing ? { letterSpacing: defaults.letterSpacing } : {}),
    ...(style?.textDecorationLine || defaults.textDecorationLine
      ? { textDecorationLine: style?.textDecorationLine ?? defaults.textDecorationLine }
      : {}),
    ...(style?.lineHeight || defaults.lineHeight ? { lineHeight: style?.lineHeight ?? defaults.lineHeight } : {}),
    ...(style?.direction || defaults.direction ? { direction: style?.direction ?? defaults.direction } : {}),
    ...(style?.textAlign || defaults.textAlign ? { textAlign: style?.textAlign ?? defaults.textAlign } : {}),
    ...(filter ? { filter } : {}),
  };
}
