import { describe, expect, it } from 'vitest';
import { findMatchingShortcut, getShortcutGestures, getShortcutLabel } from '../shortcuts';

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
        hasStageFocus: false,
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
        hasStageFocus: false,
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
        hasStageFocus: false,
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
        hasStageFocus: false,
      },
      'other',
    );

    expect(snap?.id).toBe('toggleSnapEnabled');
    expect(getShortcutLabel('toggleSnapEnabled', 'other')).toBe('Shift + G');
  });

  it('matches the layers and pages panel shortcuts', () => {
    const layers = findMatchingShortcut(
      {
        code: 'KeyL',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: false,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    const pages = findMatchingShortcut(
      {
        code: 'KeyO',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: false,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    expect(layers?.id).toBe('toggleLayersPanel');
    expect(pages?.id).toBe('togglePagesPanel');
    expect(getShortcutLabel('toggleLayersPanel', 'other')).toBe('Shift + L');
    expect(getShortcutLabel('togglePagesPanel', 'other')).toBe('Shift + O');
  });

  it('matches stage-only nudge shortcuts and blocks them outside the stage', () => {
    const blocked = findMatchingShortcut(
      {
        code: 'ArrowRight',
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    const nudged = findMatchingShortcut(
      {
        code: 'ArrowRight',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
        hasStageFocus: true,
      },
      'other',
    );

    expect(blocked).toBeNull();
    expect(nudged?.id).toBe('nudgeSelectionRight');
    expect(getShortcutLabel('nudgeSelectionRight', 'other')).toBe('Right / Shift + Right');
  });

  it('matches text styling shortcuts', () => {
    const bold = findMatchingShortcut(
      {
        code: 'KeyB',
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    const strike = findMatchingShortcut(
      {
        code: 'KeyX',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'mac',
    );

    expect(bold?.id).toBe('toggleBoldSelection');
    expect(strike?.id).toBe('toggleStrikethroughSelection');
    expect(getShortcutLabel('toggleUnderlineSelection', 'other')).toBe('Ctrl + U');
  });

  it('matches alignment and distribution shortcuts', () => {
    const alignLeft = findMatchingShortcut(
      {
        code: 'ArrowLeft',
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: true,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    const distributeBottom = findMatchingShortcut(
      {
        code: 'ArrowDown',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
        altKey: true,
      },
      {
        interactiveFocus: false,
        hasSelection: true,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'mac',
    );

    expect(alignLeft?.id).toBe('alignSelectionLeft');
    expect(distributeBottom?.id).toBe('distributeSelectionBottom');
    expect(getShortcutLabel('alignSelectionCenterX', 'mac')).toBe('Cmd + Alt + H');
    expect(getShortcutLabel('distributeSelectionVertical', 'other')).toBe('Ctrl + Shift + Alt + V');
  });

  it('lists multi-select click modifiers in the shortcut help gestures', () => {
    expect(getShortcutGestures('mac')).toContainEqual({
      label: 'Cmd + Click / Shift + Click',
      description: 'Toggle multi-select',
    });
    expect(getShortcutGestures('other')).toContainEqual({
      label: 'Ctrl + Click / Shift + Click',
      description: 'Toggle multi-select',
    });
  });
});
