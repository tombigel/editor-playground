import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createTextDocumentFromCode } from '../../model/richContent';
import { renderLeafContent } from '../nodePresentation';

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

function expectSafeRecomputedCode(markup: string, forbidden: readonly string[]) {
  expect(markup).toContain('<span class="token keyword">let</span>');
  expect(markup).not.toContain('<span class="token keyword">const</span> attacker');
  for (const token of forbidden) {
    expect(markup).not.toContain(token);
  }
}

describe('render/nodePresentation security', () => {
  it.each(highlightPayloads)('recomputes standalone code HTML for $name', ({ highlightedHtml, forbidden }) => {
    const code = createTextNode('code', 'root');
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

    expectSafeRecomputedCode(renderToStaticMarkup(renderLeafContent(code)), forbidden);
  });

  it.each(highlightPayloads)('recomputes rich code HTML for $name', ({ highlightedHtml, forbidden }) => {
    const rich = createTextNode('rich', 'root');
    rich.content = createTextDocumentContent([
      {
        type: 'code-block',
        language: 'typescript',
        theme: 'dark',
        highlightedHtml,
        children: [{ type: 'code-line', children: [{ text: 'let safe = 1;' }] }],
      },
    ]);

    expectSafeRecomputedCode(renderToStaticMarkup(renderLeafContent(rich)), forbidden);
  });
});
