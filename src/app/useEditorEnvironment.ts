import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
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

export function useApplyResolvedTheme(resolvedTheme: 'light' | 'dark') {
  useEffect(() => {
    document.body.dataset.editorTheme = resolvedTheme;
    document.documentElement.dataset.editorTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;

    return () => {
      delete document.body.dataset.editorTheme;
      delete document.documentElement.dataset.editorTheme;
      document.documentElement.style.colorScheme = '';
    };
  }, [resolvedTheme]);
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

      if (
        settingsOpen &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
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

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
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
