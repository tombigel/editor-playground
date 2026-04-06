import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColorPicker } from '../color-picker';

describe('components/ui/color-picker', () => {
  it('renders the default host contract as a full-width field wrapper', () => {
    const markup = renderToStaticMarkup(
      <ColorPicker value="#1668ff" ariaLabel="Theme color" onChange={() => {}} />,
    );

    expect(markup).toContain('data-ui="color-picker"');
    expect(markup).toContain('data-variant="default"');
    expect(markup).toContain('class="block min-w-0 w-full"');
  });

  it('renders the shared swatch host variant for dense inspector consumers', () => {
    const markup = renderToStaticMarkup(
      <ColorPicker value="#1668ff" ariaLabel="Swatch" variant="swatch" onChange={() => {}} />,
    );

    expect(markup).toContain('data-variant="swatch"');
    expect(markup).toContain('editor-color-picker');
    expect(markup).toContain('editor-icon-button-subtle');
    expect(markup).toContain('h-8 w-8');
  });
});
