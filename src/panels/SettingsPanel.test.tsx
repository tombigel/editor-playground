import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../model/defaults';
import { SettingsPanel } from './SettingsPanel';

describe('panels/SettingsPanel', () => {
  it('renders an editable export file name field in the export section', () => {
    const document = createInitialDocument();
    const markup = renderToStaticMarkup(
      <SettingsPanel
        documentJson='{"rootId":"site_1"}'
        errors={[]}
        stickyLayout={{}}
        selectedNode={document.nodes[document.rootId] ?? null}
        previewSticky={true}
        spacerVisibility="selected"
        showGridLanes={false}
        snapEnabled={true}
        themeMode="auto"
        undoDepth={0}
        redoDepth={0}
        historyLimit={100}
        onClose={() => {}}
        onPreviewStickyChange={() => {}}
        onSpacerVisibilityChange={() => {}}
        onShowGridLanesChange={() => {}}
        onSnapEnabledChange={() => {}}
        onThemeModeChange={() => {}}
        onClearHistory={() => {}}
        onHistoryLimitChange={() => {}}
        onImport={() => ({ ok: true, message: 'ok' })}
        onResetData={() => {}}
        onResetAll={() => {}}
      />,
    );

    expect(markup).toContain('File name');
    expect(markup).toContain('sticky-playground-document.json');
    expect(markup).toContain('suggested native save name');
  });
});
