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
    expect(markup).toContain('h-6 px-2.5');
    expect(markup).not.toContain('h-7 px-2.5');
    expect(markup).toContain('p-0.5');
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
            ariaLabel: 'Switch text subtype to Text Block',
            icon: <TextInitial className="h-3.5 w-3.5" />,
            tooltip: <div className="leading-3.5 font-medium">Text</div>,
          },
          {
            value: 'code',
            label: 'Code',
            ariaLabel: 'Switch text subtype to Code Block',
            icon: <CodeXml className="h-3.5 w-3.5" />,
            tooltip: <div className="leading-3.5 font-medium">Code</div>,
          },
        ]}
      />,
    );

    expect(markup).toContain('data-display="icon"');
    expect(markup).toContain('p-px');
    expect(markup).toContain('h-6 w-6 p-0');
    expect(markup).not.toContain('h-7 w-7 p-0');
    expect(markup).toContain('aria-label="Switch text subtype to Text Block"');
    expect(markup).toContain('aria-label="Switch text subtype to Code Block"');
    expect(markup).toContain('leading-3.5 font-medium');
  });

  it('keeps icon-label options at the 24px option-selector height', () => {
    const markup = renderToStaticMarkup(
      <OptionsSelector
        display="icon-label"
        value="text"
        onValueChange={() => {}}
        options={[
          { value: 'text', label: 'Text', icon: <TextInitial className="h-3.5 w-3.5" /> },
          { value: 'code', label: 'Code', icon: <CodeXml className="h-3.5 w-3.5" /> },
        ]}
      />,
    );

    expect(markup).toContain('h-6 gap-1.5 px-2.5');
    expect(markup).not.toContain('h-7 gap-1.5 px-2.5');
  });

  it('renders the mixed multi-select representation without active option chrome', () => {
    const markup = renderToStaticMarkup(
      <OptionsSelector
        ariaLabel="Alignment"
        mixed
        value="left"
        onValueChange={() => {}}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />,
    );

    expect(markup).toContain('data-mixed="true"');
    expect(markup).toContain('border-dashed');
    expect(markup).toContain('h-6 px-2.5');
    expect(markup).toContain('data-ui="options-selector-option"');
    expect(markup.match(/aria-pressed="true"/g)?.length ?? 0).toBe(0);
    expect(markup).not.toContain('bg-[color:var(--editor-accent)]');
    expect(markup).not.toContain('h-7 px-2.5');
  });
});
