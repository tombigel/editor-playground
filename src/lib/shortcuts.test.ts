import { describe, expect, it } from 'vitest';
import { findMatchingShortcut, getShortcutLabel } from './shortcuts';

describe('shortcut registry', () => {
  it('matches arrange shortcuts with industry-standard shift variants', () => {
    const sendBackward = findMatchingShortcut(
      {
        code: 'BracketLeft',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
      },
      'mac',
    );

    const sendToBack = findMatchingShortcut(
      {
        code: 'BracketLeft',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
      },
      'mac',
    );

    expect(sendBackward?.id).toBe('orderBack');
    expect(sendToBack?.id).toBe('orderSendToBack');
  });

  it('supports redo labels for both mac and non-mac platforms', () => {
    expect(getShortcutLabel('redo', 'mac')).toBe('Cmd + Shift + Z');
    expect(getShortcutLabel('redo', 'other')).toBe('Ctrl + Shift + Z / Ctrl + Y');
  });

  it('treats question mark as the shortcut help trigger', () => {
    const help = findMatchingShortcut(
      {
        code: 'Slash',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: false,
        hasDismissiblePanels: false,
      },
      'other',
    );

    expect(help?.id).toBe('showShortcutHelp');
    expect(getShortcutLabel('showShortcutHelp', 'other')).toBe('?');
  });

  it('matches and labels the snap-to-guides shortcut', () => {
    const snap = findMatchingShortcut(
      {
        code: 'KeyG',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: false,
        hasDismissiblePanels: false,
      },
      'other',
    );

    expect(snap?.id).toBe('toggleSnapEnabled');
    expect(getShortcutLabel('toggleSnapEnabled', 'other')).toBe('Shift + G');
  });
});
