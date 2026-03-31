import { describe, expect, it } from 'vitest';
import { buildNodeDebugInfo } from '../debugInfo';
import { createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import type { WrapperNode } from '../../model/types';

describe('editor/debugInfo', () => {
  it('authoredRect derives from node.rect base raw values', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (n) => n.type === 'wrapper' && n.role === 'section',
    ) as WrapperNode;

    if (!section) {
      throw new Error('Expected section wrapper');
    }

    const debugInfo = buildNodeDebugInfo(document, section);

    expect(debugInfo.authoredRect.x).toBe(section.rect.x.base.raw);
    expect(debugInfo.authoredRect.y).toBe(section.rect.y.base.raw);
    expect(debugInfo.authoredRect.width).toBe(section.rect.width.base.raw);
    expect(debugInfo.authoredRect.height).toBe(section.rect.height.base.raw);
  });

  it('htmlId is non-null only for top-level section/header/footer wrappers', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];

    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    // Find section at root level
    const sectionId = root.children.find((id) => {
      const node = document.nodes[id];
      return node?.type === 'wrapper' && node.role === 'section';
    });

    if (!sectionId) {
      throw new Error('Expected section at root level');
    }

    const section = document.nodes[sectionId] as WrapperNode;
    const debugInfo = buildNodeDebugInfo(document, section);

    expect(debugInfo.htmlId).toBe(section.id);
  });

  it('htmlId is null for all leaf nodes', () => {
    const document = createInitialDocument();
    const textNode = Object.values(document.nodes).find((n) => n.type === 'leaf' && n.role === 'text');

    if (!textNode || textNode.type !== 'leaf') {
      throw new Error('Expected text leaf node');
    }

    const debugInfo = buildNodeDebugInfo(document, textNode);

    expect(debugInfo.htmlId).toBeNull();
  });

  it('htmlId is null for container wrappers', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];

    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const sectionId = root.children.find((id) => {
      const node = document.nodes[id];
      return node?.type === 'wrapper' && node.role === 'section';
    });

    if (!sectionId) {
      throw new Error('Expected section at root level');
    }

    const section = document.nodes[sectionId] as WrapperNode;
    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const debugInfo = buildNodeDebugInfo(document, container);

    expect(debugInfo.htmlId).toBeNull();
  });

  it('isTriggerTarget is true when another node has triggerId === this node id', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (n) => n.type === 'wrapper' && n.role === 'section',
    ) as WrapperNode;

    if (!section) {
      throw new Error('Expected section wrapper');
    }

    // Enable animation on the section so we can check isTriggerTarget
    section.animation = {
      trigger: 'scroll',
      effect: { kind: 'named', type: 'fade' },
    };

    // Create a leaf node with animation that triggers the section
    const triggerLeaf = createLeaf('text', section.id);
    triggerLeaf.animation = {
      trigger: 'click',
      effect: { kind: 'named', type: 'fade' },
      triggerId: section.id,
    };
    document.nodes[triggerLeaf.id] = triggerLeaf;
    section.children.push(triggerLeaf.id);

    const debugInfo = buildNodeDebugInfo(document, section);

    expect(debugInfo.animation.isTriggerTarget).toBe(true);
  });

  it('isTriggerTarget is false when no other node has triggerId === this node id', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (n) => n.type === 'wrapper' && n.role === 'section',
    ) as WrapperNode;

    if (!section) {
      throw new Error('Expected section wrapper');
    }

    const debugInfo = buildNodeDebugInfo(document, section);

    expect(debugInfo.animation.isTriggerTarget).toBe(false);
  });

  it('sticky is disabled by default', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (n) => n.type === 'wrapper' && n.role === 'section',
    ) as WrapperNode;

    if (!section) {
      throw new Error('Expected section wrapper');
    }

    // Create a section without sticky definition
    const newSection = createWrapper('section', document.rootId);
    document.nodes[newSection.id] = newSection;

    const debugInfo = buildNodeDebugInfo(document, newSection);

    expect(debugInfo.sticky.enabled).toBe(false);
    expect(debugInfo.sticky.target).toBeNull();
    expect(debugInfo.sticky.edges).toBe('none');
    expect(debugInfo.sticky.elevated).toBeNull();
  });

  it('measuredBounds is null when document reference is not provided', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (n) => n.type === 'wrapper' && n.role === 'section',
    ) as WrapperNode;

    if (!section) {
      throw new Error('Expected section wrapper');
    }

    const debugInfo = buildNodeDebugInfo(document, section);

    expect(debugInfo.measuredBounds).toBeNull();
  });

  it('measuredBounds is computed when document reference is provided', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (n) => n.type === 'wrapper' && n.role === 'section',
    ) as WrapperNode;

    if (!section) {
      throw new Error('Expected section wrapper');
    }

    const mockElement = {
      getBoundingClientRect: () => ({
        left: 10,
        top: 20,
        width: 300,
        height: 400,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    const mockDocumentRef = {
      getElementById: (id: string) => (id === `stage-node-${section.id}` ? mockElement : null),
    } as unknown as Pick<Document, 'getElementById'>;

    const debugInfo = buildNodeDebugInfo(document, section, { documentRef: mockDocumentRef });

    expect(debugInfo.measuredBounds).not.toBeNull();
    expect(debugInfo.measuredBounds?.left).toBe(10);
    expect(debugInfo.measuredBounds?.top).toBe(20);
    expect(debugInfo.measuredBounds?.width).toBe(300);
    expect(debugInfo.measuredBounds?.height).toBe(400);
  });
});
