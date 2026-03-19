import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import {
  resolveAccentSurfaceColors,
  resolveEditorAccentColor,
  resolveStickyGuideColors,
  type EditorDarkTheme,
  type EditorLightTheme,
  type ResolvedTheme,
} from '@/lib/theme';
import { scrollSelectedStageNodeIntoView } from './selectionScroll';

export function useSystemThemePreference() {
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreference = () => setSystemPrefersDark(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return systemPrefersDark;
}

export function useApplyEditorTheme(
  resolvedTheme: ResolvedTheme,
  accentColor: string,
  paperAccentColor: string,
  monokaiAccentColor: string,
  lightTheme: EditorLightTheme,
  darkTheme: EditorDarkTheme,
) {
  useEffect(() => {
    const resolvedAccent = resolveEditorAccentColor(
      accentColor,
      paperAccentColor,
      monokaiAccentColor,
      resolvedTheme,
      lightTheme,
      darkTheme,
    );
    const stickyGuideColors = resolveStickyGuideColors(resolvedAccent);
    const accentSurfaceColors = resolveAccentSurfaceColors(resolvedAccent, stickyGuideColors);
    document.body.dataset.editorTheme = resolvedTheme;
    document.body.dataset.editorLightTheme = lightTheme;
    document.body.dataset.editorDarkTheme = darkTheme;
    document.body.style.setProperty('--editor-accent', resolvedAccent);
    document.body.style.setProperty('--editor-accent-foreground', accentSurfaceColors.accentForeground);
    document.body.style.setProperty('--editor-accent-foreground-muted', accentSurfaceColors.accentForegroundMuted);
    document.body.style.setProperty('--editor-sticky-offset-guide-color', stickyGuideColors.offsetGuideColor);
    document.body.style.setProperty('--editor-sticky-padding-guide-color', stickyGuideColors.paddingGuideColor);
    document.body.style.setProperty('--editor-sticky-offset-label-background', stickyGuideColors.offsetLabelBackground);
    document.body.style.setProperty('--editor-sticky-auto-guide-color', stickyGuideColors.autoGuideColor);
    document.body.style.setProperty('--editor-sticky-auto-label-background', stickyGuideColors.autoLabelBackground);
    document.body.style.setProperty('--editor-sticky-distance-label-text', accentSurfaceColors.stickyDistanceLabelText);
    document.body.style.setProperty('--editor-sticky-offset-label-text', accentSurfaceColors.stickyOffsetLabelText);
    document.body.style.setProperty('--editor-sticky-auto-label-text', accentSurfaceColors.stickyAutoLabelText);
    document.documentElement.dataset.editorTheme = resolvedTheme;
    document.documentElement.dataset.editorLightTheme = lightTheme;
    document.documentElement.dataset.editorDarkTheme = darkTheme;
    document.documentElement.style.setProperty('--editor-accent', resolvedAccent);
    document.documentElement.style.setProperty('--editor-accent-foreground', accentSurfaceColors.accentForeground);
    document.documentElement.style.setProperty(
      '--editor-accent-foreground-muted',
      accentSurfaceColors.accentForegroundMuted,
    );
    document.documentElement.style.setProperty('--editor-sticky-offset-guide-color', stickyGuideColors.offsetGuideColor);
    document.documentElement.style.setProperty('--editor-sticky-padding-guide-color', stickyGuideColors.paddingGuideColor);
    document.documentElement.style.setProperty(
      '--editor-sticky-offset-label-background',
      stickyGuideColors.offsetLabelBackground,
    );
    document.documentElement.style.setProperty('--editor-sticky-auto-guide-color', stickyGuideColors.autoGuideColor);
    document.documentElement.style.setProperty(
      '--editor-sticky-auto-label-background',
      stickyGuideColors.autoLabelBackground,
    );
    document.documentElement.style.setProperty(
      '--editor-sticky-distance-label-text',
      accentSurfaceColors.stickyDistanceLabelText,
    );
    document.documentElement.style.setProperty(
      '--editor-sticky-offset-label-text',
      accentSurfaceColors.stickyOffsetLabelText,
    );
    document.documentElement.style.setProperty(
      '--editor-sticky-auto-label-text',
      accentSurfaceColors.stickyAutoLabelText,
    );
    document.documentElement.style.colorScheme = resolvedTheme;

    return () => {
      delete document.body.dataset.editorTheme;
      delete document.body.dataset.editorLightTheme;
      delete document.body.dataset.editorDarkTheme;
      document.body.style.removeProperty('--editor-accent');
      document.body.style.removeProperty('--editor-accent-foreground');
      document.body.style.removeProperty('--editor-accent-foreground-muted');
      document.body.style.removeProperty('--editor-sticky-offset-guide-color');
      document.body.style.removeProperty('--editor-sticky-padding-guide-color');
      document.body.style.removeProperty('--editor-sticky-offset-label-background');
      document.body.style.removeProperty('--editor-sticky-auto-guide-color');
      document.body.style.removeProperty('--editor-sticky-auto-label-background');
      document.body.style.removeProperty('--editor-sticky-distance-label-text');
      document.body.style.removeProperty('--editor-sticky-offset-label-text');
      document.body.style.removeProperty('--editor-sticky-auto-label-text');
      delete document.documentElement.dataset.editorTheme;
      delete document.documentElement.dataset.editorLightTheme;
      delete document.documentElement.dataset.editorDarkTheme;
      document.documentElement.style.removeProperty('--editor-accent');
      document.documentElement.style.removeProperty('--editor-accent-foreground');
      document.documentElement.style.removeProperty('--editor-accent-foreground-muted');
      document.documentElement.style.removeProperty('--editor-sticky-offset-guide-color');
      document.documentElement.style.removeProperty('--editor-sticky-padding-guide-color');
      document.documentElement.style.removeProperty('--editor-sticky-offset-label-background');
      document.documentElement.style.removeProperty('--editor-sticky-auto-guide-color');
      document.documentElement.style.removeProperty('--editor-sticky-auto-label-background');
      document.documentElement.style.removeProperty('--editor-sticky-distance-label-text');
      document.documentElement.style.removeProperty('--editor-sticky-offset-label-text');
      document.documentElement.style.removeProperty('--editor-sticky-auto-label-text');
      document.documentElement.style.colorScheme = '';
    };
  }, [accentColor, darkTheme, lightTheme, monokaiAccentColor, paperAccentColor, resolvedTheme]);
}

export function useScrollSelectedNodeIntoView(selectedId: string | null) {
  useEffect(() => {
    if (!selectedId || typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollSelectedStageNodeIntoView(selectedId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);
}

export function useSectionTemplatePosition(
  open: boolean,
  anchor: HTMLElement | null,
  onPositionChange: (position: { top: number; left: number }) => void,
) {
  useEffect(() => {
    if (!open || !anchor) {
      return;
    }
    const resolvedAnchor = anchor;

    function updatePosition() {
      const rect = resolvedAnchor.getBoundingClientRect();
      onPositionChange({
        top: Math.max(72, Math.min(window.innerHeight - 480, rect.top - 10)),
        left: rect.right + 16,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor, onPositionChange, open]);
}

export function useDismissFloatingPanels({
  settingsOpen,
  settingsPanelRef,
  onCloseSettings,
  sectionTemplateOpen,
  sectionTemplatePanelRef,
  onCloseSectionTemplates,
}: {
  settingsOpen: boolean;
  settingsPanelRef: RefObject<HTMLDivElement | null>;
  onCloseSettings: () => void;
  sectionTemplateOpen: boolean;
  sectionTemplatePanelRef: RefObject<HTMLDivElement | null>;
  onCloseSectionTemplates: () => void;
}) {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const hasOpenSelect = Boolean(document.querySelector('[data-ui="select-content"][data-state="open"]'));

      if (
        settingsOpen &&
        settingsPanelRef.current &&
        !hasOpenSelect &&
        !settingsPanelRef.current.contains(target) &&
        !target.closest('[data-ui="select-content"]') &&
        !target.closest('[data-panel-trigger="settings"]')
      ) {
        onCloseSettings();
      }

      if (
        sectionTemplateOpen &&
        sectionTemplatePanelRef.current &&
        !sectionTemplatePanelRef.current.contains(target) &&
        !target.closest('[data-panel-trigger="section-templates"]')
      ) {
        onCloseSectionTemplates();
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => window.removeEventListener('pointerdown', handlePointerDown, true);
  }, [
    onCloseSectionTemplates,
    onCloseSettings,
    sectionTemplateOpen,
    sectionTemplatePanelRef,
    settingsOpen,
    settingsPanelRef,
  ]);
}

export function isInteractiveFocus(element: HTMLElement | null) {
  if (!element) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(
    element.closest(
      'input, textarea, select, button, [role="textbox"], [contenteditable="true"], [data-radix-slider-thumb], [data-radix-select-trigger]',
    ),
  );
}

export function hasStageKeyboardFocus(element: HTMLElement | null) {
  return Boolean(element?.closest('[data-stage-focus-scope="true"]'));
}
