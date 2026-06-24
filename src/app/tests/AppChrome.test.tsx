import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Eye } from 'lucide-react';
import { RailToggleButton, SectionTemplatePopover } from '../AppChrome';

describe('app/AppChrome', () => {
  it('uses the shared editor scrollbar class on the section-template list', () => {
    const markup = renderToStaticMarkup(
      <SectionTemplatePopover
        open
        style={{ top: 76, left: 80 }}
        onOpenChange={() => {}}
        onClose={() => {}}
        onInsertTemplate={() => {}}
      />,
    );

    expect(markup).toContain('editor-scrollbar');
    expect(markup).toContain('editor-panel-header-close');
  });

  it('supports suppressing the live popover wrapper for static showcase rendering', () => {
    const markup = renderToStaticMarkup(
      <SectionTemplatePopover
        open
        suppressPopover
        style={{ top: 12, left: 24 }}
        onOpenChange={() => {}}
        onClose={() => {}}
        onInsertTemplate={() => {}}
      />,
    );

    expect(markup).toContain('data-ui="floating-panel-shell"');
    expect(markup).not.toContain('popover="manual"');
  });

  it('keeps icon toggle names stable while exposing pressed state separately', () => {
    const markup = renderToStaticMarkup(
      <RailToggleButton icon={Eye} pressed label="Show hidden" onClick={() => {}} />,
    );

    expect(markup).toContain('aria-label="Show hidden"');
    expect(markup).toContain('aria-pressed="true"');
  });
});
