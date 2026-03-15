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
  const orderState = getNodeOrderState(state, selectedNode);
  const sectionOrderState = getSectionOrderState(state, selectedNode);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyLayout = useMemo<StickyLayoutState>(
    () => resolveStickyLayout(state.document, stickyGeometry),
    [state.document, stickyGeometry],
  );
  const documentJson = useMemo(() => serializeDocumentJson(state.document), [state.document]);
  const stageSelectableIds = useMemo(() => getStageSelectableNodeIds(state.document), [state.document]);
  const systemPrefersDark = useSystemThemePreference();
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => resolveThemeMode(state.ui.themeMode, systemPrefersDark),
    [state.ui.themeMode, systemPrefersDark],
  );
  const topbarClass =
    resolvedTheme === 'dark'
      ? 'editor-topbar border-b border-white/10 bg-[#131720] px-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]'
      : 'editor-topbar border-b border-[#245fe2] bg-[#2f6df6] px-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]';

  return {
    selectedNode,
    orderState,
    sectionOrderState,
    errors,
    stickyLayout,
    documentJson,
    stageSelectableIds,
    resolvedTheme,
    topbarClass,
  };
}
