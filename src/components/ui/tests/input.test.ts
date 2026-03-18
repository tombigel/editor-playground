import { describe, expect, it } from 'vitest';
import { resolveDisplayedInputValue, stringifyControlledInputValue } from '../input';

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
      }),
    ).toBe('');

    expect(
      resolveDisplayedInputValue({
        isControlled: true,
        isFocused: false,
        controlledValue: '24',
        draftValue: '',
      }),
    ).toBe('24');
  });

  it('leaves uncontrolled inputs on their native browser behavior', () => {
    expect(
      resolveDisplayedInputValue({
        isControlled: false,
        isFocused: true,
        controlledValue: undefined,
        draftValue: '',
      }),
    ).toBeUndefined();
  });
});
