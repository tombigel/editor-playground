import { parseFontSizeValue } from './units';
import type { RichContent } from './types';

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
    style: { fontFamily: 'monospace', fontSize: parseFontSizeValue('14px'), lineHeight: 1.6 },
  },
};
