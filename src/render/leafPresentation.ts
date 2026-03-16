import type { CSSProperties } from 'react';
import type { DocumentNode, TextLeaf } from '../model/types';
import { formatValue } from '../model/units';
import type { SharedCssRule, StyleRecord } from './types';
export type { SharedCssRule, StyleRecord, StyleValue } from './types';

type LeafNode = Extract<DocumentNode, { type: 'leaf' }>;

export function getLeafInlineStyle(node: LeafNode): StyleRecord {
  if (node.role === 'text') {
    return getTextLeafStyle(node);
  }

  if (node.role === 'image' && node.name === 'Brand Mark') {
    return {
      minWidth: 0,
      minHeight: 0,
    };
  }

  return {};
}

export function getTextLeafStyle(node: TextLeaf): StyleRecord {
  return {
    margin: 0,
    maxWidth: '100%',
    whiteSpace: 'pre-wrap',
    color: node.style?.color ?? '#16202a',
    fontSize: node.style?.fontSize ? formatValue(node.style.fontSize.parsed) : '18px',
    fontWeight: node.style?.fontWeight ?? '500',
    fontStyle: node.style?.fontStyle ?? 'normal',
    letterSpacing: '-0.02em',
    textDecorationLine: node.style?.textDecorationLine ?? 'none',
    lineHeight: node.style?.lineHeight ?? 1.24,
    direction: node.style?.direction ?? 'ltr',
    textAlign: node.style?.textAlign ?? 'left',
  };
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
        padding: '13px 24px',
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
