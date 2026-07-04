import type { CSSProperties } from 'react';
import { CODE_THEME_SURFACE } from '../model/textNodeDefaults';
import type { MediaNode, TextNode, TypographyStyle } from '../model/types';
import { isMediaNode, isTextNode } from '../model/types';
import { buildFontFamilyStack, DEFAULT_FONT_FALLBACK_STACK } from '../fonts';
import { formatValue } from '../model/units';
import { buildBorderStyle, buildBoxShadow, buildFilterShadow } from './styleHelpers';
import type { SharedCssRule, StyleRecord } from './types';
export type { SharedCssRule, StyleRecord, StyleValue } from './types';

type LeafNode = TextNode | MediaNode;

export function getLeafInlineStyle(node: LeafNode): StyleRecord {
  if (isTextNode(node)) {
    if (node.subtype === 'code') {
      return getCodeLeafStyle(node);
    }
    if (node.subtype === 'block' && node.link !== undefined && node.style?.background !== undefined) {
      return getButtonLeafStyle(node);
    }
    if (node.subtype === 'block' && node.link !== undefined) {
      return getLinkLeafStyle(node);
    }
    return getTextLeafStyle(node);
  }

  if (isMediaNode(node)) {
    return getImageLeafStyle(node);
  }

  return {};
}

export function getTextLeafStyle(node: TextNode): StyleRecord {
  return getTypographyStyle(node.style, {
    whiteSpace: 'pre-wrap',
    maxWidth: '100%',
    margin: 0,
    fontFamily: DEFAULT_FONT_FALLBACK_STACK,
  });
}

export function getCodeLeafStyle(node: TextNode): StyleRecord {
  const style: StyleRecord = {
    display: 'block',
    maxWidth: '100%',
    ...getTypographyStyle(node.style, {
      maxWidth: '100%',
      margin: 0,
      fontFamily: 'monospace',
    }, { includeFilter: false }),
  };
  if (isCodeThemeSurfaceValue(style.color)) {
    delete style.color;
  }
  return style;
}

export function getStandaloneCodePreStyle(node: TextNode): StyleRecord {
  const wrap = node.style?.textWrap !== 'single-line';
  const style: StyleRecord = {
    display: 'block',
    width: '100%',
    margin: 0,
    whiteSpace: wrap ? 'pre-wrap' : 'pre',
    wordBreak: wrap ? 'break-word' : 'normal',
    overflowWrap: wrap ? 'anywhere' : 'normal',
    wordWrap: wrap ? 'break-word' : 'normal',
    overflowX: wrap ? 'hidden' : 'auto',
    ...(node.style?.tabSize != null ? { tabSize: node.style.tabSize } : {}),
    ...(isAuthoredCodeSurfaceValue(node.style?.background) ? { background: node.style.background } : {}),
  };
  Object.assign(style, buildBorderStyle(node.style));
  const boxShadow = buildBoxShadow(node.style);
  if (boxShadow) {
    style.boxShadow = boxShadow;
  }
  return style;
}

export function isAuthoredCodeSurfaceValue(value: unknown): value is string {
  return typeof value === 'string' && !isCodeThemeSurfaceValue(value);
}

function isCodeThemeSurfaceValue(value: unknown): value is string {
  return typeof value === 'string' && Object.values(CODE_THEME_SURFACE).some(
    (surface) => surface.background === value || surface.color === value,
  );
}

export function getLinkLeafStyle(node: TextNode): StyleRecord {
  return {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    ...getTypographyStyle(node.style, {
      fontFamily: DEFAULT_FONT_FALLBACK_STACK,
      margin: 0,
      whiteSpace: node.style?.textWrap === 'wrap' ? 'normal' : node.style?.textWrap === 'single-line' ? 'nowrap' : undefined,
    }),
  };
}

export function getImageLeafStyle(node: MediaNode): StyleRecord {
  const style: StyleRecord =
    node.name === 'Brand Mark'
      ? {
          minWidth: 0,
          minHeight: 0,
        }
      : {
          overflow: 'hidden',
        };

  Object.assign(style, buildBorderStyle(node.style));
  const boxShadow = buildBoxShadow(node.style);
  if (boxShadow) {
    style.boxShadow = boxShadow;
  }
  return style;
}

