import { parseFontSizeValue } from './units';
import type { RichContent } from './types';
import { DEFAULT_TEXT_COLOR } from './styleDefaults';

export const CODE_THEME_SURFACE = {
  light: {
    background: '#f5f2f0',
    color: DEFAULT_TEXT_COLOR,
  },
  dark: {
    background: '#272822',
    color: '#f8f8f2',
  },
} as const;

export const TEXT_NODE_DEFAULTS = {
  heading: {
    content: "I'm a Header Text",
    style: { fontSize: parseFontSizeValue('32px'), fontWeight: 700, lineHeight: 1.2 },
  },
  paragraph: {
    content: "This is a paragraph.\nAdd your text here.",
    style: { fontSize: parseFontSizeValue('18px'), lineHeight: 1.45 },
  },
  rich: {
    content: [{ text: 'Edit rich text' }] as RichContent,
    style: { fontSize: parseFontSizeValue('18px'), lineHeight: 1.45 },
  },
  code: {
    content: '// your code here',
    language: 'plaintext',
    theme: 'light' as 'light' | 'dark',
    style: {
      fontFamily: 'monospace',
      fontSize: parseFontSizeValue('14px'),
      lineHeight: 1.6,
      background: CODE_THEME_SURFACE.light.background,
      color: CODE_THEME_SURFACE.light.color,
    },
  },
};
