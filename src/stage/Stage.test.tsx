import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDefaultRect, createInitialDocument, createLeaf, createWrapper } from '../model/defaults';
import { parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue } from '../model/units';
import { resolveWrapperStickyState } from '../sticky/resolve';
import {
  didDragPointerMove,
  findDropWrapper,
  getDragElementRect,
  getNodeHeight,
  getNodeWidth,
  getResizeCommitSize,
  getShiftLockedPointer,
  measureStageNodeElement,
  resolveDragPointerPosition,
} from './stageMath';
import {
  Stage,
} from './Stage';

describe('stage/Stage', () => {
  it.each(['fit-content', 'max-content', 'min-content'])(
    'preserves %s width for text leaves in the stage DOM',
    (widthKeyword) => {
      const document = structuredClone(createInitialDocument());
      const target = Object.values(document.nodes).find(
        (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
      );

      if (!target || target.type !== 'leaf' || target.role !== 'text') {
        throw new Error('Expected post title text node');
      }

      target.rect.width.base = parseWidthValue(widthKeyword);

      const markup = renderToStaticMarkup(
        <Stage
          document={document}
          selectedId={null}
          previewSticky={true}
          spacerVisibility="selected"
          showGridLanes={false}
          snapEnabled={true}
          onStageFocus={() => {}}
          onSelect={() => {}}
          onMove={() => {}}
          onReparent={() => {}}
          onResize={() => {}}
          onResizeStart={() => {}}
          onResizeEnd={() => {}}
        />,
      );

      expect(markup).toContain(`id="stage-node-${target.id}"`);
      const nodeMarkupMatch = markup.match(new RegExp(`id="stage-node-${target.id}"[^>]*style="([^"]+)"`));
      expect(nodeMarkupMatch?.[1]).toContain(`width:${widthKeyword}`);
      expect(nodeMarkupMatch?.[1]).not.toContain('width:100%');
    },
  );

  it('renders text leaves using their configured html tag in the stage', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.htmlTag = 'blockquote';

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={null}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onMove={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    expect(markup).toContain('<blockquote');
  });

  it('renders text decoration styles for text leaves in the stage', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style ??= {};
    target.style.textDecorationLine = 'underline line-through';

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={null}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onMove={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    expect(markup).toContain('text-decoration-line:underline line-through');
  });

  it('renders text direction styles for text leaves in the stage', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style ??= {};
    target.style.direction = 'rtl';

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={null}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onMove={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    expect(markup).toContain('direction:rtl');
  });

  it('keeps text styling stable when the html tag changes in the stage', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.htmlTag = 'blockquote';
    target.style ??= {};
    target.style.fontSize = parseFontSizeValue('31px');
    target.style.fontWeight = 'bold';
    target.style.lineHeight = 1.4;

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={null}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onMove={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    const tagMarkupMatch = markup.match(/<blockquote style="([^"]+)">/);
    expect(tagMarkupMatch?.[1]).toContain('margin:0');
    expect(tagMarkupMatch?.[1]).toContain('max-width:100%');
    expect(tagMarkupMatch?.[1]).toContain('white-space:pre-wrap');
    expect(tagMarkupMatch?.[1]).toContain('font-size:31px');
    expect(tagMarkupMatch?.[1]).toContain('font-weight:bold');
    expect(tagMarkupMatch?.[1]).toContain('letter-spacing:-0.02em');
    expect(tagMarkupMatch?.[1]).toContain('line-height:1.4');
  });

  it('uses measured runtime geometry for intrinsic text sizing', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.rect.width.base = parseWidthValue('fit-content');
    target.rect.height.base = parseHeightValue('auto');

    const measuredNodeSizes = {
      [target.id]: {
        width: 312,
        height: 91,
      },
    };

    expect(getNodeWidth(target, measuredNodeSizes)).toBe(312);
    expect(getNodeHeight(target, measuredNodeSizes)).toBe(91);
  });

  it('derives aspect-ratio height from measured runtime width', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'image' && node.name === 'Post Image',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'image') {
      throw new Error('Expected post image node');
    }

    const measuredNodeSizes = {
      [target.id]: {
        width: 400,
        height: 300,
      },
    };

    expect(getNodeWidth(target, measuredNodeSizes)).toBe(400);
    expect(getNodeHeight(target, measuredNodeSizes)).toBe(300);
  });

  it('keeps auto height when resizing width from a horizontal handle', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.rect.height.base = parseHeightValue('auto');

    expect(
      getResizeCommitSize(
        target,
        {
          nodeId: target.id,
          handle: 'e',
          startClientX: 0,
          startClientY: 0,
          originX: 0,
          originY: 0,
          originWidth: 520,
          originHeight: 145,
        },
        600,
        145,
      ),
    ).toEqual({ width: '600px', height: 'auto' });
  });

  it('keeps aspect-ratio height authored when resizing width from a horizontal handle', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'image' && node.name === 'Post Image',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'image') {
      throw new Error('Expected post image node');
    }

    target.rect.height.base = parseHeightValue('aspect-ratio(4/3)');

    expect(
      getResizeCommitSize(
        target,
        {
          nodeId: target.id,
          handle: 'e',
          startClientX: 0,
          startClientY: 0,
          originX: 0,
          originY: 0,
          originWidth: 420,
          originHeight: 315,
        },
        500,
        315,
      ),
    ).toEqual({ width: '500px', height: 'aspect-ratio(4/3)' });
  });

  it('keeps keyword width authored when resizing height from a vertical handle', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.rect.width.base = parseWidthValue('fit-content');

    expect(
      getResizeCommitSize(
        target,
        {
          nodeId: target.id,
          handle: 's',
          startClientX: 0,
          startClientY: 0,
          originX: 0,
          originY: 0,
          originWidth: 520,
          originHeight: 145,
        },
        520,
        220,
      ),
    ).toEqual({ width: 'fit-content', height: '220px' });
  });

  it('treats click jitter as selection instead of a committed drag', () => {
    expect(
      didDragPointerMove(
        {
          startClientX: 200,
          startClientY: 320,
        },
        201,
        320,
      ),
    ).toBe(false);
    expect(
      didDragPointerMove(
        {
          startClientX: 200,
          startClientY: 320,
        },
        200,
        321,
      ),
    ).toBe(false);
    expect(
      didDragPointerMove(
        {
          startClientX: 200,
          startClientY: 320,
        },
        202,
        320,
      ),
    ).toBe(true);
  });

  it('anchors intrinsic-height text leaves to the top of their mesh area', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.rect.height.base = parseHeightValue('auto');

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={target.id}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onMove={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    const nodeMarkupMatch = markup.match(new RegExp(`id="stage-node-${target.id}"[^>]*style="([^"]+)"`));
    expect(nodeMarkupMatch?.[1]).toContain('align-self:start');
    expect(nodeMarkupMatch?.[1]).toContain('height:auto');
  });

  it('measures wrappers from the inner content box to avoid border feedback loops', () => {
    const size = measureStageNodeElement({
      dataset: { nodeId: 'section_8' } as DOMStringMap,
      classList: {
        contains: (value: string) => value === 'stage-wrapper',
      } as unknown as DOMTokenList,
      getBoundingClientRect: () =>
        ({
          width: 996,
          height: 556,
        }) as DOMRect,
      querySelector: (selector: string) =>
        selector === '[data-content-wrapper-for="section_8"]'
          ? ({
              getBoundingClientRect: () =>
                ({
                  width: 994,
                  height: 554,
                }) as DOMRect,
            } as HTMLElement)
          : null,
    } as HTMLElement);

    expect(size).toEqual({
      width: 994,
      height: 554,
    });
  });

  it('derives content-wrapper sticky extent locally from measured wrapper geometry', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('180px'),
      durationTop: parseUnitValue('180px'),
      durationBottom: parseUnitValue('180px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    const stickyState = resolveWrapperStickyState(section, [], {
      nodeSizes: {
        [section.id]: { width: 1000, height: 320 },
      },
    });

    expect(stickyState.totalExtraExtentPx).toBe(180);
    expect(stickyState.registrations[0]).toMatchObject({
      ownerId: section.id,
      parentWrapperId: section.id,
      startPx: 320,
      durationPx: 180,
      extentPx: 180,
    });
  });

  it('derives child sticky start positions from child coordinates and measured height', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.children = [];
    const stickyLeaf = createLeaf('text', section.id);
    stickyLeaf.rect = createDefaultRect('24px', '100px', '200px', 'auto');
    stickyLeaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('120px'),
      durationTop: parseUnitValue('120px'),
      durationBottom: parseUnitValue('120px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    document.nodes[stickyLeaf.id] = stickyLeaf;
    section.children.push(stickyLeaf.id);

    const stickyState = resolveWrapperStickyState(section, [stickyLeaf], {
      nodeSizes: {
        [section.id]: { width: 1000, height: 600 },
        [stickyLeaf.id]: { width: 200, height: 84 },
      },
    });

    expect(stickyState.registrations[0]).toMatchObject({
      ownerId: stickyLeaf.id,
      parentWrapperId: section.id,
      startPx: 184,
      durationPx: 120,
      endPx: 304,
    });
  });

  it('locks drag movement to the dominant axis when shift is held', () => {
    expect(
      getShiftLockedPointer(
        {
          startClientX: 100,
          startClientY: 100,
        } as const,
        140,
        110,
        true,
      ),
    ).toEqual({
      clientX: 140,
      clientY: 100,
    });

    expect(
      getShiftLockedPointer(
        {
          startClientX: 100,
          startClientY: 100,
        } as const,
        105,
        150,
        true,
      ),
    ).toEqual({
      clientX: 100,
      clientY: 150,
    });
  });

  it('inverts snapping with Alt while dragging', () => {
    const dragState = {
      nodeId: 'leaf_1',
      startClientX: 104,
      startClientY: 77,
      currentClientX: 104,
      currentClientY: 77,
      grabOffsetX: 0,
      grabOffsetY: 0,
      useVisualOffset: false,
      modelShiftX: 0,
      modelShiftY: 0,
      previewWidth: 50,
      previewHeight: 40,
      originX: 0,
      originY: 0,
    } as const;
    const documentRef = {
      querySelector: () =>
        ({
          getBoundingClientRect: () =>
            ({
              left: 100,
              top: 40,
              width: 400,
              height: 400,
              right: 500,
              bottom: 440,
            }) as DOMRect,
        }) as HTMLElement,
      querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    };
    const windowRef = {
      innerWidth: 1440,
      innerHeight: 900,
    };

    expect(
      resolveDragPointerPosition(dragState, 104, 77, {
        shiftKey: false,
        altKey: false,
        snapEnabled: true,
        documentRef,
        windowRef,
      }),
    ).toMatchObject({
      clientX: 100,
      guideX: 100,
      guideXSource: 'page',
    });

    expect(
      resolveDragPointerPosition(dragState, 104, 77, {
        shiftKey: false,
        altKey: true,
        snapEnabled: true,
        documentRef,
        windowRef,
      }),
    ).toMatchObject({
      clientX: 104,
      guideX: null,
      guideY: null,
    });
  });

  it('falls back to the current parent wrapper when the hovered drop target is invalid', () => {
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

    const invalidTarget = {
      dataset: { dropWrapperId: container.id },
      parentElement: null,
      getBoundingClientRect: () =>
        ({
          left: 220,
          top: 140,
          width: 300,
          height: 180,
          right: 520,
          bottom: 320,
        }) as DOMRect,
    } as unknown as HTMLElement;
    const parentWrapper = {
      dataset: { dropWrapperId: section.id },
      getBoundingClientRect: () =>
        ({
          left: 100,
          top: 40,
          width: 900,
          height: 600,
          right: 1000,
          bottom: 640,
        }) as DOMRect,
    } as unknown as HTMLElement;
    const documentRef = {
      elementFromPoint: () => invalidTarget,
      querySelectorAll: () => [parentWrapper] as unknown as NodeListOf<HTMLElement>,
    };

    expect(findDropWrapper(document, container.id, 250, 200, documentRef)).toMatchObject({
      wrapperId: section.id,
      rect: {
        left: 100,
        top: 40,
      },
    });
  });

  it('keeps drag offsets aligned to the visual rect when sticky rendering shifts the node', () => {
    const parentWrapper = {
      dataset: { dropWrapperId: 'section_1' },
      getBoundingClientRect: () =>
        ({
          left: 100,
          top: 50,
          width: 800,
          height: 500,
          right: 900,
          bottom: 550,
        }) as DOMRect,
    } as unknown as HTMLElement;
    const documentRef = {
      querySelectorAll: () => [parentWrapper] as unknown as NodeListOf<HTMLElement>,
    };
    const draggedElement = {
      getBoundingClientRect: () =>
        ({
          left: 160,
          top: 140,
          width: 240,
          height: 120,
          right: 400,
          bottom: 260,
        }) as DOMRect,
    } as HTMLElement;

    expect(getDragElementRect(draggedElement, 190, 180, 'section_1', 20, 30, documentRef)).toMatchObject({
      offsetX: 30,
      offsetY: 40,
      useVisualOffset: true,
      modelShiftX: 40,
      modelShiftY: 60,
    });
  });
});
