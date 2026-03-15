import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDefaultRect, createInitialDocument, createLeaf } from '../model/defaults';
import { parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue } from '../model/units';
import { resolveWrapperStickyState } from '../sticky/resolve';
import { didDragPointerMove, getNodeHeight, getNodeWidth, getResizeCommitSize, measureStageNodeElement, Stage } from './Stage';

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
});
