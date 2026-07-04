import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Switch } from '../switch';

describe('components/ui/switch', () => {
  it('renders compact sizing by default', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} onCheckedChange={() => {}} />);

    expect(markup).toContain('data-size="compact"');
    expect(markup).toContain('--editor-switch-background');
    expect(markup).toContain('--editor-switch-background-checked');
  });

  it('renders the large opt-in size with the previous geometry', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} size="large" onCheckedChange={() => {}} />);

    expect(markup).toContain('data-size="large"');
  });

  it('renders shared mixed-state styling without showcase-only overrides', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} mixed onCheckedChange={() => {}} />);

    expect(markup).toContain('data-mixed="true"');
    expect(markup).not.toContain('--editor-switch-background-mixed');
    expect(markup).toContain('--editor-surface-border');
    expect(markup).toContain('--editor-switch-mixed-indicator');
    expect(markup).not.toContain('data-ui="switch-mixed-indicator"');
    expect(markup).not.toContain('!');
    expect(markup).not.toContain('var(--editor-accent)_50%');
    expect(markup).not.toContain('bg-slate-400');
  });

  // Large mixed-state thumb translate-x geometry is expressed purely via a Tailwind
  // arbitrary-value utility class with no data attribute to assert on; covered by the
  // Playwright e2e suite / visual review instead.
});
