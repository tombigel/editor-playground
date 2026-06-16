import { useEffect, type Dispatch } from 'react';
import {
  setPresetAnimation,
  setKeyframeAnimation,
  updateAnimationOptions,
  clearAnimation,
  setDocumentAnimationSettings,
  setNodeAnimation,
  getNodeAnimation,
  getAnimatedNodes,
  getMotionPresets,
  getPresetCategory,
  getPresetsForTrigger,
  getPresetParams,
  buildDocumentInteractConfig,
  createAnimationPreview,
  filterInteractConfig,
  buildPreviewConfig,
} from '../api/animationApi';
import { persistState, type EditorState } from '../api/editorApi';
import { buildEditorGoogleFontsStylesheetHref } from '../api/fontApi';
import type { HistoryAction } from './types';
import { useApplyEditorTheme, useScrollSelectedNodeIntoView } from './useEditorEnvironment';

const EDITOR_FONT_LINK_ID = 'editor-playground-google-fonts';

export function useAppRuntime(
  state: EditorState,
  resolvedTheme: 'light' | 'dark',
  dispatch?: Dispatch<HistoryAction>,
) {
  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (!import.meta.env.DEV || !dispatch) return;

    const w = window as unknown as Record<string, unknown>;
    w.playgroundAnimationApi = {
      // High-level
      setPresetAnimation: (target: string, params: Parameters<typeof setPresetAnimation>[2]) =>
        setPresetAnimation(state.document, target, params),
      setKeyframeAnimation: (target: string, params: Parameters<typeof setKeyframeAnimation>[2]) =>
        setKeyframeAnimation(state.document, target, params),
      updateAnimationOptions: (target: string, updates: Parameters<typeof updateAnimationOptions>[2]) =>
        updateAnimationOptions(state.document, target, updates),
      clearAnimation: (target: string) =>
        clearAnimation(state.document, target),
      setDocumentAnimationSettings: (settings: Parameters<typeof setDocumentAnimationSettings>[1]) =>
        setDocumentAnimationSettings(state.document, settings),
      // Low-level
      setNodeAnimation: (nodeId: string, def: Parameters<typeof setNodeAnimation>[2]) =>
        setNodeAnimation(state.document, nodeId, def),
      getNodeAnimation: (nodeId: string) =>
        getNodeAnimation(state.document, nodeId),
      getAnimatedNodes: () =>
        getAnimatedNodes(state.document),
      // Catalog & config
      getMotionPresets,
      getPresetCategory,
      getPresetsForTrigger,
      getPresetParams,
      buildDocumentInteractConfig: () =>
        buildDocumentInteractConfig(state.document),
      // Preview runtime
      createAnimationPreview,
      filterInteractConfig,
      buildPreviewConfig: (triggers: Parameters<typeof buildPreviewConfig>[1]) =>
        buildPreviewConfig(state.document, triggers),
      setAnimationPreview: (value: Record<string, unknown>) =>
        dispatch({ type: 'setAnimationPreview', value }),
      // Apply to live editor state
      applyDocument: (doc: Parameters<typeof setNodeAnimation>[0]) =>
        dispatch({ type: 'importDocument', document: doc }),
    };

    return () => {
      delete w.playgroundAnimationApi;
    };
  }, [state.document, dispatch]);

  useEffect(() => {
    if (!import.meta.env.DEV || !dispatch) return;

    const w = window as unknown as Record<string, unknown>;
    w.playgroundDocApi = {
      getDocument: () => state.document,
      getNode: (id: string) => state.document.nodes[id],
      applyDocument: (doc: Parameters<typeof setNodeAnimation>[0]) =>
        dispatch({ type: 'importDocument', document: doc }),
    };

    return () => {
      delete w.playgroundDocApi;
    };
  }, [state.document, dispatch]);

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
