import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ControlGroup,
  InlineNotice,
  LabeledControlRow,
  NoticeSurface,
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
});
