import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML/XML
import 'prismjs/components/prism-json';
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function normalizeCodeLanguage(language: string): string {
  if (language === 'plaintext') {
    return language;
  }
  return Prism.languages[language] ? language : 'plaintext';
}

export function highlightCode(code: string, language: string): string {
  const normalizedLanguage = normalizeCodeLanguage(language);
  const grammar = Prism.languages[normalizedLanguage];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, normalizedLanguage);
}
