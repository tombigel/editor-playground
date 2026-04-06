import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ControlGroup,
  InlineNotice,
  LabeledFieldStack,
  LabeledControlRow,
  NoticeSurface,
  SettingsNavItem,
  ValuePill,
} from '../settings-panel';

describe('components/ui/settings-panel', () => {
  it('renders a shared labeled control row and group contract', () => {
    const markup = renderToStaticMarkup(
      <ControlGroup separated>
        <LabeledControlRow label="Language" controlWidth="120px">
          <span>Site language</span>
        </LabeledControlRow>
      </ControlGroup>,
    );

    expect(markup).toContain('data-ui="control-group"');
    expect(markup).toContain('data-separated="true"');
    expect(markup).toContain('data-ui="labeled-control-row"');
    expect(markup).toContain('data-ui="labeled-control-row-control"');
    expect(markup).toContain('Language');
    expect(markup).toContain('Site language');
    expect(markup).toContain('width:120px');
  });

  it('renders shared notice surfaces for block and inline feedback', () => {
    const blockMarkup = renderToStaticMarkup(
      <NoticeSurface tone="danger">Failed to export</NoticeSurface>,
    );
    const inlineMarkup = renderToStaticMarkup(
      <InlineNotice>Broken anchor</InlineNotice>,
    );

    expect(blockMarkup).toContain('data-ui="notice-surface"');
    expect(blockMarkup).toContain('data-tone="danger"');
    expect(blockMarkup).toContain('Failed to export');
    expect(inlineMarkup).toContain('data-ui="inline-notice"');
    expect(inlineMarkup).toContain('data-tone="warning"');
    expect(inlineMarkup).toContain('Broken anchor');
  });

  it('renders stacked field and compact value pill contracts', () => {
    const stackMarkup = renderToStaticMarkup(
      <LabeledFieldStack label="Width">
        <input value="120" readOnly />
      </LabeledFieldStack>,
    );
    const pillMarkup = renderToStaticMarkup(
      <ValuePill mixed value="120px" />,
    );

    expect(stackMarkup).toContain('data-ui="labeled-field-stack"');
    expect(stackMarkup).toContain('Width');
    expect(pillMarkup).toContain('data-ui="value-pill"');
    expect(pillMarkup).toContain('data-mixed="true"');
    expect(pillMarkup).toContain('>-<');
  });

  it('renders shared settings nav items for full and compact variants', () => {
    const fullMarkup = renderToStaticMarkup(
      <SettingsNavItem title="Fonts" description="Manage typography" />,
    );
    const compactMarkup = renderToStaticMarkup(
      <SettingsNavItem title="Typography" active compact />,
    );
    const accentHoverMarkup = renderToStaticMarkup(
      <SettingsNavItem title="Design System" compact variant="accent-hover" />,
    );

    expect(fullMarkup).toContain('data-ui="settings-nav-item"');
    expect(fullMarkup).toContain('settings-nav-link');
    expect(fullMarkup).toContain('Manage typography');
    expect(compactMarkup).toContain('data-active="true"');
    expect(compactMarkup).toContain('shadow-sm');
    expect(compactMarkup).toContain('Typography');
    expect(accentHoverMarkup).toContain('data-variant="accent-hover"');
    expect(accentHoverMarkup).toContain('bg-transparent');
  });
});
