import { describe, expect, it } from 'vitest';
import { createContainerNode, createInitialDocument, createTextNode } from '../../model/defaults';
import type { DocumentModel } from '../../model/types';
import {
  areMeasuredNodeSizesEqual,
  measureCssViewport,
  measureStageNodeElement,
  measureStageNodeSizes,
  measureStageViewport,
} from '../math/measure';

describe('measureStageNodeElement', () => {
  it('measures from the inner content wrapper when the element is a stage-wrapper', () => {
    const size = measureStageNodeElement({
      dataset: { nodeId: 'section_8' } as DOMStringMap,
      classList: {
        contains: (value: string) => value === 'stage-wrapper',
      } as unknown as DOMTokenList,
      getBoundingClientRect: () => ({ width: 996, height: 556 }) as DOMRect,
      querySelector: (selector: string) =>
        selector === '[data-content-wrapper-for="section_8"]'
          ? ({ getBoundingClientRect: () => ({ width: 994, height: 554 }) as DOMRect } as HTMLElement)
          : null,
    } as unknown as HTMLElement);

    expect(size).toEqual({ width: 994, height: 554 });
  });

  it('measures directly from the element when it is not a stage-wrapper', () => {
    const size = measureStageNodeElement({
      dataset: { nodeId: 'text_1' } as DOMStringMap,
      classList: { contains: () => false } as unknown as DOMTokenList,
      getBoundingClientRect: () => ({ width: 200, height: 40 }) as DOMRect,
      querySelector: () => null,
    } as unknown as HTMLElement);

    expect(size).toEqual({ width: 200, height: 40 });
  });

  it('returns null when the element has no node id', () => {
    const size = measureStageNodeElement({
      dataset: {} as DOMStringMap,
      classList: { contains: () => false } as unknown as DOMTokenList,
      getBoundingClientRect: () => ({ width: 200, height: 40 }) as DOMRect,
      querySelector: () => null,
    } as unknown as HTMLElement);

    expect(size).toBeNull();
  });

  it('returns null when the measured rect has zero width or height', () => {
    const size = measureStageNodeElement({
      dataset: { nodeId: 'text_1' } as DOMStringMap,
      classList: { contains: () => false } as unknown as DOMTokenList,
      getBoundingClientRect: () => ({ width: 0, height: 40 }) as DOMRect,
      querySelector: () => null,
    } as unknown as HTMLElement);

    expect(size).toBeNull();
  });

  it('falls back to the wrapper element rect when the content wrapper is not found', () => {
    const size = measureStageNodeElement({
      dataset: { nodeId: 'section_8' } as DOMStringMap,
      classList: { contains: (value: string) => value === 'stage-wrapper' } as unknown as DOMTokenList,
      getBoundingClientRect: () => ({ width: 500, height: 300 }) as DOMRect,
      querySelector: () => null,
    } as unknown as HTMLElement);

    expect(size).toEqual({ width: 500, height: 300 });
  });
});

describe('measureStageNodeSizes', () => {
  function makeElement(nodeId: string, width: number, height: number) {
    return {
      dataset: { nodeId },
      classList: { contains: () => false },
      getBoundingClientRect: () => ({ width, height }) as DOMRect,
      querySelector: () => null,
    } as unknown as HTMLElement;
  }

  it('measures percentage-width and auto-height nodes, keyed by node id', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const text = createTextNode('block', section.id);
    // text default rect uses fixed px width and 'auto' height per createDefaultRect('32px','32px','320px','auto')
    document.nodes[text.id] = text;
    section.children.push(text.id);

    const root = {
      querySelectorAll: () => [makeElement(text.id, 300, 45)] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    const sizes = measureStageNodeSizes(root, document);

    // width is fixed px (not %) -> not measured (0); height is 'auto' keyword -> measured
    expect(sizes[text.id]).toEqual({ width: 0, height: 45 });
  });

  it('skips elements without a node id', () => {
    const document = structuredClone(createInitialDocument());
    const root = {
      querySelectorAll: () =>
        [
          {
            dataset: {},
            classList: { contains: () => false },
            getBoundingClientRect: () => ({ width: 100, height: 100 }) as DOMRect,
            querySelector: () => null,
          },
        ] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    expect(measureStageNodeSizes(root, document)).toEqual({});
  });

  it('skips elements whose node id is not present in the document', () => {
    const document = structuredClone(createInitialDocument());
    const root = {
      querySelectorAll: () => [makeElement('missing-node', 100, 100)] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    expect(measureStageNodeSizes(root, document)).toEqual({});
  });

  it('skips the site root node', () => {
    const document = structuredClone(createInitialDocument());
    const root = {
      querySelectorAll: () => [makeElement(document.rootId, 100, 100)] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    expect(measureStageNodeSizes(root, document)).toEqual({});
  });

  it('skips nodes whose measurement yields zero for both width and height', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const container = createContainerNode('container', section.id);
    // default container rect: width 360px, height 240px -> both fixed px, neither % nor auto
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const root = {
      querySelectorAll: () => [makeElement(container.id, 360, 240)] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    expect(measureStageNodeSizes(root, document)).toEqual({});
  });

  it('does not feed measured auto height back into group layout', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const group = createContainerNode('group', section.id);
    document.nodes[group.id] = group;
    section.children.push(group.id);

    const root = {
      querySelectorAll: () => [makeElement(group.id, 320, 480)] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    expect(measureStageNodeSizes(root, document)).toEqual({});
  });

  it('measures percentage width nodes', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    // section rect uses width '100%' by default (createDefaultRect('0px','0px','100%','480px'))
    const root = {
      querySelectorAll: () => [makeElement(section.id, 1000, 480)] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    const sizes = measureStageNodeSizes(root, document as DocumentModel);
    expect(sizes[section.id]).toEqual({ width: 1000, height: 0 });
  });

  it('returns an empty map when no elements are found', () => {
    const document = structuredClone(createInitialDocument());
    const root = {
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    } as unknown as HTMLElement;

    expect(measureStageNodeSizes(root, document)).toEqual({});
  });
});

describe('measureStageViewport', () => {
  it('returns width/height minus padding when the rect and computed styles are valid', () => {
    const root = {
      getBoundingClientRect: () => ({ width: 1000, height: 800 }) as DOMRect,
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            paddingLeft: '10px',
            paddingRight: '20px',
            paddingTop: '5px',
            paddingBottom: '15px',
          }),
        },
      },
    } as unknown as Pick<HTMLElement, 'getBoundingClientRect' | 'ownerDocument'>;

    expect(measureStageViewport(root)).toEqual({ width: 970, height: 780 });
  });

  it('returns null when there is no default view', () => {
    const root = {
      getBoundingClientRect: () => ({ width: 1000, height: 800 }) as DOMRect,
      ownerDocument: { defaultView: null },
    } as unknown as Pick<HTMLElement, 'getBoundingClientRect' | 'ownerDocument'>;

    expect(measureStageViewport(root)).toBeNull();
  });

  it('returns null when the rect has zero width or height', () => {
    const root = {
      getBoundingClientRect: () => ({ width: 0, height: 800 }) as DOMRect,
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            paddingLeft: '0px',
            paddingRight: '0px',
            paddingTop: '0px',
            paddingBottom: '0px',
          }),
        },
      },
    } as unknown as Pick<HTMLElement, 'getBoundingClientRect' | 'ownerDocument'>;

    expect(measureStageViewport(root)).toBeNull();
  });

  it('returns null when padding consumes the entire rect', () => {
    const root = {
      getBoundingClientRect: () => ({ width: 20, height: 20 }) as DOMRect,
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingTop: '10px',
            paddingBottom: '10px',
          }),
        },
      },
    } as unknown as Pick<HTMLElement, 'getBoundingClientRect' | 'ownerDocument'>;

    expect(measureStageViewport(root)).toBeNull();
  });

  it('treats missing/invalid padding values as zero', () => {
    const root = {
      getBoundingClientRect: () => ({ width: 500, height: 400 }) as DOMRect,
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            paddingLeft: '',
            paddingRight: 'auto',
            paddingTop: undefined,
            paddingBottom: undefined,
          }),
        },
      },
    } as unknown as Pick<HTMLElement, 'getBoundingClientRect' | 'ownerDocument'>;

    expect(measureStageViewport(root)).toEqual({ width: 500, height: 400 });
  });
});

