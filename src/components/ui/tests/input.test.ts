import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Input, resolveDisplayedInputValue, stringifyControlledInputValue } from '../input';

describe('components/ui/input', () => {
  it('stringifies controlled input values consistently for local drafts', () => {
    expect(stringifyControlledInputValue(undefined)).toBe('');
    expect(stringifyControlledInputValue(null)).toBe('');
    expect(stringifyControlledInputValue(24)).toBe('24');
    expect(stringifyControlledInputValue('42')).toBe('42');
    expect(stringifyControlledInputValue(['a', 'b'])).toBe('a,b');
  });

  it('shows the local draft while a controlled input is focused', () => {
    expect(
      resolveDisplayedInputValue({
        isControlled: true,
        isFocused: true,
        controlledValue: '24',
        draftValue: '',
        syncWhileFocused: false,
      }),
    ).toBe('');

    expect(
      resolveDisplayedInputValue({
        isControlled: true,
        isFocused: false,
        controlledValue: '24',
        draftValue: '',
        syncWhileFocused: false,
      }),
    ).toBe('24');
  });

  it('can opt into showing external controlled updates while focused', () => {
    expect(
      resolveDisplayedInputValue({
        isControlled: true,
        isFocused: true,
        controlledValue: '16',
        draftValue: '12',
        syncWhileFocused: true,
      }),
    ).toBe('16');
  });

  it('leaves uncontrolled inputs on their native browser behavior', () => {
    expect(
      resolveDisplayedInputValue({
        isControlled: false,
        isFocused: true,
        controlledValue: undefined,
        draftValue: '',
        syncWhileFocused: false,
      }),
    ).toBeUndefined();
  });

  it('uses the shared compact control radius in markup', () => {
    const markup = renderToStaticMarkup(React.createElement(Input, { value: '16', onChange: () => {} }));

    expect(markup).toContain('rounded-sm');
    expect(markup).not.toContain('rounded-md');
  });
});
