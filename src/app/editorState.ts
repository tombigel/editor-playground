import {
  applyTextNodeMarkdown,
  alignNodes,
  cancelPromoteWrapperRole,
  clearSelection,
  confirmPromoteWrapperRole,
  createFactoryResetState,
  deleteNode,
  deleteNodes,
  demoteWrapperRole,
  duplicateSelection,
  distributeNodes,
  importDocument as importEditorDocument,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  moveNodeInTree,
  loadPersistedState,
  moveNode,
  moveNodes,
  nudgeNode,
  parseUnitValue,
  pasteClipboardNodes,
  pasteExternalClipboard,
  reparentNode,
  reparentNodes,
  requestPromoteWrapperRole,
  resizeNode,
  reorderNodes,
  setContainerChildBoundary,
  setNodeVisibility,
  setPageTopLevelWrapperPlacement,
  setTopLevelWrapperVisibility,
  selectNode,
  selectManyNodes,
  toggleNodeSelection,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
  type EditorState,
  type NodeId,
} from '../api/editorApi';
import {
  mergeTextNodesToRichDoc,
  setSiteNodeStickyElevation,
  setTextDocumentBlockGapDoc,
  setTextDocumentContentDoc,
  splitRichTextNodeDoc,
  switchTextSubtypeDoc,
} from '../api/documentApi';
import {
  setPresetAnimation,
  setKeyframeAnimation,
  updateAnimationOptions,
  clearAnimation,
  setDocumentAnimationSettings,
  getNodeAnimation,
} from '../api/animationApi';
import { applyEditorNavigationState } from '../api/editorNavigationApi';
import {
  addPage,
  addPageSlugAlias,
  deletePage,
  reorderPage,
  setPageAsHome,
  setPageDisplayName,
  setPageLang,
  setPageSlug,
  setPageParent,
  setPageVisibility,
  setPageViewTransition,
  removePageSlugAlias,
  syncPageHrefLinks,
  setSiteSettings,
} from '../api/pageApi';
import { setActivePage } from '../editor/editorMutations';
import { isNodeEffectivelyHidden } from '../api/documentViewApi';
import {
  appendHistoryEntry,
  applyHistoryEntry,
  buildHistoryEntry,
  clampHistoryLimit,
} from './history';
import {
  selectedNodeDisallowsContentWrapperTarget,
  selectedNodeHasBottomEdge,
  selectedNodeHasTopEdge,
} from './appSelectors';
import { normalizeFocusedPanelOffset } from '../editor/focusedPanelPosition';
import type { EditorAction, HistoryAction, HistoryState } from './types';
export type { EditorAction, HistoryAction, HistoryState } from './types';

export const DEFAULT_HISTORY_LIMIT = 100;
export const MIN_HISTORY_LIMIT = 1;
export const MAX_HISTORY_LIMIT = 500;

