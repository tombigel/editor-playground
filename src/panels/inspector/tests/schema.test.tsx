import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createLeaf } from '../../../model/defaults';
import { resolveInspectorBlocks, resolveInspectorConfigKey } from '../schema';
import type { InspectorActionHandlers, InspectorOrderState } from '../types';

const actions: InspectorActionHandlers = {
  onTextChange: () => {},
  onWrapperStyleChange: () => {},
  onRectChange: () => {},
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
  onEnterFocusedMode: () => {},
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
    expect(resolveInspectorConfigKey(null)).toBe('empty');
    const blocks = resolveInspectorBlocks({ node: null, actions, orderState, focusedMode: null });
    expect(blocks.map((block) => block.id)).toEqual(['summary']);
    expect(blocks[0]?.layout).toBe('custom');
  });

  it('resolves section wrapper blocks with titles and descriptions', () => {
    const document = createInitialDocument();
    const wrapper = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!wrapper || wrapper.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const blocks = resolveInspectorBlocks({ node: wrapper, actions, orderState, focusedMode: null });
    expect(resolveInspectorConfigKey(wrapper)).toBe('section');
    expect(blocks.map((block) => block.id)).toEqual([
      'summary',
      'layout',
      'design',
      'sticky-behavior',
      'properties',
    ]);
    expect(blocks.map((block) => block.bucket)).toEqual([
      'summary',
      'primary',
      'primary',
      'behavior',
      'primary',
    ]);
    expect(blocks[1]?.title).toBe('Layout');
    expect(blocks[3]?.title).toBe('Section sticky behavior');
    expect(blocks[3]?.sections.map((section) => section.id)).toEqual(['sticky']);
  });

  it('resolves text leaf content, text style, and design before sticky behavior', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text',
    );

    if (!textNode || textNode.type !== 'leaf' || textNode.role !== 'text') {
      throw new Error('Expected text node');
    }

    const blocks = resolveInspectorBlocks({ node: textNode, actions, orderState, focusedMode: null });
    expect(resolveInspectorConfigKey(textNode)).toBe('text');
    expect(blocks.map((block) => block.id)).toEqual([
      'summary',
      'layout',
      'content',
      'text-style',
      'design',
      'sticky-behavior',
      'properties',
    ]);
    expect(blocks[2]?.title).toBe('Content');
    expect(blocks[2]?.description).toContain('Copy');
    expect(blocks[3]?.title).toBe('Text style');
    expect(blocks[3]?.description).toContain('Typography');
    expect(blocks[4]?.title).toBe('Design');
    expect(blocks[4]?.description).toContain('Color');
  });

  it('keeps custom summary blocks separate from section-based layout blocks', () => {
    const document = createInitialDocument();
    const siteNode = document.nodes[document.rootId];

    const blocks = resolveInspectorBlocks({ node: siteNode, actions, orderState, focusedMode: null });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      id: 'summary',
      layout: 'custom',
      sections: [],
    });
  });

  it('assigns dedicated config keys to button, link, image, and site nodes', () => {
    const document = createInitialDocument();
    const linkNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'link');
    const imageNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    const siteNode = document.nodes[document.rootId];
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const buttonNode = createLeaf('button', section.id);

    expect(resolveInspectorConfigKey(buttonNode)).toBe('button');
    expect(resolveInspectorConfigKey(linkNode ?? null)).toBe('link');
    expect(resolveInspectorConfigKey(imageNode ?? null)).toBe('image');
    expect(resolveInspectorConfigKey(siteNode)).toBe('site');
  });

  it('resolves design blocks for link, image, and button leaves', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }
    const linkNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'link');
    const imageNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    const buttonNode = createLeaf('button', section.id);

    if (!linkNode || linkNode.type !== 'leaf' || !imageNode || imageNode.type !== 'leaf' || !buttonNode || buttonNode.type !== 'leaf') {
      throw new Error('Expected link, image, and button leaves');
    }

    expect(resolveInspectorBlocks({ node: linkNode, actions, orderState, focusedMode: null }).map((block) => block.id)).toEqual([
      'summary',
      'layout',
      'content',
      'text-style',
      'design',
      'sticky-behavior',
      'properties',
    ]);
    expect(resolveInspectorBlocks({ node: imageNode, actions, orderState, focusedMode: null }).map((block) => block.id)).toEqual([
      'summary',
      'layout',
      'content',
      'design',
      'sticky-behavior',
      'properties',
    ]);
    expect(resolveInspectorBlocks({ node: buttonNode, actions, orderState, focusedMode: null }).map((block) => block.id)).toEqual([
      'summary',
      'layout',
      'content',
      'text-style',
      'design',
      'sticky-behavior',
      'properties',
    ]);
  });

  it('assigns dedicated config keys to each wrapper role', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'header');
    const footerNode = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'footer');
    const sectionNode = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');

    if (!sectionNode || sectionNode.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const containerWrapper = {
      ...sectionNode,
      id: 'container_test',
      role: 'container' as const,
    };

    expect(resolveInspectorConfigKey(sectionNode)).toBe('section');
    expect(resolveInspectorConfigKey(headerNode ?? null)).toBe('header');
    expect(resolveInspectorConfigKey(footerNode ?? null)).toBe('footer');
    expect(resolveInspectorConfigKey(containerWrapper)).toBe('container');
  });

  it('renders a go-to-mode button in sticky inspector sections outside focused mode', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text',
    );

    if (!textNode || textNode.type !== 'leaf' || textNode.role !== 'text') {
      throw new Error('Expected text node');
    }

    const blocks = resolveInspectorBlocks({ node: textNode, actions, orderState, focusedMode: null });
    const stickySection = blocks.find((block) => block.id === 'sticky-behavior')?.sections[0];

    expect(stickySection).toBeTruthy();
    const markup = renderToStaticMarkup(<>{stickySection?.render()}</>);
    expect(markup).toContain('aria-label="Go to sticky mode"');
  });
});
