import {
  clearPersistedState,
  clearSessionState,
  createFactoryResetState,
  parseImportedDocumentJson,
  persistDefaultDocument,
  type EditorState,
} from '../api/editorApi';
import type { ActionResult } from '../panels/settingsTransfer';

export function importSettingsDocument(raw: string):
  | { ok: true; message: string; document: ReturnType<typeof parseImportedDocumentJson> }
  | { ok: false; message: string } {
  try {
    const document = parseImportedDocumentJson(raw);
    return {
      ok: true,
      message: 'Document imported. Undo with Cmd + Z.',
      document,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Import failed.',
    };
  }
}

export function resetEditorData(ui: EditorState['ui']) {
  const next = createFactoryResetState(ui);
  clearSessionState();
  persistDefaultDocument(next.document);
  return next;
}

export function resetEditorState() {
  clearPersistedState();
  const next = createFactoryResetState();
  persistDefaultDocument(next.document);
  return next;
}

export function toActionResult(result: { ok: boolean; message: string }): ActionResult {
  return result;
}
