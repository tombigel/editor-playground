import { describe, expect, it } from 'vitest';
import { createInitialState, distributeNodes, insertLeaf, insertWrapper, parseUnitValue, serializeNodesForClipboardDoc } from '../../api/editorApi';
import { createContainerNode, createDefaultRect, createTextNode } from '../../model/defaults';
import {
  createRichTextBlock,
  createRichTextLeaf,
  createTextDocumentContent,
  getSingleListBlockContent,
  getTextContent,
  listContentToRichListBlock,
  richListBlockToListContent,
} from '../../model/richContent';
import { editorReducer, historyReducer, type HistoryState } from '../editorState';
import type { EditorState } from '../../editor/types';

function createTestHistoryState(): HistoryState {
  return {
    present: createInitialState(),
    past: [],
    future: [],
    historyLimit: 100,
    activeResize: null,
  };
}

function createKeyboardNudgeExpansionState(): { state: EditorState; parentId: string; leafId: string } {
  const state = createInitialState();
  const document = structuredClone(state.document);
  const root = document.nodes[document.rootId];
  if (!root || root.contentType !== 'site') {
    throw new Error('Expected site root');
  }
  const sectionId = root.children.find((id) => {
    const node = document.nodes[id];
    return node?.contentType === 'container' && node.subtype === 'section';
  });
  if (!sectionId) {
    throw new Error('Expected section');
  }
  const parent = createContainerNode('container', sectionId);
  parent.rect = createDefaultRect('40px', '40px', '240px', '120px');
  const leaf = createTextNode('block', parent.id);
  leaf.rect = createDefaultRect('20px', '110px', '80px', '40px');
  parent.children = [leaf.id];
  document.nodes[parent.id] = parent;
  document.nodes[leaf.id] = leaf;
  document.nodes[sectionId].children.push(parent.id);
  return {
    state: {
      ...state,
      document,
      selectedId: leaf.id,
      selectedIds: [leaf.id],
      ui: {
        ...state.ui,
      },
    },
    parentId: parent.id,
    leafId: leaf.id,
  };
}

function getRectNode(document: EditorState['document'], nodeId: string) {
  const node = document.nodes[nodeId];
  if (!node || node.contentType === 'site') {
    throw new Error(`Expected rect node ${nodeId}`);
  }
  return node;
}