export function editorReducer(state: EditorState, action: EditorAction) {
  const selectedId = state.selectedId;
  const selectedIds = state.selectedIds ?? (selectedId ? [selectedId] : []);
  switch (action.type) {
    case 'select':
      return applyHiddenSelectionConstraints(selectNode(state, action.id));
    case 'toggleSelect':
      return applyHiddenSelectionConstraints(toggleNodeSelection(state, action.id));
    case 'clearSelection':
      return clearSelection(state);
    case 'selectMany':
      return applyHiddenSelectionConstraints(selectManyNodes(state, action.ids, action.mode));
    case 'insertWrapper':
      return insertWrapper(state, action.role);
    case 'insertSectionTemplate':
      return insertSectionTemplate(state, action.templateId);
    case 'insertLeaf':
      return insertLeaf(state, action.role);
    case 'move':
      return moveNode(state, action.id, { x: action.x, y: action.y }, action.options);
    case 'moveSelection':
      return moveNodes(state, action.moves, action.options);
    case 'reparent':
      return reparentNode(state, action.id, action.parentId, action.x, action.y, action.options);
    case 'reparentSelection':
      return reparentNodes(state, action.moves, action.parentId, action.options);
    case 'moveNodeInTree':
      return moveNodeInTree(state, action.id, action.targetParentId, action.targetIndex);
    case 'resize':
      return resizeNode(state, action.id, { width: action.width, height: action.height });
    case 'text':
      return applySelectedNodeUpdate(state, action.id ? [action.id] : selectedIds, (nextState, nodeId) =>
        updateTextField(nextState, nodeId, action.field, action.value),
      );
    case 'wrapperStyle':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateWrapperStyleField(nextState, nodeId, action.field, action.value),
      );
    case 'containerChildBoundary':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        setContainerChildBoundary(nextState, nodeId, action.value),
      );
    case 'rect':
      return selectedId ? updateRectField(state, selectedId, action.field, action.value) : state;
    case 'promote':
      return selectedId ? requestPromoteWrapperRole(state, selectedId, action.role) : state;
    case 'confirmPromote':
      return confirmPromoteWrapperRole(state);
    case 'cancelPromote':
      return cancelPromoteWrapperRole(state);
    case 'demote':
      return selectedId ? demoteWrapperRole(state, selectedId) : state;
    case 'delete':
      return selectedIds.length > 0 ? deleteNodes(state, selectedIds) : state;
    case 'deleteNode':
      return deleteNode(state, action.id);
    case 'duplicateSelection':
      return selectedIds.length > 0 ? duplicateSelection(state, action.nodeIds) : state;
    case 'pasteClipboardNodes':
      return pasteClipboardNodes(state, action.payload);
    case 'pasteExternalClipboard':
      return pasteExternalClipboard(state, action.data);
    case 'applyTextNodeMarkdown':
      return applyTextNodeMarkdown(state, action.id, action.markdown);
    case 'setTextDocumentContent':
      return { ...state, document: setTextDocumentContentDoc(state.document, action.id, action.content, action.options) };
    case 'setTextDocumentBlockGap':
      return { ...state, document: setTextDocumentBlockGapDoc(state.document, action.id, action.value) };
    case 'switchTextSubtype':
      return {
        ...state,
        document: switchTextSubtypeDoc(state.document, action.nodeId, action.subtype, {
          mode: action.conversionMode,
        }),
      };
    case 'mergeTextSelectionToRich': {
      const nodeIds = action.nodeIds ?? selectedIds;
      if (nodeIds.length < 2) {
        return state;
      }

      const survivorNodeId = nodeIds[0];
      const nextDocument = mergeTextNodesToRichDoc(state.document, nodeIds, { survivorNodeId });
      if (nextDocument === state.document) {
        return state;
      }

      return {
        ...state,
        document: nextDocument,
        selectedId: survivorNodeId,
        selectedIds: [survivorNodeId],
      };
    }
    case 'splitRichTextNode': {
      const nodeId = action.nodeId ?? selectedId;
      if (!nodeId) {
        return state;
      }

      const source = state.document.nodes[nodeId];
      if (!source || source.contentType !== 'text' || source.subtype !== 'rich' || !source.parentId || source.content.blocks.length <= 1) {
        return state;
      }

      const parent = state.document.nodes[source.parentId];
      if (!parent) {
        return state;
      }

      const anchorIndex = parent.children.indexOf(nodeId);
      if (anchorIndex === -1) {
        return state;
      }

      const nextDocument = splitRichTextNodeDoc(state.document, nodeId);
      if (nextDocument === state.document) {
        return state;
      }

      const nextParent = nextDocument.nodes[source.parentId];
      if (!nextParent) {
        return state;
      }

      const splitNodeIds = nextParent.children.slice(anchorIndex, anchorIndex + source.content.blocks.length);
      return {
        ...state,
        document: nextDocument,
        selectedId: nodeId,
        selectedIds: splitNodeIds,
      };
    }
    case 'setNodeVisibility':
      return applyHiddenSelectionConstraints(setNodeVisibility(state, action.id, action.value));
    case 'stickyEnabled':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, { enabled: action.value }),
      );
    case 'stickyTarget':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          target: selectedNodeDisallowsContentWrapperTarget(nextState, nodeId) ? 'self' : action.value,
        }),
      );
    case 'stickyEdges':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          edges:
            action.value === 'both'
              ? { top: true, bottom: true }
              : action.value === 'bottom'
                ? { top: false, bottom: true }
                : { top: true, bottom: false },
        }),
      );
    case 'stickyOffset':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          offsetTop: selectedNodeHasTopEdge(nextState, nodeId) ? parseUnitValue(`${action.value}vh`) : undefined,
          offsetBottom:
            selectedNodeHasBottomEdge(nextState, nodeId) ? parseUnitValue(`${action.value}vh`) : undefined,
        }),
      );
    case 'stickyOffsetTop':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          offsetTop: parseUnitValue(`${action.value}vh`),
        }),
      );
    case 'stickyOffsetBottom':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          offsetBottom: parseUnitValue(`${action.value}vh`),
        }),
      );
    case 'stickyDurationMode':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, { durationMode: action.value }),
      );
    case 'stickyDuration':
      if (selectedIds.length === 0) {
        return state;
      }
      {
        const parsedDuration = parseUnitValue(`${action.value}vh`);
        return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
          updateStickyField(nextState, nodeId, {
            duration: parsedDuration,
            durationTop: selectedNodeHasTopEdge(nextState, nodeId) ? parsedDuration : undefined,
            durationBottom: selectedNodeHasBottomEdge(nextState, nodeId) ? parsedDuration : undefined,
          }),
        );
      }
    case 'stickyDurationTop':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          durationTop: parseUnitValue(`${action.value}vh`),
        }),
      );
    case 'stickyDurationBottom':
      if (selectedIds.length === 0) {
        return state;
      }
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, {
          durationBottom: parseUnitValue(`${action.value}vh`),
        }),
      );
    case 'stickyElevation':
      return { ...state, document: setSiteNodeStickyElevation(state.document, action.value) };
    case 'stickyElevated':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        updateStickyField(nextState, nodeId, { elevated: action.value }),
      );
    case 'animationPreset': {
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) => {
        // Preserve existing timing when changing preset params
        const existing = getNodeAnimation(nextState.document, nodeId);
        const existingTiming = existing && 'timing' in existing ? existing.timing : undefined;
        return {
          ...nextState,
          document: setPresetAnimation(nextState.document, nodeId, {
            trigger: action.trigger,
            preset: action.preset,
            options: action.params,
            timing: existingTiming,
          }),
        };
      });
    }
    case 'animationKeyframe':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) => ({
        ...nextState,
        document: setKeyframeAnimation(nextState.document, nodeId, {
          trigger: action.trigger,
          name: action.name,
          keyframes: action.keyframes,
          duration: action.duration,
          easing: action.easing,
        }),
      }));
    case 'animationOptions':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) => ({
        ...nextState,
        document: updateAnimationOptions(nextState.document, nodeId, action.options),
      }));
    case 'animationClear':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) => ({
        ...nextState,
        document: clearAnimation(nextState.document, nodeId),
      }));
    case 'animationDocSettings':
      return { ...state, document: setDocumentAnimationSettings(state.document, action.settings) };
    case 'orderBack':
      return selectedIds.length > 0 ? reorderNodes(state, selectedIds, 'back') : state;
    case 'orderForward':
      return selectedIds.length > 0 ? reorderNodes(state, selectedIds, 'forward') : state;
    case 'orderSendToBack':
      return selectedIds.length > 0 ? reorderNodes(state, selectedIds, 'sendToBack') : state;
    case 'orderBringToFront':
      return selectedIds.length > 0 ? reorderNodes(state, selectedIds, 'bringToFront') : state;
    case 'alignSelection':
      return selectedIds.length > 1 ? alignNodes(state, selectedIds, action.mode, action.rects) : state;
    case 'distributeSelection':
      return selectedIds.length > 2 ? distributeNodes(state, selectedIds, action.mode, action.rects) : state;
    case 'bulkEdit':
      return action.operations.reduce((nextState, operation) => {
        if (operation.kind === 'text') {
          return applySelectedNodeUpdate(nextState, operation.targetIds, (draftState, nodeId) =>
            updateTextField(draftState, nodeId, operation.field, operation.value),
          );
        }
        if (operation.kind === 'wrapperStyle') {
          return applySelectedNodeUpdate(nextState, operation.targetIds, (draftState, nodeId) =>
            updateWrapperStyleField(draftState, nodeId, operation.field, operation.value),
          );
        }
        return applySelectedNodeUpdate(nextState, operation.targetIds, (draftState, nodeId) =>
          updateStickyField(draftState, nodeId, operation.patch),
        );
      }, state);
    case 'applyEditorNavigation':
      return applyEditorNavigationState(state, action.navigation, {
        nodeTarget: action.nodeTarget,
      });
    case 'nudgeSelection':
      return applySelectedNodeUpdate(state, selectedIds, (nextState, nodeId) =>
        nudgeNode(nextState, nodeId, { x: action.deltaX, y: action.deltaY }),
      );
    case 'importDocument':
      return importEditorDocument(state, action.document);
    case 'setShowHidden':
      return { ...state, ui: { ...state.ui, showHidden: action.value } };
    case 'setPreviewSticky':
      return { ...state, ui: { ...state.ui, previewSticky: action.value } };
    case 'setAnimationPreview':
      return {
        ...state,
        ui: {
          ...state.ui,
          animationPreview: { ...state.ui.animationPreview, ...action.value },
        },
      };
    case 'setSpacerVisibility':
      return { ...state, ui: { ...state.ui, spacerVisibility: action.value } };
    case 'setShowGridLanes':
      return { ...state, ui: { ...state.ui, showGridLanes: action.value } };
    case 'setShowDebugInfo':
      return { ...state, ui: { ...state.ui, showDebugInfo: action.value } };
    case 'setSnapSettings':
      return {
        ...state,
        ui: {
          ...state.ui,
          snapSettings: {
            guideSnap: {
              ...state.ui.snapSettings.guideSnap,
              ...(action.value.guideSnap ?? {}),
            },
            containerSnap: {
              ...state.ui.snapSettings.containerSnap,
              ...(action.value.containerSnap ?? {}),
            },
          },
        },
      };
    case 'setThemeMode':
      return { ...state, ui: { ...state.ui, themeMode: action.value } };
    case 'setAccentColor':
      return { ...state, ui: { ...state.ui, accentColor: action.value } };
    case 'setLightTheme':
      return { ...state, ui: { ...state.ui, lightTheme: action.value } };
    case 'setDarkTheme':
      return { ...state, ui: { ...state.ui, darkTheme: action.value } };
    case 'setFocusedMode':
      return {
        ...state,
        ui: {
          ...state.ui,
          focusedMode: action.value,
          inspectorCollapsed: !!action.value,
          temporaryInspectorOpen: false,
        },
      };
    case 'setStartupFocusedMode':
      return { ...state, ui: { ...state.ui, startupFocusedMode: action.value } };
    case 'setInspectorCollapsed':
      return { ...state, ui: { ...state.ui, inspectorCollapsed: action.value } };
    case 'setTemporaryInspectorOpen':
      return {
        ...state,
        ui: {
          ...state.ui,
          temporaryInspectorOpen: state.ui.focusedMode ? action.value : false,
        },
      };
    case 'setFocusedPanelOffset':
      return {
        ...state,
        ui: {
          ...state.ui,
          focusedPanelOffset: normalizeFocusedPanelOffset(action.value),
        },
      };
    case 'setActivePage':
      return setActivePage(state, action.pageId);
    case 'addPage': {
      const nextDoc = addPage(state.document, action.options);
      const newPage = nextDoc.pages?.[nextDoc.pages.length - 1];
      return { ...state, document: nextDoc, activePageId: newPage?.id ?? state.activePageId };
    }
    case 'deletePage': {
      const nextDoc = deletePage(state.document, action.pageId);
      const activePageId = nextDoc.pages?.find((p) => p.id === state.activePageId)
        ? state.activePageId
        : nextDoc.pages?.[0]?.id ?? null;
      return { ...state, document: nextDoc, activePageId, selectedId: null, selectedIds: [] };
    }
    case 'reorderPage':
      return { ...state, document: reorderPage(state.document, action.pageId, action.direction) };
    case 'setPageDisplayName':
      return { ...state, document: setPageDisplayName(state.document, action.pageId, action.displayName) };
    case 'setPageAsHome':
      return { ...state, document: setPageAsHome(state.document, action.pageId) };
    case 'setPageLang':
      return { ...state, document: setPageLang(state.document, action.pageId, action.lang) };
    case 'setPageSlug':
      return { ...state, document: setPageSlug(state.document, action.pageId, action.slug) };
    case 'setPageParent':
      return { ...state, document: setPageParent(state.document, action.pageId, action.parentPageId) };
    case 'setPageTopLevelWrapperPlacement':
      return {
        ...state,
        document: setPageTopLevelWrapperPlacement(state.document, action.pageId, action.nodeId, action.placement),
      };
    case 'setTopLevelWrapperVisibility':
      return applyHiddenSelectionConstraints({
        ...state,
        document: setTopLevelWrapperVisibility(
          state.document,
          action.pageId,
          action.nodeId,
          action.visibility,
          action.pageIds,
        ),
      });
    case 'setPageVisibility':
      return { ...state, document: setPageVisibility(state.document, action.pageId, action.visible) };
    case 'setPageViewTransition':
      return { ...state, document: setPageViewTransition(state.document, action.pageId, action.transition) };
    case 'addPageSlugAlias':
      return { ...state, document: addPageSlugAlias(state.document, action.pageId, action.alias) };
    case 'removePageSlugAlias':
      return { ...state, document: removePageSlugAlias(state.document, action.pageId, action.alias) };
    case 'syncPageLinks':
      return { ...state, document: syncPageHrefLinks(state.document, action.oldUrl, action.newUrl) };
    case 'setSiteSettings':
      return { ...state, document: setSiteSettings(state.document, action.patch) };
    default:
      return state;
  }
}

