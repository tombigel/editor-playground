import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  closeHelpDialogState,
  HelpDialog,
  getHelpDialogGridTemplateColumns,
  getHelpNavToggleLabel,
  HELP_NAV_COLLAPSED_WIDTH_PX,
  HELP_NAV_EXPANDED_WIDTH_PX,
} from '../HelpDialog';

describe('panels/HelpDialog', () => {
  it('uses the shared editor panel header and defaults to shortcuts content', () => {
    const markup = renderToStaticMarkup(<HelpDialog open onOpenChange={() => {}} />);

    expect(markup).toContain('Help');
    expect(markup).toContain('editor-panel-header-close');
    expect(markup).toContain('Close help');
    expect(markup).toContain('data-help-entry="shortcuts"');
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain('Keyboard shortcuts');
    expect(markup).toContain('About');
    expect(markup).toContain('Pointer Modifiers');
    expect(markup).toContain('API Reference');
    expect(markup).toContain('Animation API');
    expect(markup).toContain('Console Testing Guide');
    expect(markup).toContain('How to add docs?');
    expect(markup).toContain('Collapse help navigation');
    expect(markup).toContain('data-help-nav-collapsed="false"');
    expect(markup).not.toContain('settings-nav-link-copy mt-0.5 text-xs leading-5">API.md<');
    expect(markup).not.toContain('settings-nav-link-copy mt-0.5 text-xs leading-5">CONSOLE_TEST_GUIDE.md<');
    expect(markup.indexOf('data-help-entry="doc:docs/HELP_BROWSER.md"')).toBeLessThan(markup.indexOf('data-help-entry="shortcuts"'));
    expect(markup.indexOf('data-help-entry="shortcuts"')).toBeLessThan(markup.indexOf('data-help-entry="about"'));
    expect(markup).toContain('divider-special');
  });

  it('supports opening directly to documentation mode', () => {
    const markup = renderToStaticMarkup(
      <HelpDialog open onOpenChange={() => {}} initialEntryId="doc:docs/PLAYGROUND_SPEC.md" />,
    );

    expect(markup).toContain('data-help-entry="doc:docs/PLAYGROUND_SPEC.md"');
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain('PLAYGROUND_SPEC.md');
    expect(markup).not.toContain('data-help-entry="shortcuts" data-active="true"');
  });

  it('uses the expected nav widths and toggle labels for expanded and collapsed states', () => {
    expect(HELP_NAV_EXPANDED_WIDTH_PX).toBe(240);
    expect(HELP_NAV_COLLAPSED_WIDTH_PX).toBe(56);
    expect(getHelpDialogGridTemplateColumns(false)).toBe('240px minmax(0,1fr)');
    expect(getHelpDialogGridTemplateColumns(true)).toBe('56px minmax(0,1fr)');
    expect(getHelpNavToggleLabel(false)).toBe('Collapse help navigation');
    expect(getHelpNavToggleLabel(true)).toBe('Expand help navigation');
  });

  it('keeps the current document while resetting transient view state on close', () => {
    expect(
      closeHelpDialogState({
        activeEntryId: 'doc:docs/API.md',
        pendingAnchor: 'architecture-overview',
        navCollapsed: true,
      }),
    ).toEqual({
      activeEntryId: 'doc:docs/API.md',
      pendingAnchor: null,
      navCollapsed: false,
    });
  });
});