describe('app/editorState', () => {
  it('expands the parent when keyboard nudging moves below its bottom edge', () => {
    const enabled = createKeyboardNudgeExpansionState();
    const expanded = editorReducer(enabled.state, {
      type: 'nudgeSelection',
      deltaX: 0,
      deltaY: 20,
    });
    expect(getRectNode(expanded.document, enabled.leafId).rect.y.base.raw).toBe('130px');
    expect(getRectNode(expanded.document, enabled.parentId).rect.height.base.raw).toBe('170px');
  });

  it('keeps preview toggles out of undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setPreviewSticky', value: false });

    expect(next.present.ui.previewSticky).toBe(false);
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('keeps focused mode actions out of undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setFocusedMode', value: 'sticky' });

    expect(next.present.ui.focusedMode).toBe('sticky');
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('clears temporary inspector state when entering and leaving focused mode', () => {
    const initial = createInitialState();
    const entered = editorReducer(initial, { type: 'setFocusedMode', value: 'sticky' });
    const opened = editorReducer(entered, { type: 'setTemporaryInspectorOpen', value: true });
    const exited = editorReducer(opened, { type: 'setFocusedMode', value: null });

    expect(entered.ui.temporaryInspectorOpen).toBe(false);
    expect(entered.ui.inspectorCollapsed).toBe(true);
    expect(opened.ui.temporaryInspectorOpen).toBe(true);
    expect(exited.ui.temporaryInspectorOpen).toBe(false);
    expect(exited.ui.inspectorCollapsed).toBe(false);
  });

  it('prevents temporary inspector open when no focused mode is active', () => {
    const initial = createInitialState();
    const next = editorReducer(initial, { type: 'setTemporaryInspectorOpen', value: true });

    expect(next.ui.temporaryInspectorOpen).toBe(false);
  });

  it('updates startup mode without changing the current focused mode', () => {
    const initial = createInitialState();
    const next = editorReducer(initial, { type: 'setStartupFocusedMode', value: 'sticky' });

    expect(next.ui.startupFocusedMode).toBe('sticky');
    expect(next.ui.focusedMode).toBeNull();
  });

  it('stores focused panel offsets outside undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setFocusedPanelOffset', value: { x: -42, y: 88 } });

    expect(next.present.ui.focusedPanelOffset).toEqual({ x: -42, y: 88 });
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('setShowDebugInfo toggles ui.showDebugInfo', () => {
    const initial = createInitialState();

    const withTrue = editorReducer(initial, { type: 'setShowDebugInfo', value: true });
    expect(withTrue.ui.showDebugInfo).toBe(true);

    const withFalse = editorReducer(withTrue, { type: 'setShowDebugInfo', value: false });
    expect(withFalse.ui.showDebugInfo).toBe(false);
  });

  it('setShowDebugInfo is excluded from undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setShowDebugInfo', value: true });

    expect(next.present.ui.showDebugInfo).toBe(true);
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('setShowHidden toggles ui.showHidden outside undo history', () => {
    const initial = createTestHistoryState();

    const next = historyReducer(initial, { type: 'setShowHidden', value: false });

    expect(next.present.ui.showHidden).toBe(false);
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
  });

  it('coalesces resize streams into a single history entry when the resize ends', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    if (!present.selectedId) {
      throw new Error('Expected selected leaf after insertion');
    }

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const resizing = historyReducer(before, { type: 'beginResize', id: present.selectedId });
    const duringResize = historyReducer(resizing, {
      type: 'resize',
      id: present.selectedId,
      width: '320px',
      height: '160px',
    });
    const completed = historyReducer(duringResize, { type: 'endResize', id: present.selectedId });

    expect(duringResize.past).toHaveLength(0);
    expect(completed.activeResize).toBeNull();
    expect(completed.past).toHaveLength(1);
  });

  it('duplicates the selected node, selects the duplicate, and tracks undo history', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    const sourceId = present.selectedId;
    if (!sourceId) {
      throw new Error('Expected selected text');
    }
    const initial = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const duplicated = historyReducer(initial, { type: 'duplicateSelection' });

    expect(duplicated.past).toHaveLength(1);
    expect(duplicated.present.selectedId).not.toBe(sourceId);
    expect(duplicated.present.selectedIds).toEqual([duplicated.present.selectedId]);
    expect(Object.keys(duplicated.present.document.nodes).length).toBe(
      Object.keys(present.document.nodes).length + 1,
    );

    const undone = historyReducer(duplicated, { type: 'undo' });
    expect(undone.present.selectedId).toBe(sourceId);
    expect(undone.present.document.nodes[sourceId]).toBeTruthy();
  });

  it('duplicates a dragged node at the committed placement and tracks undo history', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    const sourceId = present.selectedId;
    if (!sourceId) {
      throw new Error('Expected selected text');
    }
    const sourceParentId = present.document.nodes[sourceId].parentId;
    if (!sourceParentId) {
      throw new Error('Expected source parent');
    }
    const initial = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const duplicated = historyReducer(initial, {
      type: 'duplicateDraggedNodes',
      nodeIds: [sourceId],
      targetParentId: sourceParentId,
      placements: [{ sourceId, x: '96px', y: '112px' }],
    });

    expect(duplicated.past).toHaveLength(1);
    expect(duplicated.present.selectedId).not.toBe(sourceId);
    const duplicate = duplicated.present.selectedId
      ? duplicated.present.document.nodes[duplicated.present.selectedId]
      : null;
    if (!duplicate || duplicate.contentType === 'site') {
      throw new Error('Expected duplicate editable node');
    }
    expect(duplicate.parentId).toBe(sourceParentId);
    expect(duplicate.rect.x.base.raw).toBe('96px');
    expect(duplicate.rect.y.base.raw).toBe('112px');
    expect(duplicated.present.document.nodes[sourceId].parentId).toBe(sourceParentId);

    const undone = historyReducer(duplicated, { type: 'undo' });
    expect(undone.present.selectedId).toBe(sourceId);
    expect(Object.keys(undone.present.document.nodes)).toHaveLength(Object.keys(present.document.nodes).length);
  });

  it('pastes a clipboard node payload into the selected container parent', () => {
    let source = createInitialState();
    source = insertLeaf(source, 'text');
    const sourceId = source.selectedId;
    if (!sourceId) {
      throw new Error('Expected copied text');
    }
    const payload = serializeNodesForClipboardDoc(source.document, [sourceId]);
    if (!payload) {
      throw new Error('Expected clipboard payload');
    }

    let target = createInitialState();
    target = insertWrapper(target, 'container');
    const containerId = target.selectedId;
    if (!containerId) {
      throw new Error('Expected target container');
    }

    const pasted = editorReducer(target, { type: 'pasteClipboardNodes', payload });

    expect(pasted.selectedId).not.toBe(sourceId);
    expect(pasted.selectedId).toBeTruthy();
    expect(pasted.selectedId ? pasted.document.nodes[pasted.selectedId]?.parentId : null).toBe(containerId);
  });

  it('pastes external styled HTML as a new rich node without replacing the selected text node', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const selectedTextId = state.selectedId;
    if (!selectedTextId) {
      throw new Error('Expected selected text node');
    }
    const beforeNodeCount = Object.keys(state.document.nodes).length;
    const selectedBefore = structuredClone(state.document.nodes[selectedTextId]);

    const pasted = editorReducer(state, {
      type: 'pasteExternalClipboard',
      data: {
        html: '<h2><strong>Styled heading</strong></h2><ul><li><em>List item</em></li></ul>',
        text: 'Styled heading\nList item',
      },
    });

    expect(Object.keys(pasted.document.nodes)).toHaveLength(beforeNodeCount + 1);
    expect(pasted.document.nodes[selectedTextId]).toEqual(selectedBefore);
    expect(pasted.selectedId).not.toBe(selectedTextId);
    const pastedNode = pasted.selectedId ? pasted.document.nodes[pasted.selectedId] : null;
    expect(pastedNode).toMatchObject({ contentType: 'text', subtype: 'rich' });
    if (!pastedNode || pastedNode.contentType !== 'text') {
      throw new Error('Expected pasted text node');
    }
    expect(pastedNode.content.blocks[0]).toMatchObject({
      type: 'h2',
      children: [{ text: 'Styled heading', bold: true }],
    });
    expect(pastedNode.content.blocks[1]).toMatchObject({
      type: 'ul',
      children: [{ type: 'list-item', children: [{ text: 'List item', italic: true }] }],
    });
  });

  it('keeps external URL and image URL paste precedence through the reducer', () => {
    const state = createInitialState();

    const linkState = editorReducer(state, {
      type: 'pasteExternalClipboard',
      data: { text: 'https://example.com' },
    });
    const linkNode = linkState.selectedId ? linkState.document.nodes[linkState.selectedId] : null;
    expect(linkNode).toMatchObject({
      contentType: 'text',
      subtype: 'block',
      link: { linkType: 'external', href: 'https://example.com' },
    });

    const imageState = editorReducer(state, {
      type: 'pasteExternalClipboard',
      data: { text: 'https://example.com/image.png' },
    });
    const imageNode = imageState.selectedId ? imageState.document.nodes[imageState.selectedId] : null;
    expect(imageNode).toMatchObject({
      contentType: 'media',
      subtype: 'image',
      src: 'https://example.com/image.png',
    });
  });

  it('forces container wrappers to keep self sticky targeting', () => {
    let state = createInitialState();
    state = insertWrapper(state, 'section');
    state = insertWrapper(state, 'container');
    if (!state.selectedId) {
      throw new Error('Expected selected container after insertion');
    }

    const next = editorReducer(state, { type: 'stickyTarget', value: 'contentWrapper' });
    const sticky = next.document.nodes[state.selectedId];

    expect(sticky?.contentType).toBe('container');
    if (sticky?.contentType !== 'container') {
      throw new Error('Expected wrapper node');
    }
    expect(sticky.sticky?.target).toBe('self');
  });

  it('keeps the first selected node as the master while toggling in additional nodes', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const firstId = state.selectedId;
    state = insertLeaf(state, 'text');
    const secondId = state.selectedId;

    if (!firstId || !secondId) {
      throw new Error('Expected inserted text nodes');
    }

    const multi = editorReducer(state, { type: 'toggleSelect', id: firstId });

    expect(multi.selectedId).toBe(secondId);
    expect(multi.selectedIds).toEqual([secondId, firstId]);
  });

  it('keeps structural wrappers single-selected when the user tries to add them to a multi-selection', () => {
    const initialState = createInitialState();
    const section = Object.values(initialState.document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const header = Object.values(initialState.document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'header',
    );
    const footer = Object.values(initialState.document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'footer',
    );

    if (!section || section.contentType !== 'container' || !header || header.contentType !== 'container' || !footer || footer.contentType !== 'container') {
      throw new Error('Expected structural wrappers');
    }

    const state = insertLeaf(initialState, 'text');
    const textId = state.selectedId;
    if (!textId) {
      throw new Error('Expected inserted text node');
    }

    const withSectionToggledIn = editorReducer(state, { type: 'toggleSelect', id: section.id });
    expect(withSectionToggledIn.selectedId).toBe(textId);
    expect(withSectionToggledIn.selectedIds).toEqual([textId]);

    const sectionOnly = editorReducer(state, { type: 'select', id: section.id });
    const withLeafToggledIn = editorReducer(sectionOnly, { type: 'toggleSelect', id: textId });
    expect(withLeafToggledIn.selectedId).toBe(textId);
    expect(withLeafToggledIn.selectedIds).toEqual([textId]);

    const marqueeSelection = editorReducer(state, {
      type: 'selectMany',
      ids: [section.id, textId],
      mode: 'replace',
    });
    expect(marqueeSelection.selectedId).toBe(textId);
    expect(marqueeSelection.selectedIds).toEqual([textId]);

    const headerSelection = editorReducer(state, {
      type: 'selectMany',
      ids: [header.id, textId],
      mode: 'replace',
    });
    expect(headerSelection.selectedId).toBe(textId);
    expect(headerSelection.selectedIds).toEqual([textId]);

    const footerSelection = editorReducer(state, {
      type: 'selectMany',
      ids: [footer.id, textId],
      mode: 'replace',
    });
    expect(footerSelection.selectedId).toBe(textId);
    expect(footerSelection.selectedIds).toEqual([textId]);
  });

  it('collapses mixed visible and hidden selections to the hidden node', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const hiddenId = state.selectedId;
    state = insertLeaf(state, 'text');
    const visibleId = state.selectedId;

    if (!hiddenId || !visibleId) {
      throw new Error('Expected inserted text nodes');
    }

    state = editorReducer(state, { type: 'setNodeVisibility', id: hiddenId, value: false });
    const mixed = editorReducer(state, { type: 'toggleSelect', id: hiddenId });

    expect(mixed.selectedId).toBe(hiddenId);
    expect(mixed.selectedIds).toEqual([hiddenId]);
  });

  it('collapses an existing mixed selection when one selected node is hidden', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const firstId = state.selectedId;
    state = insertLeaf(state, 'text');
    const secondId = state.selectedId;

    if (!firstId || !secondId) {
      throw new Error('Expected inserted text nodes');
    }

    state = editorReducer(state, { type: 'toggleSelect', id: firstId });
    const next = editorReducer(state, { type: 'setNodeVisibility', id: firstId, value: false });

    expect(next.selectedId).toBe(firstId);
    expect(next.selectedIds).toEqual([firstId]);
  });

  it('stores one history entry for a bulk multi-select edit', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    const firstId = present.selectedId;
    present = insertLeaf(present, 'text');
    const secondId = present.selectedId;

    if (!firstId || !secondId) {
      throw new Error('Expected inserted text nodes');
    }

    present = editorReducer(present, { type: 'toggleSelect', id: firstId });

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const next = historyReducer(before, {
      type: 'bulkEdit',
      operations: [{ kind: 'text', targetIds: [firstId, secondId], field: 'color', value: '#112233' }],
    });

    expect(next.past).toHaveLength(1);
    expect(next.past[0]?.nodePatches).toHaveLength(2);
    expect(next.present.document.nodes[firstId]).toMatchObject({ style: { color: '#112233' } });
    expect(next.present.document.nodes[secondId]).toMatchObject({ style: { color: '#112233' } });
  });

  it('merges selected sibling text nodes into one rich node through the reducer', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const firstId = state.selectedId;
    state = insertLeaf(state, 'text');
    const secondId = state.selectedId;

    if (!firstId || !secondId) {
      throw new Error('Expected inserted text nodes');
    }

    const merged = editorReducer(state, {
      type: 'mergeTextSelectionToRich',
      nodeIds: [firstId, secondId],
    });
    const mergedNode = merged.document.nodes[firstId];

    expect(merged.selectedId).toBe(firstId);
    expect(merged.selectedIds).toEqual([firstId]);
    expect(mergedNode).toMatchObject({ contentType: 'text', subtype: 'rich' });
    expect(merged.document.nodes[secondId]).toBeUndefined();
  });

  it('splits a rich text node into sibling nodes and selects the split set', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'richtext');
    const nodeId = state.selectedId;
    if (!nodeId) {
      throw new Error('Expected inserted rich node');
    }
    const node = state.document.nodes[nodeId];
    if (node.contentType !== 'text' || node.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    node.content = createTextDocumentContent([
      createRichTextBlock('h2', [createRichTextLeaf('Heading')]),
      createRichTextBlock('paragraph', [createRichTextLeaf('Body')]),
    ]);

    const split = editorReducer(state, { type: 'splitRichTextNode', nodeId });
    const parentId = node.parentId;
    if (!parentId) {
      throw new Error('Expected rich text parent');
    }
    const parent = split.document.nodes[parentId];
    if (!parent || parent.contentType !== 'container') {
      throw new Error('Expected section parent');
    }

    const splitIds = parent.children.slice(-2);
    expect(split.selectedId).toBe(nodeId);
    expect(split.selectedIds).toEqual(splitIds);
    expect(splitIds[0]).toBe(nodeId);
    expect(split.document.nodes[splitIds[0]]).toMatchObject({ contentType: 'text', subtype: 'block' });
    expect(split.document.nodes[splitIds[1]]).toMatchObject({ contentType: 'text', subtype: 'block' });
    const second = split.document.nodes[splitIds[1]];
    if (second.contentType !== 'text') {
      throw new Error('Expected split text node');
    }
    expect(getTextContent(second.content.blocks)).toBe('Body');
  });

  it('does not split single-block rich text nodes', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'richtext');
    const nodeId = state.selectedId;
    if (!nodeId) {
      throw new Error('Expected inserted rich node');
    }

    const split = editorReducer(state, { type: 'splitRichTextNode', nodeId });

    expect(split).toBe(state);
  });

  it('updates list content through the reducer using the pure document api', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const nodeId = state.selectedId;

    if (!nodeId) {
      throw new Error('Expected inserted text node');
    }

    state = editorReducer(state, { type: 'switchTextSubtype', nodeId, subtype: 'list' });
    const next = editorReducer(state, {
      type: 'setTextDocumentContent',
      id: nodeId,
      content: createTextDocumentContent([
        listContentToRichListBlock({
          type: 'ol',
          start: 3,
          markerStyle: 'upper-alpha',
          items: [
            { text: 'Alpha', direction: 'ltr' },
            { text: 'Beta', direction: 'rtl' },
          ],
        }),
      ]),
    });

    expect(next.document.nodes[nodeId]).toMatchObject({
      contentType: 'text',
      subtype: 'list',
    });
    const nextNode = next.document.nodes[nodeId];
    if (nextNode.contentType !== 'text' || nextNode.subtype !== 'list') {
      throw new Error('Expected list node');
    }
    expect(richListBlockToListContent(getSingleListBlockContent(nextNode.content)!)).toEqual({
      type: 'ol',
      start: 3,
      markerStyle: 'upper-alpha',
      items: [
        { text: 'Alpha', direction: 'ltr' },
        { text: 'Beta', direction: 'rtl' },
      ],
    });
  });

  it('stores an undo entry for canonical text document content updates', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    const nodeId = present.selectedId;

    if (!nodeId) {
      throw new Error('Expected inserted text node');
    }

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const next = historyReducer(before, {
      type: 'setTextDocumentContent',
      id: nodeId,
      content: createTextDocumentContent([
        {
          type: 'paragraph',
          children: [{ text: 'Updated through canonical content' }],
        },
      ]),
    });

    expect(next.past).toHaveLength(1);
    expect(next.present.document.nodes[nodeId]).toMatchObject({
      contentType: 'text',
      content: {
        blocks: [{ type: 'paragraph', children: [{ text: 'Updated through canonical content' }] }],
      },
    });
  });

  it('applies markdown import to rich text nodes through the reducer', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'richtext');
    const nodeId = state.selectedId;

    if (!nodeId) {
      throw new Error('Expected inserted rich text node');
    }

    const next = editorReducer(state, {
      type: 'applyTextNodeMarkdown',
      id: nodeId,
      markdown: '# Imported title\n\n- First\n- Second',
    });
    const nextNode = next.document.nodes[nodeId];

    expect(nextNode).toMatchObject({ contentType: 'text', subtype: 'rich' });
    if (nextNode.contentType !== 'text' || nextNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    expect(nextNode.content.blocks.map((block) => block.type)).toEqual(['h1', 'ul']);
  });

  it('stores an undo entry for markdown imports into rich text nodes', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'richtext');
    const nodeId = present.selectedId;

    if (!nodeId) {
      throw new Error('Expected inserted rich text node');
    }

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const next = historyReducer(before, {
      type: 'applyTextNodeMarkdown',
      id: nodeId,
      markdown: '## Imported section',
    });
    const nextNode = next.present.document.nodes[nodeId];

    expect(next.past).toHaveLength(1);
    expect(nextNode).toMatchObject({ contentType: 'text', subtype: 'rich' });
    if (nextNode.contentType !== 'text' || nextNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    expect(nextNode.content.blocks).toMatchObject([{ type: 'h2' }]);
  });

  it('stores an undo entry for canonical rich block gap updates', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'richtext');
    const nodeId = present.selectedId;

    if (!nodeId) {
      throw new Error('Expected inserted rich text node');
    }

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const next = historyReducer(before, {
      type: 'setTextDocumentBlockGap',
      id: nodeId,
      value: 28,
    });

    expect(next.past).toHaveLength(1);
    const nextNode = next.present.document.nodes[nodeId];
    if (nextNode.contentType !== 'text' || nextNode.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }
    expect(nextNode.content.blockGap).toBe(28);
  });

  it('stores one history entry for a group move', () => {
    let present = createInitialState();
    present = insertLeaf(present, 'text');
    const firstId = present.selectedId;
    present = insertLeaf(present, 'text');
    const secondId = present.selectedId;

    if (!firstId || !secondId) {
      throw new Error('Expected inserted text nodes');
    }

    present = editorReducer(present, { type: 'toggleSelect', id: firstId });

    const before = {
      present,
      past: [],
      future: [],
      historyLimit: 100,
      activeResize: null,
    } satisfies HistoryState;

    const next = historyReducer(before, {
      type: 'moveSelection',
      moves: [
        { id: firstId, x: '120px', y: '140px' },
        { id: secondId, x: '220px', y: '240px' },
      ],
    });

    expect(next.past).toHaveLength(1);
    expect(next.past[0]?.nodePatches).toHaveLength(2);
    expect(next.present.document.nodes[firstId]).toMatchObject({ rect: { x: { base: { raw: '120px' } }, y: { base: { raw: '140px' } } } });
    expect(next.present.document.nodes[secondId]).toMatchObject({ rect: { x: { base: { raw: '220px' } }, y: { base: { raw: '240px' } } } });
  });

  it('distributes three selected siblings across the full selected span', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const firstId = state.selectedId;
    state = insertLeaf(state, 'text');
    const secondId = state.selectedId;
    state = insertLeaf(state, 'text');
    const thirdId = state.selectedId;

    if (!firstId || !secondId || !thirdId) {
      throw new Error('Expected inserted text nodes');
    }

    const nextDocument = structuredClone(state.document);
    const firstNode = nextDocument.nodes[firstId];
    const secondNode = nextDocument.nodes[secondId];
    const thirdNode = nextDocument.nodes[thirdId];
    if (
      !firstNode ||
      firstNode.contentType === 'site' ||
      !secondNode ||
      secondNode.contentType === 'site' ||
      !thirdNode ||
      thirdNode.contentType === 'site'
    ) {
      throw new Error('Expected movable nodes');
    }

    firstNode.rect.x.base = parseUnitValue('0px');
    secondNode.rect.x.base = parseUnitValue('120px');
    thirdNode.rect.x.base = parseUnitValue('500px');
    firstNode.rect.y.base = parseUnitValue('40px');
    secondNode.rect.y.base = parseUnitValue('40px');
    thirdNode.rect.y.base = parseUnitValue('40px');
    firstNode.rect.width.base = parseUnitValue('50px');
    secondNode.rect.width.base = parseUnitValue('50px');
    thirdNode.rect.width.base = parseUnitValue('50px');

    state = {
      ...state,
      document: nextDocument,
      selectedId: firstId,
      selectedIds: [firstId, secondId, thirdId],
    };

    const next = distributeNodes(
      state,
      [firstId, secondId, thirdId],
      'horizontal',
      {
        [firstId]: { left: 0, top: 40, width: 50, height: 20 },
        [secondId]: { left: 120, top: 40, width: 50, height: 20 },
        [thirdId]: { left: 500, top: 40, width: 50, height: 20 },
      },
    );

    expect(next.document.nodes[firstId]).toMatchObject({ rect: { x: { base: { raw: '0px' } } } });
    expect(next.document.nodes[secondId]).toMatchObject({ rect: { x: { base: { raw: '250px' } } } });
    expect(next.document.nodes[thirdId]).toMatchObject({ rect: { x: { base: { raw: '500px' } } } });
  });

  it('distributes selected siblings by left edges', () => {
    let state = createInitialState();
    state = insertLeaf(state, 'text');
    const firstId = state.selectedId;
    state = insertLeaf(state, 'text');
    const secondId = state.selectedId;
    state = insertLeaf(state, 'text');
    const thirdId = state.selectedId;

    if (!firstId || !secondId || !thirdId) {
      throw new Error('Expected inserted text nodes');
    }

    const nextDocument = structuredClone(state.document);
    const firstNode = nextDocument.nodes[firstId];
    const secondNode = nextDocument.nodes[secondId];
    const thirdNode = nextDocument.nodes[thirdId];
    if (
      !firstNode ||
      firstNode.contentType === 'site' ||
      !secondNode ||
      secondNode.contentType === 'site' ||
      !thirdNode ||
      thirdNode.contentType === 'site'
    ) {
      throw new Error('Expected movable nodes');
    }

    firstNode.rect.x.base = parseUnitValue('0px');
    secondNode.rect.x.base = parseUnitValue('120px');
    thirdNode.rect.x.base = parseUnitValue('500px');
    firstNode.rect.width.base = parseUnitValue('50px');
    secondNode.rect.width.base = parseUnitValue('120px');
    thirdNode.rect.width.base = parseUnitValue('80px');

    state = {
      ...state,
      document: nextDocument,
      selectedId: firstId,
      selectedIds: [firstId, secondId, thirdId],
    };

    const next = distributeNodes(
      state,
      [firstId, secondId, thirdId],
      'left',
      {
        [firstId]: { left: 0, top: 40, width: 50, height: 20 },
        [secondId]: { left: 120, top: 40, width: 120, height: 20 },
        [thirdId]: { left: 500, top: 40, width: 80, height: 20 },
      },
    );

    expect(next.document.nodes[firstId]).toMatchObject({ rect: { x: { base: { raw: '0px' } } } });
    expect(next.document.nodes[secondId]).toMatchObject({ rect: { x: { base: { raw: '250px' } } } });
    expect(next.document.nodes[thirdId]).toMatchObject({ rect: { x: { base: { raw: '500px' } } } });
  });
});
