import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../../model/defaults';
import { SettingsPanel } from '../SettingsPanel';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';
import { SETTINGS_SECTION_META } from '../settings/settingsSections';

describe('panels/SettingsPanel', () => {
  it('renders an editable export file name field in the export section', () => {
    const document = createInitialDocument();
    const markup = renderToStaticMarkup(
      <SettingsPanel
        document={document}
        documentJson='{"rootId":"site_1"}'
        globalStickyElevation={true}
        onStickyElevationChange={() => undefined}
        previewSticky={true}
        animationPreview={{ enabled: false, mode: 'passive', triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true } }}
        onAnimationPreviewChange={() => {}}
        spacerVisibility="selected"
        showGridLanes={false}
        showDebugInfo={false}
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
        onShowDebugInfoChange={() => {}}
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
    expect(markup).toContain('Show Hidden');
    expect(markup).toContain('Shows hidden components and wrappers as stage ghosts.');
    expect(markup).toContain('Animation preview');
    expect(markup).toContain('Pages');
    expect(markup).toContain('Fonts');
    expect(markup).toContain('Chooses which focused mode the editor opens with.');
    expect(markup).toContain('aria-label="Startup mode"');
    expect(markup).toContain('data-showcase-tour-anchor="settings-panel"');
    expect(markup).toContain('sticky-playground');
    expect(markup).toContain('JSON exports use `.json`; rendered site exports use `.zip`.');
    expect(markup).toContain('Document JSON');
    expect(markup).toContain('Rendered Site');
    expect(markup).toContain('Output structure');
    expect(markup).toContain('Validate links');
    expect(markup).toContain('Title');
    expect(markup).toContain('Language');
    expect(markup).toContain('Keyboard and pointer reference');
    expect(markup).toContain('Model export for re-importing into the editor.');
    expect(markup).toContain('Generated site structure export for hosting or SSR.');
    expect(markup).toContain('Bring a saved document model back into the editor.');
    expect(markup).toContain('Max snap speed');
    expect(markup).toContain('Save JSON');
    expect(markup).toContain('Save Site ZIP');
    expect(markup).toContain('editor-scrollbar');
    expect(markup).not.toContain('Save Site HTML');
    expect(markup).not.toContain('Save Site CSS');
    expect(markup).not.toContain('Copy Site HTML');
    expect(markup).not.toContain('Copy Site CSS');
    expect(markup).not.toContain('Browse help');
    expect(markup).not.toContain('API Reference');

    const navOrder = Array.from(
      markup.matchAll(/data-settings-nav="([^"]+)"/g),
      (match) => match[1],
    );
    const sectionOrder = Array.from(
      markup.matchAll(/data-settings-section="([^"]+)"/g),
      (match) => match[1],
    );
    const expectedOrder = SETTINGS_SECTION_META.map((section) => section.id);

    expect(navOrder).toEqual(expectedOrder);
    expect(sectionOrder).toEqual(expectedOrder);
  });

  it('supports opening directly to a targeted settings section', () => {
    const document = createInitialDocument();
    const markup = renderToStaticMarkup(
      <SettingsPanel
        document={document}
        documentJson='{"rootId":"site_1"}'
        globalStickyElevation={true}
        onStickyElevationChange={() => undefined}
        previewSticky={true}
        animationPreview={{ enabled: false, mode: 'passive', triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true } }}
        onAnimationPreviewChange={() => {}}
        spacerVisibility="selected"
        showGridLanes={false}
        showDebugInfo={false}
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
        onShowDebugInfoChange={() => {}}
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
        activeSection="fonts"
      />,
    );

    expect(markup).toContain('data-settings-nav="fonts"');
    expect(markup).toContain('data-settings-nav="fonts"');
    expect(markup).toContain('data-settings-section="fonts"');
  });
});
