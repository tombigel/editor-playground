import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createButtonTextNode } from '../../../model/defaults';
import { resolveInspectorBlocks, resolveInspectorConfigKey } from '../schema';
import type { InspectorActionHandlers, InspectorOrderState } from '../types';

const actions: InspectorActionHandlers = {
  onTextChange: () => {},
  onWrapperStyleChange: () => {},
  onRectChange: () => {},
  onSetNodeVisibility: () => {},
  onSetTopLevelWrapperVisibility: () => {},
  onPromote: () => {},
  onDemote: () => {},
  onStickyEnabled: () => {},
  onStickyTarget: () => {},
  onStickyEdges: () => {},
  onStickyOffset: () => {},
  onStickyOffsetTop: () => {},
  onStickyOffsetBottom: () => {},
  onStickyDurationMode: () => {},
  onStickyDuration: () => {},
  onStickyDurationTop: () => {},
  onStickyDurationBottom: () => {},
  onStickyElevation: () => {},
  onStickyElevated: () => {},
  onAnimationPresetChange: () => {},
  onAnimationKeyframeChange: () => {},
  onAnimationOptionsChange: () => {},
  onAnimationClear: () => {},
  onAnimationDocSettingsChange: () => {},
  onSwitchTextSubtype: () => {},
  onEnterFocusedMode: () => {},
  onOpenManageFonts: () => {},
};

const orderState: InspectorOrderState = {
  showOrderControls: false,
  canOrderBack: false,
  canOrderForward: false,
  canSendToBack: false,
  canBringToFront: false,
  orderBackShortcut: '',
  orderForwardShortcut: '',
  sendToBackShortcut: '',
  bringToFrontShortcut: '',
  canSectionBack: false,
  canSectionForward: false,
  onOrderBack: () => {},
  onOrderForward: () => {},
  onSendToBack: () => {},
  onBringToFront: () => {},
  onSectionBack: () => {},
  onSectionForward: () => {},
};

