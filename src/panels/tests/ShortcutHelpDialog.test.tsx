import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShortcutHelpDialog } from '../ShortcutHelpDialog';

describe('panels/ShortcutHelpDialog', () => {
  it('uses the shared editor panel header', () => {
    const markup = renderToStaticMarkup(<ShortcutHelpDialog open onOpenChange={() => {}} />);

    expect(markup).toContain('Keyboard Shortcuts');
    expect(markup).toContain('editor-panel-header-close');
    expect(markup).toContain('Close keyboard shortcuts');
  });
});
