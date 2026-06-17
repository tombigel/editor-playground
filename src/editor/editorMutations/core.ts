import type { PageId } from '../../model/types/site';
import type { DocumentModel } from '../../model/types';
import { validateDocument } from '../../model/validation';
import type { EditorState } from '../types';
import { normalizeDocument } from '../editorPersistence';

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
