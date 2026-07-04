import { describe, expect, it } from 'vitest';
import { getSingleTextBlockContent, getTextContent } from '../../model/richContent';
import { createContainerNode, createDefaultRect, createTextNode } from '../../model/defaults';
import { createInitialState } from '../editorPersistence';
import {
  alignNodes,
  cancelPromoteWrapperRole,
  confirmPromoteWrapperRole,
  deleteNode,
  deleteNodes,
  demoteWrapperRole,
  distributeNodes,
  getValidationErrors,
  importDocument,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  moveNode,
  moveNodes,
  nudgeNode,
  reparentNode,
  reparentNodes,
  reorderNode,
  reorderNodes,
  requestPromoteWrapperRole,
  resizeNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
} from '../editorMutations';
import type { EditorState } from '../types';
import type { ContainerNode, DocumentNode, NodeId } from '../../model/types';

function getRoot(document: EditorState['document']) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    throw new Error('Expected site root');
  }
  return root;
}

function createKeyboardNudgeExpansionState() {
  const state = createInitialState();
  const document = structuredClone(state.document);
  const root = getRoot(document);
  const sectionId = root.children.find((id) => {
    const node = document.nodes[id];
    return node?.contentType === 'container' && node.subtype === 'section';
  });
  if (!sectionId) {
    throw new Error('Expected section');
  }
  const parent = createContainerNode('container', sectionId);
  parent.rect = createDefaultRect('40px', '40px', '240px', '120px');
  const leaf = createTextNode('block', parent.id);
  leaf.rect = createDefaultRect('20px', '110px', '80px', '40px');
  parent.children = [leaf.id];
  document.nodes[parent.id] = parent;
  document.nodes[leaf.id] = leaf;
  document.nodes[sectionId].children.push(parent.id);
  return {
    state: { ...state, document },
    parentId: parent.id,
    leafId: leaf.id,
  };
}

function findNodeByRole(state: EditorState, type: string, role: string) {
  const contentType = type === 'wrapper' ? 'container' : 'text';
  return Object.values(state.document.nodes).find(
    (node) => node.contentType === contentType && (node as any).subtype === role,
  );
}


function findSections(state: EditorState): ContainerNode[] {
  return Object.values(state.document.nodes).filter(
    (node): node is ContainerNode => node.contentType === 'container' && node.subtype === 'section',
  );
}

