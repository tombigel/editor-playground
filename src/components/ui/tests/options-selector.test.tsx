import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CodeXml, TextInitial } from 'lucide-react';

import { OptionsSelector } from '../options-selector';

describe('components/ui/options-selector', () => {
  it('renders a segmented selector with the active option pressed', () => {
    const markup = renderToStaticMarkup(
      <OptionsSelector
        ariaLabel="Alignment"
        value="center"
        onValueChange={() => {}}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />,
    );

    expect(markup).toContain('data-ui="options-selector"');
    expect(markup).toContain('<fieldset');
    expect(markup).toContain('>Alignment<');
    expect(markup.match(/aria-pressed="true"/g)?.length).toBe(1);
    expect(markup).toContain('data-variant="default"');
    expect(markup).toContain('bg-[color:var(--editor-accent)]');
    expect(markup).toContain('text-[color:var(--editor-accent-foreground)]');
  });

  it('supports icon-only options with per-option tooltips and aria labels', () => {
    const markup = renderToStaticMarkup(
      <OptionsSelector
        ariaLabel="Text subtype"
        display="icon"
        size="compact"
        value="block"
        onValueChange={() => {}}
        options={[
          {
            value: 'block',
            label: 'Text',
            ariaLabel: 'Switch text subtype to Text',
            icon: <TextInitial className="h-3.5 w-3.5" />,
            tooltip: <div className="leading-3.5 font-medium">Text</div>,
          },
          {
            value: 'code',
            label: 'Code',
            ariaLabel: 'Switch text subtype to Code',
            icon: <CodeXml className="h-3.5 w-3.5" />,
            tooltip: <div className="leading-3.5 font-medium">Code</div>,
          },
        ]}
      />,
    );

    expect(markup).toContain('data-display="icon"');
    expect(markup).toContain('aria-label="Switch text subtype to Text"');
    expect(markup).toContain('aria-label="Switch text subtype to Code"');
    expect(markup).toContain('leading-3.5 font-medium');
  });
});
