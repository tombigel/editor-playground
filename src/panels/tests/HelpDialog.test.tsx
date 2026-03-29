import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelpDialog } from '../HelpDialog';

describe('panels/HelpDialog', () => {
  it('uses the shared editor panel header and defaults to shortcuts content', () => {
    const markup = renderToStaticMarkup(<HelpDialog open onOpenChange={() => {}} />);

    expect(markup).toContain('Help');
    expect(markup).toContain('editor-panel-header-close');
    expect(markup).toContain('Close help');
    expect(markup).toContain('data-help-entry="shortcuts"');
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain('Keyboard shortcuts');
    expect(markup).toContain('Pointer Modifiers');
    expect(markup).toContain('API Reference');
    expect(markup).toContain('Animation API');
    expect(markup).toContain('Console Testing Guide');
    expect(markup).toContain('How to add docs?');
    expect(markup).not.toContain('settings-nav-link-copy mt-0.5 text-xs leading-5">API.md<');
    expect(markup).not.toContain('settings-nav-link-copy mt-0.5 text-xs leading-5">CONSOLE_TEST_GUIDE.md<');
  });
});
