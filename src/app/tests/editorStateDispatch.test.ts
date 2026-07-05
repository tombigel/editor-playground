import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../api/editorApi';
import { getNodeAnimation } from '../../api/animationApi';
import { createRichTextBlock, createRichTextLeaf, createTextDocumentContent } from '../../model/richContent';
import { createContainerNode, createTextNode } from '../../model/defaults';
import { editorReducer, type EditorAction } from '../editorState';
import type { EditorState } from '../../editor/types';

/**
 * Dispatch-wiring tests for the editorReducer action surface. The underlying
 * operations are covered at the documentApi/editorMutations layers; these
 * tests assert that each action type routes to the right operation with an
 * observable state change, and that empty-selection guards return the same
 * state reference.
 */

function stateWithNoSelection(): EditorState {
  const state = createInitialState();
  return { ...state, selectedId: null, selectedIds: [] };
}

function stateWithSelectedLeaf(): { state: EditorState; leafId: string } {
  const inserted = editorReducer(createInitialState(), { type: 'insertLeaf', role: 'text' });
  const leafId = inserted.selectedId;
  if (!leafId) {
    throw new Error('Expected insertLeaf to select the new leaf');
  }
  return { state: inserted, leafId };
}

function findSectionId(state: EditorState): string {
  const root = state.document.nodes[state.document.rootId];
  if (root.contentType !== 'site') {
    throw new Error('Expected site root');
  }
  const sectionId = root.children.find((id) => {
    const node = state.document.nodes[id];
    return node?.contentType === 'container' && node.subtype === 'section';
  });
  if (!sectionId) {
    throw new Error('Expected a section');
  }
  return sectionId;
}

function stateWithSelectedSection(): { state: EditorState; sectionId: string } {
  const state = createInitialState();
  const sectionId = findSectionId(state);
  return { state: { ...state, selectedId: sectionId, selectedIds: [sectionId] }, sectionId };
}

function getStickyNode(state: EditorState, nodeId: string) {
  const node = state.document.nodes[nodeId];
  if (node.contentType === 'site') {
    throw new Error('Expected non-site node');
  }
  return node;
}

describe('app/editorReducer empty-selection guards', () => {
  it.each<[string, EditorAction]>([
    ['rect', { type: 'rect', field: 'x', value: '10px' }],
    ['promote', { type: 'promote', role: 'header' }],
    ['demote', { type: 'demote' }],
    ['delete', { type: 'delete' }],
    ['duplicateSelection', { type: 'duplicateSelection' }],
    ['duplicateDraggedNodes', { type: 'duplicateDraggedNodes', nodeIds: [], targetParentId: 'missing', placements: [] }],
    ['orderBack', { type: 'orderBack' }],
    ['orderForward', { type: 'orderForward' }],
    ['orderSendToBack', { type: 'orderSendToBack' }],
    ['orderBringToFront', { type: 'orderBringToFront' }],
    ['text', { type: 'text', field: 'content', value: 'x' }],
    ['wrapperStyle', { type: 'wrapperStyle', field: 'paddingTop', value: '8px' }],
    ['containerChildBoundary', { type: 'containerChildBoundary', value: 'box' }],
    ['nudgeSelection', { type: 'nudgeSelection', deltaX: 1, deltaY: 1 }],
    ['stickyTarget', { type: 'stickyTarget', value: 'self' }],
    ['stickyEdges', { type: 'stickyEdges', value: 'both' }],
    ['stickyOffset', { type: 'stickyOffset', value: 4 }],
    ['stickyOffsetTop', { type: 'stickyOffsetTop', value: 4 }],
    ['stickyOffsetBottom', { type: 'stickyOffsetBottom', value: 4 }],
    ['stickyDuration', { type: 'stickyDuration', value: 20 }],
    ['stickyDurationTop', { type: 'stickyDurationTop', value: 20 }],
    ['stickyDurationBottom', { type: 'stickyDurationBottom', value: 20 }],
    ['stickyEnabled', { type: 'stickyEnabled', value: true }],
    ['animationClear', { type: 'animationClear' }],
    ['mergeTextSelectionToRich', { type: 'mergeTextSelectionToRich' }],
    ['splitRichTextNode', { type: 'splitRichTextNode' }],
  ])('%s returns the same state reference with no selection', (_name, action) => {
    const state = stateWithNoSelection();
    expect(editorReducer(state, action)).toBe(state);
  });

  it('alignSelection requires more than one node and distributeSelection more than two', () => {
    const { state } = stateWithSelectedLeaf();
    expect(editorReducer(state, { type: 'alignSelection', mode: 'left', rects: {} })).toBe(state);
    expect(editorReducer(state, { type: 'distributeSelection', mode: 'horizontal', rects: {} })).toBe(state);
  });
});

