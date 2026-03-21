import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useFontPreviewStylesheet } from '../useFontPreviewStylesheet';

describe('panels/inspector/useFontPreviewStylesheet', () => {
  it('exports a function', () => {
    expect(typeof useFontPreviewStylesheet).toBe('function');
  });

  it('does not throw during SSR with null href', () => {
    // The hook checks `typeof window === "undefined"` for SSR safety.
    // renderToStaticMarkup runs synchronously without effects, so useEffect
    // is never called — this verifies the hook body doesn't throw during render.
    function TestComponent() {
      useFontPreviewStylesheet(null);
      return createElement('div', null, 'ok');
    }

    const html = renderToStaticMarkup(createElement(TestComponent));
    expect(html).toContain('ok');
  });

  it('does not throw during SSR with a non-null href', () => {
    function TestComponent() {
      useFontPreviewStylesheet('https://fonts.example.com/css');
      return createElement('div', null, 'ok');
    }

    const html = renderToStaticMarkup(createElement(TestComponent));
    expect(html).toContain('ok');
  });
});