describe('editor/editorMutations', () => {
  // ---------------------------------------------------------------------------
  // insertWrapper
  // ---------------------------------------------------------------------------
  describe('insertWrapper', () => {
    it('inserts a section wrapper at the root level', () => {
      const state = createInitialState();
      const rootBefore = getRoot(state.document);
      const childCountBefore = rootBefore.children.length;

      const next = insertWrapper(state, 'section');
      const rootAfter = getRoot(next.document);

      expect(rootAfter.children.length).toBe(childCountBefore + 1);
      expect(next.selectedId).toBeTruthy();
      const inserted = next.document.nodes[next.selectedId!];
      expect(inserted.contentType).toBe('container');
      if (inserted.contentType === 'container') {
        expect(inserted.subtype).toBe('section');
      }
    });

    it('inserts a container wrapper into the first section when nothing is selected', () => {
      const state = createInitialState();
      const next = insertWrapper(state, 'container');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).toBe('container');
      if (inserted.contentType === 'container') {
        expect(inserted.subtype).toBe('container');
        expect(inserted.parentId).toBeTruthy();
        const parent = next.document.nodes[inserted.parentId!];
        expect(parent.contentType).toBe('container');
      }
    });

    it('inserts a container wrapper into the selected wrapper', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const withSelection: EditorState = { ...state, selectedId: section.id, selectedIds: [section.id] };
      const next = insertWrapper(withSelection, 'container');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).toBe('container');
      if (inserted.contentType === 'container') {
        expect(inserted.subtype).toBe('container');
        expect(inserted.parentId).toBe(section.id);
      }
    });

    it('inserts a header wrapper at root level', () => {
      const state = createInitialState();
      const next = insertWrapper(state, 'header');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).toBe('container');
      if (inserted.contentType === 'container') {
        expect(inserted.subtype).toBe('header');
      }
    });

    it('inserts a footer wrapper at root level', () => {
      const state = createInitialState();
      const next = insertWrapper(state, 'footer');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).toBe('container');
      if (inserted.contentType === 'container') {
        expect(inserted.subtype).toBe('footer');
      }
    });

    it('selects the newly inserted wrapper', () => {
      const state = createInitialState();
      const next = insertWrapper(state, 'section');

      expect(next.selectedId).toBeTruthy();
      expect(next.selectedIds).toContain(next.selectedId);
    });
  });

  // ---------------------------------------------------------------------------
  // insertLeaf
  // ---------------------------------------------------------------------------
  describe('insertLeaf', () => {
    it('inserts a text leaf into the first section when nothing is selected', () => {
      const state = createInitialState();
      const next = insertLeaf(state, 'text');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).not.toBe('container');
      if (inserted.contentType !== 'container' && inserted.contentType !== 'site') {
        expect(inserted.subtype).toBe('block');
      }
    });

    it('inserts an image leaf', () => {
      const state = createInitialState();
      const next = insertLeaf(state, 'image');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).not.toBe('container');
      if (inserted.contentType !== 'container' && inserted.contentType !== 'site') {
        expect(inserted.subtype).toBe('image');
      }
    });

    it('inserts a list leaf', () => {
      const state = createInitialState();
      const next = insertLeaf(state, 'list');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).not.toBe('container');
      if (inserted.contentType !== 'container' && inserted.contentType !== 'site') {
        expect(inserted.subtype).toBe('list');
      }
    });

    it('inserts a link leaf', () => {
      const state = createInitialState();
      const next = insertLeaf(state, 'link');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).not.toBe('container');
      if (inserted.contentType !== 'container' && inserted.contentType !== 'site' && inserted.contentType !== 'media') {
        expect(inserted.subtype).toBe('block');
        expect(inserted.link).toMatchObject({ linkType: 'anchor', href: '#' });
        expect(inserted.htmlTag).toBe('div');
        expect(getSingleTextBlockContent(inserted.content)?.type).toBe('div');
      }
    });

    it('inserts a button leaf', () => {
      const state = createInitialState();
      const next = insertLeaf(state, 'button');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).not.toBe('container');
      if (inserted.contentType !== 'container' && inserted.contentType !== 'site') {
        expect(inserted.subtype).toBe('block');
      }
    });

    it('inserts a leaf into the selected wrapper', () => {
      const state = createInitialState();
      const container = insertWrapper(state, 'container');
      const containerId = container.selectedId!;

      const next = insertLeaf(container, 'text');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.parentId).toBe(containerId);
    });

    it('inserts a leaf beside the selected leaf (same parent)', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const firstLeafId = withLeaf.selectedId!;
      const firstLeafParent = withLeaf.document.nodes[firstLeafId].parentId;

      const withSecondLeaf = insertLeaf(withLeaf, 'text');
      const secondLeaf = withSecondLeaf.document.nodes[withSecondLeaf.selectedId!];

      expect(secondLeaf.parentId).toBe(firstLeafParent);
    });
  });

  // ---------------------------------------------------------------------------
  // insertSectionTemplate
  // ---------------------------------------------------------------------------
  describe('insertSectionTemplate', () => {
    it('inserts after the selected section when a descendant is selected', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section || section.contentType !== 'container' || section.children.length === 0) {
        throw new Error('Expected section with content');
      }

      const withSelection: EditorState = {
        ...state,
        selectedId: section.children[0],
        selectedIds: [section.children[0]],
      };
      const rootBefore = getRoot(withSelection.document);

      const next = insertSectionTemplate(withSelection, 'blank');
      const rootAfter = getRoot(next.document);

      expect(rootAfter.children.indexOf(next.selectedId!)).toBe(rootBefore.children.indexOf(section.id) + 1);
    });

    it('inserts a post section template', () => {
      const state = createInitialState();
      const next = insertSectionTemplate(state, 'post');
      const inserted = next.document.nodes[next.selectedId!];

      expect(inserted.contentType).toBe('container');
      if (inserted.contentType === 'container') {
        expect(inserted.subtype).toBe('section');
      }
    });

    it('selects the newly inserted section', () => {
      const state = createInitialState();
      const next = insertSectionTemplate(state, 'blank');

      expect(next.selectedId).toBeTruthy();
      expect(next.selectedIds).toEqual([next.selectedId]);
    });
  });

  // ---------------------------------------------------------------------------
  // updateTextField
  // ---------------------------------------------------------------------------
  describe('updateTextField', () => {
    it('delegates to the document API and returns a new editor state with the updated document', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateTextField(withLeaf, leafId, 'name', 'New Name');
      expect(next.document.nodes[leafId].name).toBe('New Name');
      expect(next.document).not.toBe(withLeaf.document);
    });

    it('returns the same state reference when the document API reports no change', () => {
      const state = createInitialState();

      const forSiteNode = updateTextField(state, state.document.rootId, 'name', 'Foo');
      expect(forSiteNode).toBe(state);

      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;
      const forStaleField = updateTextField(withLeaf, leafId, 'fontWeight', 'bold');
      expect(forStaleField).toBe(withLeaf);
    });

    it('normalizes document font state after a fontFamily edit registers the used family', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateTextField(withLeaf, leafId, 'fontFamily', 'JetBrains Mono');
      expect(next.document.fontLibrary.usedFamilies.some((family) => family.family === 'JetBrains Mono')).toBe(true);
    });

    it('updates a representative text field end-to-end through the wrapper', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateTextField(withLeaf, leafId, 'content', 'Hello world');
      const node = next.document.nodes[leafId];
      if (node.contentType === 'text') {
        expect(getTextContent(node.content.blocks)).toBe('Hello world');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // updateRectField
  // ---------------------------------------------------------------------------
  describe('updateRectField', () => {
    it('updates node x position', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateRectField(withLeaf, leafId, 'x', '100px');
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('100px');
      }
    });

    it('updates node y position', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateRectField(withLeaf, leafId, 'y', '200px');
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.y.base.raw).toBe('200px');
      }
    });

    it('updates node width', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateRectField(withLeaf, leafId, 'width', '300px');
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.width.base.raw).toBe('300px');
      }
    });

    it('updates node height', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateRectField(withLeaf, leafId, 'height', '400px');
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.height.base.raw).toBe('400px');
      }
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      const next = updateRectField(state, state.document.rootId, 'x', '10px');
      expect(next).toBe(state);
    });

    it('returns unchanged state for a stale node id', () => {
      const state = createInitialState();
      const next = updateRectField(state, 'missing_node', 'x', '10px');
      expect(next).toBe(state);
    });
  });

  // ---------------------------------------------------------------------------
  // updateStickyField
  // ---------------------------------------------------------------------------
  describe('updateStickyField', () => {
    it('creates sticky definition with defaults when none exists', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateStickyField(withLeaf, leafId, { enabled: true });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.sticky).toBeTruthy();
        expect(node.sticky?.enabled).toBe(true);
        expect(node.sticky?.target).toBe('self');
        expect(node.sticky?.edges.top).toBe(true);
        expect(node.sticky?.edges.bottom).toBe(false);
        expect(node.sticky?.durationMode).toBe('auto');
      }
    });

    it('merges partial patch into existing sticky definition', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const withSticky = updateStickyField(withLeaf, leafId, { enabled: true, target: 'self' });
      const next = updateStickyField(withSticky, leafId, { durationMode: 'custom' });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.sticky?.enabled).toBe(true);
        expect(node.sticky?.durationMode).toBe('custom');
      }
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      const next = updateStickyField(state, state.document.rootId, { enabled: true });
      expect(next).toBe(state);
    });

    it('returns unchanged state for a stale node id', () => {
      const state = createInitialState();
      const next = updateStickyField(state, 'missing_node', { enabled: true });
      expect(next).toBe(state);
    });

    it('forces container sticky target to self instead of contentWrapper', () => {
      const state = createInitialState();
      const withContainer = insertWrapper(state, 'container');
      const containerId = withContainer.selectedId!;

      const next = updateStickyField(withContainer, containerId, {
        enabled: true,
        target: 'contentWrapper',
      });
      const node = next.document.nodes[containerId];
      if (node.contentType === 'container') {
        expect(node.sticky?.target).toBe('self');
      }
    });

    it('allows non-container wrappers to use contentWrapper target', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const next = updateStickyField(state, section.id, {
        enabled: true,
        target: 'contentWrapper',
      });
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.sticky?.target).toBe('contentWrapper');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // updateWrapperStyleField
  // ---------------------------------------------------------------------------
  describe('updateWrapperStyleField', () => {
    it('returns unchanged state for non-wrapper node', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = updateWrapperStyleField(withLeaf, leafId, 'background', '#fff');
      expect(next).toBe(withLeaf);
    });

    it('updates sectionBorderBottomWidth', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const next = updateWrapperStyleField(state, section.id, 'sectionBorderBottomWidth', '3px');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.sectionBorderBottomWidth?.raw).toBe('3px');
      }
    });

    it('clears sectionBorderBottomWidth with empty value', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const withWidth = updateWrapperStyleField(state, section.id, 'sectionBorderBottomWidth', '3px');
      const next = updateWrapperStyleField(withWidth, section.id, 'sectionBorderBottomWidth', '');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.sectionBorderBottomWidth).toBeUndefined();
      }
    });

    it('updates wrapper padding fields', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const next = updateWrapperStyleField(state, section.id, 'paddingLeft', '16px');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.paddingLeft?.raw).toBe('16px');
      }
    });

    it('clears wrapper padding with empty value', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const withPad = updateWrapperStyleField(state, section.id, 'paddingTop', '10px');
      const next = updateWrapperStyleField(withPad, section.id, 'paddingTop', '');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.paddingTop).toBeUndefined();
      }
    });

    it('updates wrapper border width and radius', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const withBW = updateWrapperStyleField(state, section.id, 'borderWidth', '2px');
      const withBR = updateWrapperStyleField(withBW, section.id, 'borderRadius', '12px');
      const node = withBR.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.borderWidth?.raw).toBe('2px');
        expect(node.style!.borderRadius?.raw).toBe('12px');
      }
    });

    it('updates wrapper shadow fields', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const withColor = updateWrapperStyleField(state, section.id, 'shadowColor', '#000');
      const withBlur = updateWrapperStyleField(withColor, section.id, 'shadowBlur', '10');
      const node = withBlur.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.shadowColor).toBe('#000');
        expect(node.style!.shadowBlur).toBe(10);
      }
    });

    it('ignores non-finite shadow length for wrapper', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const next = updateWrapperStyleField(state, section.id, 'shadowBlur', 'not-a-number');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.shadowBlur).toBeUndefined();
      }
    });

    it('sets a generic wrapper style field as a string', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const next = updateWrapperStyleField(state, section.id, 'sectionBorderBottomColor', '#abc');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.sectionBorderBottomColor).toBe('#abc');
      }
    });

    it('clears generic wrapper style field with empty value', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section') as ContainerNode;

      const withVal = updateWrapperStyleField(state, section.id, 'sectionBorderBottomColor', '#abc');
      const next = updateWrapperStyleField(withVal, section.id, 'sectionBorderBottomColor', '');
      const node = next.document.nodes[section.id];
      if (node.contentType === 'container') {
        expect(node.style!.sectionBorderBottomColor).toBeUndefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // moveNode
  // ---------------------------------------------------------------------------
  describe('moveNode', () => {
    it('moves a node x and y positions', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = moveNode(withLeaf, leafId, { x: '50px', y: '75px' });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('50px');
        expect(node.rect.y.base.raw).toBe('75px');
      }
    });

    it('moves only x when y is not provided', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const before = withLeaf.document.nodes[leafId];
      const beforeY = before.contentType !== 'site' ? before.rect.y.base.raw : '';

      const next = moveNode(withLeaf, leafId, { x: '100px' });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('100px');
        expect(node.rect.y.base.raw).toBe(beforeY);
      }
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      const next = moveNode(state, state.document.rootId, { x: '10px' });
      expect(next).toBe(state);
    });

    it('returns unchanged state for a stale node id', () => {
      const state = createInitialState();
      const next = moveNode(state, 'missing_node', { x: '10px' });
      expect(next).toBe(state);
    });
  });

  // ---------------------------------------------------------------------------
  // moveNodes
  // ---------------------------------------------------------------------------
  describe('moveNodes', () => {
    it('returns unchanged state for empty moves array', () => {
      const state = createInitialState();
      const next = moveNodes(state, []);
      expect(next).toBe(state);
    });

    it('moves multiple nodes', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const leaf1Id = withLeaf1.selectedId!;
      const withLeaf2 = insertLeaf(withLeaf1, 'text');
      const leaf2Id = withLeaf2.selectedId!;

      const next = moveNodes(withLeaf2, [
        { id: leaf1Id, x: '10px', y: '20px' },
        { id: leaf2Id, x: '30px', y: '40px' },
      ]);

      const node1 = next.document.nodes[leaf1Id];
      const node2 = next.document.nodes[leaf2Id];
      if (node1.contentType !== 'site' && node2.contentType !== 'site') {
        expect(node1.rect.x.base.raw).toBe('10px');
        expect(node1.rect.y.base.raw).toBe('20px');
        expect(node2.rect.x.base.raw).toBe('30px');
        expect(node2.rect.y.base.raw).toBe('40px');
      }
    });

    it('returns unchanged state when all positions are identical', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;
      const node = withLeaf.document.nodes[leafId];
      if (node.contentType === 'site') throw new Error('Expected non-site');

      const next = moveNodes(withLeaf, [
        { id: leafId, x: node.rect.x.base.raw, y: node.rect.y.base.raw },
      ]);
      expect(next).toBe(withLeaf);
    });

    it('skips site nodes in moves', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = moveNodes(withLeaf, [
        { id: state.document.rootId, x: '999px', y: '999px' },
        { id: leafId, x: '50px', y: '50px' },
      ]);

      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('50px');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // nudgeNode
  // ---------------------------------------------------------------------------
  describe('nudgeNode', () => {
    it('nudges a node by pixel delta', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const before = withLeaf.document.nodes[leafId];
      if (before.contentType === 'site') throw new Error('Expected non-site');
      const beforeX = Number.parseFloat(before.rect.x.base.raw);
      const beforeY = Number.parseFloat(before.rect.y.base.raw);

      const next = nudgeNode(withLeaf, leafId, { x: 5, y: 10 });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe(`${beforeX + 5}px`);
        expect(node.rect.y.base.raw).toBe(`${beforeY + 10}px`);
      }
    });

    it('clamps y to zero for large negative deltas', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = nudgeNode(withLeaf, leafId, { x: 0, y: -99999 });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.y.base.raw).toBe('0px');
      }
    });

    it('clamps x to zero for large negative deltas', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = nudgeNode(withLeaf, leafId, { x: -99999, y: 0 });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('0px');
      }
    });

    it('expands anchor-boundary parents when keyboard nudging moves below the bottom edge', () => {
      const { state, parentId, leafId } = createKeyboardNudgeExpansionState();

      const expanded = nudgeNode(state, leafId, { x: 0, y: 20 });
      const expandedLeaf = expanded.document.nodes[leafId];
      const expandedParent = expanded.document.nodes[parentId];
      if (expandedLeaf.contentType === 'site' || expandedParent.contentType !== 'container') {
        throw new Error('Expected leaf and container');
      }
      expect(expandedLeaf.rect.y.base.raw).toBe('130px');
      expect(expandedParent.rect.height.base.raw).toBe('170px');

      const boxState = {
        ...state,
        document: structuredClone(state.document),
      };
      const boxParent = boxState.document.nodes[parentId];
      if (boxParent.contentType !== 'container') {
        throw new Error('Expected parent container');
      }
      boxParent.layout = { childBoundary: 'box' };
      const clamped = nudgeNode(boxState, leafId, { x: 0, y: 20 });
      const clampedLeaf = clamped.document.nodes[leafId];
      const clampedParent = clamped.document.nodes[parentId];
      if (clampedLeaf.contentType === 'site' || clampedParent.contentType !== 'container') {
        throw new Error('Expected leaf and container');
      }
      expect(clampedLeaf.rect.y.base.raw).toBe('80px');
      expect(clampedParent.rect.height.base.raw).toBe('120px');
    });

    it('returns unchanged state for root-level section (parentId === rootId)', () => {
      const state = createInitialState();
      const root = getRoot(state.document);
      const sectionId = root.children.find((id) => {
        const node = state.document.nodes[id];
        return node?.contentType === 'container' && node.subtype === 'section';
      });
      if (!sectionId) throw new Error('Expected section');

      expect(nudgeNode(state, sectionId, { x: 10, y: 10 })).toBe(state);
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      expect(nudgeNode(state, state.document.rootId, { x: 10, y: 10 })).toBe(state);
    });

    it('returns unchanged state for node without parent', () => {
      const state = createInitialState();
      expect(nudgeNode(state, state.document.rootId, { x: 1, y: 1 })).toBe(state);
    });
  });

  // ---------------------------------------------------------------------------
  // resizeNode
  // ---------------------------------------------------------------------------
  describe('resizeNode', () => {
    it('resizes node width', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = resizeNode(withLeaf, leafId, { width: '200px' });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.width.base.raw).toBe('200px');
      }
    });

    it('resizes node height', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = resizeNode(withLeaf, leafId, { height: '150px' });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.height.base.raw).toBe('150px');
      }
    });

    it('resizes both width and height', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = resizeNode(withLeaf, leafId, { width: '300px', height: '250px' });
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.width.base.raw).toBe('300px');
        expect(node.rect.height.base.raw).toBe('250px');
      }
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      const next = resizeNode(state, state.document.rootId, { width: '500px' });
      expect(next).toBe(state);
    });

    it('returns unchanged state for a stale node id', () => {
      const state = createInitialState();
      const next = resizeNode(state, 'missing_node', { width: '500px' });
      expect(next).toBe(state);
    });
  });

  // ---------------------------------------------------------------------------
  // reorderNode
  // ---------------------------------------------------------------------------
  describe('reorderNode', () => {
    it('moves a leaf back by one position', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const _leaf1Id = withLeaf1.selectedId!;
      const withLeaf2 = insertLeaf(withLeaf1, 'text');
      const leaf2Id = withLeaf2.selectedId!;

      const parent = withLeaf2.document.nodes[withLeaf2.document.nodes[leaf2Id].parentId!];
      const indexBefore = parent.children.indexOf(leaf2Id);

      const next = reorderNode(withLeaf2, leaf2Id, 'back');
      const parentAfter = next.document.nodes[parent.id];
      expect(parentAfter.children.indexOf(leaf2Id)).toBe(indexBefore - 1);
    });

    it('moves a leaf forward by one position', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const leaf1Id = withLeaf1.selectedId!;
      const withLeaf2 = insertLeaf(withLeaf1, 'text');
      const _leaf2Id = withLeaf2.selectedId!;

      const parent = withLeaf2.document.nodes[withLeaf2.document.nodes[leaf1Id].parentId!];
      const indexBefore = parent.children.indexOf(leaf1Id);

      const next = reorderNode(withLeaf2, leaf1Id, 'forward');
      const parentAfter = next.document.nodes[parent.id];
      expect(parentAfter.children.indexOf(leaf1Id)).toBe(indexBefore + 1);
    });

    it('sends a leaf to the back', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const withLeaf2 = insertLeaf(withLeaf1, 'text');
      const leaf2Id = withLeaf2.selectedId!;

      const next = reorderNode(withLeaf2, leaf2Id, 'sendToBack');
      const parentId = next.document.nodes[leaf2Id].parentId!;
      const parentAfter = next.document.nodes[parentId];
      expect(parentAfter.children[0]).toBe(leaf2Id);
    });

    it('brings a leaf to the front', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const leaf1Id = withLeaf1.selectedId!;
      const withLeaf2 = insertLeaf(withLeaf1, 'text');

      const next = reorderNode(withLeaf2, leaf1Id, 'bringToFront');
      const parentId = next.document.nodes[leaf1Id].parentId!;
      const parentAfter = next.document.nodes[parentId];
      expect(parentAfter.children[parentAfter.children.length - 1]).toBe(leaf1Id);
    });

    it('returns unchanged state when node is already at the back', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const leaf1Id = withLeaf1.selectedId!;
      insertLeaf(withLeaf1, 'text');

      const next = reorderNode(withLeaf1, leaf1Id, 'back');
      const parentId = withLeaf1.document.nodes[leaf1Id].parentId!;
      const parent = withLeaf1.document.nodes[parentId];
      if (parent.children[0] === leaf1Id) {
        expect(next).toBe(withLeaf1);
      }
    });

    it('returns unchanged state when node is already at the front', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const withLeaf2 = insertLeaf(withLeaf1, 'text');
      const leaf2Id = withLeaf2.selectedId!;

      const next = reorderNode(withLeaf2, leaf2Id, 'forward');
      const parentId = withLeaf2.document.nodes[leaf2Id].parentId!;
      const parent = withLeaf2.document.nodes[parentId];
      if (parent.children[parent.children.length - 1] === leaf2Id) {
        expect(next).toBe(withLeaf2);
      }
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      expect(reorderNode(state, state.document.rootId, 'forward')).toBe(state);
    });

    it('returns unchanged state for section sendToBack/bringToFront', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      expect(reorderNode(state, section.id, 'sendToBack')).toBe(state);
      expect(reorderNode(state, section.id, 'bringToFront')).toBe(state);
    });

    it('swaps sections among sibling sections only', () => {
      const state = createInitialState();
      const s1 = insertSectionTemplate(state, 'blank');
      const s2 = insertSectionTemplate(s1, 'blank');
      const sectionBId = s2.selectedId!;

      const rootBefore = getRoot(s2.document);
      const indexBefore = rootBefore.children.indexOf(sectionBId);

      const next = reorderNode(s2, sectionBId, 'back');
      const rootAfter = getRoot(next.document);
      const indexAfter = rootAfter.children.indexOf(sectionBId);

      expect(indexAfter).toBeLessThan(indexBefore);
    });

    it('does not reorder non-reorderable wrapper roles', () => {
      const state = createInitialState();
      const header = findNodeByRole(state, 'wrapper', 'header');
      if (!header) throw new Error('Expected header');

      // header is not reorderable via reorderNode (it's structural)
      const next = reorderNode(state, header.id, 'forward');
      expect(next).toBe(state);
    });
  });

  // ---------------------------------------------------------------------------
  // reorderNodes
  // ---------------------------------------------------------------------------
  describe('reorderNodes', () => {
    it('delegates to reorderNode for single node', () => {
      const state = createInitialState();
      const withLeaf1 = insertLeaf(state, 'text');
      const _leaf1Id = withLeaf1.selectedId!;
      const withLeaf2 = insertLeaf(withLeaf1, 'text');
      const leaf2Id = withLeaf2.selectedId!;

      const single = reorderNodes(withLeaf2, [leaf2Id], 'back');
      const direct = reorderNode(withLeaf2, leaf2Id, 'back');

      const sParent = single.document.nodes[single.document.nodes[leaf2Id].parentId!];
      const dParent = direct.document.nodes[direct.document.nodes[leaf2Id].parentId!];
      expect(sParent.children.indexOf(leaf2Id)).toBe(dParent.children.indexOf(leaf2Id));
    });

    it('returns unchanged state for empty nodeIds', () => {
      const state = createInitialState();
      expect(reorderNodes(state, [], 'forward')).toBe(state);
    });

    it('returns unchanged state when sections are included in multi-select', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      if (!section) throw new Error('Expected section');
      const next = reorderNodes(withLeaf, [section.id, leafId], 'forward');
      expect(next).toBe(withLeaf);
    });

    it('moves multiple selected nodes back', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const _l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;
      const s3 = insertLeaf(s2, 'text');
      const l3 = s3.selectedId!;

      const parentId = s3.document.nodes[l3].parentId!;
      const parentBefore = s3.document.nodes[parentId];
      const i2Before = parentBefore.children.indexOf(l2);
      const i3Before = parentBefore.children.indexOf(l3);

      const next = reorderNodes(s3, [l2, l3], 'back');
      const parentAfter = next.document.nodes[parentId];
      const i2After = parentAfter.children.indexOf(l2);
      const i3After = parentAfter.children.indexOf(l3);

      expect(i2After).toBeLessThanOrEqual(i2Before);
      expect(i3After).toBeLessThanOrEqual(i3Before);
    });

    it('sends multiple selected nodes to back', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;
      const s3 = insertLeaf(s2, 'text');
      const l3 = s3.selectedId!;

      const next = reorderNodes(s3, [l2, l3], 'sendToBack');
      const parentId = next.document.nodes[l2].parentId!;
      const parentAfter = next.document.nodes[parentId];

      // l2 and l3 should be at the beginning
      const i2 = parentAfter.children.indexOf(l2);
      const i3 = parentAfter.children.indexOf(l3);
      const i1 = parentAfter.children.indexOf(l1);
      expect(i2).toBeLessThan(i1);
      expect(i3).toBeLessThan(i1);
    });

    it('brings multiple selected nodes to front', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;
      const s3 = insertLeaf(s2, 'text');
      const l3 = s3.selectedId!;

      const next = reorderNodes(s3, [l1, l2], 'bringToFront');
      const parentId = next.document.nodes[l1].parentId!;
      const parentAfter = next.document.nodes[parentId];

      const i1 = parentAfter.children.indexOf(l1);
      const i2 = parentAfter.children.indexOf(l2);
      const i3 = parentAfter.children.indexOf(l3);
      expect(i1).toBeGreaterThan(i3);
      expect(i2).toBeGreaterThan(i3);
    });

    it('returns unchanged state when nodes have different parents', () => {
      const state = createInitialState();
      const sections = findSections(state);
      if (sections.length < 2) {
        // Insert a second section to ensure we have two different parents
        const s = insertSectionTemplate(state, 'blank');
        const withLeaf1 = insertLeaf({ ...s, selectedId: sections[0].id, selectedIds: [sections[0].id] }, 'text');
        const l1 = withLeaf1.selectedId!;
        const withLeaf2 = insertLeaf({ ...withLeaf1, selectedId: s.selectedId, selectedIds: [s.selectedId!] }, 'text');
        const l2 = withLeaf2.selectedId!;

        const next = reorderNodes(withLeaf2, [l1, l2], 'forward');
        expect(next).toBe(withLeaf2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // alignNodes
  // ---------------------------------------------------------------------------
  describe('alignNodes', () => {
    it('returns unchanged state for fewer than 2 nodes', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const rects = {
        [leafId]: { left: 10, top: 20, width: 100, height: 50 },
      };

      const next = alignNodes(withLeaf, [leafId], 'left', rects);
      expect(next).toBe(withLeaf);
    });

    it('aligns nodes to left edge of anchor', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 50, top: 10, width: 100, height: 50 },
        [l2]: { left: 200, top: 10, width: 100, height: 50 },
      };

      const next = alignNodes(s2, [l1, l2], 'left', rects);
      const node2 = next.document.nodes[l2];
      if (node2.contentType !== 'site') {
        // l2 should have moved left towards l1
        const newX = Number.parseFloat(node2.rect.x.base.raw);
        expect(newX).toBeLessThan(200);
      }
    });

    it('aligns nodes to right edge of anchor', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 200, top: 10, width: 100, height: 50 },
        [l2]: { left: 50, top: 10, width: 80, height: 50 },
      };

      const next = alignNodes(s2, [l1, l2], 'right', rects);
      const node2 = next.document.nodes[l2];
      if (node2.contentType !== 'site') {
        // l2 right edge should align with l1 right edge (300)
        const newX = Number.parseFloat(node2.rect.x.base.raw);
        expect(newX).toBeGreaterThan(50);
      }
    });

    it('aligns nodes vertically to top edge of anchor', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 10, top: 30, width: 100, height: 50 },
        [l2]: { left: 10, top: 200, width: 100, height: 50 },
      };

      const next = alignNodes(s2, [l1, l2], 'top', rects);
      const node2 = next.document.nodes[l2];
      if (node2.contentType !== 'site') {
        const newY = Number.parseFloat(node2.rect.y.base.raw);
        expect(newY).toBeLessThan(200);
      }
    });

    it('returns unchanged state when anchor rect is missing', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;

      // Provide rect for l2 but not l1 (the anchor)
      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l2]: { left: 10, top: 10, width: 100, height: 50 },
      };

      const next = alignNodes(s2, [l1, l2], 'left', rects);
      expect(next).toBe(s2);
    });

    it('returns unchanged state when nodes are in different parents', () => {
      const state = createInitialState();
      const s1 = insertSectionTemplate(state, 'blank');
      const section1 = s1.selectedId!;
      const sections = findSections(state);
      if (sections.length === 0) return;

      const withL1 = insertLeaf({ ...s1, selectedId: sections[0].id, selectedIds: [sections[0].id] }, 'text');
      const l1 = withL1.selectedId!;
      const withL2 = insertLeaf({ ...withL1, selectedId: section1, selectedIds: [section1] }, 'text');
      const l2 = withL2.selectedId!;

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 10, top: 10, width: 100, height: 50 },
        [l2]: { left: 200, top: 10, width: 100, height: 50 },
      };

      const next = alignNodes(withL2, [l1, l2], 'left', rects);
      expect(next).toBe(withL2);
    });
  });

  // ---------------------------------------------------------------------------
  // distributeNodes
  // ---------------------------------------------------------------------------
  describe('distributeNodes', () => {
    it('returns unchanged state for fewer than 3 items', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 10, top: 10, width: 100, height: 50 },
        [l2]: { left: 200, top: 10, width: 100, height: 50 },
      };

      const next = distributeNodes(s2, [l1, l2], 'horizontal', rects);
      expect(next).toBe(s2);
    });

    it('distributes three or more nodes horizontally', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;
      const s3 = insertLeaf(s2, 'text');
      const l3 = s3.selectedId!;

      // Set up manual positions: l2 is middle and needs distributing
      const moved = moveNodes(s3, [
        { id: l1, x: '0px', y: '0px' },
        { id: l2, x: '50px', y: '0px' },
        { id: l3, x: '400px', y: '0px' },
      ]);

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 0, top: 0, width: 100, height: 50 },
        [l2]: { left: 50, top: 0, width: 100, height: 50 },
        [l3]: { left: 400, top: 0, width: 100, height: 50 },
      };

      const next = distributeNodes(moved, [l1, l2, l3], 'horizontal', rects);
      // l2 should have been repositioned (middle node distributed evenly)
      expect(next).not.toBe(moved);
    });

    it('distributes nodes vertically', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;
      const s3 = insertLeaf(s2, 'text');
      const l3 = s3.selectedId!;

      const moved = moveNodes(s3, [
        { id: l1, x: '0px', y: '0px' },
        { id: l2, x: '0px', y: '10px' },
        { id: l3, x: '0px', y: '400px' },
      ]);

      const rects: Record<NodeId, { left: number; top: number; width: number; height: number }> = {
        [l1]: { left: 0, top: 0, width: 100, height: 50 },
        [l2]: { left: 0, top: 10, width: 100, height: 50 },
        [l3]: { left: 0, top: 400, width: 100, height: 50 },
      };

      const next = distributeNodes(moved, [l1, l2, l3], 'vertical', rects);
      expect(next).not.toBe(moved);
    });
  });

  // ---------------------------------------------------------------------------
  // reparentNode
  // ---------------------------------------------------------------------------
  describe('reparentNode', () => {
    it('reparents a leaf to a different wrapper', () => {
      const state = createInitialState();
      const withContainer = insertWrapper(state, 'container');
      const _containerId = withContainer.selectedId!;

      const withLeaf = insertLeaf(withContainer, 'text');
      const leafId = withLeaf.selectedId!;
      const originalParentId = withLeaf.document.nodes[leafId].parentId!;

      // Insert another container to reparent into
      const withContainer2 = insertWrapper(withLeaf, 'container');
      const container2Id = withContainer2.selectedId!;

      const next = reparentNode(withContainer2, leafId, container2Id, '10px', '20px');
      const node = next.document.nodes[leafId];
      expect(node.parentId).toBe(container2Id);
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('10px');
        expect(node.rect.y.base.raw).toBe('20px');
      }

      // Check original parent no longer has the child
      const oldParent = next.document.nodes[originalParentId];
      expect(oldParent.children).not.toContain(leafId);
    });

    it('falls back to moveNode when reparenting to same parent', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;
      const parentId = withLeaf.document.nodes[leafId].parentId!;

      const next = reparentNode(withLeaf, leafId, parentId, '50px', '60px');
      const node = next.document.nodes[leafId];
      if (node.contentType !== 'site') {
        expect(node.rect.x.base.raw).toBe('50px');
        expect(node.rect.y.base.raw).toBe('60px');
      }
      expect(node.parentId).toBe(parentId);
    });

    it('returns unchanged state for self-reparenting', () => {
      const state = createInitialState();
      const withContainer = insertWrapper(state, 'container');
      const containerId = withContainer.selectedId!;

      const next = reparentNode(withContainer, containerId, containerId, '0px', '0px');
      expect(next).toBe(withContainer);
    });

    it('prevents reparenting to a descendant (cyclic)', () => {
      const state = createInitialState();
      const withC1 = insertWrapper(state, 'container');
      const c1Id = withC1.selectedId!;
      const withC2 = insertWrapper(withC1, 'container');
      const c2Id = withC2.selectedId!;

      // c2 is inside c1, so reparenting c1 into c2 would be cyclic
      const next = reparentNode(withC2, c1Id, c2Id, '0px', '0px');
      expect(next).toBe(withC2);
    });

    it('returns unchanged state for site node', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const next = reparentNode(state, state.document.rootId, section.id, '0px', '0px');
      expect(next).toBe(state);
    });

    it('returns unchanged state when target parent is not a wrapper', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      // Try to reparent into the site root (which is type=site, not wrapper)
      const next = reparentNode(withLeaf, leafId, state.document.rootId, '0px', '0px');
      expect(next).toBe(withLeaf);
    });

    it('prevents reparenting a section into a container', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const withContainer = insertWrapper(state, 'container');
      const containerId = withContainer.selectedId!;

      // sections cannot be parented under containers (canParentNode returns false for non-container child)
      const next = reparentNode(withContainer, section.id, containerId, '0px', '0px');
      expect(next).toBe(withContainer);
    });
  });

  describe('reparentNodes', () => {
    it('reparents multiple siblings to a different wrapper', () => {
      const state = createInitialState();
      const withContainer = insertWrapper(state, 'container');

      const withLeafA = insertLeaf(withContainer, 'text');
      const leafAId = withLeafA.selectedId!;
      const withLeafB = insertLeaf(withLeafA, 'text');
      const leafBId = withLeafB.selectedId!;

      const withContainerB = insertWrapper(withLeafB, 'container');
      const containerBId = withContainerB.selectedId!;
      const sourceParentId = withContainerB.document.nodes[leafAId].parentId!;

      const next = reparentNodes(
        withContainerB,
        [
          { id: leafAId, x: '20px', y: '30px' },
          { id: leafBId, x: '140px', y: '30px' },
        ],
        containerBId,
      );

      expect(next.document.nodes[leafAId].parentId).toBe(containerBId);
      expect(next.document.nodes[leafBId].parentId).toBe(containerBId);
      const leafA = next.document.nodes[leafAId];
      const leafB = next.document.nodes[leafBId];
      if (leafA.contentType !== 'site' && leafB.contentType !== 'site') {
        expect(leafA.rect.x.base.raw).toBe('20px');
        expect(leafB.rect.x.base.raw).toBe('140px');
      }

      const oldParent = next.document.nodes[sourceParentId];
      expect(oldParent.children).not.toContain(leafAId);
      expect(oldParent.children).not.toContain(leafBId);

      const newParent = next.document.nodes[containerBId];
      expect(newParent.children).toEqual(expect.arrayContaining([leafAId, leafBId]));
    });

    it('returns unchanged state for invalid target parent', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = reparentNodes(
        withLeaf,
        [{ id: leafId, x: '20px', y: '30px' }],
        withLeaf.document.rootId,
      );

      expect(next).toBe(withLeaf);
    });
  });

  // ---------------------------------------------------------------------------
  // requestPromoteWrapperRole / confirmPromoteWrapperRole / cancelPromoteWrapperRole
  // ---------------------------------------------------------------------------
  describe('promote/demote wrapper role', () => {
    it('promotes a section to header when no header exists', () => {
      const state = createInitialState();
      // Delete the existing header first
      const header = findNodeByRole(state, 'wrapper', 'header');
      if (!header) throw new Error('Expected header');
      const withoutHeader = deleteNode(state, header.id);

      const section = findNodeByRole(withoutHeader, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const next = requestPromoteWrapperRole(withoutHeader, section.id, 'header');
      // No pending swap needed since there's no existing header
      expect(next.pendingRoleSwap).toBeNull();
      const promoted = next.document.nodes[section.id];
      if (promoted.contentType === 'container') {
        expect(promoted.subtype).toBe('header');
      }
    });

    it('sets pending role swap when header already exists', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const next = requestPromoteWrapperRole(state, section.id, 'header');
      expect(next.pendingRoleSwap).toBeTruthy();
      expect(next.pendingRoleSwap?.targetRole).toBe('header');
      expect(next.pendingRoleSwap?.requestedId).toBe(section.id);
    });

    it('confirms promote replaces existing header with section role', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      const header = findNodeByRole(state, 'wrapper', 'header');
      if (!section || !header) throw new Error('Expected section and header');

      const requested = requestPromoteWrapperRole(state, section.id, 'header');
      const confirmed = confirmPromoteWrapperRole(requested);

      const promotedSection = confirmed.document.nodes[section.id];
      const demotedHeader = confirmed.document.nodes[header.id];

      if (promotedSection.contentType === 'container') {
        expect(promotedSection.subtype).toBe('header');
      }
      if (demotedHeader.contentType === 'container') {
        expect(demotedHeader.subtype).toBe('section');
      }
      expect(confirmed.pendingRoleSwap).toBeNull();
    });

    it('cancels pending role swap', () => {
      const state = createInitialState();
      const section = findNodeByRole(state, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const requested = requestPromoteWrapperRole(state, section.id, 'header');
      expect(requested.pendingRoleSwap).toBeTruthy();

      const cancelled = cancelPromoteWrapperRole(requested);
      expect(cancelled.pendingRoleSwap).toBeNull();
    });

    it('confirm with no pending swap is a no-op', () => {
      const state = createInitialState();
      const next = confirmPromoteWrapperRole(state);
      expect(next).toBe(state);
    });

    it('promotes to footer and moves wrapper to end of root children', () => {
      const state = createInitialState();
      const footer = findNodeByRole(state, 'wrapper', 'footer');
      if (!footer) throw new Error('Expected footer');
      const withoutFooter = deleteNode(state, footer.id);

      const section = findNodeByRole(withoutFooter, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const next = requestPromoteWrapperRole(withoutFooter, section.id, 'footer');
      const root = getRoot(next.document);
      expect(root.children[root.children.length - 1]).toBe(section.id);
    });

    it('promoted header is moved to first position in root', () => {
      const state = createInitialState();
      const header = findNodeByRole(state, 'wrapper', 'header');
      if (!header) throw new Error('Expected header');
      const withoutHeader = deleteNode(state, header.id);

      const section = findNodeByRole(withoutHeader, 'wrapper', 'section');
      if (!section) throw new Error('Expected section');

      const next = requestPromoteWrapperRole(withoutHeader, section.id, 'header');
      const root = getRoot(next.document);
      expect(root.children[0]).toBe(section.id);
    });
  });

  // ---------------------------------------------------------------------------
  // demoteWrapperRole
  // ---------------------------------------------------------------------------
  describe('demoteWrapperRole', () => {
    it('demotes a header to section', () => {
      const state = createInitialState();
      const header = findNodeByRole(state, 'wrapper', 'header');
      if (!header) throw new Error('Expected header');

      const next = demoteWrapperRole(state, header.id);
      const demoted = next.document.nodes[header.id];
      if (demoted.contentType === 'container') {
        expect(demoted.subtype).toBe('section');
      }
    });

    it('demotes a footer to section', () => {
      const state = createInitialState();
      const footer = findNodeByRole(state, 'wrapper', 'footer');
      if (!footer) throw new Error('Expected footer');

      const next = demoteWrapperRole(state, footer.id);
      const demoted = next.document.nodes[footer.id];
      if (demoted.contentType === 'container') {
        expect(demoted.subtype).toBe('section');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // deleteNode / deleteNodes
  // ---------------------------------------------------------------------------
  describe('deleteNode / deleteNodes', () => {
    it('deletes a leaf node', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = deleteNode(withLeaf, leafId);
      expect(next.document.nodes[leafId]).toBeUndefined();
    });

    it('deletes a wrapper and all its children recursively', () => {
      const state = createInitialState();
      const withContainer = insertWrapper(state, 'container');
      const containerId = withContainer.selectedId!;
      const withLeaf = insertLeaf(withContainer, 'text');
      const leafId = withLeaf.selectedId!;

      const next = deleteNode(withLeaf, containerId);
      expect(next.document.nodes[containerId]).toBeUndefined();
      expect(next.document.nodes[leafId]).toBeUndefined();
    });

    it('removes deleted node from parent children array', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;
      const parentId = withLeaf.document.nodes[leafId].parentId!;

      const next = deleteNode(withLeaf, leafId);
      expect(next.document.nodes[parentId].children).not.toContain(leafId);
    });

    it('clears selection when the selected node is deleted', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const next = deleteNode(withLeaf, leafId);
      expect(next.selectedId).toBeNull();
    });

    it('deletes multiple nodes at once', () => {
      const state = createInitialState();
      const s1 = insertLeaf(state, 'text');
      const l1 = s1.selectedId!;
      const s2 = insertLeaf(s1, 'text');
      const l2 = s2.selectedId!;

      const next = deleteNodes(s2, [l1, l2]);
      expect(next.document.nodes[l1]).toBeUndefined();
      expect(next.document.nodes[l2]).toBeUndefined();
    });

    it('returns unchanged state for empty nodeIds', () => {
      const state = createInitialState();
      const next = deleteNodes(state, []);
      expect(next).toBe(state);
    });

    it('does not delete root node (parentId is null)', () => {
      const state = createInitialState();
      const next = deleteNode(state, state.document.rootId);
      expect(next.document.nodes[state.document.rootId]).toBeTruthy();
    });

    it('handles deletion of ancestor when descendant is also in list', () => {
      const state = createInitialState();
      const withContainer = insertWrapper(state, 'container');
      const containerId = withContainer.selectedId!;
      const withLeaf = insertLeaf(withContainer, 'text');
      const leafId = withLeaf.selectedId!;

      // Both container and its child leaf are in the delete list
      const next = deleteNodes(withLeaf, [containerId, leafId]);
      expect(next.document.nodes[containerId]).toBeUndefined();
      expect(next.document.nodes[leafId]).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // importDocument
  // ---------------------------------------------------------------------------
  describe('importDocument', () => {
    it('clears selection and pendingRoleSwap on import', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      const stateWithPending: EditorState = {
        ...withLeaf,
        pendingRoleSwap: {
          requestedId: leafId,
          targetRole: 'header',
          existingId: leafId,
        },
      };

      const next = importDocument(stateWithPending, state.document);
      expect(next.selectedId).toBeNull();
      expect(next.selectedIds).toEqual([]);
      expect(next.pendingRoleSwap).toBeNull();
    });

    it('throws on invalid document', () => {
      const state = createInitialState();
      const badDocument = {
        rootId: 'nonexistent',
        nodes: {},
        fontLibrary: { defaults: [], favorites: [], usedFamilies: [] },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => importDocument(state, badDocument as any)).toThrow('Import failed');
    });
  });

  // ---------------------------------------------------------------------------
  // getValidationErrors
  // ---------------------------------------------------------------------------
  describe('getValidationErrors', () => {
    it('returns empty array for valid initial state', () => {
      const state = createInitialState();
      expect(getValidationErrors(state)).toEqual([]);
    });

    it('returns errors for corrupted document', () => {
      const state = createInitialState();
      const corrupted: EditorState = {
        ...state,
        document: {
          rootId: 'nonexistent',
          nodes: {},
          fontLibrary: { defaults: [], favorites: [], usedFamilies: [] },
        },
      };

      const errors = getValidationErrors(corrupted);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases: document immutability
  // ---------------------------------------------------------------------------
  describe('immutability', () => {
    it('mutations do not modify the original state document', () => {
      const state = createInitialState();
      const originalNodes = Object.keys(state.document.nodes);

      insertLeaf(state, 'text');

      expect(Object.keys(state.document.nodes)).toEqual(originalNodes);
    });

    it('moveNode does not mutate the original document', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;
      const beforeX = (withLeaf.document.nodes[leafId] as Exclude<DocumentNode, { type: 'site' }>).rect.x.base.raw;

      moveNode(withLeaf, leafId, { x: '999px' });

      const afterX = (withLeaf.document.nodes[leafId] as Exclude<DocumentNode, { type: 'site' }>).rect.x.base.raw;
      expect(afterX).toBe(beforeX);
    });

    it('deleteNode does not mutate the original document', () => {
      const state = createInitialState();
      const withLeaf = insertLeaf(state, 'text');
      const leafId = withLeaf.selectedId!;

      deleteNode(withLeaf, leafId);

      expect(withLeaf.document.nodes[leafId]).toBeTruthy();
    });
  });
});
