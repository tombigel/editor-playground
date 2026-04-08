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
  'auto',
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function normalizeCodeLanguage(language: string): string {
  if (language === 'auto' || language === 'plaintext' || language === 'markdown') {
    return language;
  }
  return Prism.languages[language] ? language : 'plaintext';
}

export function detectCodeLanguage(code: string): string {
  const trimmed = code.trim();
  if (trimmed === '') {
    return 'plaintext';
  }

  if (
    /^#{1,6}\s/m.test(trimmed) ||
    /^\s*[-*+]\s+/m.test(trimmed) ||
    /^\s*\d+\.\s+/m.test(trimmed) ||
    /^\s*>+\s?/m.test(trimmed) ||
    /```/.test(trimmed) ||
    /\[[^\]]+\]\([^)]+\)/.test(trimmed)
  ) {
    return 'markdown';
  }

  if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {}
  }

  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return 'markup';
  }

  if (/^#!.*\b(bash|sh|zsh)\b/m.test(trimmed) || /\b(echo|fi|then|done|export)\b/.test(trimmed)) {
    return 'bash';
  }

  if (/\b(def|from|import|lambda|None|True|False)\b/.test(trimmed)) {
    return 'python';
  }

  if (/\b(fn|let mut|impl|match|Some|None|Result<)\b/.test(trimmed)) {
    return 'rust';
  }

  if (/\b(public class|System\.out|new [A-Z][A-Za-z0-9_]*\(|package [a-z])/m.test(trimmed)) {
    return 'java';
  }

  if (/\b(namespace|using\s+[A-Z]|Console\.WriteLine|public\s+(class|record|interface))\b/.test(trimmed)) {
    return 'csharp';
  }

  if (/\b(interface|type)\s+[A-Z_a-z][A-Za-z0-9_]*\b/.test(trimmed) || /:\s*(string|number|boolean|unknown|never|void)\b/.test(trimmed)) {
    return 'typescript';
  }

  if (/\b(function|const|let|var|=>)\b/.test(trimmed)) {
    return 'javascript';
  }

  return 'plaintext';
}

export function highlightCode(code: string, language: string): string {
  const normalizedLanguage = normalizeCodeLanguage(language);
  const resolvedLanguage = normalizedLanguage === 'auto'
    ? detectCodeLanguage(code)
    : normalizedLanguage;
  const grammar = Prism.languages[resolvedLanguage];
  if (!grammar) return escapeHtml(code);
  return Prism.highlight(code, grammar, resolvedLanguage);
}
