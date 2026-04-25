import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Switch } from '../switch';

describe('components/ui/switch', () => {
  it('renders shared mixed-state styling without showcase-only overrides', () => {
    const markup = renderToStaticMarkup(<Switch checked={false} mixed onCheckedChange={() => {}} />);

    expect(markup).toContain('data-mixed="true"');
    expect(markup).toContain('data-[state=unchecked]:translate-x-[9px]');
    expect(markup).not.toContain('data-ui="switch-mixed-indicator"');
    expect(markup).not.toContain('--editor-switch-mixed-indicator');
    expect(markup).not.toContain('!');
    expect(markup).not.toContain('var(--editor-accent)_50%');
    expect(markup).not.toContain('bg-slate-400');
  });
});
