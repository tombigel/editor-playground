import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState, resolveStickyLayout } from '../../api/editorApi';
import { AppShell } from '../AppShell';

function createProps(): ComponentProps<typeof AppShell> {
  const state = createInitialState();

  return {
    state,
    historyState: {
      past: [],
      future: [],
      historyLimit: 100,
    },
    selectedNode: null,
    orderState: { show: false, canBack: false, canForward: false },
    sectionOrderState: { canBack: false, canForward: false },
    resolvedTheme: 'light',
    shortcutPlatform: 'mac',
    topbarClass: 'editor-topbar',
    stageSelectableIds: [],
    settingsOpen: false,
    shortcutHelpOpen: false,
    sectionTemplateOpen: false,
    sectionTemplatePosition: { top: 0, left: 0 },
    settingsPanelRef: null,
    sectionTemplatePanelRef: null,
    documentJson: '{}',
    errors: [],
    stickyLayout: resolveStickyLayout(state.document),
    dispatch: () => undefined,
    onStickyGeometryChange: () => undefined,
    onOpenSectionTemplates: () => undefined,
    onSectionTemplateOpenChange: () => undefined,
    onCloseSectionTemplates: () => undefined,
    onSettingsOpenChange: () => undefined,
    onShortcutHelpOpenChange: () => undefined,
    onImportDocument: async () => ({ ok: true, message: 'Imported.' }),
    onResetData: () => undefined,
    onResetAll: () => undefined,
  };
}

describe('app/AppShell', () => {
  it('renders the left rail with smaller buttons and a stronger add label', () => {
    const markup = renderToStaticMarkup(<AppShell {...createProps()} />);

    expect(markup).toContain('grid-template-columns:76px minmax(0,1fr) 300px');
    expect(markup).not.toContain('editor-bg-subtle editor-border-subtle overflow-visible rounded-2xl border p-2');
    expect(markup).toContain('editor-border-subtle mt-2 w-full border-b');
    expect(markup).toContain('editor-text-strong text-sm font-semibold');
    expect(markup).toContain('editor-insert-button group h-10 w-10 rounded-lg border');
    expect(markup).toContain('editor-insert-button-inner flex h-full w-full items-center justify-center rounded-lg border');
    expect(markup).toContain('flex h-10 w-10 items-center justify-center rounded-lg border');
  });
});
