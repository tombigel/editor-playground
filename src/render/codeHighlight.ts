import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML/XML
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-csharp';

export const SUPPORTED_CODE_LANGUAGES = [
  'plaintext',
  'markdown',
  'javascript',
  'typescript',
  'css',
  'markup',
  'json',
  'python',
  'bash',
  'c',
  'cpp',
  'rust',
  'java',
  'go',
  'csharp',
] as const;

export type SupportedCodeLanguage = (typeof SUPPORTED_CODE_LANGUAGES)[number];

export function getCodeLanguageLabel(language: string): string {
  if (language === 'plaintext') {
    return 'Plain text';
  }
  if (language === 'markup') {
    return 'HTML';
  }
  if (language === 'cpp') {
    return 'C++';
  }
  if (language === 'csharp') {
    return 'C#';
  }
  return language.charAt(0).toUpperCase() + language.slice(1);
}

export const CODE_LANGUAGE_OPTIONS = SUPPORTED_CODE_LANGUAGES.map((language) => ({
  value: language,
  label: getCodeLanguageLabel(language),
}));

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function normalizeCodeLanguage(language: string): string {
  if (language === 'plaintext' || language === 'markdown') {
    return language;
  }
  return Prism.languages[language] ? language : 'plaintext';
}

export function highlightCode(code: string, language: string): string {
  const resolvedLanguage = normalizeCodeLanguage(language);
  const grammar = Prism.languages[resolvedLanguage];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, resolvedLanguage);
}
