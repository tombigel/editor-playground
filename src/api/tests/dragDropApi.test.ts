import { describe, expect, it } from 'vitest';
import {
  beginDragSession,
  cancelDragSession,
  finishDragSession,
  updateDragSession,
} from '../dragDropApi';
import type { DragGeometrySnapshot, DragUpdateInput } from '../types';
import { createDefaultRect, createInitialDocument, createContainerNode, createTextNode } from '../../model/defaults';
import type { DocumentModel, NodeId, TextNode, ContainerNode } from '../../model/types';

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
    (node): node is ContainerNode => node.contentType === 'container' && node.subtype === 'section',
  );
  if (!section) {
    throw new Error('Expected section wrapper');
  }

  const containerA = createContainerNode('container',section.id);
  containerA.rect = createDefaultRect('40px', '40px', '300px', '240px');
  const childContainer = createContainerNode('container',containerA.id);
  childContainer.rect = createDefaultRect('24px', '24px', '180px', '120px');
  const containerB = createContainerNode('container',section.id);
  containerB.rect = createDefaultRect('420px', '40px', '300px', '240px');

  const leafA = createTextNode('block',containerA.id) as TextNode;
  leafA.rect = createDefaultRect('20px', '30px', '80px', '40px');
  const leafB = createTextNode('block',containerA.id) as TextNode;
  leafB.rect = createDefaultRect('140px', '30px', '80px', '40px');
  const leafOther = createTextNode('block',containerB.id) as TextNode;
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

type DragInputOverrides = Omit<Partial<DragUpdateInput>, 'guideSnap' | 'containerSnap'> & {
  guideSnap?: Partial<DragUpdateInput['guideSnap']>;
  containerSnap?: Partial<DragUpdateInput['containerSnap']>;
};

