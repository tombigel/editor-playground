import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Switch } from '../switch';

describe('components/ui/switch', () => {
  it('renders compact sizing by default', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} onCheckedChange={() => {}} />);

    expect(markup).toContain('data-size="compact"');
    expect(markup).toContain('h-4');
    expect(markup).toContain('w-7');
    expect(markup).toContain('size-3');
    expect(markup).toContain('top-1/2');
    expect(markup).toContain('-translate-y-1/2');
    expect(markup).toContain('--editor-switch-background');
    expect(markup).toContain('--editor-switch-background-checked');
    expect(markup).toContain('data-[state=unchecked]:translate-x-[1px]');
    expect(markup).toContain('data-[state=checked]:translate-x-[13px]');
  });

  it('renders the large opt-in size with the previous geometry', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} size="large" onCheckedChange={() => {}} />);

    expect(markup).toContain('data-size="large"');
    expect(markup).toContain('h-5');
    expect(markup).toContain('w-9');
    expect(markup).toContain('size-4');
    expect(markup).toContain('data-[state=unchecked]:translate-x-0.5');
    expect(markup).toContain('data-[state=checked]:translate-x-[17px]');
  });

  it('renders shared mixed-state styling without showcase-only overrides', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} mixed onCheckedChange={() => {}} />);

    expect(markup).toContain('data-mixed="true"');
    expect(markup).toContain('bg-transparent');
    expect(markup).not.toContain('--editor-switch-background-mixed');
    expect(markup).toContain('--editor-surface-border');
    expect(markup).toContain('data-[state=unchecked]:translate-x-[7px]');
    expect(markup).toContain('border-dashed');
    expect(markup).toContain('--editor-switch-mixed-indicator');
    expect(markup).not.toContain('data-ui="switch-mixed-indicator"');
    expect(markup).not.toContain('!');
    expect(markup).not.toContain('var(--editor-accent)_50%');
    expect(markup).not.toContain('bg-slate-400');
  });

  it('keeps the large mixed-state position available', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} mixed size="large" onCheckedChange={() => {}} />);

    expect(markup).toContain('data-[state=unchecked]:translate-x-[9px]');
  });
});
