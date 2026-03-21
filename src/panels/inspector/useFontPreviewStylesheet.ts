import { useEffect, useId } from 'react';

/**
 * Manages a `<link rel="stylesheet">` element in `document.head` for font preview.
 *
 * When `href` is a non-empty string the hook creates or updates a link element.
 * When `href` is `null` the link is removed. Cleanup removes the link on unmount.
 *
 * This extracts the repeated pattern from FontPickerPopover and ManageFontsPanel
 * so callers own the decision of *when* to load preview fonts.
 */
export function useFontPreviewStylesheet(href: string | null): void {
  const linkId = useId().replace(/:/g, '');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = window.document.getElementById(linkId) as HTMLLinkElement | null;
    if (!href) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.href = href;
      return;
    }

    const link = window.document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = href;
    window.document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [href, linkId]);
}
