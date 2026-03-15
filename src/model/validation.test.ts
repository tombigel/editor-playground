import { describe, expect, it } from 'vitest';
import { createInitialDocument, createLeaf, createWrapper } from './defaults';
import { getMainWrappers } from './selectors';
import { validateDocument } from './validation';

describe('model/validation', () => {
  it('accepts the default document', () => {
    const document = createInitialDocument();
    expect(validateDocument(document)).toEqual([]);
  });

  it('rejects multiple headers', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];
    firstSection.role = 'header';

    const errors = validateDocument(document);
    expect(errors).toContain('Only one header is allowed.');
  });

  it('rejects leaf nodes with children', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];
    const leafId = firstSection.children.find((id) => document.nodes[id]?.type === 'leaf');
    expect(leafId).toBeTruthy();
    if (!leafId) {
      return;
    }

    document.nodes[leafId].children.push('fake_child');
    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Leaf ${leafId} cannot contain children.`))).toBe(true);
  });

  it('rejects container as direct site child', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const container = createWrapper('container', root.id);
    document.nodes[container.id] = container;
    root.children.push(container.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Site cannot directly contain container ${container.id}.`))).toBe(true);
  });

  it('rejects nested site-section wrappers', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const nestedSection = createWrapper('section', section.id);
    document.nodes[nestedSection.id] = nestedSection;
    section.children.push(nestedSection.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`${section.role} ${section.id} cannot contain section ${nestedSection.id}.`))).toBe(true);
  });

  it('rejects site containing leaves', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }
    const rogueLeaf = createLeaf('text', root.id);
    document.nodes[rogueLeaf.id] = rogueLeaf;
    root.children.push(rogueLeaf.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Site can only contain wrappers, found ${rogueLeaf.id}.`))).toBe(true);
  });
});