export function getButtonLeafStyle(node: TextNode): StyleRecord {
  const style: StyleRecord = {
    display: 'block',
    width: '100%',
    minWidth: 'min-content',
    maxWidth: '100%',
    boxSizing: 'border-box',
    ...getTypographyStyle(node.style, {
      fontFamily: DEFAULT_FONT_FALLBACK_STACK,
      whiteSpace: node.style?.textWrap === 'wrap' ? 'normal' : node.style?.textWrap === 'single-line' ? 'nowrap' : undefined,
    }, { includeFilter: false }),
    ...(node.style?.background ? { background: node.style.background } : {}),
    ...(node.style?.paddingBlock ? { paddingBlock: formatValue(node.style.paddingBlock.parsed) } : {}),
    ...(node.style?.paddingInline ? { paddingInline: formatValue(node.style.paddingInline.parsed) } : {}),
  };
  Object.assign(style, buildBorderStyle(node.style));
  const boxShadow = buildBoxShadow(node.style);
  if (boxShadow) {
    style.boxShadow = boxShadow;
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
  linkAnchor: string;
  imageLink: string;
  image: string;
  brandMarkImage: string;
  imagePlaceholder: string;
  video: string;
  svg: string;
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
      selector: selectors.linkAnchor,
      style: {
        fontFamily: 'inherit',
        textDecoration: 'inherit',
        textUnderlineOffset: 'inherit',
        fontWeight: 'inherit',
      },
    },
    {
      selector: selectors.imageLink,
      style: {
        color: 'inherit',
        textDecoration: 'none',
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
      },
    },
    {
      selector: selectors.video,
      style: {
        display: 'block',
        maxWidth: '100%',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      },
    },
    {
      selector: selectors.svg,
      style: {
        display: 'block',
        maxWidth: '100%',
        width: '100%',
        height: '100%',
      },
    },
    {
      selector: `${selectors.svg}.sp-svg-mono :where(path, circle, ellipse, rect, polygon, polyline, line)`,
      style: {
        fill: 'currentColor',
        fillOpacity: 'var(--sp-svg-fill-opacity, 1)',
      },
    },
    {
      selector: `${selectors.svg}.sp-svg-stroke :where(path, circle, ellipse, rect, polygon, polyline, line)`,
      style: {
        stroke: 'var(--sp-svg-stroke-color, currentColor)',
        strokeWidth: 'var(--sp-svg-stroke-width, 1)',
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
        border: 0,
        font: 'inherit',
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
  style: (TypographyStyle & { textWrap?: 'single-line' | 'wrap' } & { shadowColor?: string; shadowBlur?: number; shadowSpread?: number; shadowOffsetX?: number; shadowOffsetY?: number }) | undefined,
  defaults: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    letterSpacing?: string;
    textDecorationLine?: string;
    lineHeight?: number;
    fontFamily?: string;
    direction?: 'ltr' | 'rtl';
    textAlign?: 'left' | 'center' | 'right';
    whiteSpace?: 'normal' | 'nowrap' | 'pre-wrap';
    maxWidth?: string;
    margin?: number;
  },
  options: {
    includeFilter?: boolean;
  } = {},
): StyleRecord {
  const filter = options.includeFilter === false ? undefined : buildFilterShadow(style);
  return {
    ...(defaults.margin !== undefined ? { margin: defaults.margin } : {}),
    ...(defaults.maxWidth ? { maxWidth: defaults.maxWidth } : {}),
    ...(defaults.whiteSpace ? { whiteSpace: defaults.whiteSpace } : {}),
    ...(style?.color || defaults.color ? { color: style?.color ?? defaults.color } : {}),
    ...(style?.fontFamily || defaults.fontFamily
      ? { fontFamily: style?.fontFamily ? buildFontFamilyStack(style.fontFamily) : defaults.fontFamily }
      : {}),
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
