import { useEffect, useState } from 'react';
import { getCachedGoogleFontsCatalog, loadGoogleFontsCatalog } from './googleFontsCatalog';
import type { GoogleFontsCatalog } from './types';

type GoogleFontsCatalogState =
  | { status: 'loading'; catalog: null; error: null }
  | { status: 'ready'; catalog: GoogleFontsCatalog; error: null }
  | { status: 'error'; catalog: null; error: string };

export function useGoogleFontsCatalog(): GoogleFontsCatalogState & { retry: () => void } {
  const cached = getCachedGoogleFontsCatalog();
  const [state, setState] = useState<GoogleFontsCatalogState>(
    cached ? { status: 'ready', catalog: cached, error: null } : { status: 'loading', catalog: null, error: null },
  );
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setState({ status: 'loading', catalog: null, error: null });

    loadGoogleFontsCatalog()
      .then((catalog) => {
        if (!cancelled) {
          setState({ status: 'ready', catalog, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', catalog: null, error: err instanceof Error ? err.message : String(err) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return { ...state, retry: () => setRetryCount((n) => n + 1) };
}
