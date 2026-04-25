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

  it('renders default notice icons by tone with custom and suppressed icon support', () => {
    const defaultMarkup = renderToStaticMarkup(<NoticeSurface>Neutral message</NoticeSurface>);
    const messageMarkup = renderToStaticMarkup(<NoticeSurface tone="message">Neutral message</NoticeSurface>);
    const infoMarkup = renderToStaticMarkup(<NoticeSurface tone="info">Helpful context</NoticeSurface>);
    const warningMarkup = renderToStaticMarkup(<NoticeSurface tone="warning">Check this</NoticeSurface>);
    const dangerMarkup = renderToStaticMarkup(<NoticeSurface tone="danger">Failed</NoticeSurface>);
    const errorMarkup = renderToStaticMarkup(<NoticeSurface tone="error">Failed</NoticeSurface>);
    const customMarkup = renderToStaticMarkup(
      <NoticeSurface tone="info" icon={<span data-testid="custom-icon" />}>
        Custom
      </NoticeSurface>,
    );
    const suppressedMarkup = renderToStaticMarkup(
      <NoticeSurface tone="info" icon={null}>
        No icon
      </NoticeSurface>,
    );

    expect(defaultMarkup).toContain('data-tone="message"');
    expect(messageMarkup).toContain('editor-bg-subtle');
    expect(messageMarkup).toContain('editor-text-muted');
    expect(messageMarkup).toContain('lucide-info');
    expect(infoMarkup).toContain('editor-success-surface');
    expect(infoMarkup).toContain('editor-success-text');
    expect(infoMarkup).toContain('lucide-info');
    expect(warningMarkup).toContain('lucide-triangle-alert');
    expect(dangerMarkup).toContain('lucide-shield-alert');
    expect(dangerMarkup).toContain('editor-danger-surface');
    expect(dangerMarkup).toContain('editor-danger-text');
    expect(errorMarkup).toContain('data-tone="error"');
    expect(errorMarkup).toContain('lucide-shield-alert');
    expect(errorMarkup).not.toContain('text-red-700');
    expect(customMarkup).toContain('data-testid="custom-icon"');
    expect(customMarkup).not.toContain('lucide-info');
    expect(suppressedMarkup).not.toContain('data-ui="notice-icon"');
  });

  it('renders inline notice tone variants', () => {
    const messageMarkup = renderToStaticMarkup(<InlineNotice tone="message">Neutral note</InlineNotice>);
    const infoMarkup = renderToStaticMarkup(<InlineNotice tone="info">Useful note</InlineNotice>);
    const warningMarkup = renderToStaticMarkup(<InlineNotice tone="warning">Broken anchor</InlineNotice>);
    const dangerMarkup = renderToStaticMarkup(<InlineNotice tone="danger">Invalid setting</InlineNotice>);
    const errorMarkup = renderToStaticMarkup(<InlineNotice tone="error">Invalid setting</InlineNotice>);

    expect(messageMarkup).toContain('data-tone="message"');
    expect(messageMarkup).toContain('editor-text-muted');
    expect(infoMarkup).toContain('data-tone="info"');
    expect(infoMarkup).toContain('editor-success-text');
    expect(infoMarkup).toContain('lucide-info');
    expect(warningMarkup).toContain('data-tone="warning"');
    expect(warningMarkup).toContain('lucide-triangle-alert');
    expect(dangerMarkup).toContain('data-tone="danger"');
    expect(dangerMarkup).toContain('lucide-shield-alert');
    expect(dangerMarkup).toContain('editor-danger-text');
    expect(errorMarkup).toContain('data-tone="error"');
    expect(errorMarkup).toContain('lucide-shield-alert');
    expect(errorMarkup).not.toContain('text-red-700');
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
