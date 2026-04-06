import * as React from 'react';
import type { ChangeDetail, ColorInput as HdrColorInputElement } from 'hdr-color-input';

import { cn } from '@/lib/utils';

type EditorTheme = 'auto' | 'light' | 'dark';
export type ColorPickerVariant = 'default' | 'swatch';

function readEditorTheme(): EditorTheme {
  if (typeof document === 'undefined') {
    return 'auto';
  }

  const candidates = [document.body.dataset.editorTheme, document.documentElement.dataset.editorTheme];
  const resolvedTheme = candidates.find((value): value is Exclude<EditorTheme, 'auto'> => value === 'light' || value === 'dark');

  return resolvedTheme ?? 'auto';
}

const loadHdrColorInput =
  typeof window === 'undefined'
    ? null
    : (() => {
        let promise: Promise<unknown> | null = null;

        return () => {
          if (typeof customElements !== 'undefined' && customElements.get('color-input')) {
            return Promise.resolve();
          }

          promise ??= import('hdr-color-input');
          return promise;
        };
      })();

const EDITOR_COLOR_PICKER_SHADOW_STYLE = `
  .preview {
    box-sizing: border-box;
    inline-size: 100%;
    min-inline-size: 0 !important;
    max-inline-size: 100%;
    padding: 0.625rem;
    gap: 0.375rem;
    margin: 0.375rem 0 0;
    border-radius: 0.625rem;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--contrast) 22%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--contrast) 18%, transparent);
  }

  .preview > * {
    max-inline-size: 100%;
  }

  .tools {
    top: 0.625rem;
    right: 0.625rem;
    gap: 0.375rem;
  }

  .copy-btn,
  .eyedropper-btn {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid color-mix(in srgb, var(--contrast) 18%, transparent);
    border-radius: 9999px;
    background: color-mix(in srgb, var(--contrast) 14%, transparent);
    color: var(--contrast);
    opacity: 0.96;
    transition:
      opacity 150ms ease,
      background-color 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .copy-btn svg,
  .eyedropper-btn svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  .copy-btn:hover,
  .copy-btn:focus-visible,
  .eyedropper-btn:hover,
  .eyedropper-btn:focus-visible {
    background: color-mix(in srgb, var(--contrast) 22%, transparent);
    border-color: color-mix(in srgb, var(--contrast) 28%, transparent);
    transform: translateY(-1px);
  }

  .copy-message {
    font-family: Inter, "Helvetica Neue", Arial, sans-serif;
    font-size: 9px;
    font-weight: 600;
    line-height: 1.2;
    padding: 0.1875rem 0.4375rem;
    border: 1px solid color-mix(in srgb, var(--contrast) 18%, transparent);
    border-radius: 9999px;
    background: color-mix(in srgb, var(--contrast) 14%, transparent);
  }

  .space {
    display: inline-flex;
    align-items: center;
    font-family: Inter, "Helvetica Neue", Arial, sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: -0.01em;
    min-height: 1.5rem;
    max-inline-size: 100%;
    padding: 0 0.5rem;
    border: 1px solid color-mix(in srgb, var(--contrast) 18%, transparent);
    border-radius: 9999px;
    background: color-mix(in srgb, var(--contrast) 12%, transparent);
  }

  .controls .control label {
    font-family: Inter, "Helvetica Neue", Arial, sans-serif !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    line-height: 1.2 !important;
    color: var(--editor-utility-text-muted) !important;
  }

  .controls .control {
    grid-template-columns: minmax(0, 1.1rem) 1fr 3.25rem !important;
    gap: 0.4375rem !important;
  }

  .controls .control .num-wrapper {
    width: 3rem !important;
    min-width: 3rem !important;
  }

  .controls .control input[type="number"] {
    box-sizing: border-box !important;
    width: 100% !important;
    min-height: 1.625rem !important;
    padding: 0.0625rem 0.4375rem !important;
    border: 1px solid var(--editor-utility-border) !important;
    border-radius: 0.5rem !important;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--editor-surface-background) 94%, #ffffff 6%),
        var(--editor-input-background)
      ) !important;
    color: var(--editor-input-text) !important;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 35%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--editor-utility-border) 38%, transparent) !important;
    font-family: Inter, "Helvetica Neue", Arial, sans-serif !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    line-height: 1.2 !important;
    text-align: right !important;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      background-color 150ms ease !important;
  }

  .controls .control input[type="number"]:hover {
    border-color: color-mix(in srgb, var(--editor-accent) 18%, var(--editor-utility-border)) !important;
  }

  .controls .control input[type="number"]:focus-visible {
    border-color: var(--editor-accent) !important;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 42%, transparent),
      0 0 0 3px color-mix(in srgb, var(--editor-accent) 16%, transparent) !important;
  }

  .control input[type="number"]:focus-visible,
  .space:focus-visible,
  .copy-btn:focus-visible,
  .eyedropper-btn:focus-visible,
  .area-picker:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--editor-accent) 20%, transparent);
    outline-offset: 2px;
  }

  .controls .control input[type="range"] {
    height: 0.375rem;
    border: 1px solid var(--editor-utility-border) !important;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 22%, transparent),
      inset 0 0 0 1px color-mix(in srgb, var(--editor-utility-border) 34%, transparent) !important;
  }

  .controls .control input[type="range"]::-webkit-slider-thumb {
    border: 3px solid var(--editor-slider-thumb-background) !important;
    box-shadow:
      0 0 0 1px var(--editor-slider-thumb-border),
      0 4px 12px color-mix(in srgb, var(--editor-text) 16%, transparent) !important;
  }

  .controls .control input[type="range"]::-moz-range-thumb {
    border: 3px solid var(--editor-slider-thumb-background) !important;
    box-shadow:
      0 0 0 1px var(--editor-slider-thumb-border),
      0 4px 12px color-mix(in srgb, var(--editor-text) 16%, transparent) !important;
  }

  .area-picker .area-thumb {
    border: 3px solid var(--editor-slider-thumb-background) !important;
    box-shadow:
      0 0 0 1px var(--editor-slider-thumb-border),
      0 6px 14px color-mix(in srgb, var(--editor-text) 18%, transparent) !important;
  }
`;

