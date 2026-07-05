import { describe, expect, it } from 'vitest';
import { createMediaNode } from '../../model/defaults';
import type { ContainerNode } from '../../model/types';
import { createInitialDocument, setWrapperStyleFieldDoc } from '../documentApi';

function firstSection(document: ReturnType<typeof createInitialDocument>): ContainerNode {
  const section = Object.values(document.nodes).find(
    (node) => node.contentType === 'container' && node.subtype === 'section',
  );
  if (!section || section.contentType !== 'container') {
    throw new Error('Expected section wrapper');
  }
  return section;
}

function getContainer(document: ReturnType<typeof createInitialDocument>, id: string): ContainerNode {
  const node = document.nodes[id];
  if (!node || node.contentType !== 'container') {
    throw new Error(`Expected container ${id}`);
  }
  return node;
}

describe('api/documentApi setWrapperStyleFieldDoc', () => {
  it('returns the same document for non-container nodes', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const image = createMediaNode('image', section.id);
    document.nodes[image.id] = image;
    section.children.push(image.id);

    expect(setWrapperStyleFieldDoc(document, image.id, 'background', '#fff')).toBe(document);
  });

  it('stores gradient text verbatim and rejects non-gradient values', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const gradient = 'linear-gradient(45deg, rgba(255,0,0,0.4) 0%, var(--brand) 100%)';

    const withGradient = setWrapperStyleFieldDoc(document, section.id, 'backgroundGradient', gradient);
    expect(getContainer(withGradient, section.id).style?.backgroundGradient).toBe(gradient);

    expect(setWrapperStyleFieldDoc(withGradient, section.id, 'backgroundGradient', '#ff0000')).toBe(withGradient);

    const cleared = setWrapperStyleFieldDoc(withGradient, section.id, 'backgroundGradient', '');
    expect(getContainer(cleared, section.id).style?.backgroundGradient).toBeUndefined();
  });

  it('seeds a background size when a repeating gradient is enabled', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);

    const next = setWrapperStyleFieldDoc(
      document,
      section.id,
      'backgroundGradient',
      'repeating-linear-gradient(45deg, red 0px, blue 20px)',
    );

    expect(getContainer(next, section.id).style?.backgroundSize).toBe('40px 40px');
  });

  it('updates clip-text, spacing, border, and shadow fields', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);

    let next = setWrapperStyleFieldDoc(document, section.id, 'backgroundClipText', 'true');
    next = setWrapperStyleFieldDoc(next, section.id, 'paddingLeft', '16px');
    next = setWrapperStyleFieldDoc(next, section.id, 'borderRadius', '12px');
    next = setWrapperStyleFieldDoc(next, section.id, 'shadowBlur', '10');

    const node = getContainer(next, section.id);
    expect(node.style?.backgroundClipText).toBe(true);
    expect(node.style?.paddingLeft?.raw).toBe('16px');
    expect(node.style?.borderRadius?.raw).toBe('12px');
    expect(node.style?.shadowBlur).toBe(10);
  });
});
