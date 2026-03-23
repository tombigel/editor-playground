import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../../model/defaults';
import { SettingsPanel } from '../SettingsPanel';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';

describe('panels/SettingsPanel', () => {
  it('renders an editable export file name field in the export section', () => {
    const document = createInitialDocument();
    const markup = renderToStaticMarkup(
      <SettingsPanel
        document={document}
        documentJson='{"rootId":"site_1"}'
        errors={[]}
        stickyLayout={{}}
        selectedNode={document.nodes[document.rootId] ?? null}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapSettings={DEFAULT_SNAP_SETTINGS}
        themeMode="auto"
        accentColor="#1668ff"
        lightTheme="air"
        darkTheme="monokai"
        resolvedTheme="light"
        startupFocusedMode={null}
        undoDepth={0}
        redoDepth={0}
        historyLimit={100}
        onClose={() => {}}
        onPreviewStickyChange={() => {}}
        onSpacerVisibilityChange={() => {}}
        onShowGridLanesChange={() => {}}
        onSnapSettingsChange={() => {}}
        onThemeModeChange={() => {}}
        onAccentColorChange={() => {}}
        onLightThemeChange={() => {}}
        onDarkThemeChange={() => {}}
        onStartupFocusedModeChange={() => {}}
        onClearHistory={() => {}}
        onHistoryLimitChange={() => {}}
        onImport={() => ({ ok: true, message: 'ok' })}
        onResetData={() => {}}
        onResetAll={() => {}}
      />,
    );

    expect(markup).toContain('Base file name');
    expect(markup).toContain('Theme');
    expect(markup).toContain('Palette');
    expect(markup).toContain('Accent');
    expect(markup).toContain('Startup mode');
    expect(markup).toContain('Chooses which focused mode the editor opens with.');
    expect(markup).toContain('aria-label="Startup mode"');
    expect(markup).toContain('sticky-playground');
    expect(markup).toContain('JSON exports use `.json`; rendered site exports use `.zip`.');
    expect(markup).toContain('Document JSON');
    expect(markup).toContain('Rendered Site');
    expect(markup).toContain('Model export for re-importing into the editor.');
    expect(markup).toContain('Generated site structure export for hosting or SSR.');
    expect(markup).toContain('Bring a saved document model back into the editor.');
    expect(markup).toContain('Save JSON');
    expect(markup).toContain('Save Site ZIP');
    expect(markup).toContain('editor-scrollbar');
    expect(markup).not.toContain('Save Site HTML');
    expect(markup).not.toContain('Save Site CSS');
    expect(markup).not.toContain('Copy Site HTML');
    expect(markup).not.toContain('Copy Site CSS');
  });
});
