import type {
  CodeTheme,
  LinkKind,
  ListDirection,
  OrderedListMarkerStyle,
  RichBlockStyle,
  RichListBlock,
  RichTextBlockType,
  UnorderedListMarkerStyle,
} from '../types';

export type NormalizeTextContentOptions = {
  blockSeparator?: string;
};

export type UnknownRecord = Record<string, unknown>;

export const RICH_TEXT_BLOCK_TYPES = new Set<RichTextBlockType>([
  'paragraph',
  'div',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

export const RICH_LIST_BLOCK_TYPES = new Set<RichListBlock['type']>(['ul', 'ol']);
export const RICH_TEXT_LINK_TYPES = new Set<LinkKind>(['external', 'page', 'anchor']);
export const CODE_THEMES = new Set<CodeTheme>(['auto', 'light', 'dark']);
export const MAX_LIST_ITEM_DEPTH = 8;

export const ORDERED_MARKER_STYLES = new Set<OrderedListMarkerStyle>([
  'decimal',
  'lower-alpha',
  'upper-alpha',
  'lower-roman',
  'upper-roman',
]);

export const UNORDERED_MARKER_STYLES = new Set<UnorderedListMarkerStyle>(['disc', 'circle', 'square']);

const RICH_BLOCK_STYLE_KEYS = new Set<keyof RichBlockStyle>([
  'color',
  'background',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textDecorationLine',
  'textAlign',
  'filter',
  'borderStyle',
  'borderWidth',
  'borderColor',
  'borderRadius',
  'boxSizing',
  'backgroundClip',
  'boxShadow',
  'tabSize',
]);

export function isObjectRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeDirection(value: unknown): 'ltr' | 'rtl' | undefined {
  if (value === 'ltr' || value === 'rtl') {
    return value;
  }
  return undefined;
}

export function normalizeListItemDirection(value: unknown): ListDirection | undefined {
  if (value === 'ltr' || value === 'rtl') {
    return value;
  }
  return undefined;
}

export function normalizeListItemDepth(value: unknown, previousDepth = 0): number | undefined {
  const rawDepth = typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : 0;
  const maxDepth = Math.min(MAX_LIST_ITEM_DEPTH, Math.max(0, previousDepth) + 1);
  const depth = Math.min(maxDepth, Math.max(0, rawDepth));
  return depth > 0 ? depth : undefined;
}

export function normalizeLineHeight(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function normalizeBlockGap(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function normalizeLinkKind(value: unknown): LinkKind {
  return typeof value === 'string' && RICH_TEXT_LINK_TYPES.has(value as LinkKind)
    ? value as LinkKind
    : 'external';
}

export function normalizeCodeTheme(value: unknown): CodeTheme {
  return typeof value === 'string' && CODE_THEMES.has(value as CodeTheme)
    ? value as CodeTheme
    : 'auto';
}

export function normalizeCodeTabSize(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(8, Math.max(1, Math.trunc(value)));
}

export function normalizeRichBlockStyle(value: unknown): RichBlockStyle | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const style: RichBlockStyle = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!RICH_BLOCK_STYLE_KEYS.has(key as keyof RichBlockStyle)) {
      continue;
    }
    if (key === 'tabSize') {
      const tabSize = normalizeCodeTabSize(rawValue);
      if (tabSize !== undefined) {
        style.tabSize = tabSize;
      }
      continue;
    }
    if (typeof rawValue === 'string' || typeof rawValue === 'number') {
      (style as Record<string, string | number>)[key] = rawValue;
    }
  }

  return Object.keys(style).length > 0 ? style : undefined;
}
