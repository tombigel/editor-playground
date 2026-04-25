import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ValueWithUnit, composeValueWithUnitValue } from '../value-with-unit';

describe('components/ui/value-with-unit', () => {
  it('renders a fixed number+unit shell', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="number-fixed"
        value="16px"
        onChange={() => {}}
        options={[{ type: 'option', value: 'px', label: 'px', inputMode: 'numeric' }]}
        inputValue="16"
        selectedOption="px"
      />,
    );

    expect(markup).toContain('value-with-unit');
    expect(markup).toContain('h-7');
    expect(markup).toContain('value-with-unit-segment value-with-unit-segment-static');
    expect(markup).not.toContain('overflow-hidden');
    expect(markup).not.toContain('h-8');
    expect(markup).toContain('>px<');
    expect(markup).not.toContain('data-ui="select-trigger"');
  });

  it('renders ordered options with separators for keyword and numeric menus', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="number-or-keyword-select"
        value="50%"
        onChange={() => {}}
        options={[
          { type: 'option', value: 'px', label: 'px', inputMode: 'numeric' },
          { type: 'option', value: '%', label: '%', inputMode: 'numeric' },
          { type: 'separator', id: 'keywords' },
          { type: 'option', value: 'fit-content', label: 'fit-content', inputMode: 'keyword' },
        ]}
        inputValue="50"
        selectedOption="%"
        defaultMenuOpen
      />,
    );

    expect(markup).toContain('data-ui="select-separator"');
    expect(markup).toContain('>fit-content<');
    expect(markup.indexOf('>%<')).toBeLessThan(markup.indexOf('>fit-content<'));
  });

  it('applies the accessible label to the keyword-only trigger', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="keyword-select"
        value="auto"
        onChange={() => {}}
        options={[{ type: 'option', value: 'auto', label: 'Auto', inputMode: 'keyword' }]}
        selectedOption="auto"
        ariaLabel="Width mode"
      />,
    );

    expect(markup).toContain('aria-label="Width mode"');
    expect(markup).toContain('data-ui="select-trigger"');
  });

  it('renders shared mixed-state styling for shell and segment', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="number-select"
        value="16px"
        onChange={() => {}}
        options={[
          { type: 'option', value: 'px', label: 'px', inputMode: 'numeric' },
          { type: 'option', value: '%', label: '%', inputMode: 'numeric' },
        ]}
        inputValue=""
        selectedOption="px"
        mixed
        mixedSegment
      />,
    );

    expect(markup).toContain('value-with-unit-mixed');
    expect(markup).toContain('value-with-unit-segment-mixed');
    expect(markup).toContain('placeholder="-"');
  });

  it('renders combobox markup for styled suggestions', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="number-select"
        value="16px"
        onChange={() => {}}
        options={[{ type: 'option', value: 'px', label: 'px', inputMode: 'numeric' }]}
        inputValue="16"
        selectedOption="px"
        suggestions={[
          { value: '12' },
          { value: '16' },
        ]}
        suggestionListId="font-size-suggestions"
        defaultSuggestionsOpen
      />,
    );

    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-controls="font-size-suggestions"');
    expect(markup).toContain('role="listbox"');
    expect(markup).toContain('id="font-size-suggestions-option-12"');
    expect(markup).toContain('value-with-unit-suggestions');
    expect(markup).not.toContain('<datalist');
    expect(markup).toContain('12px');
  });

  it('can expose a controlled suggestions layer without disabled-state utility classes', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="number-select"
        value="16px"
        onChange={() => {}}
        options={[{ type: 'option', value: 'px', label: 'px', inputMode: 'numeric' }]}
        inputValue="16"
        selectedOption="px"
        suggestions={[{ value: '12' }]}
        suggestionsOpen
        includeDisabledStyles={false}
      />,
    );

    expect(markup).toContain('aria-expanded="true"');
    expect(markup).not.toContain('disabled:pointer-events-none');
    expect(markup).not.toContain('disabled:cursor-default');
  });

  it('renders component-owned focus and open state classes instead of relying on global rescue rules', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="number-select"
        value="16px"
        onChange={() => {}}
        options={[{ type: 'option', value: 'px', label: 'px', inputMode: 'numeric' }]}
        inputValue="16"
        selectedOption="px"
      />,
    );

    expect(markup).toContain('data-ui="value-with-unit"');
    expect(markup).toContain('focus-within:outline-2');
    expect(markup).toContain('data-[state=open]:shadow-[inset_0_0_0_1px_var(--editor-accent)]');
  });

  it('can fill the parent width for compact inspector controls', () => {
    const markup = renderToStaticMarkup(
      <ValueWithUnit
        mode="keyword-select"
        value="auto"
        onChange={() => {}}
        options={[{ type: 'option', value: 'auto', label: 'Auto', inputMode: 'keyword' }]}
        selectedOption="auto"
        expandToFill
      />,
    );

    expect(markup).toContain('class="relative w-full"');
  });

  it('uses the same value composition for typed and suggested numeric entries', () => {
    expect(
      composeValueWithUnitValue({
        mode: 'number-select',
        inputValue: '24',
        selectedOptionValue: 'px',
        selectedOptionInputMode: 'numeric',
      }),
    ).toBe('24px');

    expect(
      composeValueWithUnitValue({
        mode: 'number-select',
        inputValue: '12',
        selectedOptionValue: 'px',
        selectedOptionInputMode: 'numeric',
      }),
    ).toBe('12px');
  });
});
