import { describe, expect, it } from 'vitest';
import { createContainerNode, createMediaNode, createTextNode } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import {
  convertGroupToContainerDoc,
  createInitialDocument,
  deleteNodeDoc,
  deleteNodesDoc,
  demoteWrapperRoleDoc,
  groupNodesDoc,
  moveNodeDoc,
  moveNodeInTreeDoc,
  promoteWrapperRoleDoc,
  reorderNodeDoc,
  reorderNodesDoc,
  reparentNodeDoc,
  reparentNodeAtDoc,
  reparentNodesAtDoc,
  setContainerAriaLabelDoc,
  setContainerSemanticTypeDoc,
  switchSubtypeDoc,
  ungroupNodeDoc,
} from '../documentApi';

function getRoot(document: ReturnType<typeof createInitialDocument>) {
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    throw new Error('Expected site root');
  }
  return root;
}

function getSection(document: ReturnType<typeof createInitialDocument>) {
  const root = getRoot(document);
  const sectionId = root.children.find((childId) => {
    const node = document.nodes[childId];
    return node?.contentType === 'container' && node.subtype === 'section';
  });
  if (!sectionId) {
    throw new Error('Expected section');
  }
  const section = document.nodes[sectionId];
  if (!section || section.contentType !== 'container') {
    throw new Error('Expected container section');
  }
  return section;
}

function getRectNode(document: ReturnType<typeof createInitialDocument>, id: string) {
  const node = document.nodes[id];
  if (!node || node.contentType === 'site') {
    throw new Error(`Expected rect-bearing node ${id}`);
  }
  return node;
}

