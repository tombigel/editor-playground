import { Button } from '../components/ui/button';

export function BackToEditorButton() {
  const editorUrl = `${window.location.origin}${window.location.pathname}`;
  const editorWindowId =
    'localStorage' in window ? window.localStorage.getItem('sticky-window-group-id') : null;

  function handleClick() {
    const namedEditorWindow = editorWindowId
      ? window.open('', `sticky-editor-${editorWindowId}`)
      : null;

    if (namedEditorWindow && !namedEditorWindow.closed) {
      namedEditorWindow.focus();
      return;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      return;
    }

    window.location.assign(editorUrl);
  }

  return (
    <div className="fixed top-4 -left-1 -translate-x-[calc(100%-32px)] hover:translate-x-0 transition-transform">
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className="border-slate-900/15 bg-white/40 text-slate-900 shadow-lg"
      >
        Back to Editor
        <span aria-hidden="true">←</span>
      </Button>
    </div>
  );
}
