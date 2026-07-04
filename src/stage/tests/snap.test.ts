import { describe, expect, it } from 'vitest';
import { createContainerNode, createInitialDocument, createTextNode } from '../../model/defaults';
import type { DocumentModel } from '../../model/types';
import {
  collectAllSnapTargets,
  collectPageSnapTargets,
  collectVerticalSnapTargets,
  findDropWrapper,
  findDropWrapperElement,
  findHorizontalSnap,
  findVerticalSnap,
} from '../math/snap';
import type { SnapTarget } from '../types';

function makeElement(rect: Partial<DOMRect>, nodeId: string) {
  return {
    dataset: { nodeId },
    getBoundingClientRect: () => rect as DOMRect,
  } as unknown as HTMLElement;
}

describe('findHorizontalSnap', () => {
  it('snaps to the nearest target within the threshold', () => {
    const targets: SnapTarget[] = [
      { value: 100, source: 'component', anchor: 'edge' },
      { value: 105, source: 'page', anchor: 'edge' },
    ];
    // left edge anchor = 100 -> distance 0 to first target, 5 to second
    const result = findHorizontalSnap(100, 200, targets);
    expect(result).toMatchObject({ target: 100, distance: 0, source: 'component', anchor: 'edge' });
  });

  it('does not snap when every target is outside the threshold', () => {
    const targets: SnapTarget[] = [{ value: 200, source: 'component', anchor: 'edge' }];
    // anchors: 0, 50, 100 - all far from 200
    const result = findHorizontalSnap(0, 100, targets);
    expect(result).toBeNull();
  });

  it('picks the first-encountered target on an exact tie', () => {
    const targets: SnapTarget[] = [
      { value: 104, source: 'component', anchor: 'edge' },
      { value: 96, source: 'page', anchor: 'edge' },
    ];
    // left anchor = 100, both targets are distance 4 away
    const result = findHorizontalSnap(100, 200, targets);
    expect(result).toMatchObject({ target: 104, source: 'component' });
  });

  it('checks left, center, and right anchors against targets', () => {
    const targets: SnapTarget[] = [{ value: 200, source: 'component', anchor: 'center' }];
    // left=100, center=200, right=300 for left=100 width=200
    const result = findHorizontalSnap(100, 200, targets);
    expect(result).toMatchObject({ target: 200, distance: 0, anchor: 'center' });
  });

  it('respects the exact snap threshold boundary', () => {
    const targets: SnapTarget[] = [{ value: 108, source: 'component', anchor: 'edge' }];
    // left anchor = 100, distance 8 == threshold, should snap
    const withinThreshold = findHorizontalSnap(100, 200, targets);
    expect(withinThreshold).toMatchObject({ target: 108 });

    const outsideThreshold = findHorizontalSnap(100, 200, [
      { value: 109, source: 'component', anchor: 'edge' },
    ]);
    expect(outsideThreshold).toBeNull();
  });
});

describe('findVerticalSnap', () => {
  it('snaps to the nearest target within the threshold', () => {
    const targets: SnapTarget[] = [
      { value: 50, source: 'component', anchor: 'edge' },
      { value: 54, source: 'page', anchor: 'edge' },
    ];
    // top anchor = 50
    const result = findVerticalSnap(50, 100, targets);
    expect(result).toMatchObject({ target: 50, distance: 0, source: 'component', anchor: 'edge' });
  });

  it('does not snap when outside the threshold', () => {
    const targets: SnapTarget[] = [{ value: 500, source: 'page', anchor: 'edge' }];
    const result = findVerticalSnap(0, 100, targets);
    expect(result).toBeNull();
  });

  it('checks top, middle, and bottom anchors against targets', () => {
    const targets: SnapTarget[] = [{ value: 150, source: 'page', anchor: 'center' }];
    // top=50, middle=150, bottom=250 for top=50 height=200
    const result = findVerticalSnap(50, 200, targets);
    expect(result).toMatchObject({ target: 150, distance: 0, anchor: 'center' });
  });
});