describe('app/editorReducer geometry and structure dispatch', () => {
  it('clearSelection empties both selection fields', () => {
    const { state } = stateWithSelectedLeaf();
    const next = editorReducer(state, { type: 'clearSelection' });
    expect(next.selectedId).toBeNull();
    expect(next.selectedIds).toEqual([]);
  });

  it('move and resize update the node rect through the dispatch surface', () => {
    const { state, leafId } = stateWithSelectedLeaf();

    const moved = editorReducer(state, { type: 'move', id: leafId, x: '40px', y: '50px' });
    const movedNode = getStickyNode(moved, leafId);
    expect(movedNode.rect.x.base.raw).toBe('40px');
    expect(movedNode.rect.y.base.raw).toBe('50px');

    const resized = editorReducer(moved, { type: 'resize', id: leafId, width: '250px', height: '75px' });
    const resizedNode = getStickyNode(resized, leafId);
    expect(resizedNode.rect.width.base.raw).toBe('250px');
    expect(resizedNode.rect.height.base.raw).toBe('75px');
  });

  it('rect updates the selected node field', () => {
    const { state, leafId } = stateWithSelectedLeaf();
    const next = editorReducer(state, { type: 'rect', field: 'x', value: '77px' });
    expect(getStickyNode(next, leafId).rect.x.base.raw).toBe('77px');
  });

  it('reparent moves the node under the new parent', () => {
    const { state, leafId } = stateWithSelectedLeaf();
    const sectionId = findSectionId(state);
    const document = structuredClone(state.document);
    const container = createContainerNode('container', sectionId);
    document.nodes[container.id] = container;
    const section = document.nodes[sectionId];
    if (section.contentType !== 'container') {
      throw new Error('Expected container section');
    }
    section.children.push(container.id);
    const withContainer = { ...state, document };

    const next = editorReducer(withContainer, {
      type: 'reparent',
      id: leafId,
      parentId: container.id,
      x: '5px',
      y: '5px',
    });
    expect(next.document.nodes[leafId].parentId).toBe(container.id);
    expect(next.document.nodes[container.id].children).toContain(leafId);
  });

  it('duplicateDraggedNodes clones into the drag target and selects the duplicate', () => {
    const { state, leafId } = stateWithSelectedLeaf();
    const sectionId = findSectionId(state);
    const document = structuredClone(state.document);
    const container = createContainerNode('container', sectionId);
    document.nodes[container.id] = container;
    const section = document.nodes[sectionId];
    if (section.contentType !== 'container') {
      throw new Error('Expected container section');
    }
    section.children.push(container.id);
    const withContainer = { ...state, document };

    const next = editorReducer(withContainer, {
      type: 'duplicateDraggedNodes',
      nodeIds: [leafId],
      targetParentId: container.id,
      placements: [{ sourceId: leafId, x: '32px', y: '48px' }],
    });

    expect(next.selectedId).toBeTruthy();
    expect(next.selectedId).not.toBe(leafId);
    const duplicate = next.selectedId ? next.document.nodes[next.selectedId] : null;
    expect(duplicate?.parentId).toBe(container.id);
    if (!duplicate || duplicate.contentType === 'site') {
      throw new Error('Expected duplicate editable node');
    }
    expect(duplicate.rect.x.base.raw).toBe('32px');
    expect(duplicate.rect.y.base.raw).toBe('48px');
    expect(next.document.nodes[leafId].parentId).toBe(sectionId);
  });

  it('promote/confirmPromote and demote drive the wrapper role lifecycle', () => {
    const { state, sectionId } = stateWithSelectedSection();

    const requested = editorReducer(state, { type: 'promote', role: 'header' });
    expect(requested.pendingRoleSwap).toBeTruthy();

    const confirmed = editorReducer(requested, { type: 'confirmPromote' });
    expect(confirmed.pendingRoleSwap).toBeFalsy();
    const promoted = confirmed.document.nodes[sectionId];
    if (promoted.contentType !== 'container') {
      throw new Error('Expected container');
    }
    expect(promoted.subtype).toBe('header');

    const cancelled = editorReducer(requested, { type: 'cancelPromote' });
    expect(cancelled.pendingRoleSwap).toBeFalsy();
    const untouched = cancelled.document.nodes[sectionId];
    if (untouched.contentType !== 'container') {
      throw new Error('Expected container');
    }
    expect(untouched.subtype).toBe('section');
  });
});

