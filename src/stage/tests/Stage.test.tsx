import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createDefaultRect, createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import type { DocumentModel } from '../../model/types';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../../model/units';
import { resolveWrapperStickyState } from '../../sticky/resolve';
import {
  computeResizeFrame,
  didDragPointerMove,
  findDropWrapper,
  getDragElementRect,
  getNodeHeight,
  getNodeWidth,
  getResizeCommitSize,
  getResizeStartSize,
  getStructuralResizeMinHeight,
  getShiftLockedPointer,
  measureCssViewport,
  measureStageNodeElement,
  resolveDragPointerPosition,
} from '../stageMath';
import {
  Stage,
} from '../Stage';
import { DragPreviewOverlay } from '../stageRenderers/dragOverlay';

function withDocumentFontLibrary(document: Omit<DocumentModel, 'fontLibrary'>): DocumentModel {
  return {
    ...document,
    fontLibrary: structuredClone(createInitialDocument().fontLibrary),
  };
}

describe('stage/Stage', () => {
  it('applies the shared editor scrollbar class to the stage shell', () => {
    const markup = renderToStaticMarkup(
      <Stage
        document={createInitialDocument()}
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

    expect(markup).toContain('class="stage-shell editor-scrollbar"');
  });

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

  it('renders authored section height as a content-wrapper minimum height', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.rect.height.base = parseHeightValue('720px');

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={section.id}
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

    expect(markup).toContain(`data-content-wrapper-for="${section.id}"`);
    expect(markup).toContain('min-height:720px');
  });

  it('renders section dividers on the inner surface so divider width does not change wrapper box metrics', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.style.sectionBorderBottomColor = '#cbd5e1';
    section.style.sectionBorderBottomWidth = parseUnitValue('5px');

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={section.id}
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

    const wrapperMarkupMatch = markup.match(new RegExp(`id="stage-node-${section.id}"[^>]*style="([^"]+)"`));
    expect(wrapperMarkupMatch?.[1]).not.toContain('border-bottom-width:5px');
    expect(markup).toMatch(
      new RegExp(
        `data-content-wrapper-for="${section.id}"[\\s\\S]*?class="content-wrapper-surface"[^>]*border-bottom-width:5px`,
      ),
    );
  });

  it('shows the section padding boundary when the section or one of its children is selected', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    const title = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!section || section.type !== 'wrapper' || !title || title.type !== 'leaf') {
      throw new Error('Expected section wrapper and child leaf');
    }

    const sectionSelectedMarkup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={section.id}
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

    const childSelectedMarkup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={title.id}
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

    expect(sectionSelectedMarkup).toContain('class="wrapper-padding-overlay"');
    expect(sectionSelectedMarkup).toContain('class="wrapper-padding-overlay-boundary"');
    expect(sectionSelectedMarkup).toContain('top:64px;right:72px;bottom:72px;left:72px');
    expect(childSelectedMarkup).toContain('class="wrapper-padding-overlay"');
    expect(childSelectedMarkup).toContain('top:64px;right:72px;bottom:72px;left:72px');
  });

  it('shows the container padding boundary when the container or one of its children is selected', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const container = createWrapper('container', section.id);
    const text = createLeaf('text', container.id);
    container.children = [text.id];
    document.nodes[container.id] = container;
    document.nodes[text.id] = text;
    section.children = [...section.children, container.id];

    const containerSelectedMarkup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={container.id}
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

    const childSelectedMarkup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={text.id}
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

    expect(containerSelectedMarkup).toContain('class="wrapper-padding-overlay"');
    expect(containerSelectedMarkup).toContain('top:16px;right:16px;bottom:16px;left:16px');
    expect(childSelectedMarkup).toContain('class="wrapper-padding-overlay"');
    expect(childSelectedMarkup).toContain('top:16px;right:16px;bottom:16px;left:16px');
  });

  it('renders selection outlines for all selected nodes without primary label chrome during multi-select', () => {
    const document = structuredClone(createInitialDocument());
    const textLeaves = Object.values(document.nodes).filter(
      (node): node is Extract<typeof document.nodes[string], { type: 'leaf'; role: 'text' }> =>
        node.type === 'leaf' && node.role === 'text',
    );

    const primary = textLeaves[0];
    const secondary = textLeaves[1];
    if (!primary || !secondary) {
      throw new Error('Expected multiple text leaves');
    }

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={primary.id}
        selectedIds={[primary.id, secondary.id]}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onSelectMany={() => {}}
        onClearSelection={() => {}}
        onMove={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    expect(markup).toContain(`id="stage-node-${primary.id}"`);
    expect(markup).toContain(`id="stage-node-${secondary.id}"`);
    expect(markup).not.toContain('selected-primary');
    expect(markup.match(/selected-multi/g)?.length).toBe(2);
  });

  it('does not render resize handles while multiple nodes are selected', () => {
    const document = structuredClone(createInitialDocument());
    const textLeaves = Object.values(document.nodes).filter(
      (node): node is Extract<typeof document.nodes[string], { type: 'leaf'; role: 'text' }> =>
        node.type === 'leaf' && node.role === 'text',
    );

    const primary = textLeaves[0];
    const secondary = textLeaves[1];
    if (!primary || !secondary) {
      throw new Error('Expected multiple text leaves');
    }

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={primary.id}
        selectedIds={[primary.id, secondary.id]}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        onStageFocus={() => {}}
        onSelect={() => {}}
        onSelectMany={() => {}}
        onClearSelection={() => {}}
        onMove={() => {}}
        onMoveSelection={() => {}}
        onReparent={() => {}}
        onResize={() => {}}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
      />,
    );

    expect(markup).not.toContain('data-stage-resize-handle="true"');
  });

  it('retains container surface styling in the drag preview', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const container = createWrapper('container', section.id);
    container.style.background = '#f6d7c8';
    container.style.borderWidth = parseUnitValue('3px');
    container.style.borderColor = '#4c2a1b';
    container.style.borderRadius = parseUnitValue('24px');
    container.style.shadowColor = 'rgba(40, 20, 10, 0.2)';
    container.style.shadowBlur = 18;
    container.style.shadowSpread = 6;
    container.style.shadowOffsetX = 0;
    container.style.shadowOffsetY = 12;
    section.children = [...section.children, container.id];
    document.nodes[container.id] = container;

    const dragState = {
      nodeId: container.id,
      startClientX: 200,
      startClientY: 200,
      grabOffsetX: 20,
      grabOffsetY: 30,
      useVisualOffset: false,
      modelShiftX: 0,
      modelShiftY: 0,
      previewWidth: 360,
      previewHeight: 240,
      originX: 0,
      originY: 0,
    } as const;

    const markup = renderToStaticMarkup(
      <DragPreviewOverlay
        document={document}
        dragState={dragState}
      />,
    );

    expect(markup).toContain('class="drag-preview-content-wrapper content-wrapper"');
    expect(markup).toContain('class="content-wrapper-surface"');
    expect(markup).toContain('background:#f6d7c8');
    expect(markup).toContain('border-style:solid');
    expect(markup).toContain('border-width:3px');
    expect(markup).toContain('border-color:#4c2a1b');
    expect(markup).toContain('border-radius:24px');
    expect(markup).toContain('box-shadow:0px 12px 18px 6px rgba(40, 20, 10, 0.2)');
  });

  it('compensates editor sticky offsets against the stage shell padding', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: true },
      offsetTop: parseUnitValue('10vh'),
      offsetBottom: parseUnitValue('5vh'),
      durationMode: 'auto',
      duration: parseUnitValue('50vh'),
      durationTop: parseUnitValue('50vh'),
      durationBottom: parseUnitValue('50vh'),
    };

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
    expect(nodeMarkupMatch?.[1]).toContain('top:calc(10vh + 22px)');
    expect(nodeMarkupMatch?.[1]).toContain('bottom:calc(5vh + 48px)');
    expect(markup).toContain('Top Offset · 90px');
    expect(markup).toContain('Padding · 64px');
    expect(markup).toContain('class="sticky-offset-padding-segment sticky-offset-padding-segment-top" style="height:64px"');
    expect(markup).toContain('class="sticky-offset-label sticky-offset-label-padding" style="top:64px"');
    expect(markup).toContain('height:154px;top:-154px');
    expect(markup).toContain('Bottom Offset · 45px');
    expect(markup).toContain('Padding · 72px');
    expect(markup).toContain('class="sticky-offset-padding-segment sticky-offset-padding-segment-bottom" style="height:72px"');
    expect(markup).toContain('class="sticky-offset-label sticky-offset-label-padding" style="top:45px"');
    expect(markup).toContain('height:117px;top:auto;bottom:-117px');
    expect(markup).toContain('class="sticky-spacer-layer" style="box-sizing:border-box;padding-top:64px;padding-right:72px;padding-bottom:72px;padding-left:72px;');
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

  it('renders bottom sticky offset padding guides with the same additive segment treatment', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!section || section.type !== 'wrapper' || !target || target.type !== 'leaf') {
      throw new Error('Expected section wrapper and target leaf');
    }

    target.sticky = {
      enabled: true,
      target: 'self',
      edges: {
        top: false,
        bottom: true,
      },
      offsetBottom: parseUnitValue('5vh'),
      durationMode: 'auto',
      duration: parseUnitValue('50vh'),
    };

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

    expect(markup).toContain('Offset · 45px');
    expect(markup).toContain('Padding · 72px');
    expect(markup).toContain('class="sticky-offset-padding-segment sticky-offset-padding-segment-bottom" style="height:72px"');
    expect(markup).toContain('class="sticky-offset-label sticky-offset-label-padding" style="top:45px"');
    expect(markup).toContain('height:117px;top:auto;bottom:-117px');
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
    target.style.fontWeight = 700;
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
    expect(tagMarkupMatch?.[1]).toContain('font-weight:700');
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

  it('does not let measured wrapper height override explicit section height in stage math', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const measuredNodeSizes = {
      [section.id]: {
        width: 998,
        height: 1600,
      },
    };

    expect(getNodeHeight(section, measuredNodeSizes)).toBe(450);
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

  it('measures CSS viewport units from the browser viewport instead of the stage canvas', () => {
    expect(
      measureCssViewport(
        {
          ownerDocument: {
            defaultView: {
              innerWidth: 1600,
              innerHeight: 1000,
            },
          } as unknown as Document,
        } as unknown as HTMLElement,
        { width: 900, height: 700 },
      ),
    ).toEqual({
      width: 1600,
      height: 1000,
    });
  });

  it('measures wrapper resize starts from the inner content wrapper surface', () => {
    const size = getResizeStartSize(
      {
        closest: () =>
          ({
            dataset: { nodeId: 'container_1' } as DOMStringMap,
            classList: {
              contains: (value: string) => value === 'stage-wrapper',
            } as unknown as DOMTokenList,
            querySelector: (selector: string) =>
              selector === '[data-content-wrapper-for="container_1"]'
                ? ({
                    getBoundingClientRect: () =>
                      ({
                        width: 316,
                        height: 176,
                      }) as DOMRect,
                  } as unknown as HTMLElement)
                : null,
            getBoundingClientRect: () =>
              ({
                width: 320,
                height: 180,
              }) as DOMRect,
          } as unknown as HTMLElement),
      } as unknown as HTMLDivElement,
      240,
      120,
    );

    expect(size).toEqual({
      width: 316,
      height: 176,
    });
  });

  it('measures structural resize minimums from rendered child bottoms plus bottom padding', () => {
    const size = getStructuralResizeMinHeight(
      {
        closest: () =>
          ({
            dataset: { nodeId: 'section_8' } as DOMStringMap,
            classList: {
              contains: (value: string) => value === 'stage-wrapper',
            } as unknown as DOMTokenList,
            querySelector: (selector: string) =>
              selector === '[data-content-wrapper-for="section_8"]'
                ? ({
                    ownerDocument: {
                      defaultView: {
                        getComputedStyle: () => ({
                          paddingTop: '20px',
                          paddingBottom: '30px',
                        }),
                      },
                    } as unknown as Document,
                    getBoundingClientRect: () =>
                      ({
                        top: 100,
                        height: 400,
                      }) as DOMRect,
                    querySelectorAll: () =>
                      [
                        {
                          dataset: { nodeId: 'text_1' } as DOMStringMap,
                          parentElement: {
                            closest: () =>
                              ({
                                dataset: { nodeId: 'section_8' } as DOMStringMap,
                              } as unknown as HTMLElement),
                          } as unknown as HTMLElement,
                          getBoundingClientRect: () =>
                            ({
                              bottom: 248,
                            }) as DOMRect,
                        } as unknown as HTMLElement,
                      ] as unknown as NodeListOf<HTMLElement>,
                  } as unknown as HTMLElement)
                : null,
          } as unknown as HTMLElement),
      } as unknown as HTMLDivElement,
      500,
    );

    expect(size).toBe(178);
  });

  it('renders wrapper resize handles outside the content wrapper so they align to the outer border edge', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }
    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={container.id}
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

    expect(markup).toMatch(
      new RegExp(`data-content-wrapper-for="${container.id}"[\\s\\S]*?</div><div class="resize-handle handle-n"`),
    );
  });

  it.each(['section', 'header', 'footer'] as const)(
    'renders a single bottom resize knob for a selected top-level %s wrapper',
    (role) => {
      const document = structuredClone(createInitialDocument());
      const wrapper = Object.values(document.nodes).find(
        (node) => node.type === 'wrapper' && node.role === role,
      );

      if (!wrapper || wrapper.type !== 'wrapper') {
        throw new Error(`Expected ${role} wrapper`);
      }

      const markup = renderToStaticMarkup(
        <Stage
          document={document}
          selectedId={wrapper.id}
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

      expect(markup).toContain('class="resize-handle handle-s resize-handle-structural-s"');
      expect(markup).not.toContain('class="resize-handle handle-n"');
      expect(markup).not.toContain('class="resize-handle handle-e"');
      expect(markup).not.toContain('class="resize-handle handle-se"');
    },
  );

  it('keeps the bottom resize handle round for selected non-structural wrappers', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={container.id}
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

    expect(markup).toContain('class="resize-handle handle-s"');
    expect(markup).not.toContain('resize-handle-structural-s');
  });

  it('suppresses the top-level structural resize knob for aspect-ratio heights', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.rect.height.base = parseHeightValue('aspect-ratio(4/3)');

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={section.id}
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

    expect(markup).not.toContain('data-stage-resize-handle="true"');
  });

  it.each([
    ['px', '480px', 540, '540px'],
    ['%', '50%', 360, '360px'],
    ['vh', '50vh', 360, '40vh'],
  ] as const)(
    'serializes %s structural wrapper height correctly when resizing from the bottom handle',
    (_label, authoredHeight, nextHeight, expectedHeight) => {
      const document = structuredClone(createInitialDocument());
      const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
      if (!section || section.type !== 'wrapper') {
        throw new Error('Expected section wrapper');
      }

      section.rect.height.base = parseHeightValue(authoredHeight);

      const commit = getResizeCommitSize(
        section,
        {
          nodeId: section.id,
          handle: 's',
          startClientX: 0,
          startClientY: 0,
          originX: 0,
          originY: 0,
          originWidth: 1000,
          originHeight: 480,
        },
        1000,
        nextHeight,
        document,
        {},
        { width: 1440, height: 900 },
      );

      expect(commit.height).toBe(expectedHeight);
    },
  );

  it('converts structural auto height to px when resizing from the bottom handle', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.rect.height.base = parseHeightValue('auto');

    const commit = getResizeCommitSize(
      section,
      {
        nodeId: section.id,
        handle: 's',
        startClientX: 0,
        startClientY: 0,
        originX: 0,
        originY: 0,
        originWidth: 1000,
        originHeight: 320,
      },
      1000,
      412,
      document,
      {},
      { width: 1440, height: 900 },
    );

    expect(commit.height).toBe('412px');
  });

  it('respects per-resize minimum height constraints when dragging a south handle', () => {
    expect(
      computeResizeFrame(
        {
          nodeId: 'section_1',
          handle: 's',
          startClientX: 0,
          startClientY: 0,
          originWidth: 1000,
          originHeight: 300,
          originX: 0,
          originY: 0,
          minHeight: 184,
        },
        0,
        -400,
        false,
      ),
    ).toMatchObject({
      width: 1000,
      height: 184,
      x: 0,
      y: 0,
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

  it('renders self-sticky indicators for top-level sections', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('140px'),
      durationTop: parseUnitValue('140px'),
      durationBottom: parseUnitValue('140px'),
      offsetTop: parseUnitValue('24px'),
      offsetBottom: parseUnitValue('0px'),
    };

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={section.id}
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

    expect(markup).toContain('Offset · 24px');
    expect(markup).toContain('height:24px;top:-24px');
    expect(markup).toContain('Distance: auto');
    expect(markup).not.toContain('Distance · 140px');
    expect(markup).not.toContain('sticky-track');
  });

  it('renders a single auto distance guide for top-edge self sticky leaves', () => {
    const siteId = 'site_top_auto';
    const section = createWrapper('section', siteId);
    section.name = 'Top Auto Section';
    section.rect = createDefaultRect('0px', '0px', '100%', '600px');
    section.style.paddingTop = parseSpacingValue('0px');
    section.style.paddingRight = parseSpacingValue('0px');
    section.style.paddingBottom = parseSpacingValue('0px');
    section.style.paddingLeft = parseSpacingValue('0px');

    const target = createLeaf('text', section.id);
    if (target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected text leaf');
    }

    target.name = 'Top Auto Leaf';
    target.rect = createDefaultRect('24px', '300px', '200px', '100px');
    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'auto',
      duration: parseUnitValue('0px'),
      durationTop: parseUnitValue('0px'),
      durationBottom: parseUnitValue('0px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    section.children = [target.id];

    const document = withDocumentFontLibrary({
      rootId: siteId,
      nodes: {
        [siteId]: {
          id: siteId,
          type: 'site' as const,
          parentId: null,
          children: [section.id],
          name: 'Site',
          visible: true,
          locked: false,
        },
        [section.id]: section,
        [target.id]: target,
      },
    });

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={target.id}
        previewSticky={true}
        spacerVisibility="all"
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

    expect(markup.match(/Distance: auto/g)).toHaveLength(1);
    expect(markup).not.toContain('sticky-auto-spacer-bottom');
    expect(markup).toMatch(/sticky-auto-spacer sticky-auto-spacer-top[^"]*" style="top:100%;bottom:auto;height:200px"/);
  });

  it('extends top-edge auto guides through wrapper bottom padding', () => {
    const siteId = 'site_top_auto_padding';
    const section = createWrapper('section', siteId);
    section.name = 'Top Auto Padded Section';
    section.rect = createDefaultRect('0px', '0px', '100%', '400px');
    section.style.paddingTop = parseSpacingValue('20px');
    section.style.paddingRight = parseSpacingValue('0px');
    section.style.paddingBottom = parseSpacingValue('30px');
    section.style.paddingLeft = parseSpacingValue('0px');

    const target = createLeaf('text', section.id);
    if (target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected text leaf');
    }

    target.name = 'Top Auto Padded Leaf';
    target.rect = createDefaultRect('24px', '100px', '200px', '50px');
    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'auto',
      duration: parseUnitValue('0px'),
      durationTop: parseUnitValue('0px'),
      durationBottom: parseUnitValue('0px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    section.children = [target.id];

    const document = withDocumentFontLibrary({
      rootId: siteId,
      nodes: {
        [siteId]: {
          id: siteId,
          type: 'site' as const,
          parentId: null,
          children: [section.id],
          name: 'Site',
          visible: true,
          locked: false,
        },
        [section.id]: section,
        [target.id]: target,
      },
    });

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={target.id}
        previewSticky={true}
        spacerVisibility="all"
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

    expect(markup).toMatch(/sticky-auto-spacer sticky-auto-spacer-top[^"]*" style="top:100%;bottom:auto;height:250px"/);
  });

  it('extends bottom-edge auto guides through wrapper top padding', () => {
    const siteId = 'site_bottom_auto_padding';
    const section = createWrapper('section', siteId);
    section.name = 'Bottom Auto Padded Section';
    section.rect = createDefaultRect('0px', '0px', '100%', '400px');
    section.style.paddingTop = parseSpacingValue('20px');
    section.style.paddingRight = parseSpacingValue('0px');
    section.style.paddingBottom = parseSpacingValue('30px');
    section.style.paddingLeft = parseSpacingValue('0px');

    const target = createLeaf('text', section.id);
    if (target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected text leaf');
    }

    target.name = 'Bottom Auto Padded Leaf';
    target.rect = createDefaultRect('24px', '100px', '200px', '50px');
    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: false, bottom: true },
      durationMode: 'auto',
      duration: parseUnitValue('0px'),
      durationTop: parseUnitValue('0px'),
      durationBottom: parseUnitValue('0px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    section.children = [target.id];

    const document = withDocumentFontLibrary({
      rootId: siteId,
      nodes: {
        [siteId]: {
          id: siteId,
          type: 'site' as const,
          parentId: null,
          children: [section.id],
          name: 'Site',
          visible: true,
          locked: false,
        },
        [section.id]: section,
        [target.id]: target,
      },
    });

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={target.id}
        previewSticky={true}
        spacerVisibility="all"
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

    expect(markup).toMatch(/sticky-auto-spacer sticky-auto-spacer-bottom[^"]*" style="top:auto;bottom:100%;height:100px"/);
  });

  it('splits both-edge auto self sticky guides by free space above and below the leaf', () => {
    const siteId = 'site_test';
    const section = createWrapper('section', siteId);
    section.name = 'Auto Sticky Section';
    section.rect = createDefaultRect('0px', '0px', '100%', '600px');
    section.style.paddingTop = parseSpacingValue('0px');
    section.style.paddingRight = parseSpacingValue('0px');
    section.style.paddingBottom = parseSpacingValue('0px');
    section.style.paddingLeft = parseSpacingValue('0px');

    const stickyLeaf = createLeaf('text', section.id);
    if (stickyLeaf.type !== 'leaf' || stickyLeaf.role !== 'text') {
      throw new Error('Expected text leaf');
    }

    stickyLeaf.name = 'Both Auto Leaf';
    stickyLeaf.rect = createDefaultRect('24px', '300px', '200px', '100px');
    stickyLeaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: true },
      durationMode: 'auto',
      duration: parseUnitValue('0px'),
      durationTop: parseUnitValue('0px'),
      durationBottom: parseUnitValue('0px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    section.children = [stickyLeaf.id];

    const document = withDocumentFontLibrary({
      rootId: siteId,
      nodes: {
        [siteId]: {
          id: siteId,
          type: 'site' as const,
          parentId: null,
          children: [section.id],
          name: 'Site',
          visible: true,
          locked: false,
        },
        [section.id]: section,
        [stickyLeaf.id]: stickyLeaf,
      },
    });

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={stickyLeaf.id}
        previewSticky={true}
        spacerVisibility="all"
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

    expect(markup).toContain('Top Distance: auto');
    expect(markup).toContain('Bottom Distance: auto');
    expect(markup).toMatch(/sticky-auto-spacer sticky-auto-spacer-bottom sticky-guide-dual[^"]*" style="top:auto;bottom:100%;height:300px"/);
    expect(markup).toMatch(/sticky-auto-spacer sticky-auto-spacer-top sticky-guide-dual[^"]*" style="top:100%;bottom:auto;height:200px"/);
  });

  it('includes container border width in sticky overlay insets', () => {
    const siteId = 'site_container_border';
    const section = createWrapper('section', siteId);
    section.name = 'Container Border Section';
    section.rect = createDefaultRect('0px', '0px', '100%', '400px');
    section.style.paddingTop = parseSpacingValue('0px');
    section.style.paddingRight = parseSpacingValue('0px');
    section.style.paddingBottom = parseSpacingValue('0px');
    section.style.paddingLeft = parseSpacingValue('0px');

    const container = createWrapper('container', section.id);
    container.name = 'Bordered Container';
    container.rect = createDefaultRect('40px', '40px', '320px', '220px');
    container.style.paddingTop = parseSpacingValue('16px');
    container.style.paddingRight = parseSpacingValue('16px');
    container.style.paddingBottom = parseSpacingValue('16px');
    container.style.paddingLeft = parseSpacingValue('16px');
    container.style.borderWidth = parseUnitValue('2px');
    container.style.borderColor = '#dbe3ee';

    const target = createLeaf('text', container.id);
    if (target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected text leaf');
    }

    target.name = 'Bordered Container Leaf';
    target.rect = createDefaultRect('24px', '24px', '160px', '40px');
    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('80px'),
      durationTop: parseUnitValue('80px'),
      durationBottom: parseUnitValue('80px'),
      offsetTop: parseUnitValue('12px'),
      offsetBottom: parseUnitValue('0px'),
    };

    container.children = [target.id];
    section.children = [container.id];

    const document = withDocumentFontLibrary({
      rootId: siteId,
      nodes: {
        [siteId]: {
          id: siteId,
          type: 'site' as const,
          parentId: null,
          children: [section.id],
          name: 'Site',
          visible: true,
          locked: false,
        },
        [section.id]: section,
        [container.id]: container,
        [target.id]: target,
      },
    });

    const markup = renderToStaticMarkup(
      <Stage
        document={document}
        selectedId={target.id}
        previewSticky={true}
        spacerVisibility="all"
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

    expect(
      markup,
    ).toMatch(new RegExp(`data-content-wrapper-for="${container.id}"[\\s\\S]*?class="content-wrapper-surface"[^>]*border-width:2px`));
    expect(
      markup,
    ).toMatch(new RegExp(`data-content-wrapper-for="${container.id}"[\\s\\S]*?class="sticky-spacer-layer" style="box-sizing:border-box;padding-top:16px;padding-right:16px;padding-bottom:16px;padding-left:16px;`));
    expect(markup).toContain('Padding · 16px');
    expect(markup).toContain('class="sticky-offset-padding-segment sticky-offset-padding-segment-top" style="height:16px"');
    expect(markup).toContain('class="sticky-offset-label sticky-offset-label-padding" style="top:16px"');
    expect(markup).toContain('height:28px;top:-28px');
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
