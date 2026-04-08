import { describe, expect, it } from 'vitest';
import { detectCodeLanguage, highlightCode, normalizeCodeLanguage, SUPPORTED_CODE_LANGUAGES } from '../codeHighlight';

describe('render/codeHighlight', () => {
  it('supports auto and markdown languages', () => {
    expect(SUPPORTED_CODE_LANGUAGES).toContain('auto');
    expect(SUPPORTED_CODE_LANGUAGES).toContain('markdown');
    expect(normalizeCodeLanguage('auto')).toBe('auto');
    expect(normalizeCodeLanguage('markdown')).toBe('markdown');
  });

  it('detects markdown-like code for auto highlighting', () => {
    const markdown = '# Heading\n\n- one\n- two\n\n[link](https://example.com)';
    expect(detectCodeLanguage(markdown)).toBe('markdown');
    expect(highlightCode(markdown, 'auto')).toContain('token');
  });

  it('keeps markdown as highlighted code instead of parsing it', () => {
    const markdown = '## Heading\n\nParagraph';
    const html = highlightCode(markdown, 'markdown');
    expect(html).toContain('token');
    expect(html).toContain('Heading');
  });
});