function constrainSelectionForHiddenNodes(state: EditorState, selectedIds: NodeId[]) {
  if (selectedIds.length <= 1) {
    return selectedIds;
  }

  const firstHiddenId = selectedIds.find((selectedId) =>
    isNodeEffectivelyHidden(state.document, selectedId),
  );
  return firstHiddenId ? [firstHiddenId] : selectedIds;
}

function applyHiddenSelectionConstraints(state: EditorState) {
  const selectedIds = constrainSelectionForHiddenNodes(state, state.selectedIds);
  if (selectedIds === state.selectedIds) {
    return state;
  }
  return {
    ...state,
    selectedId: selectedIds[0] ?? null,
    selectedIds,
  };
}

export function createHistoryState(): HistoryState {
  return {
    present: loadPersistedState(),
    past: [],
    future: [],
    historyLimit: DEFAULT_HISTORY_LIMIT,
    activeResize: null,
  };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'beginResize') {
    if (state.activeResize) {
      return state;
    }
    return {
      ...state,
      activeResize: {
        nodeId: action.id,
        before: state.present,
      },
    };
  }

  if (action.type === 'endResize') {
    if (!state.activeResize || state.activeResize.nodeId !== action.id) {
      return state;
    }

    const entry = buildHistoryEntry(
      state.activeResize.before,
      state.present,
      null,
      Date.now(),
    );

    if (!entry) {
      return { ...state, activeResize: null };
    }

    return {
      ...state,
      past: appendHistoryEntry(state.past, entry, state.historyLimit),
      future: [],
      activeResize: null,
    };
  }

  if (action.type === 'undo') {
    if (state.activeResize) {
      return state;
    }
    const entry = state.past[state.past.length - 1];
    if (!entry) {
      return state;
    }

    return {
      ...state,
      present: applyHistoryEntry(state.present, entry, 'undo'),
      past: state.past.slice(0, -1),
      future: [entry, ...state.future],
    };
  }

  if (action.type === 'redo') {
    if (state.activeResize) {
      return state;
    }
    const entry = state.future[0];
    if (!entry) {
      return state;
    }

    return {
      ...state,
      present: applyHistoryEntry(state.present, entry, 'redo'),
      past: [...state.past, entry],
      future: state.future.slice(1),
    };
  }

  if (action.type === 'clearHistory') {
    return { ...state, past: [], future: [], activeResize: null };
  }

  if (action.type === 'resetData') {
    return {
      ...state,
      present: createFactoryResetState(state.present.ui),
      past: [],
      future: [],
      activeResize: null,
    };
  }

  if (action.type === 'resetAll') {
    return {
      ...state,
      present: createFactoryResetState(),
      past: [],
      future: [],
      historyLimit: DEFAULT_HISTORY_LIMIT,
      activeResize: null,
    };
  }

  if (action.type === 'setHistoryLimit') {
    const nextLimit = clampHistoryLimit(action.value, DEFAULT_HISTORY_LIMIT, MIN_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
    const excess = Math.max(0, state.past.length - nextLimit);
    return {
      ...state,
      historyLimit: nextLimit,
      past: excess > 0 ? state.past.slice(excess) : state.past,
    };
  }

  const nextPresent = editorReducer(state.present, action);
  if (nextPresent === state.present) {
    return state;
  }

  if (state.activeResize && isResizeStreamAction(action, state.activeResize.nodeId)) {
    return {
      ...state,
      present: nextPresent,
    };
  }

  if (!shouldTrackInHistory(action)) {
    return {
      ...state,
      present: nextPresent,
    };
  }

  const entry = buildHistoryEntry(
    state.present,
    nextPresent,
    getTextDebounceKey(action, state.present.selectedId),
    Date.now(),
  );
  if (!entry) {
    return {
      ...state,
      present: nextPresent,
    };
  }

  return {
    ...state,
    present: nextPresent,
    past: appendHistoryEntry(state.past, entry, state.historyLimit),
    future: [],
  };
}