describe('app/editorReducer sticky dispatch', () => {
  it('routes each sticky field action to the selected node sticky definition', () => {
    const { state, sectionId } = stateWithSelectedSection();

    const enabled = editorReducer(state, { type: 'stickyEnabled', value: true });
    expect(getStickyNode(enabled, sectionId).sticky?.enabled).toBe(true);

    const both = editorReducer(enabled, { type: 'stickyEdges', value: 'both' });
    expect(getStickyNode(both, sectionId).sticky?.edges).toEqual({ top: true, bottom: true });
    const bottom = editorReducer(enabled, { type: 'stickyEdges', value: 'bottom' });
    expect(getStickyNode(bottom, sectionId).sticky?.edges).toEqual({ top: false, bottom: true });
    const top = editorReducer(enabled, { type: 'stickyEdges', value: 'top' });
    expect(getStickyNode(top, sectionId).sticky?.edges).toEqual({ top: true, bottom: false });

    const offsetTop = editorReducer(both, { type: 'stickyOffsetTop', value: 6 });
    expect(getStickyNode(offsetTop, sectionId).sticky?.offsetTop?.raw).toBe('6vh');
    const offsetBottom = editorReducer(both, { type: 'stickyOffsetBottom', value: 7 });
    expect(getStickyNode(offsetBottom, sectionId).sticky?.offsetBottom?.raw).toBe('7vh');

    const durationMode = editorReducer(both, { type: 'stickyDurationMode', value: 'custom' });
    expect(getStickyNode(durationMode, sectionId).sticky?.durationMode).toBe('custom');
    const durationTop = editorReducer(both, { type: 'stickyDurationTop', value: 25 });
    expect(getStickyNode(durationTop, sectionId).sticky?.durationTop?.raw).toBe('25vh');
    const durationBottom = editorReducer(both, { type: 'stickyDurationBottom', value: 35 });
    expect(getStickyNode(durationBottom, sectionId).sticky?.durationBottom?.raw).toBe('35vh');

    const elevated = editorReducer(both, { type: 'stickyElevated', value: true });
    expect(getStickyNode(elevated, sectionId).sticky?.elevated).toBe(true);
  });

  it('stickyOffset writes only the offsets for the currently pinned edges', () => {
    const { state, sectionId } = stateWithSelectedSection();
    // Default sticky edges pin the top only.
    const enabled = editorReducer(state, { type: 'stickyEnabled', value: true });

    const next = editorReducer(enabled, { type: 'stickyOffset', value: 9 });
    const sticky = getStickyNode(next, sectionId).sticky;
    expect(sticky?.offsetTop?.raw).toBe('9vh');
    expect(sticky?.offsetBottom).toBeUndefined();
  });

  it('stickyDuration mirrors the shared duration into the pinned-edge durations', () => {
    const { state, sectionId } = stateWithSelectedSection();
    const enabled = editorReducer(state, { type: 'stickyEnabled', value: true });

    const next = editorReducer(enabled, { type: 'stickyDuration', value: 30 });
    const sticky = getStickyNode(next, sectionId).sticky;
    expect(sticky?.duration?.raw).toBe('30vh');
    expect(sticky?.durationTop?.raw).toBe('30vh');
    expect(sticky?.durationBottom).toBeUndefined();
  });

  it('stickyTarget forces self for plain container subtypes', () => {
    const { state } = stateWithSelectedLeaf();
    const sectionId = findSectionId(state);
    const document = structuredClone(state.document);
    const container = createContainerNode('container', sectionId);
    document.nodes[container.id] = container;
    const section = document.nodes[sectionId];
    if (section.contentType !== 'container') {
      throw new Error('Expected container section');
    }
    section.children.push(container.id);
    const withContainer: EditorState = {
      ...state,
      document,
      selectedId: container.id,
      selectedIds: [container.id],
    };

    const next = editorReducer(withContainer, { type: 'stickyTarget', value: 'contentWrapper' });
    expect(getStickyNode(next, container.id).sticky?.target).toBe('self');
  });

  it('stickyElevation writes to the site node instead of the selection', () => {
    const state = stateWithNoSelection();
    const next = editorReducer(state, { type: 'stickyElevation', value: true });
    const site = next.document.nodes[next.document.rootId];
    if (site.contentType !== 'site') {
      throw new Error('Expected site root');
    }
    expect(site.stickyElevation).toBe(true);
  });
});

