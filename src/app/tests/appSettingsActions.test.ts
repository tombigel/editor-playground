import { describe, expect, it } from 'vitest';
import { createInitialState, serializeDocumentJson } from '../../api/editorApi';
import { importSettingsDocument, resetEditorData, resetEditorState, toActionResult } from '../appSettingsActions';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';

describe('app/appSettingsActions', () => {
  it('returns a parsed document and success message for valid imports', () => {
    const result = importSettingsDocument(serializeDocumentJson(createInitialState().document));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected successful import result');
    }
    expect(result.document.rootId).toBe('site_1');
    expect(result.message).toBe('Document imported. Undo with Cmd + Z.');
  });

  it('returns the parser error message for invalid imports', () => {
    const result = importSettingsDocument('{not-valid-json');

    expect(result).toEqual({
      ok: false,
      message: 'Import failed: invalid JSON.',
    });
  });

  it('preserves ui settings when resetting only editor data', () => {
    const customSnapSettings = { ...DEFAULT_SNAP_SETTINGS, guideSnap: { ...DEFAULT_SNAP_SETTINGS.guideSnap, enabled: false } };
    const next = resetEditorData({
      previewSticky: false,
      animationPreview: {
        enabled: false,
        mode: 'passive',
        triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
      },
      spacerVisibility: 'all',
      showGridLanes: true,
      snapSettings: customSnapSettings,
      themeMode: 'dark',
      accentColor: '#ff6b4a',
      lightTheme: 'paper',
      darkTheme: 'midnight',
      focusedMode: 'sticky',
      startupFocusedMode: 'sticky',
      inspectorCollapsed: true,
      temporaryInspectorOpen: true,
      focusedPanelOffset: { x: -36, y: 72 },
    });

    expect(next.selectedId).toBeNull();
    expect(next.ui).toEqual({
      previewSticky: false,
      animationPreview: {
        enabled: false,
        mode: 'passive',
        triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
      },
      spacerVisibility: 'all',
      showGridLanes: true,
      snapSettings: customSnapSettings,
      themeMode: 'dark',
      accentColor: '#ff6b4a',
      lightTheme: 'paper',
      darkTheme: 'midnight',
      focusedMode: 'sticky',
      startupFocusedMode: 'sticky',
      inspectorCollapsed: true,
      temporaryInspectorOpen: false,
      focusedPanelOffset: { x: -36, y: 72 },
    });
  });

  it('restores default ui when resetting all persisted state', () => {
    const next = resetEditorState();

    expect(next.ui).toEqual({
      previewSticky: true,
      animationPreview: {
        enabled: false,
        mode: 'passive',
        triggers: { entrance: true, ongoing: true, scroll: true, mouse: true, click: true, hover: true },
      },
      spacerVisibility: 'selected',
      showGridLanes: false,
      snapSettings: DEFAULT_SNAP_SETTINGS,
      themeMode: 'auto',
      accentColor: '#1668ff',
      lightTheme: 'air',
      darkTheme: 'monokai',
      focusedMode: null,
      startupFocusedMode: null,
      inspectorCollapsed: false,
      temporaryInspectorOpen: false,
      focusedPanelOffset: { x: 0, y: 0 },
    });
  });

  it('preserves action result shapes for settings callbacks', () => {
    expect(toActionResult({ ok: true, message: 'Saved' })).toEqual({ ok: true, message: 'Saved' });
  });
});
