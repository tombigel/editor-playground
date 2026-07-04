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

  // The 28px compact control height/radius contract is expressed purely via Tailwind
  // utility classes with no data attribute to assert on; covered by the Playwright
  // e2e suite / visual review instead.
});
