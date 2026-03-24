import { describe, expect, it } from 'vitest';
import { createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import {
  buildLayersTreeRows,
  isLayersNodeDraggable,
  resolveLayersDropTarget,
} from '../layersTree';

describe('panels/layersTree', () => {
  it('keeps hidden nodes in the layers tree when their ancestors are expanded', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const hiddenLeaf = createLeaf('text', container.id);
    hiddenLeaf.visible = false;
    document.nodes[hiddenLeaf.id] = hiddenLeaf;
    container.children.push(hiddenLeaf.id);

    const rows = buildLayersTreeRows(
      document,
      [],
      new Set([section.id, container.id]),
    );

    expect(rows.map((row) => row.id)).toContain(hiddenLeaf.id);
    expect(rows.find((row) => row.id === hiddenLeaf.id)?.node.visible).toBe(false);
  });

  it('marks structural wrappers as draggable in the layers tree', () => {
    const document = createInitialDocument();
    const header = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );
    const footer = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'footer',
    );
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (
      !header ||
      header.type !== 'wrapper' ||
      !footer ||
      footer.type !== 'wrapper' ||
      !section ||
      section.type !== 'wrapper'
    ) {
      throw new Error('Expected structural wrappers');
    }

    expect(isLayersNodeDraggable(header)).toBe(true);
    expect(isLayersNodeDraggable(section)).toBe(true);
    expect(isLayersNodeDraggable(footer)).toBe(true);
  });

  it('marks divider boundaries between top-level header, sections, and footer groups', () => {
    const document = createInitialDocument();
    const rows = buildLayersTreeRows(document, [], new Set());

    const headerRow = rows.find((row) => row.node.type === 'wrapper' && row.node.role === 'header');
    const sectionRow = rows.find((row) => row.node.type === 'wrapper' && row.node.role === 'section');
    const footerRow = rows.find((row) => row.node.type === 'wrapper' && row.node.role === 'footer');

    if (!headerRow || !sectionRow || !footerRow) {
      throw new Error('Expected top-level structural rows');
    }

    expect(headerRow.dividerBefore).toBe(false);
    expect(sectionRow.dividerBefore).toBe(true);
    expect(footerRow.dividerBefore).toBe(true);
  });

  it('resolves inside wrapper drops and root structural reordering targets', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    const footer = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'footer',
    );

    if (!section || section.type !== 'wrapper' || !footer || footer.type !== 'wrapper') {
      throw new Error('Expected section and footer wrappers');
    }

    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const leaf = createLeaf('button', section.id);
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    expect(resolveLayersDropTarget(document, leaf.id, container.id, 'inside')).toEqual({
      targetParentId: container.id,
      targetIndex: 0,
    });
    expect(resolveLayersDropTarget(document, footer.id, section.id, 'before')).toEqual({
      targetParentId: document.rootId,
      targetIndex: 1,
    });
  });
});
