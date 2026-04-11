const PREVIEW_MODE_PARAM = 'preview';
const WINDOW_GROUP_STORAGE_KEY = 'sticky-window-group-id';

export function getOrCreateEditorWindowId() {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const storage = 'localStorage' in window ? window.localStorage : undefined;
  const existingId = storage?.getItem(WINDOW_GROUP_STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const nextId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage?.setItem(WINDOW_GROUP_STORAGE_KEY, nextId);
  return nextId;
}

export function openPreviewSiteWindow(editorWindowId = getOrCreateEditorWindowId()) {
  if (typeof window === 'undefined') {
    return;
  }

  const previewUrl = new URL(window.location.pathname, window.location.origin);
  previewUrl.searchParams.set('mode', PREVIEW_MODE_PARAM);
  window.open(previewUrl.toString(), `sticky-preview-${editorWindowId}`);
}
