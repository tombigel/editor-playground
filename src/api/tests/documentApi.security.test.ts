import { describe, expect, it } from 'vitest';
import { createTextNode } from '../../model/defaults';
import { createTextDocumentFromCode, getSingleCodeBlockContent } from '../../model/richContent';
import { createInitialDocument, parseDocumentJson } from '../documentApi';

const highlightPayloads = [
  ['script tag', '<script>alert(1)</script>'],
  ['event handler attribute', '<span onclick="alert(1)">const</span>'],
  ['image error handler', '<img src=x onerror=alert(1)>'],
  ['svg-like payload', '<svg><animate onbegin=alert(1) attributeName=x /></svg>'],
  ['benign prism span cache', '<span class="token keyword">const</span> attacker = true;'],
] as const;

function makeDocumentWithImportedHighlight(highlightedHtml: string) {
  const document = createInitialDocument();
  const root = document.nodes[document.rootId];
  if (root.contentType !== 'site') {
    throw new Error('Expected site root');
  }
  const sectionId = root.children.find((id) => document.nodes[id]?.contentType === 'container');
  if (!sectionId) {
    throw new Error('Expected section');
  }

  const code = createTextNode('code', sectionId);
  code.content = createTextDocumentFromCode('let safe = 1;', {
    language: 'typescript',
    highlightedHtml,
  });
  code.code = {
    language: 'typescript',
    theme: 'dark',
    highlightedHtml,
  };
  document.nodes[code.id] = code;
  const section = document.nodes[sectionId];
  if (section.contentType !== 'container') {
    throw new Error('Expected section wrapper');
  }
  section.children.push(code.id);
  return { document, codeId: code.id };
}

describe('documentApi import security', () => {
  it.each(highlightPayloads)('strips imported highlightedHtml payload: %s', (_name, highlightedHtml) => {
    const { document, codeId } = makeDocumentWithImportedHighlight(highlightedHtml);

    const parsed = parseDocumentJson(JSON.stringify(document));
    const parsedCode = parsed.nodes[codeId];
    if (parsedCode.contentType !== 'text') {
      throw new Error('Expected code text node');
    }

    expect(parsedCode.code?.highlightedHtml).toBeUndefined();
    expect(getSingleCodeBlockContent(parsedCode.content)?.highlightedHtml).toBeUndefined();
  });
});
