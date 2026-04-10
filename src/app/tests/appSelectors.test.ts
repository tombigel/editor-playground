import { describe, expect, it } from 'vitest';
import { createDefaultSticky, createInitialDocument, createTextNode, createContainerNode } from '../../model/defaults';
import type { EditorState } from '../../api/editorApi';
import {
  getNodeOrderState,
  getSectionOrderState,
  selectedNodeDisallowsContentWrapperTarget,
  selectedNodeHasBottomEdge,
  selectedNodeHasTopEdge,
} from '../appSelectors';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';

function createState(): EditorState {
  return {
    document: createInitialDocument(),
    activePageId: null,
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
    ui: {
      showHidden: true,
      previewSticky: true,
      animationPreview: {
        enabled: false,
        mode: 'passive',
        triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
      },
      spacerVisibility: 'selected',
      showGridLanes: false,
      showDebugInfo: false,
      snapSettings: DEFAULT_SNAP_SETTINGS,
      themeMode: 'auto',
      accentColor: '#1668ff',
      lightTheme: 'air',
      darkTheme: 'monokai',
      focusedMode: null,
      startupFocusedMode: null,
      inspectorCollapsed: false,
      temporaryInspectorOpen: false,
      focusedPanelOffset: { x: 0, y: 0 },
    },
  };
}

describe('app/appSelectors', () => {
  it('reports reorder availability for leaf nodes within their parent order', () => {
    const state = createState();
    const section = Object.values(state.document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected starter section');
    }

    const firstChild = state.document.nodes[section.children[0]];
    const lastChild = state.document.nodes[section.children[section.children.length - 1]];

    expect(getNodeOrderState(state, firstChild)).toEqual({
      show: true,
      canBack: false,
      canForward: true,
    });
    expect(getNodeOrderState(state, lastChild)).toEqual({
      show: true,
      canBack: true,
      canForward: false,
    });
  });

  it('tracks section order only against sibling sections at the site root', () => {
    const state = createState();
    const root = state.document.nodes[state.document.rootId];
    if (root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const extraSection = createContainerNode('section', root.id);
    extraSection.name = 'Extra Section';
    state.document.nodes[extraSection.id] = extraSection;
    root.children.splice(root.children.length - 1, 0, extraSection.id);

    const firstSection = state.document.nodes[root.children.find((id) => state.document.nodes[id]?.contentType === 'container' && state.document.nodes[id]?.subtype === 'section') ?? ''];
    const secondSection = extraSection;

    expect(getSectionOrderState(state, firstSection)).toEqual({
      canBack: false,
      canForward: true,
    });
    expect(getSectionOrderState(state, secondSection)).toEqual({
      canBack: true,
      canForward: false,
    });
  });

  it('derives sticky edge and target capabilities from the selected node', () => {
    const state = createState();
    const section = Object.values(state.document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section');
    }

    const stickyLeaf = createTextNode('block', section.id);
    stickyLeaf.sticky = createDefaultSticky();
    state.document.nodes[stickyLeaf.id] = stickyLeaf;
    section.children.push(stickyLeaf.id);

    const container = createContainerNode('container', section.id);
    state.document.nodes[container.id] = container;

    expect(selectedNodeHasTopEdge(state, stickyLeaf.id)).toBe(true);
    expect(selectedNodeHasBottomEdge(state, stickyLeaf.id)).toBe(false);
    expect(selectedNodeDisallowsContentWrapperTarget(state, container.id)).toBe(true);
  });
});
