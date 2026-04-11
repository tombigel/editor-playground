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
  it('uses the shared editor panel header and renders the new root IA', () => {
    const markup = renderToStaticMarkup(<HelpDialog open onOpenChange={() => {}} />);

    expect(markup).toContain('Help');
    expect(markup).toContain('editor-panel-header-close');
    expect(markup).toContain('Close help');
    expect(markup).toContain('data-help-entry="shortcuts"');
    expect(markup).toContain('About');
    expect(markup).toContain('Sticky Playground');
    expect(markup).toContain('Guides');
    expect(markup).toContain('Reference');
    expect(markup).toContain('Developers');
    expect(markup).toContain('Keyboard shortcuts');
    expect(markup).toContain('data-help-section-root="section:guides"');
    expect(markup).toContain('Getting Started');
    expect(markup).toContain('API Reference');
    expect(markup).toContain('Workflows');
    expect(markup).toContain('On this page');
    expect(markup).toContain('Collapse help navigation');
    expect(markup).toContain('data-help-nav-collapsed="false"');
    expect(markup).toContain('id="help-dialog-nav"');
    expect(markup).toContain('help-nav-header');
    expect(markup).toContain('editor-scrollbar help-nav-scroll overflow-y-auto');
  });

  it('defaults the documentation browser to the about page when no entry is requested', () => {
    const markup = renderToStaticMarkup(<HelpDialog open onOpenChange={() => {}} />);

    expect(markup).toContain('Sticky Playground');
    expect(markup).toContain('data-help-entry-target="doc:docs/GETTING_STARTED.md"');
  });

  it('supports opening directly to the getting started guide', () => {
    const markup = renderToStaticMarkup(
      <HelpDialog open onOpenChange={() => {}} initialEntryId="doc:docs/GETTING_STARTED.md" />,
    );

    expect(markup).toContain('data-help-entry="doc:docs/GETTING_STARTED.md"');
    expect(markup).toContain('Getting Started');
    expect(markup).not.toContain('data-help-entry-target="doc:docs/GETTING_STARTED.md"');
  });

  it('renders the about page with real help-entry links instead of raw paths', () => {
    const markup = renderToStaticMarkup(<HelpDialog open onOpenChange={() => {}} initialEntryId="about" />);

    expect(markup).toContain('data-help-entry-target="doc:docs/GETTING_STARTED.md"');
    expect(markup).toContain('Reference Overview');
    expect(markup).toContain('Playground Spec');
    expect(markup).not.toContain('docs/USAGE.md');
  });

  it('uses the expected nav widths and toggle labels for expanded and collapsed states', () => {
    expect(HELP_NAV_EXPANDED_WIDTH_PX).toBe(260);
    expect(HELP_NAV_COLLAPSED_WIDTH_PX).toBe(56);
    expect(getHelpDialogGridTemplateColumns(false)).toBe('260px minmax(0,1fr)');
    expect(getHelpDialogGridTemplateColumns(true)).toBe('56px minmax(0,1fr)');
    expect(getHelpNavToggleLabel(false)).toBe('Collapse help navigation');
    expect(getHelpNavToggleLabel(true)).toBe('Expand help navigation');
  });

  it('keeps the current document while resetting transient view state on close', () => {
    expect(
      closeHelpDialogState({
        activeEntryId: 'doc:docs/API.md',
        pendingAnchor: 'text-content',
        navCollapsed: true,
        expandedIds: [],
      }),
    ).toEqual({
      activeEntryId: 'doc:docs/API.md',
      pendingAnchor: null,
      navCollapsed: false,
      expandedIds: ['section:guides', 'section:reference', 'section:developers', 'doc:docs/API.md'],
    });
  });
});