describe('api/documentApi tree operations', () => {
  describe('semantic containers and groups', () => {
    it('converts only semantic container subtypes and stores aria labels', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      section.children.push(container.id);
      document.nodes[container.id] = container;

      const navDoc = setContainerSemanticTypeDoc(document, container.id, 'nav');
      const nav = navDoc.nodes[container.id];
      expect(nav?.contentType === 'container' && nav.subtype).toBe('nav');

      const labeledDoc = setContainerAriaLabelDoc(navDoc, container.id, ' Primary navigation ');
      const labeled = labeledDoc.nodes[container.id];
      expect(labeled?.contentType === 'container' && labeled.ariaLabel).toBe('Primary navigation');

      const unchangedGroup = createContainerNode('group', section.id);
      section.children.push(unchangedGroup.id);
      document.nodes[unchangedGroup.id] = unchangedGroup;
      expect(setContainerSemanticTypeDoc(document, unchangedGroup.id, 'article')).toBe(document);
    });

    it('groups and ungroups same-parent nodes while preserving visual coordinates', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const first = createTextNode('block', section.id);
      const second = createTextNode('block', section.id);
      first.rect.x.base = parseUnitValue('80px');
      first.rect.y.base = parseUnitValue('90px');
      first.rect.width.base = parseUnitValue('120px');
      first.rect.height.base = parseUnitValue('40px');
      second.rect.x.base = parseUnitValue('260px');
      second.rect.y.base = parseUnitValue('140px');
      second.rect.width.base = parseUnitValue('100px');
      second.rect.height.base = parseUnitValue('50px');
      section.children.push(first.id, second.id);
      document.nodes[first.id] = first;
      document.nodes[second.id] = second;

      const grouped = groupNodesDoc(document, [first.id, second.id]);
      const group = Object.values(grouped.nodes).find(
        (node) => node.contentType === 'container' && node.subtype === 'group' && node.children.includes(first.id),
      );
      if (!group || group.contentType !== 'container') {
        throw new Error('Expected group');
      }

      expect(group.rect.x.base.raw).toBe('80px');
      expect(group.rect.y.base.raw).toBe('90px');
      expect(group.rect.width.base.raw).toBe('fit-content');
      expect(group.rect.height.base.raw).toBe('auto');
      const groupedFirst = getRectNode(grouped, first.id);
      const groupedSecond = getRectNode(grouped, second.id);
      expect(groupedFirst.rect.x.base.raw).toBe('0px');
      expect(groupedFirst.rect.y.base.raw).toBe('0px');
      expect(groupedSecond.rect.x.base.raw).toBe('180px');
      expect(groupedSecond.rect.y.base.raw).toBe('50px');

      const ungrouped = ungroupNodeDoc(grouped, group.id);
      expect(ungrouped.nodes[first.id].parentId).toBe(section.id);
      const ungroupedFirst = getRectNode(ungrouped, first.id);
      const ungroupedSecond = getRectNode(ungrouped, second.id);
      expect(ungroupedFirst.rect.x.base.raw).toBe('80px');
      expect(ungroupedFirst.rect.y.base.raw).toBe('90px');
      expect(ungroupedSecond.rect.x.base.raw).toBe('260px');
      expect(ungroupedSecond.rect.y.base.raw).toBe('140px');
      expect(ungrouped.nodes[group.id]).toBeUndefined();
    });

    it('rebounds a group to moved child bounds while preserving visual coordinates', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const first = createTextNode('block', section.id);
      const second = createTextNode('block', section.id);
      first.rect.x.base = parseUnitValue('80px');
      first.rect.y.base = parseUnitValue('90px');
      first.rect.width.base = parseUnitValue('120px');
      first.rect.height.base = parseUnitValue('40px');
      second.rect.x.base = parseUnitValue('260px');
      second.rect.y.base = parseUnitValue('140px');
      second.rect.width.base = parseUnitValue('100px');
      second.rect.height.base = parseUnitValue('50px');
      section.children.push(first.id, second.id);
      document.nodes[first.id] = first;
      document.nodes[second.id] = second;

      const grouped = groupNodesDoc(document, [first.id, second.id]);
      const group = Object.values(grouped.nodes).find(
        (node) => node.contentType === 'container' && node.subtype === 'group' && node.children.includes(first.id),
      );
      if (!group || group.contentType !== 'container') {
        throw new Error('Expected group');
      }

      const moved = moveNodeDoc(grouped, first.id, { x: '40px', y: '30px' });
      const movedGroup = moved.nodes[group.id];
      const movedFirst = getRectNode(moved, first.id);
      const movedSecond = getRectNode(moved, second.id);

      expect(movedGroup?.contentType === 'container' ? movedGroup.rect.x.base.raw : null).toBe('120px');
      expect(movedGroup?.contentType === 'container' ? movedGroup.rect.y.base.raw : null).toBe('120px');
      expect(movedGroup?.contentType === 'container' ? movedGroup.rect.width.base.raw : null).toBe('fit-content');
      expect(movedGroup?.contentType === 'container' ? movedGroup.rect.height.base.raw : null).toBe('auto');
      expect(movedFirst.rect.x.base.raw).toBe('0px');
      expect(movedFirst.rect.y.base.raw).toBe('0px');
      expect(movedSecond.rect.x.base.raw).toBe('140px');
      expect(movedSecond.rect.y.base.raw).toBe('20px');

      const ungrouped = ungroupNodeDoc(moved, group.id);
      expect(getRectNode(ungrouped, first.id).rect.x.base.raw).toBe('120px');
      expect(getRectNode(ungrouped, first.id).rect.y.base.raw).toBe('120px');
      expect(getRectNode(ungrouped, second.id).rect.x.base.raw).toBe('260px');
      expect(getRectNode(ungrouped, second.id).rect.y.base.raw).toBe('140px');
    });

    it('converts groups to containers without allowing reverse conversion', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const child = createTextNode('block', section.id);
      section.children.push(child.id);
      document.nodes[child.id] = child;

      const grouped = groupNodesDoc(document, [child.id]);
      const group = Object.values(grouped.nodes).find(
        (node) => node.contentType === 'container' && node.subtype === 'group',
      );
      if (!group || group.contentType !== 'container') {
        throw new Error('Expected group');
      }

      const converted = convertGroupToContainerDoc(grouped, group.id);
      const wrapper = converted.nodes[group.id];
      expect(wrapper?.contentType === 'container' && wrapper.subtype).toBe('container');
      expect(convertGroupToContainerDoc(converted, group.id)).toBe(converted);
    });
  });

  describe('deleteNodeDoc / deleteNodesDoc', () => {
    it('removes a node and its descendants and detaches it from the parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leaf = createTextNode('block', container.id);
      container.children = [leaf.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leaf.id] = leaf;

      const next = deleteNodeDoc(document, container.id);
      expect(next.nodes[container.id]).toBeUndefined();
      expect(next.nodes[leaf.id]).toBeUndefined();
      expect(next.nodes[section.id].children).not.toContain(container.id);
      // original document is untouched
      expect(document.nodes[container.id]).toBeDefined();
    });

    it('is a silent no-op (clone, unchanged content) for an unknown node id', () => {
      const document = createInitialDocument();
      const next = deleteNodeDoc(document, 'missing_node');
      expect(next).not.toBe(document);
      expect(next).toEqual(document);
    });

    it('is a no-op for an empty id list', () => {
      const document = createInitialDocument();
      const next = deleteNodesDoc(document, []);
      expect(next).toBe(document);
    });

    it('handles a stale id mixed with valid ids without erroring', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      const next = deleteNodesDoc(document, [leaf.id, 'missing_node']);
      expect(next.nodes[leaf.id]).toBeUndefined();
      expect(next.nodes[section.id].children).not.toContain(leaf.id);
    });

    it('deletes an ancestor and its own descendant together without erroring', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leaf = createTextNode('block', container.id);
      container.children = [leaf.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leaf.id] = leaf;

      // Selecting both the container and its own child: the child is filtered
      // out as non-top-level, and deleting the container removes both.
      const next = deleteNodesDoc(document, [container.id, leaf.id]);
      expect(next.nodes[container.id]).toBeUndefined();
      expect(next.nodes[leaf.id]).toBeUndefined();
      expect(next.nodes[section.id].children).not.toContain(container.id);
    });

    it('is a silent no-op when attempting to delete the site root node', () => {
      const document = createInitialDocument();
      const next = deleteNodeDoc(document, document.rootId);
      expect(next).not.toBe(document);
      expect(next).toEqual(document);
      expect(next.nodes[document.rootId]).toBeDefined();
    });
  });

  describe('reorderNodeDoc', () => {
    it('moves a reorderable leaf forward and backward among siblings', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leafA = createTextNode('block', container.id);
      const leafB = createTextNode('block', container.id);
      container.children = [leafA.id, leafB.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      const forwarded = reorderNodeDoc(document, leafA.id, 'forward');
      expect(forwarded.nodes[container.id].children).toEqual([leafB.id, leafA.id]);

      const backed = reorderNodeDoc(forwarded, leafA.id, 'back');
      expect(backed.nodes[container.id].children).toEqual([leafA.id, leafB.id]);
    });

    it('sendToBack and bringToFront move a leaf to the extremes', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leafA = createTextNode('block', container.id);
      const leafB = createTextNode('block', container.id);
      const leafC = createTextNode('block', container.id);
      container.children = [leafA.id, leafB.id, leafC.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;
      document.nodes[leafC.id] = leafC;

      const toFront = reorderNodeDoc(document, leafA.id, 'bringToFront');
      expect(toFront.nodes[container.id].children).toEqual([leafB.id, leafC.id, leafA.id]);

      const toBack = reorderNodeDoc(toFront, leafA.id, 'sendToBack');
      expect(toBack.nodes[container.id].children).toEqual([leafA.id, leafB.id, leafC.id]);
    });

    it('clamps at the first and last position without erroring', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leafA = createTextNode('block', container.id);
      const leafB = createTextNode('block', container.id);
      container.children = [leafA.id, leafB.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      const atFront = reorderNodeDoc(document, leafA.id, 'back');
      expect(atFront).toBe(document);

      const atBack = reorderNodeDoc(document, leafB.id, 'forward');
      expect(atBack).toBe(document);

      const sentToBackAlready = reorderNodeDoc(document, leafA.id, 'sendToBack');
      expect(sentToBackAlready).toBe(document);

      const broughtToFrontAlready = reorderNodeDoc(document, leafB.id, 'bringToFront');
      expect(broughtToFrontAlready).toBe(document);
    });

    it('reorders sibling sections at the root level', () => {
      const document = structuredClone(createInitialDocument());
      const root = getRoot(document);
      const extraSection = createContainerNode('section', root.id);
      root.children.push(extraSection.id);
      document.nodes[extraSection.id] = extraSection;

      const originalIndex = root.children.indexOf(extraSection.id);
      const forwarded = reorderNodeDoc(document, extraSection.id, 'forward');
      // extraSection was last, so 'forward' can't move it further.
      expect(forwarded).toBe(document);

      const backed = reorderNodeDoc(document, extraSection.id, 'back');
      const backedIndex = backed.nodes[root.id].children.indexOf(extraSection.id);
      expect(backedIndex).toBeLessThan(originalIndex);
    });

    it('rejects sendToBack/bringToFront for section-level reordering', () => {
      const document = structuredClone(createInitialDocument());
      const root = getRoot(document);
      const extraSection = createContainerNode('section', root.id);
      root.children.push(extraSection.id);
      document.nodes[extraSection.id] = extraSection;

      expect(reorderNodeDoc(document, extraSection.id, 'sendToBack')).toBe(document);
      expect(reorderNodeDoc(document, extraSection.id, 'bringToFront')).toBe(document);
    });

    it('is a no-op for an unknown node id', () => {
      const document = createInitialDocument();
      expect(reorderNodeDoc(document, 'missing_node', 'forward')).toBe(document);
    });

    it('is a no-op when attempting to reorder the root node', () => {
      const document = createInitialDocument();
      expect(reorderNodeDoc(document, document.rootId, 'forward')).toBe(document);
    });

    it('reorders multiple sibling leaves in one document mutation', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leafA = createTextNode('block', container.id);
      const leafB = createTextNode('block', container.id);
      const leafC = createTextNode('block', container.id);
      const leafD = createTextNode('block', container.id);
      container.children = [leafA.id, leafB.id, leafC.id, leafD.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;
      document.nodes[leafC.id] = leafC;
      document.nodes[leafD.id] = leafD;

      const backed = reorderNodesDoc(document, [leafB.id, leafC.id], 'back');
      expect(backed.nodes[container.id].children).toEqual([leafB.id, leafC.id, leafA.id, leafD.id]);

      const front = reorderNodesDoc(backed, [leafB.id, leafC.id], 'bringToFront');
      expect(front.nodes[container.id].children).toEqual([leafA.id, leafD.id, leafB.id, leafC.id]);
    });

    it('is a no-op for a node with no parent id or missing parent', () => {
      const document = structuredClone(createInitialDocument());
      const orphan = createTextNode('block', 'nonexistent_parent');
      document.nodes[orphan.id] = orphan;
      expect(reorderNodeDoc(document, orphan.id, 'forward')).toBe(document);
    });

    it('promotes and demotes wrapper roles through pure document helpers', () => {
      const document = structuredClone(createInitialDocument());
      const root = getRoot(document);
      const existingHeader = root.children
        .map((childId) => document.nodes[childId])
        .find((node) => node?.contentType === 'container' && node.subtype === 'header');
      const section = getSection(document);
      if (!existingHeader || existingHeader.contentType !== 'container') {
        throw new Error('Expected header');
      }

      expect(promoteWrapperRoleDoc(document, section.id, 'header')).toBe(document);

      const promoted = promoteWrapperRoleDoc(document, section.id, 'header', { replaceExisting: true });
      const promotedSection = promoted.nodes[section.id];
      const replacedHeader = promoted.nodes[existingHeader.id];
      if (promotedSection.contentType !== 'container' || replacedHeader.contentType !== 'container') {
        throw new Error('Expected wrapper roles');
      }
      expect(promotedSection.subtype).toBe('header');
      expect(replacedHeader.subtype).toBe('section');
      expect(promoted.nodes[promoted.rootId].children[0]).toBe(section.id);

      const demoted = demoteWrapperRoleDoc(promoted, section.id);
      const demotedSection = demoted.nodes[section.id];
      if (demotedSection.contentType !== 'container') {
        throw new Error('Expected demoted section');
      }
      expect(demotedSection.subtype).toBe('section');
    });

    it('is a no-op for a non-reorderable container subtype (group is reorderable but section child position requires a section parent)', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      // A group container directly under a non-site parent is not reorderable
      // only when its subtype isn't 'container'; verify group behaves as expected.
      const group = createContainerNode('group', section.id);
      const sibling = createContainerNode('group', section.id);
      section.children.push(group.id, sibling.id);
      document.nodes[group.id] = group;
      document.nodes[sibling.id] = sibling;

      // 'group' subtype is not 'container', so isReorderableNode returns false.
      expect(reorderNodeDoc(document, group.id, 'forward')).toBe(document);
    });
  });

  describe('reparentNodeDoc', () => {
    it('moves a node into a different container', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const containerA = createContainerNode('container', section.id);
      const containerB = createContainerNode('container', section.id);
      const leaf = createTextNode('block', containerA.id);
      containerA.children = [leaf.id];
      section.children.push(containerA.id, containerB.id);
      document.nodes[containerA.id] = containerA;
      document.nodes[containerB.id] = containerB;
      document.nodes[leaf.id] = leaf;

      const next = reparentNodeDoc(document, leaf.id, containerB.id);
      expect(next.nodes[leaf.id].parentId).toBe(containerB.id);
      expect(next.nodes[containerA.id].children).not.toContain(leaf.id);
      expect(next.nodes[containerB.id].children).toContain(leaf.id);
    });

    it('rejects reparenting into an own descendant (cycle prevention)', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const outer = createContainerNode('container', section.id);
      const inner = createContainerNode('container', outer.id);
      outer.children = [inner.id];
      section.children.push(outer.id);
      document.nodes[outer.id] = outer;
      document.nodes[inner.id] = inner;

      const next = reparentNodeDoc(document, outer.id, inner.id);
      expect(next).toBe(document);
    });

    it('rejects reparenting into an invalid/nonexistent parent id', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      expect(reparentNodeDoc(document, leaf.id, 'missing_parent')).toBe(document);
    });

    it('rejects reparenting a leaf into another leaf (non-container target)', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leafA = createTextNode('block', section.id);
      const leafB = createTextNode('block', section.id);
      section.children.push(leafA.id, leafB.id);
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      expect(reparentNodeDoc(document, leafA.id, leafB.id)).toBe(document);
    });

    it('is a no-op when the new parent equals the node itself', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      expect(reparentNodeDoc(document, section.id, section.id)).toBe(document);
    });

    it('is a no-op when reparenting into the current parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      expect(reparentNodeDoc(document, leaf.id, section.id)).toBe(document);
    });

    it('is a no-op for the site root node', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      expect(reparentNodeDoc(document, document.rootId, section.id)).toBe(document);
    });

    it('is a no-op for a node with no parent (should not occur, but guarded)', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const orphan = createTextNode('block', section.id);
      orphan.parentId = null as unknown as string;
      document.nodes[orphan.id] = orphan;

      expect(reparentNodeDoc(document, orphan.id, section.id)).toBe(document);
    });
  });

  describe('reparentNodeAtDoc', () => {
    it('moves a node into a different container at a position', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const containerA = createContainerNode('container', section.id);
      const containerB = createContainerNode('container', section.id);
      const leaf = createTextNode('block', containerA.id);
      containerA.children = [leaf.id];
      section.children.push(containerA.id, containerB.id);
      document.nodes[containerA.id] = containerA;
      document.nodes[containerB.id] = containerB;
      document.nodes[leaf.id] = leaf;

      const next = reparentNodeAtDoc(document, leaf.id, containerB.id, { x: '10px', y: '20px' });
      expect(next.nodes[leaf.id].parentId).toBe(containerB.id);
      const movedLeaf = next.nodes[leaf.id];
      if (movedLeaf.contentType === 'site') throw new Error('unexpected');
      expect(movedLeaf.rect.x.base.raw).toBe('10px');
      expect(movedLeaf.rect.y.base.raw).toBe('20px');
    });

    it('repositions in place when the new parent equals the current parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      const next = reparentNodeAtDoc(document, leaf.id, section.id, { x: '99px', y: '88px' });
      const movedLeaf = next.nodes[leaf.id];
      if (movedLeaf.contentType === 'site') throw new Error('unexpected');
      expect(movedLeaf.rect.x.base.raw).toBe('99px');
      expect(next.nodes[section.id].children).toContain(leaf.id);
    });

    it('rejects a cycle (reparenting into own descendant)', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const outer = createContainerNode('container', section.id);
      const inner = createContainerNode('container', outer.id);
      outer.children = [inner.id];
      section.children.push(outer.id);
      document.nodes[outer.id] = outer;
      document.nodes[inner.id] = inner;

      const next = reparentNodeAtDoc(document, outer.id, inner.id, { x: '0px', y: '0px' });
      expect(next).toBe(document);
    });

    it('is a no-op for a nonexistent parent id', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      expect(reparentNodeAtDoc(document, leaf.id, 'missing_parent', { x: '0px', y: '0px' })).toBe(document);
    });

    it('is a no-op when the new parent equals the node itself', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      expect(reparentNodeAtDoc(document, section.id, section.id, { x: '0px', y: '0px' })).toBe(document);
    });

    it('is a no-op for the site root node', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      expect(reparentNodeAtDoc(document, document.rootId, section.id, { x: '0px', y: '0px' })).toBe(document);
    });

    it('is a no-op when the node has no parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const orphan = createTextNode('block', section.id);
      orphan.parentId = null as unknown as string;
      document.nodes[orphan.id] = orphan;

      expect(reparentNodeAtDoc(document, orphan.id, section.id, { x: '0px', y: '0px' })).toBe(document);
    });

    it('rejects an invalid parent-child relationship', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leafA = createTextNode('block', section.id);
      const leafB = createTextNode('block', section.id);
      section.children.push(leafA.id, leafB.id);
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      expect(reparentNodeAtDoc(document, leafA.id, leafB.id, { x: '0px', y: '0px' })).toBe(document);
    });
  });

  describe('reparentNodesAtDoc', () => {
    it('moves multiple nodes at once while preserving their relative order', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const containerA = createContainerNode('container', section.id);
      const containerB = createContainerNode('container', section.id);
      const leafA = createTextNode('block', containerA.id);
      const leafB = createTextNode('block', containerA.id);
      const leafC = createTextNode('block', containerA.id);
      containerA.children = [leafA.id, leafB.id, leafC.id];
      section.children.push(containerA.id, containerB.id);
      document.nodes[containerA.id] = containerA;
      document.nodes[containerB.id] = containerB;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;
      document.nodes[leafC.id] = leafC;

      const next = reparentNodesAtDoc(document, containerB.id, [
        { id: leafA.id, x: '1px', y: '1px' },
        { id: leafC.id, x: '2px', y: '2px' },
      ]);

      expect(next.nodes[containerB.id].children).toEqual([leafA.id, leafC.id]);
      expect(next.nodes[containerA.id].children).toEqual([leafB.id]);
      expect(next.nodes[leafA.id].parentId).toBe(containerB.id);
      expect(next.nodes[leafC.id].parentId).toBe(containerB.id);
    });

    it('is a no-op (but still applies parent expansion) for an empty moves list', () => {
      const document = createInitialDocument();
      const section = getSection(document);
      const next = reparentNodesAtDoc(document, section.id, []);
      expect(next).toBe(document);
    });

    it('is a no-op for a nonexistent target parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      const next = reparentNodesAtDoc(document, 'missing_parent', [{ id: leaf.id, x: '0px', y: '0px' }]);
      expect(next).toBe(document);
    });

    it('is a no-op when one of the moved nodes is unknown', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const containerB = createContainerNode('container', section.id);
      const leaf = createTextNode('block', section.id);
      section.children.push(containerB.id, leaf.id);
      document.nodes[containerB.id] = containerB;
      document.nodes[leaf.id] = leaf;

      const next = reparentNodesAtDoc(document, containerB.id, [
        { id: leaf.id, x: '0px', y: '0px' },
        { id: 'missing_node', x: '0px', y: '0px' },
      ]);
      expect(next).toBe(document);
    });

    it('is a no-op when moved nodes do not share the same source parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const containerA = createContainerNode('container', section.id);
      const containerB = createContainerNode('container', section.id);
      const containerC = createContainerNode('container', section.id);
      const leafA = createTextNode('block', containerA.id);
      const leafB = createTextNode('block', containerB.id);
      containerA.children = [leafA.id];
      containerB.children = [leafB.id];
      section.children.push(containerA.id, containerB.id, containerC.id);
      document.nodes[containerA.id] = containerA;
      document.nodes[containerB.id] = containerB;
      document.nodes[containerC.id] = containerC;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      const next = reparentNodesAtDoc(document, containerC.id, [
        { id: leafA.id, x: '0px', y: '0px' },
        { id: leafB.id, x: '0px', y: '0px' },
      ]);
      expect(next).toBe(document);
    });

    it('repositions in place (without reparenting) when the target equals the source parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leafA = createTextNode('block', section.id);
      const leafB = createTextNode('block', section.id);
      section.children.push(leafA.id, leafB.id);
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      const next = reparentNodesAtDoc(document, section.id, [
        { id: leafA.id, x: '77px', y: '66px' },
      ]);
      const movedLeafA = next.nodes[leafA.id];
      if (movedLeafA.contentType === 'site') throw new Error('unexpected');
      expect(movedLeafA.rect.x.base.raw).toBe('77px');
      expect(next.nodes[section.id].children.slice(-2)).toEqual([leafA.id, leafB.id]);
    });

    it('is a no-op (identity) when repositioning in place with unchanged coordinates', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;
      const existingX = leaf.rect.x.base.raw;
      const existingY = leaf.rect.y.base.raw;

      const next = reparentNodesAtDoc(document, section.id, [
        { id: leaf.id, x: existingX, y: existingY },
      ]);
      expect(next).toBe(document);
    });

    it('rejects reparenting into an own descendant among the moved set', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const outer = createContainerNode('container', section.id);
      const inner = createContainerNode('container', outer.id);
      outer.children = [inner.id];
      section.children.push(outer.id);
      document.nodes[outer.id] = outer;
      document.nodes[inner.id] = inner;

      // Move `outer` into `inner`, its own child — must be rejected.
      // Give outer and inner a shared source parent by faking source parent id.
      const next = reparentNodesAtDoc(document, inner.id, [
        { id: outer.id, x: '0px', y: '0px' },
      ]);
      expect(next).toBe(document);
    });
  });

  describe('switchSubtypeDoc', () => {
    it('switches a media node from one subtype to another', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const image = createMediaNode('image', section.id);
      section.children.push(image.id);
      document.nodes[image.id] = image;

      const next = switchSubtypeDoc(document, image.id, 'video');
      const switched = next.nodes[image.id];
      expect(switched.contentType).toBe('media');
      if (switched.contentType !== 'media') throw new Error('unexpected');
      expect(switched.subtype).toBe('video');
      expect(switched.parentId).toBe(section.id);
      expect(switched.children).toEqual([]);
    });

    it('is a no-op when the target subtype equals the current subtype', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const image = createMediaNode('image', section.id);
      section.children.push(image.id);
      document.nodes[image.id] = image;

      const next = switchSubtypeDoc(document, image.id, 'image');
      expect(next).toBe(document);
    });

    it('is a no-op for an unknown node id', () => {
      const document = createInitialDocument();
      expect(switchSubtypeDoc(document, 'missing_node', 'video')).toBe(document);
    });

    it('throws for an unrecognised target subtype', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const image = createMediaNode('image', section.id);
      section.children.push(image.id);
      document.nodes[image.id] = image;

      expect(() => switchSubtypeDoc(document, image.id, 'not-a-real-subtype' as never)).toThrow(
        /unrecognised targetSubtype/,
      );
    });

    it('throws when attempting to switch the subtype of a container node', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      expect(() => switchSubtypeDoc(document, section.id, 'image')).toThrow(
        /cannot switch subtype of a "container" node/,
      );
    });

    it('throws when attempting to switch the subtype of the site root node', () => {
      const document = createInitialDocument();
      expect(() => switchSubtypeDoc(document, document.rootId, 'video' as never)).toThrow(
        /cannot switch subtype of a "site" node/,
      );
    });

    it('throws when switching a media node to a text-family subtype', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const image = createMediaNode('image', section.id);
      section.children.push(image.id);
      document.nodes[image.id] = image;

      expect(() => switchSubtypeDoc(document, image.id, 'block')).toThrow(
        /source node is "media" but targetSubtype "block" belongs to the "text" family/,
      );
    });

    it('throws when switching a text node to a media-family subtype', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const text = createTextNode('block', section.id);
      section.children.push(text.id);
      document.nodes[text.id] = text;

      expect(() => switchSubtypeDoc(document, text.id, 'image')).toThrow(
        /source node is "text" but targetSubtype "image" belongs to the "media" family/,
      );
    });

    it('delegates to switchTextSubtypeDoc for text-family switches', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const text = createTextNode('block', section.id);
      section.children.push(text.id);
      document.nodes[text.id] = text;

      const next = switchSubtypeDoc(document, text.id, 'code');
      const switched = next.nodes[text.id];
      expect(switched.contentType).toBe('text');
      if (switched.contentType !== 'text') throw new Error('unexpected');
      expect(switched.subtype).toBe('code');
    });
  });

  describe('moveNodeInTreeDoc uncovered branches', () => {
    it('is a no-op for an unknown node id', () => {
      const document = createInitialDocument();
      const section = getSection(document);
      expect(moveNodeInTreeDoc(document, 'missing_node', section.id, 0)).toBe(document);
    });

    it('is a no-op for a negative target index', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      expect(moveNodeInTreeDoc(document, leaf.id, section.id, -1)).toBe(document);
    });

    it('is a no-op for an unknown target parent id', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leaf = createTextNode('block', section.id);
      section.children.push(leaf.id);
      document.nodes[leaf.id] = leaf;

      expect(moveNodeInTreeDoc(document, leaf.id, 'missing_parent', 0)).toBe(document);
    });

    it('is a no-op for a target index beyond the end of the target children', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const containerA = createContainerNode('container', section.id);
      const containerB = createContainerNode('container', section.id);
      const leaf = createTextNode('block', containerA.id);
      containerA.children = [leaf.id];
      section.children.push(containerA.id, containerB.id);
      document.nodes[containerA.id] = containerA;
      document.nodes[containerB.id] = containerB;
      document.nodes[leaf.id] = leaf;

      expect(moveNodeInTreeDoc(document, leaf.id, containerB.id, 5)).toBe(document);
    });

    it('is a no-op when moving to the same position within the same parent', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const container = createContainerNode('container', section.id);
      const leafA = createTextNode('block', container.id);
      const leafB = createTextNode('block', container.id);
      container.children = [leafA.id, leafB.id];
      section.children.push(container.id);
      document.nodes[container.id] = container;
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      expect(moveNodeInTreeDoc(document, leafA.id, container.id, 0)).toBe(document);
      expect(moveNodeInTreeDoc(document, leafA.id, container.id, 1)).toBe(document);
    });

    it('is a no-op when the target parent cannot accept the child', () => {
      const document = structuredClone(createInitialDocument());
      const section = getSection(document);
      const leafA = createTextNode('block', section.id);
      const leafB = createTextNode('block', section.id);
      section.children.push(leafA.id, leafB.id);
      document.nodes[leafA.id] = leafA;
      document.nodes[leafB.id] = leafB;

      // leafB is a leaf, not a container, so it cannot accept children.
      expect(moveNodeInTreeDoc(document, leafA.id, leafB.id, 0)).toBe(document);
    });
  });
});
