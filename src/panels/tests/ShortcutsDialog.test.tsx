import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShortcutsDialog } from '../ShortcutsDialog';

describe('panels/ShortcutsDialog', () => {
  it('uses the standalone panel header without duplicating the inner shortcuts header', () => {
    const markup = renderToStaticMarkup(<ShortcutsDialog open onOpenChange={() => {}} />);

    expect(markup).toContain('Shortcuts');
    expect(markup).toContain('Keyboard and pointer reference.');
    expect(markup).not.toContain('>Keyboard shortcuts<');
    expect(markup).toContain('Close shortcuts');
    expect(markup).toContain('Pointer Modifiers');
  });
});
