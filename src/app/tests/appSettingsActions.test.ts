import { describe, expect, it } from 'vitest';
import { createInitialState, serializeDocumentJson } from '../../api/editorApi';
import { importSettingsDocument, resetEditorData, resetEditorState, toActionResult } from '../appSettingsActions';

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
    const next = resetEditorData({
      previewSticky: false,
      spacerVisibility: 'all',
      showGridLanes: true,
      snapEnabled: false,
      themeMode: 'dark',
      accentColor: '#ff6b4a',
      paperAccentColor: '#b07a3a',
      monokaiAccentColor: '#ff4f9a',
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
      spacerVisibility: 'all',
      showGridLanes: true,
      snapEnabled: false,
      themeMode: 'dark',
      accentColor: '#ff6b4a',
      paperAccentColor: '#b07a3a',
      monokaiAccentColor: '#ff4f9a',
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
      spacerVisibility: 'selected',
      showGridLanes: false,
      snapEnabled: true,
      themeMode: 'auto',
      accentColor: '#1668ff',
      paperAccentColor: '#a36a2c',
      monokaiAccentColor: '#ff6188',
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
