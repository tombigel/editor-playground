import { Button } from '../components/ui/button';

export function BackToEditorButton() {
  function handleClick() {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
    } else {
      window.open(
        `${window.location.origin}${window.location.pathname}`,
        '_blank',
      );
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999 }}>
      <Button onClick={handleClick} variant="default" size="sm">
        ← Editor
      </Button>
    </div>
  );
}
