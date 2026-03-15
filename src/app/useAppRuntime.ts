import { useEffect } from 'react';
import { persistState, type EditorState } from '../api/editorApi';
import { useApplyResolvedTheme, useScrollSelectedNodeIntoView } from './useEditorEnvironment';

export function useAppRuntime(state: EditorState, resolvedTheme: 'light' | 'dark') {
  useEffect(() => {
    persistState(state);
  }, [state]);

  useApplyResolvedTheme(resolvedTheme);
  useScrollSelectedNodeIntoView(state.selectedId);
}