function ColorPickerImpl({
  value,
  fallback = '#ffffff',
  allowAlpha = true,
  ariaLabel,
  variant = 'default',
  className,
  onChange,
}: {
  value: string | undefined;
  fallback?: string;
  allowAlpha?: boolean;
  ariaLabel: string;
  variant?: ColorPickerVariant;
  className?: string;
  onChange: (value: string) => void;
}) {
  const elementRef = React.useRef<HdrColorInputElement | null>(null);
  const [isReady, setIsReady] = React.useState(() => (
    typeof customElements !== 'undefined' && Boolean(customElements.get('color-input'))
  ));
  const [theme, setTheme] = React.useState<EditorTheme>(() => readEditorTheme());
  const resolvedValue = value?.trim() ? value : fallback;
  const onChangeRef = React.useRef(onChange);
  const resolvedValueRef = React.useRef(resolvedValue);
  const frameRef = React.useRef<number | null>(null);
  const pendingValueRef = React.useRef<string | null>(null);
  const isOpenRef = React.useRef(false);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    resolvedValueRef.current = resolvedValue;
  }, [resolvedValue]);

  React.useEffect(() => {
    if (!loadHdrColorInput) {
      return;
    }

    void loadHdrColorInput().then(() => setIsReady(true));
  }, []);

  React.useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    const updateTheme = () => setTheme(readEditorTheme());
    updateTheme();

    const observer = new MutationObserver(updateTheme);

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-editor-theme'],
      });
    }

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-editor-theme'],
    });

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const forceControlsRefresh = () => {
      if (element.hasAttribute('no-alpha')) {
        element.removeAttribute('no-alpha');
        element.setAttribute('no-alpha', '');
        return;
      }

      element.setAttribute('no-alpha', '');
      element.removeAttribute('no-alpha');
    };

    const syncValueBeforeOpen = () => {
      if (isOpenRef.current) {
        return;
      }

      const nextValue = resolvedValueRef.current;
      if (element.getAttribute('value') === nextValue) {
        element.removeAttribute('value');
      }

      element.setAttribute('value', nextValue);
      forceControlsRefresh();
    };

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<ChangeDetail>).detail;
      if (detail?.value) {
        pendingValueRef.current = detail.value;

        if (frameRef.current !== null || typeof window === 'undefined') {
          return;
        }

        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          const nextValue = pendingValueRef.current;
          pendingValueRef.current = null;

          if (nextValue) {
            onChangeRef.current(nextValue);
          }
        });
      }
    };

    const handleOpen = () => {
      isOpenRef.current = true;
    };

    const handleClose = () => {
      isOpenRef.current = false;
    };

    const handleTriggerClick = (event: Event) => {
      if (!isOpenRef.current) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      element.close();
    };

    const handleHostClick = (event: Event) => {
      if (!isOpenRef.current) {
        return;
      }

      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const clickedTrigger = path.some((node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }

        const part = node.getAttribute('part');
        return node.classList.contains('trigger') || part?.split(/\s+/).includes('trigger') === true;
      });

      if (!clickedTrigger) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      element.close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'ArrowDown') {
        syncValueBeforeOpen();
      }
    };

    const trigger = element.shadowRoot?.querySelector<HTMLElement>('[part~="trigger"]');

    element.addEventListener('change', handleChange as EventListener);
    element.addEventListener('open', handleOpen as EventListener);
    element.addEventListener('close', handleClose as EventListener);
    element.addEventListener('pointerdown', syncValueBeforeOpen);
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('click', handleHostClick, { capture: true });
    trigger?.addEventListener('click', handleTriggerClick, { capture: true });

    return () => {
      element.removeEventListener('change', handleChange as EventListener);
      element.removeEventListener('open', handleOpen as EventListener);
      element.removeEventListener('close', handleClose as EventListener);
      element.removeEventListener('pointerdown', syncValueBeforeOpen);
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('click', handleHostClick, { capture: true });
      trigger?.removeEventListener('click', handleTriggerClick, { capture: true });
      if (frameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const nextValue = pendingValueRef.current;
      pendingValueRef.current = null;
      if (nextValue) {
        onChangeRef.current(nextValue);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    if (element.getAttribute('value') !== resolvedValue) {
      element.setAttribute('value', resolvedValue);
    }
  }, [isReady, resolvedValue]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    element.theme = theme;
  }, [isReady, theme]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    element.noAlpha = !allowAlpha;
  }, [allowAlpha, isReady]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    const element = elementRef.current;
    const root = element?.shadowRoot;
    if (!root || typeof document === 'undefined') {
      return;
    }

    const styleSelector = 'style[data-editor-color-picker-shadow-style]';
    let styleElement = root.querySelector<HTMLStyleElement>(styleSelector);

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.setAttribute('data-editor-color-picker-shadow-style', 'true');
      root.appendChild(styleElement);
    }

    if (styleElement.textContent !== EDITOR_COLOR_PICKER_SHADOW_STYLE) {
      styleElement.textContent = EDITOR_COLOR_PICKER_SHADOW_STYLE;
    }
  }, [isReady]);

  return (
    <color-input
      ref={elementRef}
      class={cn(
        'block min-w-0',
        variant === 'default' ? 'w-full' : null,
        variant === 'swatch' ? 'editor-color-picker editor-icon-button-subtle h-8 w-8 overflow-hidden rounded-md border shadow-sm' : null,
        className,
      )}
      data-ui="color-picker"
      data-variant={variant}
      data-allow-alpha={allowAlpha ? 'true' : 'false'}
      aria-label={ariaLabel}
      title={ariaLabel}
      value={isReady ? undefined : resolvedValue}
      theme={!isReady && theme !== 'auto' ? theme : undefined}
      no-alpha={!isReady && !allowAlpha ? '' : undefined}
      suppressHydrationWarning
    />
  );
}

export const ColorPicker = React.memo(
  ColorPickerImpl,
  (prev, next) =>
    prev.value === next.value &&
    prev.fallback === next.fallback &&
    prev.allowAlpha === next.allowAlpha &&
    prev.ariaLabel === next.ariaLabel &&
    prev.variant === next.variant &&
    prev.className === next.className,
);
