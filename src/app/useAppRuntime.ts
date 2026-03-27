import { useEffect } from 'react';
import { persistState, type EditorState } from '../api/editorApi';
import { buildEditorGoogleFontsStylesheetHref } from '../api/fontApi';
import { useApplyEditorTheme, useScrollSelectedNodeIntoView } from './useEditorEnvironment';

const EDITOR_FONT_LINK_ID = 'sticky-playground-google-fonts';

export function useAppRuntime(state: EditorState, resolvedTheme: 'light' | 'dark') {
  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const href = buildEditorGoogleFontsStylesheetHref(state.document);
    const existing = document.getElementById(EDITOR_FONT_LINK_ID) as HTMLLinkElement | null;

    if (!href) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.href = href;
      return;
    }

    const link = document.createElement('link');
    link.id = EDITOR_FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [state.document]);

  useApplyEditorTheme(
    resolvedTheme,
    state.ui.accentColor,
    state.ui.lightTheme,
    state.ui.darkTheme,
  );
  useScrollSelectedNodeIntoView(state.selectedId);
}