function shouldTrackInHistory(action: EditorAction) {
  return (
    action.type !== 'select' &&
    action.type !== 'setShowHidden' &&
    action.type !== 'setPreviewSticky' &&
    action.type !== 'setSpacerVisibility' &&
    action.type !== 'setShowGridLanes' &&
    action.type !== 'setShowDebugInfo' &&
    action.type !== 'setSnapSettings' &&
    action.type !== 'setThemeMode' &&
    action.type !== 'setAccentColor' &&
    action.type !== 'setLightTheme' &&
    action.type !== 'setDarkTheme' &&
    action.type !== 'setFocusedMode' &&
    action.type !== 'applyEditorNavigation' &&
    action.type !== 'setStartupFocusedMode' &&
    action.type !== 'setInspectorCollapsed' &&
    action.type !== 'setTemporaryInspectorOpen' &&
    action.type !== 'setFocusedPanelOffset'
  );
}

function isResizeStreamAction(action: EditorAction, nodeId: NodeId) {
  return (
    (action.type === 'resize' && action.id === nodeId) ||
    (action.type === 'move' && action.id === nodeId) ||
    action.type === 'moveSelection'
  );
}

function getTextDebounceKey(action: EditorAction, selectedId: string | null) {
  if (action.type === 'text' && selectedId) {
    return `text:${selectedId}:${action.field}`;
  }

  if (action.type === 'setTextDocumentContent') {
    return `text:${action.id}:content`;
  }

  if (action.type === 'applyTextNodeMarkdown') {
    return `text:${action.id}:content`;
  }

  if (action.type === 'setTextDocumentBlockGap') {
    return `text:${action.id}:blockGap`;
  }

  return null;
}

function applySelectedNodeUpdate(
  state: EditorState,
  selectedIds: NodeId[],
  updater: (state: EditorState, nodeId: NodeId) => EditorState,
) {
  if (selectedIds.length === 0) {
    return state;
  }

  return selectedIds.reduce((nextState, nodeId) => updater(nextState, nodeId), state);
}
