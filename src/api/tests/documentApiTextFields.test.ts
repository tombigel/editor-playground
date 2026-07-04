import { describe, expect, it } from 'vitest';
import { createButtonTextNode, createLinkTextNode, createMediaNode, createTextNode } from '../../model/defaults';
import { createInitialDocument, setTextNodeContentDoc } from '../documentApi';

/**
 * These tests exercise field normalization directly against `setTextNodeContentDoc`
 * (the document API layer). They exist to remove duplication with
 * `src/editor/tests/editorMutations.test.ts`, which previously re-tested this same
 * normalization through the `updateTextField` editor wrapper.
 */

function firstSection(document: ReturnType<typeof createInitialDocument>) {
  const section = Object.values(document.nodes).find(
    (node) => node.contentType === 'container' && node.subtype === 'section',
  );
  if (!section || section.contentType !== 'container') {
    throw new Error('Expected section wrapper');
  }
  return section;
}

function addNode<T extends { id: string }>(document: ReturnType<typeof createInitialDocument>, sectionId: string, node: T) {
  document.nodes[node.id] = node as never;
  const section = document.nodes[sectionId];
  if (section.contentType !== 'container') {
    throw new Error('Expected section wrapper');
  }
  section.children.push(node.id);
  return node;
}

describe('api/documentApi text field normalization', () => {
  it('returns the identical document reference when the target node is the site root', () => {
    const document = createInitialDocument();
    const next = setTextNodeContentDoc(document, document.rootId, 'name', 'Foo');
    expect(next).toBe(document);
  });

  it('normalizes an unsupported htmlTag value to p', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const next = setTextNodeContentDoc(document, text.id, 'htmlTag', 'span' as never);
    const node = next.nodes[text.id];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(node.htmlTag).toBe('p');
  });

  it('clears text color when an empty string is given', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const withColor = setTextNodeContentDoc(document, text.id, 'color', '#ff0000');
    const cleared = setTextNodeContentDoc(withColor, text.id, 'color', '');
    const node = cleared.nodes[text.id];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(node.style?.color).toBeUndefined();
  });

  it('clamps fontWeight into the 100-900 range and rejects non-numeric input', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const clamped = setTextNodeContentDoc(document, text.id, 'fontWeight', '1200');
    const clampedNode = clamped.nodes[text.id];
    if (clampedNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(clampedNode.style?.fontWeight).toBe(900);

    const rejected = setTextNodeContentDoc(document, text.id, 'fontWeight', 'bold');
    expect(rejected).toBe(document);
  });

  it('normalizes fontStyle to italic or normal only', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const italic = setTextNodeContentDoc(document, text.id, 'fontStyle', 'italic');
    const italicNode = italic.nodes[text.id];
    if (italicNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(italicNode.style?.fontStyle).toBe('italic');

    const normalized = setTextNodeContentDoc(document, text.id, 'fontStyle', 'oblique');
    const normalizedNode = normalized.nodes[text.id];
    if (normalizedNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(normalizedNode.style?.fontStyle).toBe('normal');
  });

  it('normalizes textDecorationLine to a supported value or none', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const underline = setTextNodeContentDoc(document, text.id, 'textDecorationLine', 'underline');
    const underlineNode = underline.nodes[text.id];
    if (underlineNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(underlineNode.style?.textDecorationLine).toBe('underline');

    const dotted = setTextNodeContentDoc(document, text.id, 'textDecorationLine', 'dotted');
    const dottedNode = dotted.nodes[text.id];
    if (dottedNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(dottedNode.style?.textDecorationLine).toBe('none');
  });

  it('ignores non-positive lineHeight values, leaving the prior value untouched', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const withLineHeight = setTextNodeContentDoc(document, text.id, 'lineHeight', '1.5');
    const rejected = setTextNodeContentDoc(withLineHeight, text.id, 'lineHeight', '-2');
    const node = rejected.nodes[text.id];
    if (node.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(node.style?.lineHeight).toBe(1.5);
    expect(rejected).toBe(withLineHeight);
  });

  it('defaults direction to ltr for unknown values', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const rtl = setTextNodeContentDoc(document, text.id, 'direction', 'rtl');
    const rtlNode = rtl.nodes[text.id];
    if (rtlNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(rtlNode.style?.direction).toBe('rtl');

    const fallback = setTextNodeContentDoc(document, text.id, 'direction', 'bidi');
    const fallbackNode = fallback.nodes[text.id];
    if (fallbackNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(fallbackNode.style?.direction).toBe('ltr');
  });

  it('accepts center and right textAlign and defaults unknown values to left', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const centered = setTextNodeContentDoc(document, text.id, 'textAlign', 'center');
    const centeredNode = centered.nodes[text.id];
    if (centeredNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(centeredNode.style?.textAlign).toBe('center');

    const right = setTextNodeContentDoc(document, text.id, 'textAlign', 'right');
    const rightNode = right.nodes[text.id];
    if (rightNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(rightNode.style?.textAlign).toBe('right');

    const fallback = setTextNodeContentDoc(document, text.id, 'textAlign', 'justify');
    const fallbackNode = fallback.nodes[text.id];
    if (fallbackNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(fallbackNode.style?.textAlign).toBe('left');
  });

  it('clears openInNewTab when a non-true value is given', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const link = addNode(document, section.id, createLinkTextNode(section.id));

    const opened = setTextNodeContentDoc(document, link.id, 'openInNewTab', 'true');
    const closed = setTextNodeContentDoc(opened, link.id, 'openInNewTab', 'false');
    const node = closed.nodes[link.id];
    if (node.contentType !== 'text' || node.link == null) {
      throw new Error('Expected link node');
    }
    expect(node.link.openInNewTab).toBeUndefined();
  });

  it('updates paddingBlock and paddingInline on a button leaf', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const button = addNode(document, section.id, createButtonTextNode(section.id));

    const withPaddingBlock = setTextNodeContentDoc(document, button.id, 'paddingBlock', '12px');
    const withPaddingInline = setTextNodeContentDoc(withPaddingBlock, button.id, 'paddingInline', '24px');
    const node = withPaddingInline.nodes[button.id];
    if (node.contentType !== 'text' || node.link == null) {
      throw new Error('Expected button node');
    }
    expect(node.style?.paddingBlock?.raw).toBe('12px');
    expect(node.style?.paddingInline?.raw).toBe('24px');
  });

  it('updates borderColor and borderWidth on an image leaf', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const image = addNode(document, section.id, createMediaNode('image', section.id));

    const withColor = setTextNodeContentDoc(document, image.id, 'borderColor', '#000');
    const withWidth = setTextNodeContentDoc(withColor, image.id, 'borderWidth', '2px');
    const node = withWidth.nodes[image.id];
    if (node.contentType !== 'media') {
      throw new Error('Expected image node');
    }
    expect(node.style?.borderColor).toBe('#000');
    expect(node.style?.borderWidth?.raw).toBe('2px');
  });

  it('updates shadowOffsetX and ignores non-finite shadow length values', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const text = addNode(document, section.id, createTextNode('block', section.id));

    const withOffsetX = setTextNodeContentDoc(document, text.id, 'shadowOffsetX', '2');
    const offsetNode = withOffsetX.nodes[text.id];
    if (offsetNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(offsetNode.style?.shadowOffsetX).toBe(2);

    const rejected = setTextNodeContentDoc(document, text.id, 'shadowBlur', 'abc');
    expect(rejected).toBe(document);
  });

  it('clears anchorTargetId when an empty string is given', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const link = addNode(document, section.id, createLinkTextNode(section.id));

    const withTarget = setTextNodeContentDoc(document, link.id, 'anchorTargetId', 'section_5');
    const cleared = setTextNodeContentDoc(withTarget, link.id, 'anchorTargetId', '');
    const node = cleared.nodes[link.id];
    if (node.contentType !== 'text' || node.link == null) {
      throw new Error('Expected link node');
    }
    expect(node.link.anchorTargetId).toBeUndefined();
  });
});
