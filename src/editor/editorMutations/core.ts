import type { PageId } from '../../model/types/site';
import type { DocumentModel } from '../../model/types';
import { validateDocument } from '../../model/validation';
import type { EditorState } from '../types';
import { normalizeDocument } from '../editorPersistence';
import { applyAiDocumentCommands, AiCommandBatchRejectedError } from '../../api/ai/commands';
import type { AiDocumentCommand } from '../../api/ai/types/index';

export function importDocument(state: EditorState, document: DocumentModel): EditorState {
  const normalized = normalizeDocument(document);
  const errors = validateDocument(normalized);
  if (errors.length > 0) {
    throw new Error(`Import failed: ${errors.join('; ')}`);
  }

	  return {
	    ...state,
	    document: normalized,
	    activePageId: normalized.pages?.[0]?.id ?? null,
	    selectedId: null,
	    selectedIds: [],
	    pendingRoleSwap: null,
  };
}

export function setActivePage(state: EditorState, pageId: PageId): EditorState {
  const page = state.document.pages?.find((p) => p.id === pageId);
  if (!page) return state;
  return {
    ...state,
    activePageId: pageId,
    selectedId: null,
    selectedIds: [],
    pendingRoleSwap: null,
  };
}

export function getValidationErrors(state: EditorState): string[] {
  return validateDocument(state.document);
}

/**
 * Apply a batch of AI-proposed mutation commands as a single, atomic
 * `EditorState` update. Delegates to `applyAiDocumentCommands`
 * (`src/api/ai/commands.ts`), which re-validates every command against the
 * *current* document and applies all-or-nothing.
 *
 * If the batch is rejected (`AiCommandBatchRejectedError`, e.g. a stale
 * draft referencing a node that no longer exists), this returns `state`
 * unchanged — a true no-op, matching how every other reducer case behaves
 * when its underlying `*Doc` call would have been a no-op. It does not
 * surface `reasons` itself; callers that need to show a stale-draft message
 * are expected to detect "nothing changed" and re-fetch/re-generate.
 */
export function applyAiCommands(state: EditorState, commands: AiDocumentCommand[]): EditorState {
  try {
    return { ...state, document: applyAiDocumentCommands(state.document, commands) };
  } catch (error) {
    if (error instanceof AiCommandBatchRejectedError) {
      return state;
    }
    throw error;
  }
}
