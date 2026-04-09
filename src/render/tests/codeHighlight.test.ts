import { describe, expect, it } from 'vitest';
import { highlightCode, normalizeCodeLanguage, SUPPORTED_CODE_LANGUAGES } from '../codeHighlight';

describe('render/codeHighlight', () => {
  it('supports markdown as an explicit code language', () => {
    expect(SUPPORTED_CODE_LANGUAGES).toContain('markdown');
    expect(normalizeCodeLanguage('markdown')).toBe('markdown');
  });

  it('normalizes unsupported languages to plaintext', () => {
    expect(normalizeCodeLanguage('auto')).toBe('plaintext');
    expect(normalizeCodeLanguage('unsupported-language')).toBe('plaintext');
  });

  it('keeps markdown as highlighted code instead of parsing it', () => {
    const markdown = '## Heading\n\nParagraph';
    const html = highlightCode(markdown, 'markdown');
    expect(html).toContain('token');
    expect(html).toContain('Heading');
  });
});
