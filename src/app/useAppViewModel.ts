import { useMemo } from 'react';
import {
  getNode,
  getStageSelectableNodeIds,
  getValidationErrors,
  resolveStickyLayout,
  serializeDocumentJson,
  type EditorState,
  type StickyGeometrySnapshot,
  type StickyLayoutState,
} from '../api/editorApi';
import { resolveThemeMode, type ResolvedTheme } from '@/lib/theme';
import { getNodeOrderState, getSectionOrderState } from './appSelectors';
import { useSystemThemePreference } from './useEditorEnvironment';

export function useAppViewModel(state: EditorState, stickyGeometry: StickyGeometrySnapshot) {
  const selectedNode = getNode(state.document, state.selectedId);
  const selectedIds = state.selectedIds ?? (state.selectedId ? [state.selectedId] : []);
  const selectedNodes = selectedIds
    .map((selectedNodeId) => getNode(state.document, selectedNodeId))
    .filter((node): node is NonNullable<typeof selectedNode> => Boolean(node));
  const orderState = getNodeOrderState(state, selectedNode);
  const sectionOrderState = getSectionOrderState(state, selectedNode);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyLayout = useMemo<StickyLayoutState>(
    () => resolveStickyLayout(state.document, stickyGeometry),
    [state.document, stickyGeometry],
  );
  const documentJson = useMemo(() => serializeDocumentJson(state.document), [state.document]);
  const stageSelectableIds = useMemo(
    () =>
      getStageSelectableNodeIds(state.document, {
        activePageId: state.activePageId,
        showHidden: state.ui.showHidden,
        selectedIds,
      }),
    [selectedIds, state.activePageId, state.document, state.ui.showHidden],
  );
  const systemPrefersDark = useSystemThemePreference();
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => resolveThemeMode(state.ui.themeMode, systemPrefersDark),
    [state.ui.themeMode, systemPrefersDark],
  );

  return {
    selectedNode,
    selectedNodes,
    orderState,
    sectionOrderState,
    errors,
    stickyLayout,
    documentJson,
    stageSelectableIds,
    resolvedTheme,
    topbarClass: 'editor-topbar px-4',
  };
}