describe('panels/inspector/schema', () => {
  it('returns only the summary section when no node is selected', () => {
    const document = createInitialDocument();
    expect(resolveInspectorConfigKey(null)).toBe('empty');
    const blocks = resolveInspectorBlocks({ document, node: null, actions, orderState, focusedMode: null, globalStickyElevation: true });
    expect(blocks.map((block) => block.id)).toEqual(['summary']);
    expect(blocks[0]?.layout).toBe('custom');
  });

  it('resolves section wrapper blocks with titles and descriptions', () => {
    const document = createInitialDocument();
    const wrapper = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!wrapper || wrapper.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const blocks = resolveInspectorBlocks({ document, node: wrapper, actions, orderState, focusedMode: null, globalStickyElevation: true });
    expect(resolveInspectorConfigKey(wrapper)).toBe('section');
    expect(blocks.map((block) => block.id)).toEqual(['layout', 'sticky-behavior', 'animation-behavior', 'design']);
    expect(blocks.map((block) => block.bucket)).toEqual(['primary', 'behavior', 'behavior', 'primary']);
    expect(blocks[0]?.title).toBe('Layout');
    expect(blocks[1]?.title).toBe('Section sticky behavior');
    expect(blocks[1]?.sections.map((section) => section.id)).toEqual(['sticky']);
  });

  it('resolves text leaf sticky behavior immediately after layout', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'text',
    );

    if (!textNode || textNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    const blocks = resolveInspectorBlocks({ document, node: textNode, actions, orderState, focusedMode: null, globalStickyElevation: true });
    expect(resolveInspectorConfigKey(textNode)).toBe('text');
    expect(blocks.map((block) => block.id)).toEqual(['layout', 'sticky-behavior', 'animation-behavior', 'content', 'text-style', 'design']);
    expect(blocks[1]?.title).toBe('Sticky behavior');
    expect(blocks[2]?.title).toBe('Animation');
    expect(blocks[3]?.title).toBe('Content');
    expect(blocks[3]?.description).toContain('Copy');
    expect(blocks[4]?.title).toBe('Text style');
    expect(blocks[4]?.description).toContain('Typography');
    expect(blocks[5]?.title).toBe('Design');
    expect(blocks[5]?.description).toContain('Color');
  });

  it('keeps custom summary blocks separate from section-based layout blocks', () => {
    const document = createInitialDocument();
    const siteNode = document.nodes[document.rootId];

    const blocks = resolveInspectorBlocks({ document, node: siteNode, actions, orderState, focusedMode: null, globalStickyElevation: true });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      id: 'summary',
      layout: 'custom',
      sections: [],
    });
  });

  it('assigns dedicated config keys to button, link, image, and site nodes', () => {
    const document = createInitialDocument();
    const linkNode = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.link != null);
    const imageNode = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const siteNode = document.nodes[document.rootId];
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const buttonNode = createButtonTextNode(section.id);

    expect(resolveInspectorConfigKey(buttonNode)).toBe('button');
    expect(resolveInspectorConfigKey(linkNode ?? null)).toBe('text');
    expect(resolveInspectorConfigKey(imageNode ?? null)).toBe('image');
    expect(resolveInspectorConfigKey(siteNode)).toBe('site');
  });

  it('resolves design blocks for link, image, and button leaves', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const linkNode = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.link != null);
    const imageNode = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const buttonNode = createButtonTextNode(section.id);

    if (!linkNode || linkNode.contentType !== 'text' || !imageNode || imageNode.contentType !== 'media' || !buttonNode || buttonNode.contentType !== 'text') {
      throw new Error('Expected link, image, and button leaves');
    }

    expect(resolveInspectorBlocks({ document, node: linkNode, actions, orderState, focusedMode: null, globalStickyElevation: true }).map((block) => block.id)).toEqual([
      'layout',
      'sticky-behavior',
      'animation-behavior',
      'content',
      'text-style',
      'design',
    ]);
    expect(resolveInspectorBlocks({ document, node: imageNode, actions, orderState, focusedMode: null, globalStickyElevation: true }).map((block) => block.id)).toEqual([
      'layout',
      'sticky-behavior',
      'animation-behavior',
      'content',
      'design',
    ]);
    expect(resolveInspectorBlocks({ document, node: buttonNode, actions, orderState, focusedMode: null, globalStickyElevation: true }).map((block) => block.id)).toEqual([
      'layout',
      'sticky-behavior',
      'animation-behavior',
      'content',
      'text-style',
      'design',
    ]);
  });

  it('assigns dedicated config keys to each wrapper role', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'header');
    const footerNode = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'footer');
    const sectionNode = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');

    if (!sectionNode || sectionNode.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const containerWrapper = {
      ...sectionNode,
      id: 'container_test',
      subtype: 'container' as const,
    };

    expect(resolveInspectorConfigKey(sectionNode)).toBe('section');
    expect(resolveInspectorConfigKey(headerNode ?? null)).toBe('header');
    expect(resolveInspectorConfigKey(footerNode ?? null)).toBe('footer');
    expect(resolveInspectorConfigKey(containerWrapper)).toBe('container');
  });

  it('renders a go-to-mode button in sticky inspector sections outside focused mode', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'text',
    );

    if (!textNode || textNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    const blocks = resolveInspectorBlocks({ document, node: textNode, actions, orderState, focusedMode: null, globalStickyElevation: true });
    const stickySection = blocks.find((block) => block.id === 'sticky-behavior')?.sections[0];

    expect(stickySection).toBeTruthy();
    const markup = renderToStaticMarkup(stickySection?.render());
    expect(markup).toContain('aria-label="Go to Sticky focus mode"');
  });

  // ─── debug-info block ─────────────────────────────────────────────

  it('debug-info block appears first when showDebugInfo=true and non-site node selected', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'text',
    );

    if (!textNode || textNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    const stubDebugInfo = {
      dataId: 'test-id',
      htmlId: null,
      stageId: 'stage-node-test-id',
      name: 'Test Node',
      family: 'leaf' as const,
      subtype: 'block',
      parentId: null,
      authoredRect: { x: '0px', y: '0px', width: '100%', height: '400px' },
      measuredBounds: null,
      sticky: { enabled: false, target: null, edges: 'none' as const, durationMode: null, elevated: null, offsetTop: null, offsetBottom: null, duration: null, durationTop: null, durationBottom: null },
      animation: { enabled: false, isTriggerTarget: false, triggerId: null, trigger: null, effect: null, effectKind: null, requiresSticky: null, rawConfig: null },
    };

    const blocks = resolveInspectorBlocks({
      document,
      node: textNode,
      actions,
      orderState,
      focusedMode: null,
      globalStickyElevation: true,
      showDebugInfo: true,
      debugInfo: stubDebugInfo,
    });

    expect(blocks[0]?.id).toBe('debug-info');
    expect(blocks[1]?.id).toBe('layout');
    expect(blocks[2]?.id).toBe('sticky-behavior');
  });

  it('debug-info block absent when showDebugInfo is false or undefined', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'text',
    );

    if (!textNode || textNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    const blocksWithFalse = resolveInspectorBlocks({
      document,
      node: textNode,
      actions,
      orderState,
      focusedMode: null,
      globalStickyElevation: true,
      showDebugInfo: false,
    });

    expect(blocksWithFalse.map((b) => b.id)).not.toContain('debug-info');

    const blocksWithUndefined = resolveInspectorBlocks({
      document,
      node: textNode,
      actions,
      orderState,
      focusedMode: null,
      globalStickyElevation: true,
    });

    expect(blocksWithUndefined.map((b) => b.id)).not.toContain('debug-info');
  });

  it('debug-info block absent for site node even when showDebugInfo=true', () => {
    const document = createInitialDocument();
    const siteNode = document.nodes[document.rootId];

    const blocks = resolveInspectorBlocks({
      document,
      node: siteNode,
      actions,
      orderState,
      focusedMode: null,
      globalStickyElevation: true,
      showDebugInfo: true,
    });

    expect(blocks.map((b) => b.id)).not.toContain('debug-info');
  });
});
