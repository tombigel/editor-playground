import { describe, expect, it } from 'vitest';
import {
  beginDragSession,
  cancelDragSession,
  finishDragSession,
  updateDragSession,
} from '../dragDropApi';
import type { DragGeometrySnapshot } from '../types';
import { createDefaultRect, createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import type { DocumentModel, NodeId, TextLeaf, WrapperNode } from '../../model/types';

type TestNodes = {
  document: DocumentModel;
  sectionId: NodeId;
  containerAId: NodeId;
  containerBId: NodeId;
  childContainerId: NodeId;
  leafAId: NodeId;
  leafBId: NodeId;
  leafOtherId: NodeId;
};

function createDragDocument(): TestNodes {
  const document = structuredClone(createInitialDocument());
  const section = Object.values(document.nodes).find(
    (node): node is WrapperNode => node.type === 'wrapper' && node.role === 'section',
  );
  if (!section) {
    throw new Error('Expected section wrapper');
  }

  const containerA = createWrapper('container', section.id);
  containerA.rect = createDefaultRect('40px', '40px', '300px', '240px');
  const childContainer = createWrapper('container', containerA.id);
  childContainer.rect = createDefaultRect('24px', '24px', '180px', '120px');
  const containerB = createWrapper('container', section.id);
  containerB.rect = createDefaultRect('420px', '40px', '300px', '240px');

  const leafA = createLeaf('text', containerA.id) as TextLeaf;
  leafA.rect = createDefaultRect('20px', '30px', '80px', '40px');
  const leafB = createLeaf('text', containerA.id) as TextLeaf;
  leafB.rect = createDefaultRect('140px', '30px', '80px', '40px');
  const leafOther = createLeaf('text', containerB.id) as TextLeaf;
  leafOther.rect = createDefaultRect('20px', '30px', '80px', '40px');

  containerA.children = [childContainer.id, leafA.id, leafB.id];
  containerB.children = [leafOther.id];
  section.children = [...section.children, containerA.id, containerB.id];

  document.nodes[containerA.id] = containerA;
  document.nodes[containerB.id] = containerB;
  document.nodes[childContainer.id] = childContainer;
  document.nodes[leafA.id] = leafA;
  document.nodes[leafB.id] = leafB;
  document.nodes[leafOther.id] = leafOther;

  return {
    document,
    sectionId: section.id,
    containerAId: containerA.id,
    containerBId: containerB.id,
    childContainerId: childContainer.id,
    leafAId: leafA.id,
    leafBId: leafB.id,
    leafOtherId: leafOther.id,
  };
}

function makeGeometry(
  overrides: Partial<DragGeometrySnapshot> = {},
): DragGeometrySnapshot {
  return {
    previewItems: [
      {
        nodeId: 'leaf_a',
        offsetX: 0,
        offsetY: 0,
        width: 80,
        height: 40,
      },
    ],
    previewWidth: 80,
    previewHeight: 40,
    nodes: [
      {
        id: 'leaf_a',
        originX: 20,
        originY: 30,
        parentId: 'container_a',
      },
    ],
    sourceParentId: 'container_a',
    sourceContentBox: {
      left: 100,
      top: 100,
      width: 300,
      height: 200,
    },
    grabOffsetX: 40,
    grabOffsetY: 20,
    useVisualOffset: false,
    modelShiftX: 0,
    modelShiftY: 0,
    horizontalGuides: [],
    verticalGuides: [],
    dropTargets: [
      {
        id: 'container_a',
        contentBox: {
          left: 100,
          top: 100,
          width: 300,
          height: 200,
        },
        depth: 0,
        order: 1,
      },
      {
        id: 'container_b',
        contentBox: {
          left: 480,
          top: 100,
          width: 300,
          height: 200,
        },
        depth: 0,
        order: 2,
      },
    ],
    ...overrides,
  };
}

describe('api/dragDropApi', () => {
  it('keeps the drag session pending until movement exceeds 1px', () => {
    const { document, leafAId } = createDragDocument();
    const session = beginDragSession({
      document,
      anchorId: leafAId,
      selectedIds: [leafAId],
      startClientX: 140,
      startClientY: 120,
      geometry: makeGeometry({
        previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
        nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: document.nodes[leafAId]?.parentId ?? undefined }],
        sourceParentId: document.nodes[leafAId]?.parentId ?? undefined,
      }),
    });

    expect(updateDragSession(session, {
      clientX: 141,
      clientY: 120,
      shiftKey: false,
      altKey: false,
      guideSnap: { enabled: false, threshold: 8, power: 1 },
      containerSnap: { enabled: true, threshold: 0, power: 1 },
    }).phase).toBe('pending');

    expect(updateDragSession(session, {
      clientX: 142,
      clientY: 120,
      shiftKey: false,
      altKey: false,
      guideSnap: { enabled: false, threshold: 8, power: 1 },
      containerSnap: { enabled: true, threshold: 0, power: 1 },
    }).phase).toBe('dragging');
  });

  it('dedupes parent and child selection to drag only the parent', () => {
    const { document, containerAId, leafAId, sectionId } = createDragDocument();
    const session = beginDragSession({
      document,
      anchorId: leafAId,
      selectedIds: [containerAId, leafAId],
      startClientX: 180,
      startClientY: 140,
      geometry: makeGeometry({
        previewItems: [{ nodeId: containerAId, offsetX: 0, offsetY: 0, width: 300, height: 240 }],
        previewWidth: 300,
        previewHeight: 240,
        nodes: [{ id: containerAId, originX: 40, originY: 40, parentId: sectionId }],
        sourceParentId: sectionId,
        sourceContentBox: { left: 0, top: 0, width: 960, height: 900 },
        dropTargets: [
          { id: sectionId, contentBox: { left: 0, top: 0, width: 960, height: 900 }, depth: 0, order: 1 },
        ],
      }),
    });

    expect(session.anchorId).toBe(containerAId);
    expect(session.dragIds).toEqual([containerAId]);
  });

  it('moves same-parent multi-selection as a group', () => {
    const { document, leafAId, leafBId, containerAId } = createDragDocument();
    const commit = finishDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId, leafBId],
        startClientX: 140,
        startClientY: 120,
        geometry: makeGeometry({
          previewItems: [
            { nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 },
            { nodeId: leafBId, offsetX: 120, offsetY: 0, width: 80, height: 40 },
          ],
          previewWidth: 200,
          previewHeight: 40,
          nodes: [
            { id: leafAId, originX: 20, originY: 30, parentId: containerAId },
            { id: leafBId, originX: 140, originY: 30, parentId: containerAId },
          ],
          sourceParentId: containerAId,
        }),
      }),
      {
        clientX: 190,
        clientY: 150,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(commit).toMatchObject({
      type: 'moveSelection',
      moves: [
        { id: leafAId, x: '70px', y: '60px' },
        { id: leafBId, x: '190px', y: '60px' },
      ],
    });
  });

  it('falls back to anchor-only dragging for mixed-parent multi-selection', () => {
    const { document, leafAId, leafOtherId } = createDragDocument();
    const session = beginDragSession({
      document,
      anchorId: leafAId,
      selectedIds: [leafAId, leafOtherId],
      startClientX: 140,
      startClientY: 120,
      geometry: makeGeometry({
        previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
        nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: document.nodes[leafAId]?.parentId ?? undefined }],
        sourceParentId: document.nodes[leafAId]?.parentId ?? undefined,
      }),
    });

    expect(session.dragIds).toEqual([leafAId]);
  });

  it('returns a reparent commit for a valid drop target', () => {
    const { document, leafAId, containerAId, containerBId } = createDragDocument();
    const commit = finishDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 140,
        startClientY: 120,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          dropTargets: [
            { id: containerAId, contentBox: { left: 100, top: 100, width: 300, height: 200 }, depth: 0, order: 1 },
            { id: containerBId, contentBox: { left: 480, top: 100, width: 300, height: 200 }, depth: 0, order: 2 },
          ],
        }),
      }),
      {
        clientX: 560,
        clientY: 180,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(commit).toEqual({
      type: 'reparent',
      id: leafAId,
      parentId: containerBId,
      x: '40px',
      y: '60px',
    });
  });

  it('returns a reparentSelection commit for a valid multi-drop target', () => {
    const { document, leafAId, leafBId, containerAId, containerBId } = createDragDocument();
    const commit = finishDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId, leafBId],
        startClientX: 140,
        startClientY: 120,
        geometry: makeGeometry({
          previewItems: [
            { nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 },
            { nodeId: leafBId, offsetX: 120, offsetY: 0, width: 80, height: 40 },
          ],
          previewWidth: 200,
          previewHeight: 40,
          nodes: [
            { id: leafAId, originX: 20, originY: 30, parentId: containerAId },
            { id: leafBId, originX: 140, originY: 30, parentId: containerAId },
          ],
          sourceParentId: containerAId,
          dropTargets: [
            { id: containerAId, contentBox: { left: 100, top: 100, width: 300, height: 200 }, depth: 0, order: 1 },
            { id: containerBId, contentBox: { left: 480, top: 100, width: 300, height: 200 }, depth: 0, order: 2 },
          ],
        }),
      }),
      {
        clientX: 560,
        clientY: 180,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(commit).toEqual({
      type: 'reparentSelection',
      parentId: containerBId,
      moves: [
        { id: leafAId, x: '40px', y: '60px' },
        { id: leafBId, x: '160px', y: '60px' },
      ],
    });
  });

  it('falls back to moving inside the current parent when the hovered drop target is invalid', () => {
    const { document, containerAId, childContainerId, sectionId } = createDragDocument();
    const commit = finishDragSession(
      beginDragSession({
        document,
        anchorId: containerAId,
        selectedIds: [containerAId],
        startClientX: 190,
        startClientY: 160,
        geometry: makeGeometry({
          previewItems: [{ nodeId: containerAId, offsetX: 0, offsetY: 0, width: 300, height: 240 }],
          previewWidth: 300,
          previewHeight: 240,
          nodes: [{ id: containerAId, originX: 40, originY: 40, parentId: sectionId }],
          sourceParentId: sectionId,
          sourceContentBox: { left: 0, top: 0, width: 960, height: 900 },
          dropTargets: [
            { id: sectionId, contentBox: { left: 0, top: 0, width: 960, height: 900 }, depth: 0, order: 1 },
            { id: childContainerId, contentBox: { left: 180, top: 180, width: 180, height: 120 }, depth: 1, order: 2 },
          ],
        }),
      }),
      {
        clientX: 240,
        clientY: 220,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(commit).toEqual({
      type: 'move',
      id: containerAId,
      x: '200px',
      y: '200px',
    });
  });

  it('does not highlight the source parent or its ancestors while dragging inside it', () => {
    const { document, leafAId, containerAId, sectionId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 140,
        startClientY: 120,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          dropTargets: [
            { id: containerAId, contentBox: { left: 100, top: 100, width: 300, height: 200 }, depth: 0, order: 1 },
            { id: sectionId, contentBox: { left: 0, top: 0, width: 960, height: 900 }, depth: 0, order: 2 },
          ],
        }),
      }),
      {
        clientX: 180,
        clientY: 150,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(session.highlightedDropId).toBeNull();
  });

  it('highlights a structural source parent while dragging a container wrapper', () => {
    const { document, containerAId, sectionId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: containerAId,
        selectedIds: [containerAId],
        startClientX: 190,
        startClientY: 160,
        geometry: makeGeometry({
          previewItems: [{ nodeId: containerAId, offsetX: 0, offsetY: 0, width: 300, height: 240 }],
          previewWidth: 300,
          previewHeight: 240,
          nodes: [{ id: containerAId, originX: 40, originY: 40, parentId: sectionId }],
          sourceParentId: sectionId,
          sourceContentBox: { left: 0, top: 0, width: 960, height: 900 },
          dropTargets: [
            { id: sectionId, contentBox: { left: 0, top: 0, width: 960, height: 900 }, depth: 0, order: 1 },
          ],
        }),
      }),
      {
        clientX: 240,
        clientY: 220,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(session.highlightedDropId).toBe(sectionId);
  });

  it('clamps movement inside the parent content box on the right and bottom edges', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const commit = finishDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 140,
        startClientY: 120,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          sourceContentBox: { left: 100, top: 100, width: 120, height: 80 },
          dropTargets: [
            { id: containerAId, contentBox: { left: 100, top: 100, width: 120, height: 80 }, depth: 0, order: 1 },
          ],
        }),
      }),
      {
        clientX: 260,
        clientY: 220,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(commit).toEqual({
      type: 'move',
      id: leafAId,
      x: '40px',
      y: '40px',
    });
  });

  it('keeps sticky-shifted drags aligned to the visual rect', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const commit = finishDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 0,
        startClientY: 0,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 160, height: 40 }],
          previewWidth: 160,
          previewHeight: 40,
          nodes: [{ id: leafAId, originX: 0, originY: 0, parentId: containerAId }],
          sourceParentId: containerAId,
          sourceContentBox: { left: 416, top: 216, width: 288, height: 188 },
          grabOffsetX: 20,
          grabOffsetY: 18,
          useVisualOffset: true,
          modelShiftX: 14,
          modelShiftY: 9,
          dropTargets: [
            { id: containerAId, contentBox: { left: 416, top: 216, width: 288, height: 188 }, depth: 0, order: 1 },
          ],
        }),
      }),
      {
        clientX: 520,
        clientY: 300,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: false, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(commit).toEqual({
      type: 'move',
      id: leafAId,
      x: '70px',
      y: '57px',
    });
  });

  it('applies snapping on both axes after shift-lock and exposes guide sources', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 100,
        startClientY: 100,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          horizontalGuides: [{ value: 200, source: 'page', anchor: 'edge' }],
          verticalGuides: [{ value: 150, source: 'component', anchor: 'edge' }],
        }),
      }),
      {
        clientX: 206,
        clientY: 146,
        shiftKey: false,
        altKey: false,
        guideSnap: { enabled: true, threshold: 8, power: 1 },
        containerSnap: { enabled: true, threshold: 0, power: 1 },
      },
    );

    expect(session.phase).toBe('dragging');
    expect(session.currentClientX).toBe(200);
    expect(session.currentClientY).toBe(150);
    expect(session.guideX).toEqual({ value: 200, source: 'page', anchor: 'edge' });
    expect(session.guideY).toEqual({ value: 150, source: 'component', anchor: 'edge' });
  });

  it('locks to the dominant axis before snapping and inverts snapping with Alt', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const baseSession = beginDragSession({
      document,
      anchorId: leafAId,
      selectedIds: [leafAId],
      startClientX: 100,
      startClientY: 100,
      geometry: makeGeometry({
        previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
        nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
        sourceParentId: containerAId,
        horizontalGuides: [{ value: 160, source: 'page', anchor: 'edge' }],
        verticalGuides: [{ value: 200, source: 'page', anchor: 'edge' }],
      }),
    });

    const shifted = updateDragSession(baseSession, {
      clientX: 160,
      clientY: 120,
      shiftKey: true,
      altKey: false,
      guideSnap: { enabled: false, threshold: 8, power: 1 },
      containerSnap: { enabled: true, threshold: 0, power: 1 },
    });
    expect(shifted.currentClientY).toBe(120);

    const altDisabled = updateDragSession(baseSession, {
      clientX: 160,
      clientY: 120,
      shiftKey: false,
      altKey: true,
      guideSnap: { enabled: true, threshold: 8, power: 1 },
      containerSnap: { enabled: true, threshold: 0, power: 1 },
    });
    expect(altDisabled.guideX).toBeNull();
    expect(altDisabled.guideY).toBeNull();
  });

  it('cancels a session to null', () => {
    expect(cancelDragSession(null)).toBeNull();
  });
});