describe('collectVerticalSnapTargets', () => {
  it('collects top/center/bottom targets from rendered nodes, excluding the dragged node', () => {
    const elements = [
      makeElement({ top: 10, bottom: 110, height: 100, width: 50 }, 'node-a'),
      makeElement({ top: 200, bottom: 260, height: 60, width: 50 }, 'dragged'),
    ];
    const documentRef = {
      querySelectorAll: () => elements as unknown as NodeListOf<HTMLElement>,
    };

    const targets = collectVerticalSnapTargets('dragged', documentRef);

    expect(targets).toEqual([
      { value: 10, source: 'component', anchor: 'edge' },
      { value: 60, source: 'component', anchor: 'center' },
      { value: 110, source: 'component', anchor: 'edge' },
    ]);
  });

  it('skips elements with zero width or height', () => {
    const elements = [makeElement({ top: 0, bottom: 0, height: 0, width: 0 }, 'node-a')];
    const documentRef = {
      querySelectorAll: () => elements as unknown as NodeListOf<HTMLElement>,
    };

    expect(collectVerticalSnapTargets('other', documentRef)).toEqual([]);
  });
});

describe('collectPageSnapTargets', () => {
  it('falls back to window dimensions when no stage frame is present', () => {
    const documentRef = { querySelector: () => null };
    const windowRef = { innerWidth: 1000, innerHeight: 800 };

    const result = collectPageSnapTargets(documentRef, windowRef);

    expect(result.horizontal).toEqual([
      { value: 0, source: 'page', anchor: 'edge' },
      { value: 500, source: 'page', anchor: 'center' },
      { value: 1000, source: 'page', anchor: 'edge' },
    ]);
    expect(result.vertical).toEqual([
      { value: 0, source: 'page', anchor: 'edge' },
      { value: 400, source: 'page', anchor: 'center' },
      { value: 800, source: 'page', anchor: 'edge' },
    ]);
  });

  it('uses the stage frame bounding rect when present', () => {
    const frame = {
      getBoundingClientRect: () =>
        ({ left: 20, right: 620, top: 10, bottom: 410, width: 600, height: 400 }) as DOMRect,
    };
    const documentRef = { querySelector: () => frame as unknown as HTMLElement };
    const windowRef = { innerWidth: 1000, innerHeight: 800 };

    const result = collectPageSnapTargets(documentRef, windowRef);

    expect(result.horizontal).toEqual([
      { value: 20, source: 'page', anchor: 'edge' },
      { value: 320, source: 'page', anchor: 'center' },
      { value: 620, source: 'page', anchor: 'edge' },
    ]);
    expect(result.vertical).toEqual([
      { value: 10, source: 'page', anchor: 'edge' },
      { value: 210, source: 'page', anchor: 'center' },
      { value: 410, source: 'page', anchor: 'edge' },
    ]);
  });
});

describe('collectAllSnapTargets', () => {
  it('combines page horizontal targets with component + page vertical targets', () => {
    const elements = [makeElement({ top: 30, bottom: 90, height: 60, width: 40 }, 'node-a')];
    const documentRef = {
      querySelector: () => null,
      querySelectorAll: () => elements as unknown as NodeListOf<HTMLElement>,
    };
    const windowRef = { innerWidth: 1000, innerHeight: 800 };

    const result = collectAllSnapTargets('dragged', documentRef, windowRef);

    expect(result.horizontal).toEqual([
      { value: 0, source: 'page', anchor: 'edge' },
      { value: 500, source: 'page', anchor: 'center' },
      { value: 1000, source: 'page', anchor: 'edge' },
    ]);
    expect(result.vertical).toEqual([
      { value: 30, source: 'component', anchor: 'edge' },
      { value: 60, source: 'component', anchor: 'center' },
      { value: 90, source: 'component', anchor: 'edge' },
      { value: 0, source: 'page', anchor: 'edge' },
      { value: 400, source: 'page', anchor: 'center' },
      { value: 800, source: 'page', anchor: 'edge' },
    ]);
  });
});

describe('findDropWrapperElement', () => {
  it('finds the wrapper element matching the given wrapper id', () => {
    const match = { dataset: { dropWrapperId: 'wrapper-2' } } as unknown as HTMLElement;
    const wrappers = [
      { dataset: { dropWrapperId: 'wrapper-1' } } as unknown as HTMLElement,
      match,
    ];
    const documentRef = { querySelectorAll: () => wrappers as unknown as NodeListOf<HTMLElement> };

    expect(findDropWrapperElement('wrapper-2', documentRef)).toBe(match);
  });

  it('returns null when no wrapper matches', () => {
    const documentRef = { querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement> };
    expect(findDropWrapperElement('missing', documentRef)).toBeNull();
  });
});

