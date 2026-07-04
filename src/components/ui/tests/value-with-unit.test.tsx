import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ValueWithUnit, clampSuggestionIndex, composeValueWithUnitValue } from '../value-with-unit';

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
    expect(markup).toContain('value-with-unit-segment value-with-unit-segment-static');
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
    expect(markup).toContain('data-[state=open]:shadow-[inset_0_0_0_1px_var(--editor-accent)]');
  });

  // expandToFill's parent-width behavior is expressed purely via a Tailwind utility
  // class with no data attribute to assert on; covered by the Playwright e2e suite /
  // visual review instead.

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

  it('composes values across every mode and selected-option input-mode combination', () => {
    const base = { inputValue: '24', selectedOptionValue: 'px' } as const;

    expect(composeValueWithUnitValue({ ...base, mode: 'number-fixed', selectedOptionInputMode: 'numeric' })).toBe('24px');
    expect(composeValueWithUnitValue({ ...base, mode: 'number-fixed', selectedOptionInputMode: 'keyword' })).toBe('24px');

    expect(composeValueWithUnitValue({ ...base, mode: 'number-select', selectedOptionInputMode: 'numeric' })).toBe('24px');
    expect(composeValueWithUnitValue({ ...base, mode: 'number-select', selectedOptionInputMode: 'keyword' })).toBe('24px');

    expect(composeValueWithUnitValue({ ...base, mode: 'keyword-select', selectedOptionInputMode: 'numeric' })).toBeNull();
    expect(composeValueWithUnitValue({ ...base, mode: 'keyword-select', selectedOptionInputMode: 'keyword' })).toBeNull();

    expect(
      composeValueWithUnitValue({ ...base, mode: 'number-or-keyword-select', selectedOptionInputMode: 'numeric' }),
    ).toBe('24px');
    expect(
      composeValueWithUnitValue({ ...base, mode: 'number-or-keyword-select', selectedOptionInputMode: 'keyword' }),
    ).toBeNull();
  });

  it('clamps suggestion indexes into range and returns -1 for an empty list', () => {
    expect(clampSuggestionIndex(0, 0)).toBe(-1);
    expect(clampSuggestionIndex(-3, 5)).toBe(0);
    expect(clampSuggestionIndex(10, 5)).toBe(4);
    expect(clampSuggestionIndex(2, 5)).toBe(2);
  });
});
