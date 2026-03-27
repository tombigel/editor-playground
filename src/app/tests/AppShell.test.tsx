import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialState, insertLeaf, resolveStickyLayout } from '../../api/editorApi';
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
    selectedNodes: [],
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
  it('renders the editor accent and dark theme on the shell container', () => {
    const props = createProps();
    props.state.ui.accentColor = '#ff6b4a';
    props.state.ui.lightTheme = 'midday';
    props.state.ui.darkTheme = 'ink';

    const markup = renderToStaticMarkup(<AppShell {...props} />);

    expect(markup).toContain('data-editor-dark-theme="ink"');
    expect(markup).toContain('data-editor-light-theme="midday"');
    expect(markup).toContain('--editor-accent:#ff6b4a');
  });

  it('uses the shared accent for paper and monokai shells', () => {
    const paperProps = createProps();
    paperProps.state.ui.accentColor = '#b07a3a';
    paperProps.state.ui.lightTheme = 'paper';
    paperProps.resolvedTheme = 'light';

    const paperMarkup = renderToStaticMarkup(<AppShell {...paperProps} />);

    expect(paperMarkup).toContain('--editor-accent:#b07a3a');

    const monokaiProps = createProps();
    monokaiProps.state.ui.accentColor = '#ff4f9a';
    monokaiProps.state.ui.darkTheme = 'monokai';
    monokaiProps.resolvedTheme = 'dark';

    const monokaiMarkup = renderToStaticMarkup(<AppShell {...monokaiProps} />);

    expect(monokaiMarkup).toContain('--editor-accent:#ff4f9a');
  });

  it('renders the left rail with smaller buttons and a stronger add label', () => {
    const markup = renderToStaticMarkup(<AppShell {...createProps()} />);

    expect(markup).toContain('grid-template-columns:76px minmax(0,1fr) 300px');
    expect(markup).not.toContain('editor-bg-subtle editor-border-subtle overflow-visible rounded-2xl border p-2');
    expect(markup).toContain('editor-border-subtle mt-2 w-full border-b');
    expect(markup).toContain('editor-text-strong text-sm font-semibold');
    expect(markup).toContain('editor-insert-button group h-10 w-10 rounded-lg border');
    expect(markup).toContain('editor-insert-button-inner flex h-full w-full items-center justify-center rounded-lg border');
    expect(markup).toContain('data-panel-trigger="layers"');
    expect(markup).toContain('editor-rail-entry-button');
    expect(markup).toContain('editor-rail-toggle-button');
  });

  it('renders the layers panel surface when the rail entry is active', () => {
    const markup = renderToStaticMarkup(<AppShell {...createProps()} layersOpen />);

    expect(markup).toContain('editor-layers-panel');
    expect(markup).toContain('Structure, visibility, and order.');
  });

  it('renders the manage fonts dialog with an inner scroll container', () => {
    const markup = renderToStaticMarkup(<AppShell {...createProps()} manageFontsOpen />);

    expect(markup).toContain('Manage Fonts');
    expect(markup).toContain('editor-panel-header-close');
    expect(markup).toContain('max-h-[min(84vh,820px)]');
    expect(markup).toContain('editor-scrollbar min-h-0 overflow-y-auto p-5 pt-4');
  });

  it('renders the focused panel at its stored viewport offset from the workspace-aligned default', () => {
    const props = createProps();
    const state = insertLeaf(props.state, 'text');
    if (!state.selectedId) {
      throw new Error('Expected selected text node');
    }
    const selectedNode = state.document.nodes[state.selectedId];
    if (!selectedNode) {
      throw new Error('Expected selected node');
    }

    state.ui.focusedMode = 'sticky';
    state.ui.focusedPanelOffset = { x: -48, y: 64 };

    const markup = renderToStaticMarkup(
      <AppShell
        {...props}
        state={state}
        selectedNode={selectedNode}
        selectedNodes={[selectedNode]}
        stickyLayout={resolveStickyLayout(state.document)}
      />,
    );

    expect(markup).toContain('aria-label="Drag focused panel"');
    expect(markup).toContain('top:76px');
    expect(markup).toContain('right:80px');
    expect(markup).toContain('transform:translate(-48px, 64px)');
  });
});
