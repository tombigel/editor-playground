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
    expect(markup).toContain('data-selected="true"');
    expect(markup).toContain('About');
    expect(markup).toContain('Usage');
    expect(markup).toContain('Reference');
    expect(markup).toContain('Developers');
    expect(markup).toContain('Keyboard shortcuts');
    expect(markup).toContain('API Reference');
    expect(markup).toContain('Workflows');
    expect(markup).toContain('On this page');
    expect(markup).toContain('Collapse help navigation');
    expect(markup).toContain('data-help-nav-collapsed="false"');
  });

  it('supports opening directly to usage documentation', () => {
    const markup = renderToStaticMarkup(
      <HelpDialog open onOpenChange={() => {}} initialEntryId="doc:docs/USAGE.md" />,
    );

    expect(markup).toContain('data-help-entry="doc:docs/USAGE.md"');
    expect(markup).toContain('data-selected="true"');
    expect(markup).toContain('USAGE.md');
    expect(markup).not.toContain('data-help-entry="shortcuts" data-selected="true"');
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
      expandedIds: ['doc:docs/REFERENCE.md', 'doc:docs/DEVELOPERS.md', 'doc:docs/API.md'],
    });
  });
});