describe('app/editorReducer animation dispatch', () => {
  it('sets, updates, and clears a preset animation on the selected node', () => {
    const { state, leafId } = stateWithSelectedLeaf();

    const withPreset = editorReducer(state, { type: 'animationPreset', trigger: 'entrance', preset: 'FadeIn' });
    const animation = getNodeAnimation(withPreset.document, leafId);
    expect(animation).toMatchObject({ trigger: 'entrance' });

    const withOptions = editorReducer(withPreset, {
      type: 'animationOptions',
      options: { reducedMotion: 'disable' },
    });
    expect(getNodeAnimation(withOptions.document, leafId)).toMatchObject({ reducedMotion: 'disable' });

    const cleared = editorReducer(withOptions, { type: 'animationClear' });
    expect(getNodeAnimation(cleared.document, leafId)).toBeUndefined();
  });

  it('animationDocSettings writes document-level animation settings', () => {
    const state = stateWithNoSelection();
    const next = editorReducer(state, {
      type: 'animationDocSettings',
      settings: { a11y: { reducedMotion: 'disable' } },
    });
    expect(next.document.animationSettings).toEqual({ a11y: { reducedMotion: 'disable' } });
  });
});

describe('app/editorReducer bulk and document dispatch', () => {
  it('bulkEdit applies mixed text, wrapper-style, and sticky operations in one action', () => {
    const { state, leafId } = stateWithSelectedLeaf();
    const sectionId = findSectionId(state);

    const next = editorReducer(state, {
      type: 'bulkEdit',
      operations: [
        { kind: 'text', targetIds: [leafId], field: 'name', value: 'Bulk renamed' },
        { kind: 'wrapperStyle', targetIds: [sectionId], field: 'paddingTop', value: '24px' },
        { kind: 'sticky', targetIds: [sectionId], patch: { enabled: true } },
      ],
    });

    expect(next.document.nodes[leafId].name).toBe('Bulk renamed');
    const section = next.document.nodes[sectionId];
    if (section.contentType !== 'container') {
      throw new Error('Expected container section');
    }
    expect(section.style?.paddingTop?.raw).toBe('24px');
    expect(section.sticky?.enabled).toBe(true);
  });

  it('importDocument replaces the present document', () => {
    const state = stateWithNoSelection();
    const incoming = structuredClone(createInitialState().document);
    const sectionId = findSectionId({ ...state, document: incoming });
    incoming.nodes[sectionId].name = 'Imported Section';

    const next = editorReducer(state, { type: 'importDocument', document: incoming });
    expect(next.document.nodes[sectionId].name).toBe('Imported Section');
  });

  it('mergeTextSelectionToRich merges selected siblings and selects the survivor', () => {
    const first = editorReducer(createInitialState(), { type: 'insertLeaf', role: 'text' });
    const firstId = first.selectedId;
    const second = editorReducer(first, { type: 'insertLeaf', role: 'text' });
    const secondId = second.selectedId;
    if (!firstId || !secondId) {
      throw new Error('Expected two inserted leaves');
    }

    const selected: EditorState = { ...second, selectedId: firstId, selectedIds: [firstId, secondId] };
    const merged = editorReducer(selected, { type: 'mergeTextSelectionToRich' });

    expect(merged.selectedId).toBe(firstId);
    expect(merged.selectedIds).toEqual([firstId]);
    expect(merged.document.nodes[secondId]).toBeUndefined();
    const survivor = merged.document.nodes[firstId];
    if (survivor.contentType !== 'text') {
      throw new Error('Expected text survivor');
    }
    expect(survivor.subtype).toBe('rich');
  });

  it('splitRichTextNode splits a multi-block rich node and selects the split parts', () => {
    const state = createInitialState();
    const sectionId = findSectionId(state);
    const document = structuredClone(state.document);
    const rich = createTextNode('rich', sectionId);
    rich.content = createTextDocumentContent([
      createRichTextBlock('paragraph', [createRichTextLeaf('First block')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Second block')]),
    ]);
    document.nodes[rich.id] = rich;
    const section = document.nodes[sectionId];
    if (section.contentType !== 'container') {
      throw new Error('Expected container section');
    }
    section.children.push(rich.id);
    const selected: EditorState = { ...state, document, selectedId: rich.id, selectedIds: [rich.id] };

    const split = editorReducer(selected, { type: 'splitRichTextNode' });

    expect(split.selectedId).toBe(rich.id);
    expect(split.selectedIds).toHaveLength(2);
    for (const splitId of split.selectedIds) {
      expect(split.document.nodes[splitId].parentId).toBe(sectionId);
    }
  });

  it('splitRichTextNode is a no-op for single-block rich nodes and non-rich nodes', () => {
    const { state } = stateWithSelectedLeaf();
    expect(editorReducer(state, { type: 'splitRichTextNode' })).toBe(state);
  });
});

describe('app/editorReducer ui settings dispatch', () => {
  it.each<[string, EditorAction, (ui: EditorState['ui']) => boolean]>([
    ['setShowHidden', { type: 'setShowHidden', value: true }, (ui) => ui.showHidden === true],
    ['setSpacerVisibility', { type: 'setSpacerVisibility', value: 'all' }, (ui) => ui.spacerVisibility === 'all'],
    ['setShowGridLanes', { type: 'setShowGridLanes', value: true }, (ui) => ui.showGridLanes === true],
    ['setShowDebugInfo', { type: 'setShowDebugInfo', value: true }, (ui) => ui.showDebugInfo === true],
    ['setThemeMode', { type: 'setThemeMode', value: 'dark' }, (ui) => ui.themeMode === 'dark'],
    ['setAccentColor', { type: 'setAccentColor', value: '#123456' }, (ui) => ui.accentColor === '#123456'],
    ['setStartupFocusedMode', { type: 'setStartupFocusedMode', value: 'sticky' }, (ui) => ui.startupFocusedMode === 'sticky'],
    ['setInspectorCollapsed', { type: 'setInspectorCollapsed', value: true }, (ui) => ui.inspectorCollapsed === true],
  ])('%s writes the ui field', (_name, action, uiMatches) => {
    const state = stateWithNoSelection();
    expect(uiMatches(editorReducer(state, action).ui)).toBe(true);
  });

  it('setAnimationPreview merges the partial into the existing preview state', () => {
    const state = stateWithNoSelection();
    const next = editorReducer(state, { type: 'setAnimationPreview', value: { enabled: true } });
    expect(next.ui.animationPreview.enabled).toBe(true);
    expect(next.ui.animationPreview.mode).toBe(state.ui.animationPreview.mode);
  });

  it('setSnapSettings merges one snap group without clobbering the other', () => {
    const state = stateWithNoSelection();
    const next = editorReducer(state, {
      type: 'setSnapSettings',
      value: { guideSnap: { ...state.ui.snapSettings.guideSnap, threshold: 12 } },
    });
    expect(next.ui.snapSettings.guideSnap.threshold).toBe(12);
    expect(next.ui.snapSettings.guideSnap.enabled).toBe(state.ui.snapSettings.guideSnap.enabled);
    expect(next.ui.snapSettings.containerSnap).toEqual(state.ui.snapSettings.containerSnap);
  });

  it('setFocusedMode collapses the inspector and clears the temporary-open flag', () => {
    const state = stateWithNoSelection();
    const focused = editorReducer(state, { type: 'setFocusedMode', value: 'sticky' });
    expect(focused.ui.focusedMode).toBe('sticky');
    expect(focused.ui.inspectorCollapsed).toBe(true);
    expect(focused.ui.temporaryInspectorOpen).toBe(false);

    const unfocused = editorReducer(focused, { type: 'setFocusedMode', value: null });
    expect(unfocused.ui.focusedMode).toBeNull();
    expect(unfocused.ui.inspectorCollapsed).toBe(false);
  });

  it('setTemporaryInspectorOpen only applies while a focused mode is active', () => {
    const state = stateWithNoSelection();
    const notFocused = editorReducer(state, { type: 'setTemporaryInspectorOpen', value: true });
    expect(notFocused.ui.temporaryInspectorOpen).toBe(false);

    const focused = editorReducer(state, { type: 'setFocusedMode', value: 'sticky' });
    const opened = editorReducer(focused, { type: 'setTemporaryInspectorOpen', value: true });
    expect(opened.ui.temporaryInspectorOpen).toBe(true);
  });

  it('setFocusedPanelOffset normalizes invalid offsets to zero', () => {
    const state = stateWithNoSelection();
    const next = editorReducer(state, {
      type: 'setFocusedPanelOffset',
      value: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
    });
    expect(next.ui.focusedPanelOffset).toEqual({ x: 0, y: 0 });
  });
});

describe('app/editorReducer page dispatch', () => {
  function stateWithTwoPages(): { state: EditorState; firstPageId: string; secondPageId: string } {
    const base = stateWithNoSelection();
    const firstPageId = base.document.pages?.[0]?.id;
    if (!firstPageId) {
      throw new Error('Expected initial page');
    }
    const withPage = editorReducer(base, { type: 'addPage', options: { displayName: 'About' } });
    const secondPageId = withPage.document.pages?.[1]?.id;
    if (!secondPageId) {
      throw new Error('Expected added page');
    }
    return { state: withPage, firstPageId, secondPageId };
  }

  it('routes page metadata actions to the document pages', () => {
    const { state, secondPageId } = stateWithTwoPages();

    const renamed = editorReducer(state, {
      type: 'setPageDisplayName',
      pageId: secondPageId,
      displayName: 'Team',
    });
    expect(renamed.document.pages?.[1]?.displayName).toBe('Team');

    const withLang = editorReducer(state, { type: 'setPageLang', pageId: secondPageId, lang: 'fr' });
    expect(withLang.document.pages?.[1]?.lang).toBe('fr');

    const withSlug = editorReducer(state, { type: 'setPageSlug', pageId: secondPageId, slug: 'team' });
    expect(withSlug.document.pages?.[1]?.slug).toBe('team');

    const withTransition = editorReducer(state, {
      type: 'setPageViewTransition',
      pageId: secondPageId,
      transition: 'crossfade',
    });
    expect(withTransition.document.pages?.[1]?.viewTransition).toBe('crossfade');

    const hidden = editorReducer(state, { type: 'setPageVisibility', pageId: secondPageId, visible: false });
    expect(hidden.document.pages?.[1]?.visible).toBe(false);
  });

  it('setPageParent nests a page and reorderPage moves it among siblings', () => {
    const { state, firstPageId, secondPageId } = stateWithTwoPages();

    const nested = editorReducer(state, {
      type: 'setPageParent',
      pageId: secondPageId,
      parentPageId: firstPageId,
    });
    expect(nested.document.pages?.[1]?.parentPageId).toBe(firstPageId);

    const reordered = editorReducer(state, { type: 'reorderPage', pageId: secondPageId, direction: 'back' });
    expect(reordered.document.pages?.map((page) => page.id)).toEqual([secondPageId, firstPageId]);
  });

  it('setSiteSettings patches the document site settings', () => {
    const state = stateWithNoSelection();
    const next = editorReducer(state, { type: 'setSiteSettings', patch: { title: 'My Portfolio' } });
    expect(next.document.siteSettings?.title).toBe('My Portfolio');
  });

  it('syncPageLinks rewrites link hrefs matching the old page url', () => {
    const inserted = editorReducer(stateWithNoSelection(), { type: 'insertLeaf', role: 'link' });
    const linkId = inserted.selectedId;
    if (!linkId) {
      throw new Error('Expected inserted link');
    }
    const linkNode = inserted.document.nodes[linkId];
    if (linkNode.contentType !== 'text' || !linkNode.link?.href) {
      throw new Error('Expected link node with href');
    }
    const oldHref = linkNode.link.href;

    const synced = editorReducer(inserted, {
      type: 'syncPageLinks',
      oldUrl: oldHref,
      newUrl: 'https://example.com/renamed',
    });
    const syncedNode = synced.document.nodes[linkId];
    if (syncedNode.contentType !== 'text') {
      throw new Error('Expected text node');
    }
    expect(syncedNode.link?.href).toBe('https://example.com/renamed');
  });
});
