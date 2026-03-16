import { describe, expect, it } from 'vitest';
import { createInitialDocument, createLeaf, createWrapper } from '../defaults';
import { getMainWrappers } from '../selectors';
import { validateDocument } from '../validation';

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

  it('rejects documents with a missing root node', () => {
    const document = createInitialDocument();
    const rootId = document.rootId;

    delete document.nodes[rootId];

    expect(validateDocument(document)).toContain(`Missing root node ${rootId}.`);
  });

  it('rejects documents whose root is not a site node', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];

    document.rootId = firstSection.id;

    const errors = validateDocument(document);
    expect(errors).toContain(`Root node ${firstSection.id} must be a site.`);
  });

  it('rejects parents that reference missing child ids', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    root.children.push('missing_child');

    const errors = validateDocument(document);
    expect(errors).toContain(`Node ${root.id} references missing child missing_child.`);
  });

  it('rejects children that do not point back to their parent', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const childId = section.children[0];
    const child = document.nodes[childId];
    if (!child || child.type === 'site') {
      throw new Error('Expected section child');
    }

    child.parentId = document.rootId;

    const errors = validateDocument(document);
    expect(errors).toContain(`Child ${childId} does not point back to parent ${section.id}.`);
  });

  it('rejects parents that are missing an existing child back-reference', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const childId = section.children[0];
    const child = document.nodes[childId];
    if (!child || child.type === 'site') {
      throw new Error('Expected section child');
    }

    child.parentId = document.rootId;
    section.children = section.children.filter((id) => id !== childId);

    const errors = validateDocument(document);
    expect(errors).toContain(`Parent ${document.rootId} is missing child ${childId}.`);
  });

  it('rejects duplicate child ids and unreachable orphan nodes', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const duplicateId = root.children[0];
    root.children.push(duplicateId);

    const orphan = createWrapper('container', root.id);
    document.nodes[orphan.id] = orphan;

    const errors = validateDocument(document);
    expect(errors).toContain(`Node ${root.id} references child ${duplicateId} more than once.`);
    expect(errors).toContain(`Node ${orphan.id} is unreachable from root ${document.rootId}.`);
  });

  it('rejects cycles in the node graph', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    container.children.push(section.id);
    section.parentId = container.id;

    const errors = validateDocument(document);
    expect(errors).toContain(`Cycle detected at node ${section.id}.`);
  });
});
