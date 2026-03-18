import { useEffect, useState } from 'react';
import { fetchGoogleFontCatalog, type GoogleFontsCatalog } from './index';
import { readCachedGoogleFontsCatalog, shouldRefreshGoogleFontsCatalog, writeCachedGoogleFontsCatalog } from './googleFontsCache';

type CatalogState =
  | { status: 'loading'; catalog: null; error: null }
  | { status: 'ready'; catalog: GoogleFontsCatalog; error: null }
  | { status: 'error'; catalog: null; error: string };

export function useGoogleFontsCatalog() {
  const [state, setState] = useState<CatalogState>(() => {
    const cachedCatalog = readCachedGoogleFontsCatalog(resolveStorage());
    return cachedCatalog
      ? { status: 'ready', catalog: cachedCatalog, error: null }
      : { status: 'loading', catalog: null, error: null };
  });
  const [retrySeed, setRetrySeed] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const storage = resolveStorage();
    const cachedCatalog = readCachedGoogleFontsCatalog(storage);
    const shouldFetch = retrySeed > 0 || shouldRefreshGoogleFontsCatalog(cachedCatalog);

    if (cachedCatalog) {
      setState({ status: 'ready', catalog: cachedCatalog, error: null });
    } else {
      setState({ status: 'loading', catalog: null, error: null });
    }

    if (!shouldFetch) {
      return () => controller.abort();
    }

    fetchGoogleFontCatalog({ signal: controller.signal })
      .then((catalog) => {
        if (!controller.signal.aborted) {
          writeCachedGoogleFontsCatalog(storage, catalog);
          setState({ status: 'ready', catalog, error: null });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          if (cachedCatalog) {
            setState({ status: 'ready', catalog: cachedCatalog, error: null });
            return;
          }
          setState({
            status: 'error',
            catalog: null,
            error: error instanceof Error ? error.message : 'Failed to load Google Fonts catalog.',
          });
        }
      });

    return () => controller.abort();
  }, [retrySeed]);

  return {
    ...state,
    retry: () => setRetrySeed((value) => value + 1),
  };
}

function resolveStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}
