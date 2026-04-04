import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../editor/editorPersistence';
import { editorReducer, historyReducer, type HistoryState } from '../editorState';
import type { EditorState } from '../../editor/types';

function createTestHistoryState(state?: EditorState): HistoryState {
  return {
    present: state ?? createInitialState(),
    past: [],
    future: [],
    historyLimit: 100,
    activeResize: null,
  };
}

describe('app/pageActions', () => {
  describe('editorReducer/setActivePage', () => {
    it('updates activePageId and clears selection', () => {
      const initial = createInitialState();
      const pages = initial.document.pages ?? [];
      const firstPageId = pages[0]?.id;
      if (!firstPageId) throw new Error('Expected pages in initial document');

      const withSelection = { ...initial, selectedId: 'some-node', selectedIds: ['some-node'] };
      const next = editorReducer(withSelection, { type: 'setActivePage', pageId: firstPageId });

      expect(next.activePageId).toBe(firstPageId);
      expect(next.selectedId).toBeNull();
      expect(next.selectedIds).toEqual([]);
    });

    it('returns unchanged state if pageId does not exist', () => {
      const initial = createInitialState();
      const next = editorReducer(initial, { type: 'setActivePage', pageId: 'nonexistent' });
      expect(next).toBe(initial);
    });
  });

  describe('editorReducer/addPage', () => {
    it('increments pages length and sets activePageId to the new page', () => {
      const initial = createInitialState();
      const beforeCount = initial.document.pages?.length ?? 0;

      const next = editorReducer(initial, { type: 'addPage' });

      expect(next.document.pages?.length).toBe(beforeCount + 1);
      const newPage = next.document.pages?.[next.document.pages.length - 1];
      expect(next.activePageId).toBe(newPage?.id);
    });

    it('passes options through to the new page', () => {
      const initial = createInitialState();
      const next = editorReducer(initial, { type: 'addPage', options: { displayName: 'About', slug: 'about' } });
      const newPage = next.document.pages?.[next.document.pages.length - 1];
      expect(newPage?.displayName).toBe('About');
      expect(newPage?.slug).toBe('about');
    });
  });

  describe('editorReducer/deletePage', () => {
    it('removes the page from the document', () => {
      const initial = createInitialState();
      const withExtra = editorReducer(initial, { type: 'addPage', options: { displayName: 'About', slug: 'about' } });
      const pageToDelete = withExtra.document.pages?.[withExtra.document.pages.length - 1];
      if (!pageToDelete) throw new Error('Expected new page');

      const next = editorReducer(withExtra, { type: 'deletePage', pageId: pageToDelete.id });

      expect(next.document.pages?.find((p) => p.id === pageToDelete.id)).toBeUndefined();
    });

    it('falls back to first page if deleted page was active', () => {
      const initial = createInitialState();
      const withExtra = editorReducer(initial, { type: 'addPage', options: { displayName: 'About', slug: 'about' } });
      const newPage = withExtra.document.pages?.[withExtra.document.pages.length - 1];
      if (!newPage) throw new Error('Expected new page');

      const onNewPage = editorReducer(withExtra, { type: 'setActivePage', pageId: newPage.id });
      const next = editorReducer(onNewPage, { type: 'deletePage', pageId: newPage.id });

      expect(next.activePageId).toBe(next.document.pages?.[0]?.id);
    });

    it('preserves activePageId if deleted page was not active', () => {
      const initial = createInitialState();
      const firstPageId = initial.document.pages?.[0]?.id;
      if (!firstPageId) throw new Error('Expected pages');

      const withExtra = editorReducer(initial, { type: 'addPage', options: { displayName: 'About', slug: 'about' } });
      const extraPage = withExtra.document.pages?.[withExtra.document.pages.length - 1];
      if (!extraPage) throw new Error('Expected extra page');

      const next = editorReducer(withExtra, { type: 'deletePage', pageId: extraPage.id });

      expect(next.activePageId).toBe(firstPageId);
    });

    it('clears selection when deleting the active page', () => {
      const initial = createInitialState();
      const withExtra = editorReducer(initial, { type: 'addPage' });
      const newPage = withExtra.document.pages?.[withExtra.document.pages.length - 1];
      if (!newPage) throw new Error('Expected new page');

      const withSelection = { ...withExtra, selectedId: 'some-node', selectedIds: ['some-node'], activePageId: newPage.id };
      const next = editorReducer(withSelection, { type: 'deletePage', pageId: newPage.id });

      expect(next.selectedId).toBeNull();
      expect(next.selectedIds).toEqual([]);
    });
  });

  describe('history undo/redo for addPage', () => {
    it('undoes addPage restoring previous page count and activePageId', () => {
      const initial = createInitialState();
      const initialPageCount = initial.document.pages?.length ?? 0;
      const initialActivePageId = initial.activePageId;

      const hs = createTestHistoryState(initial);
      const afterAdd = historyReducer(hs, { type: 'addPage' });

      expect(afterAdd.present.document.pages?.length).toBe(initialPageCount + 1);
      expect(afterAdd.past).toHaveLength(1);

      const afterUndo = historyReducer(afterAdd, { type: 'undo' });

      expect(afterUndo.present.document.pages?.length).toBe(initialPageCount);
      expect(afterUndo.present.activePageId).toBe(initialActivePageId);
    });

    it('redoes addPage after undo', () => {
      const initial = createInitialState();
      const initialPageCount = initial.document.pages?.length ?? 0;

      const hs = createTestHistoryState(initial);
      const afterAdd = historyReducer(hs, { type: 'addPage' });
      const afterUndo = historyReducer(afterAdd, { type: 'undo' });
      const afterRedo = historyReducer(afterUndo, { type: 'redo' });

      expect(afterRedo.present.document.pages?.length).toBe(initialPageCount + 1);
    });
  });

  describe('editorReducer/addPageSlugAlias', () => {
    it('appends an alias to the page slugAliases array', () => {
      const initial = createInitialState();
      const page = initial.document.pages?.[0];
      if (!page) throw new Error('Expected pages in initial document');

      const next = editorReducer(initial, { type: 'addPageSlugAlias', pageId: page.id, alias: 'old-slug' });
      const updatedPage = next.document.pages?.find((p) => p.id === page.id);

      expect(updatedPage?.slugAliases).toContain('old-slug');
    });

    it('returns unchanged state for unknown pageId', () => {
      const initial = createInitialState();
      const next = editorReducer(initial, { type: 'addPageSlugAlias', pageId: 'nonexistent', alias: 'x' });
      expect(next.document.pages).toEqual(initial.document.pages);
    });
  });

  describe('editorReducer/removePageSlugAlias', () => {
    it('removes an alias from the page slugAliases array', () => {
      const initial = createInitialState();
      const page = initial.document.pages?.[0];
      if (!page) throw new Error('Expected pages in initial document');

      const withAlias = editorReducer(initial, { type: 'addPageSlugAlias', pageId: page.id, alias: 'old-slug' });
      const next = editorReducer(withAlias, { type: 'removePageSlugAlias', pageId: page.id, alias: 'old-slug' });
      const updatedPage = next.document.pages?.find((p) => p.id === page.id);

      expect(updatedPage?.slugAliases ?? []).not.toContain('old-slug');
    });

    it('does not include the removed alias after removal', () => {
      const initial = createInitialState();
      const page = initial.document.pages?.[0];
      if (!page) throw new Error('Expected pages in initial document');

      // Add then remove
      const withAlias = editorReducer(initial, { type: 'addPageSlugAlias', pageId: page.id, alias: 'nonexistent' });
      const next = editorReducer(withAlias, { type: 'removePageSlugAlias', pageId: page.id, alias: 'nonexistent' });
      const updatedPage = next.document.pages?.find((p) => p.id === page.id);
      expect(updatedPage?.slugAliases ?? []).not.toContain('nonexistent');
    });
  });
});
