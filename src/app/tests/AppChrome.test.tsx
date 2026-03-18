import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionTemplatePopover } from '../AppChrome';

describe('app/AppChrome', () => {
  it('uses the shared editor scrollbar class on the section-template list', () => {
    const markup = renderToStaticMarkup(
      <SectionTemplatePopover
        open
        position={{ top: 12, left: 24 }}
        onOpenChange={() => {}}
        onClose={() => {}}
        onInsertTemplate={() => {}}
      />,
    );

    expect(markup).toContain('editor-scrollbar');
    expect(markup).toContain('Choose a layout to insert.');
  });
});
