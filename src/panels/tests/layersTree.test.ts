import { describe, expect, it } from 'vitest';
import { createInitialDocument, createTextNode, createButtonTextNode, createContainerNode } from '../../model/defaults';
import {
  buildLayersTreeRows,
  isLayersNodeDraggable,
  resolveLayersDropTarget,
} from '../layersTree';

describe('panels/layersTree', () => {
  it('keeps hidden nodes in the layers tree when their ancestors are expanded', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const container = createContainerNode('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const hiddenLeaf = createTextNode('block', container.id);
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
      (node) => node.contentType === 'container' && node.subtype === 'header',
    );
    const footer = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'footer',
    );
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (
      !header ||
      header.contentType !== 'container' ||
      !footer ||
      footer.contentType !== 'container' ||
      !section ||
      section.contentType !== 'container'
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

    const headerRow = rows.find((row) => row.node.contentType === 'container' && row.node.subtype === 'header');
    const sectionRow = rows.find((row) => row.node.contentType === 'container' && row.node.subtype === 'section');
    const footerRow = rows.find((row) => row.node.contentType === 'container' && row.node.subtype === 'footer');

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
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const footer = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'footer',
    );

    if (!section || section.contentType !== 'container' || !footer || footer.contentType !== 'container') {
      throw new Error('Expected section and footer wrappers');
    }

    const container = createContainerNode('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const leaf = createButtonTextNode(section.id);
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