describe('findDropWrapper', () => {
  function buildDocumentWithContainer(): { document: DocumentModel; section: string; container: string } {
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
    return { document, section: section.id, container: container.id };
  }

  it('returns null when the dragged node has no parent (e.g. site root)', () => {
    const document = createInitialDocument();
    const siteId = document.rootId;
    const documentRef = {
      elementFromPoint: () => ({}) as HTMLElement,
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    };
    expect(findDropWrapper(document, siteId, 0, 0, documentRef)).toBeNull();
  });

  it('returns null when elementFromPoint finds nothing', () => {
    const { document, container } = buildDocumentWithContainer();
    const documentRef = {
      elementFromPoint: () => null,
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    };
    expect(findDropWrapper(document, container, 10, 10, documentRef)).toBeNull();
  });

  it('walks up from the hit element to find a valid drop wrapper ancestor', () => {
    const { document, section, container } = buildDocumentWithContainer();
    const text = createTextNode('block', container);
    document.nodes[text.id] = text;
    document.nodes[container].contentType === 'container' &&
      (document.nodes[container] as { children: string[] }).children.push(text.id);

    const wrapperElement = {
      dataset: { dropWrapperId: section },
      parentElement: null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect,
    } as unknown as HTMLElement;
    const hitElement = {
      dataset: {},
      parentElement: wrapperElement,
    } as unknown as HTMLElement;

    const documentRef = {
      elementFromPoint: () => hitElement,
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    };

    const result = findDropWrapper(document, text.id, 5, 5, documentRef);
    expect(result).toMatchObject({ wrapperId: section });
  });

  it('falls back to the current parent wrapper when the hovered drop target is invalid', () => {
    const { document, section, container } = buildDocumentWithContainer();

    const invalidTarget = {
      dataset: { dropWrapperId: container },
      parentElement: null,
      getBoundingClientRect: () => ({ left: 220, top: 140, width: 300, height: 180 }) as DOMRect,
    } as unknown as HTMLElement;
    const parentWrapper = {
      dataset: { dropWrapperId: section },
      getBoundingClientRect: () => ({ left: 100, top: 40, width: 900, height: 600 }) as DOMRect,
    } as unknown as HTMLElement;
    const documentRef = {
      elementFromPoint: () => invalidTarget,
      querySelectorAll: () => [parentWrapper] as unknown as NodeListOf<HTMLElement>,
    };

    expect(findDropWrapper(document, container, 250, 200, documentRef)).toMatchObject({
      wrapperId: section,
      rect: { left: 100, top: 40 },
    });
  });

  it('returns null when the fallback parent wrapper element cannot be found either', () => {
    const { document, container } = buildDocumentWithContainer();

    const invalidTarget = {
      dataset: { dropWrapperId: container },
      parentElement: null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) as DOMRect,
    } as unknown as HTMLElement;
    const documentRef = {
      elementFromPoint: () => invalidTarget,
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    };

    expect(findDropWrapper(document, container, 5, 5, documentRef)).toBeNull();
  });

  it('rejects a candidate wrapper that is a descendant of the dragged node', () => {
    const { document, container } = buildDocumentWithContainer();
    const child = createContainerNode('container', container);
    document.nodes[child.id] = child;
    (document.nodes[container] as { children: string[] }).children.push(child.id);

    const descendantWrapperElement = {
      dataset: { dropWrapperId: child.id },
      parentElement: null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) as DOMRect,
    } as unknown as HTMLElement;
    const hitElement = {
      dataset: {},
      parentElement: descendantWrapperElement,
    } as unknown as HTMLElement;

    const documentRef = {
      elementFromPoint: () => hitElement,
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    };

    // container cannot be dropped into its own descendant; falls back to null since
    // container has no parentId configured for a further fallback other than section.
    const result = findDropWrapper(document, container, 5, 5, documentRef);
    expect(result === null || result.wrapperId !== child.id).toBe(true);
  });
});
