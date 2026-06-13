import { describe, expect, it } from 'vitest';
import { createInitialDocument, createTextNode } from '../../model/defaults';
import { createTextDocumentFromCode } from '../../model/richContent';
import { renderSiteHtmlDocument } from '../siteExport';

const highlightPayloads = [
  {
    name: 'script tag',
    highlightedHtml: '<script>alert(1)</script>',
    forbidden: ['<script'],
  },
  {
    name: 'event handler attribute',
    highlightedHtml: '<span onclick="alert(1)">const</span>',
    forbidden: ['onclick'],
  },
  {
    name: 'image error handler',
    highlightedHtml: '<img src=x onerror=alert(1)>',
    forbidden: ['src=x', 'onerror'],
  },
  {
    name: 'svg-like payload',
    highlightedHtml: '<svg><animate onbegin=alert(1) attributeName=x /></svg>',
    forbidden: ['<svg', 'onbegin'],
  },
  {
    name: 'benign prism span cache',
    highlightedHtml: '<span class="token keyword">const</span> attacker = true;',
    forbidden: ['attacker'],
  },
] as const;

function exportDocumentWithHighlightedHtml(highlightedHtml: string) {
  const document = structuredClone(createInitialDocument());
  const section = Object.values(document.nodes).find(
    (node) => node.contentType === 'container' && node.subtype === 'section',
  );
  if (!section || section.contentType !== 'container') {
    throw new Error('Expected section wrapper');
  }

  const code = createTextNode('code', section.id);
  code.id = `code_security_${section.children.length}`;
  code.content = createTextDocumentFromCode('let safe = 1;', {
    language: 'typescript',
    theme: 'dark',
    highlightedHtml,
  });
  code.code = {
    language: 'typescript',
    theme: 'dark',
    highlightedHtml,
  };
  document.nodes[code.id] = code;
  section.children.push(code.id);
  return renderSiteHtmlDocument(document);
}

describe('site export security', () => {
  it.each(highlightPayloads)('exports recomputed code HTML for $name', ({ highlightedHtml, forbidden }) => {
    const html = exportDocumentWithHighlightedHtml(highlightedHtml);

    expect(html).toContain('<span class="token keyword">let</span>');
    expect(html).not.toContain('<span class="token keyword">const</span> attacker');
    for (const token of forbidden) {
      expect(html).not.toContain(token);
    }
  });
});