describe('measureCssViewport', () => {
  it('measures from the browser viewport instead of the stage canvas', () => {
    expect(
      measureCssViewport(
        {
          ownerDocument: {
            defaultView: { innerWidth: 1600, innerHeight: 1000 },
          },
        } as unknown as Pick<HTMLElement, 'ownerDocument'>,
        { width: 900, height: 700 },
      ),
    ).toEqual({ width: 1600, height: 1000 });
  });

  it('returns the fallback when root is null', () => {
    expect(measureCssViewport(null, { width: 900, height: 700 })).toEqual({ width: 900, height: 700 });
  });

  it('returns the fallback when there is no default view', () => {
    expect(
      measureCssViewport(
        { ownerDocument: { defaultView: null } } as unknown as Pick<HTMLElement, 'ownerDocument'>,
        { width: 900, height: 700 },
      ),
    ).toEqual({ width: 900, height: 700 });
  });

  it('returns the fallback when viewport dimensions are zero or negative', () => {
    expect(
      measureCssViewport(
        {
          ownerDocument: { defaultView: { innerWidth: 0, innerHeight: 1000 } },
        } as unknown as Pick<HTMLElement, 'ownerDocument'>,
        { width: 900, height: 700 },
      ),
    ).toEqual({ width: 900, height: 700 });
  });

  it('uses the default fallback constant when none is supplied', () => {
    const result = measureCssViewport({
      ownerDocument: { defaultView: null },
    } as unknown as Pick<HTMLElement, 'ownerDocument'>);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});

describe('areMeasuredNodeSizesEqual', () => {
  it('returns true for identical maps', () => {
    const a = { node1: { width: 100, height: 50 } };
    const b = { node1: { width: 100, height: 50 } };
    expect(areMeasuredNodeSizesEqual(a, b)).toBe(true);
  });

  it('treats sub-half-pixel differences as equal', () => {
    const a = { node1: { width: 100, height: 50 } };
    const b = { node1: { width: 100.3, height: 49.8 } };
    expect(areMeasuredNodeSizesEqual(a, b)).toBe(true);
  });

  it('returns false when a value differs beyond tolerance', () => {
    const a = { node1: { width: 100, height: 50 } };
    const b = { node1: { width: 105, height: 50 } };
    expect(areMeasuredNodeSizesEqual(a, b)).toBe(false);
  });

  it('returns false when key sets differ in size', () => {
    const a = { node1: { width: 100, height: 50 } };
    const b = { node1: { width: 100, height: 50 }, node2: { width: 10, height: 10 } };
    expect(areMeasuredNodeSizesEqual(a, b)).toBe(false);
  });

  it('returns false when key sets differ in content but not size', () => {
    const a = { node1: { width: 100, height: 50 } };
    const b = { node2: { width: 100, height: 50 } };
    expect(areMeasuredNodeSizesEqual(a, b)).toBe(false);
  });

  it('returns true for two empty maps', () => {
    expect(areMeasuredNodeSizesEqual({}, {})).toBe(true);
  });
});