function makeDragInput(
  overrides: DragInputOverrides = {},
): DragUpdateInput {
  return {
    clientX: overrides.clientX ?? 140,
    clientY: overrides.clientY ?? 120,
    timestampMs: overrides.timestampMs ?? 16,
    shiftKey: overrides.shiftKey ?? false,
    altKey: overrides.altKey ?? false,
    guideSnap: {
      enabled: true,
      threshold: 8,
      power: 1,
      maxSpeedPxPerSecond: 1200,
      ...(overrides.guideSnap ?? {}),
    },
    containerSnap: {
      enabled: true,
      threshold: 0,
      power: 1,
      ...(overrides.containerSnap ?? {}),
    },
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
      startTimestampMs: 0,
      geometry: makeGeometry({
        previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
        nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: document.nodes[leafAId]?.parentId ?? undefined }],
        sourceParentId: document.nodes[leafAId]?.parentId ?? undefined,
      }),
    });

    expect(updateDragSession(session, makeDragInput({
      clientX: 141,
      clientY: 120,
      timestampMs: 16,
      guideSnap: { enabled: false },
    })).phase).toBe('pending');

    expect(updateDragSession(session, makeDragInput({
      clientX: 142,
      clientY: 120,
      timestampMs: 32,
      guideSnap: { enabled: false },
    })).phase).toBe('dragging');
  });

  it('dedupes parent and child selection to drag only the parent', () => {
    const { document, containerAId, leafAId, sectionId } = createDragDocument();
    const session = beginDragSession({
      document,
      anchorId: leafAId,
      selectedIds: [containerAId, leafAId],
      startClientX: 180,
      startClientY: 140,
      startTimestampMs: 0,
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 190,
        clientY: 150,
        timestampMs: 40,
        guideSnap: { enabled: false },
      }),
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
      startTimestampMs: 0,
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 560,
        clientY: 180,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 560,
        clientY: 180,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 240,
        clientY: 220,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 180,
        clientY: 150,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 240,
        clientY: 220,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 260,
        clientY: 220,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
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
        startTimestampMs: 0,
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
      makeDragInput({
        clientX: 520,
        clientY: 300,
        timestampMs: 48,
        guideSnap: { enabled: false },
      }),
    );

    expect(commit).toEqual({
      type: 'move',
      id: leafAId,
      x: '70px',
      y: '57px',
    });
  });

  it('applies snapping on both axes for near-diagonal motion and exposes guide sources', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 100,
        startClientY: 100,
        startTimestampMs: 0,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          horizontalGuides: [{ value: 150, source: 'page', anchor: 'edge' }],
          verticalGuides: [{ value: 150, source: 'component', anchor: 'edge' }],
        }),
      }),
      makeDragInput({
        clientX: 146,
        clientY: 146,
        timestampMs: 48,
      }),
    );

    expect(session.phase).toBe('dragging');
    expect(session.currentClientX).toBe(150);
    expect(session.currentClientY).toBe(150);
    expect(session.guideX).toEqual({ value: 150, source: 'page', anchor: 'edge' });
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
      startTimestampMs: 0,
      geometry: makeGeometry({
        previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
        nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
        sourceParentId: containerAId,
        horizontalGuides: [{ value: 160, source: 'page', anchor: 'edge' }],
        verticalGuides: [{ value: 200, source: 'page', anchor: 'edge' }],
      }),
    });

    const shifted = updateDragSession(baseSession, makeDragInput({
      clientX: 160,
      clientY: 120,
      timestampMs: 48,
      shiftKey: true,
      guideSnap: { enabled: false },
    }));
    expect(shifted.currentClientY).toBe(120);

    const altDisabled = updateDragSession(baseSession, makeDragInput({
      clientX: 160,
      clientY: 120,
      timestampMs: 48,
      altKey: true,
    }));
    expect(altDisabled.guideX).toBeNull();
    expect(altDisabled.guideY).toBeNull();
  });

  it('computes smoothed drag motion from timestamped pointer updates', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 100,
        startClientY: 100,
        startTimestampMs: 0,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
        }),
      }),
      makeDragInput({
        clientX: 116,
        clientY: 108,
        timestampMs: 16,
        guideSnap: { enabled: false },
      }),
    );

    expect(session.motion.deltaX).toBe(16);
    expect(session.motion.deltaY).toBe(8);
    expect(session.motion.velocityX).toBeCloseTo(350, 5);
    expect(session.motion.velocityY).toBeCloseTo(175, 5);
    expect(session.motion.speedPxPerSecond).toBeCloseTo(Math.hypot(350, 175), 5);
    expect(session.motion.dominantAxis).toBe('horizontal');
  });

  it('skips guide snapping when drag speed exceeds the configured threshold', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 100,
        startClientY: 100,
        startTimestampMs: 0,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          horizontalGuides: [{ value: 200, source: 'page', anchor: 'edge' }],
        }),
      }),
      makeDragInput({
        clientX: 206,
        clientY: 120,
        timestampMs: 8,
      }),
    );

    expect(session.currentClientX).toBe(206);
    expect(session.guideX).toBeNull();
    expect(session.motion.speedPxPerSecond).toBeGreaterThan(1200);
  });

  it('preserves the visible unsnapped position when the pointer is released without moving', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const draggingSession = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 100,
        startClientY: 100,
        startTimestampMs: 0,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          horizontalGuides: [{ value: 200, source: 'page', anchor: 'edge' }],
        }),
      }),
      makeDragInput({
        clientX: 206,
        clientY: 120,
        timestampMs: 8,
      }),
    );

    expect(draggingSession.currentClientX).toBe(206);
    expect(draggingSession.guideX).toBeNull();

    const commit = finishDragSession(draggingSession, makeDragInput({
      clientX: 206,
      clientY: 120,
      timestampMs: 160,
    }));

    expect(commit).toEqual({
      type: 'move',
      id: leafAId,
      x: '66px',
      y: '0px',
    });
  });

  it('suppresses perpendicular guide snap when a dominant axis is clear', () => {
    const { document, leafAId, containerAId } = createDragDocument();
    const session = updateDragSession(
      beginDragSession({
        document,
        anchorId: leafAId,
        selectedIds: [leafAId],
        startClientX: 100,
        startClientY: 100,
        startTimestampMs: 0,
        geometry: makeGeometry({
          previewItems: [{ nodeId: leafAId, offsetX: 0, offsetY: 0, width: 80, height: 40 }],
          nodes: [{ id: leafAId, originX: 20, originY: 30, parentId: containerAId }],
          sourceParentId: containerAId,
          horizontalGuides: [{ value: 200, source: 'page', anchor: 'edge' }],
          verticalGuides: [{ value: 150, source: 'component', anchor: 'edge' }],
        }),
      }),
      makeDragInput({
        clientX: 206,
        clientY: 146,
        timestampMs: 80,
      }),
    );

    expect(session.currentClientX).toBe(200);
    expect(session.currentClientY).toBe(146);
    expect(session.guideX).toEqual({ value: 200, source: 'page', anchor: 'edge' });
    expect(session.guideY).toBeNull();
    expect(session.motion.dominantAxis).toBe('horizontal');
  });

  it('cancels a session to null', () => {
    expect(cancelDragSession(null)).toBeNull();
  });
});
