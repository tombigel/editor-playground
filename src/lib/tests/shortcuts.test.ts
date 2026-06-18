import { describe, expect, it } from 'vitest';
import { findMatchingShortcut, getShortcutGestures, getShortcutLabel } from '../shortcuts';
import {
  getShortcutFocusContext,
  hasStageKeyboardFocus,
  isInteractiveFocus,
  isTextInputFocus,
} from '../../app/useEditorEnvironment';

function createMockFocusTarget(options: {
  interactive?: boolean;
  stage?: boolean;
  textInput?: boolean;
} = {}) {
  const { interactive = false, stage = false, textInput = false } = options;

  return {
    isContentEditable: textInput,
    closest(selector: string) {
      if (stage && selector.includes('[data-stage-focus-scope="true"]')) {
        return {};
      }
      if (textInput && selector.includes('input')) {
        return {};
      }
      if (textInput && selector.includes('textarea')) {
        return {};
      }
      if (textInput && selector.includes('[role="textbox"]')) {
        return {};
      }
      if (textInput && selector.includes('[contenteditable="true"]')) {
        return {};
      }
      if (interactive && selector.includes('button')) {
        return {};
      }
      if (interactive && selector.includes('select')) {
        return {};
      }
      if (interactive && selector.includes('[data-radix-select-trigger]')) {
        return {};
      }
      if (interactive && selector.includes('[data-radix-slider-thumb]')) {
        return {};
      }
      return null;
    },
  } as unknown as HTMLElement;
}

describe('shortcut registry', () => {
  it('matches arrange shortcuts with platform-specific front and back ordering variants', () => {
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
        shiftKey: false,
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

    const bringToFrontOther = findMatchingShortcut(
      {
        code: 'BracketRight',
        metaKey: false,
        ctrlKey: true,
        shiftKey: true,
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

    expect(sendBackward?.id).toBe('orderBack');
    expect(sendToBack?.id).toBe('orderSendToBack');
    expect(bringToFrontOther?.id).toBe('orderBringToFront');
    expect(getShortcutLabel('orderSendToBack', 'mac')).toBe('Cmd + Alt + [');
    expect(getShortcutLabel('orderBringToFront', 'other')).toBe('Ctrl + Shift + ]');
  });

  it('supports redo labels for both mac and non-mac platforms', () => {
    expect(getShortcutLabel('redo', 'mac')).toBe('Cmd + Shift + Z');
    expect(getShortcutLabel('redo', 'other')).toBe('Ctrl + Shift + Z / Ctrl + Y');
  });

  it('matches settings from non-text interactive chrome', () => {
    const settings = findMatchingShortcut(
      {
        code: 'Comma',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      },
      {
        interactiveFocus: true,
        hasSelection: false,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'mac',
    );

    expect(settings?.id).toBe('openSettings');
  });

  it('classifies text input focus separately from interactive chrome', () => {
    const textInput = createMockFocusTarget({ textInput: true });
    const interactive = createMockFocusTarget({ interactive: true });
    const stagedInput = createMockFocusTarget({ textInput: true, stage: true });

    expect(isTextInputFocus(textInput)).toBe(true);
    expect(isInteractiveFocus(textInput)).toBe(true);
    expect(hasStageKeyboardFocus(textInput)).toBe(false);
    expect(getShortcutFocusContext(textInput)).toEqual({
      textInputFocus: true,
      interactiveFocus: true,
      hasStageFocus: false,
    });

    expect(isTextInputFocus(interactive)).toBe(false);
    expect(isInteractiveFocus(interactive)).toBe(true);
    expect(getShortcutFocusContext(interactive)).toEqual({
      textInputFocus: false,
      interactiveFocus: true,
      hasStageFocus: false,
    });

    expect(getShortcutFocusContext(stagedInput)).toEqual({
      textInputFocus: true,
      interactiveFocus: true,
      hasStageFocus: true,
    });
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

  it('matches the help and reference shortcuts', () => {
    const documentation = findMatchingShortcut(
      {
        code: 'KeyH',
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

    expect(documentation?.id).toBe('openDocumentation');
    expect(getShortcutLabel('openDocumentation', 'other')).toBe('Shift + H');
  });

  it('matches and labels copy, paste, and duplicate shortcuts outside text editing', () => {
    const context = {
      interactiveFocus: false,
      hasSelection: true,
      hasDismissiblePanels: false,
      hasStageFocus: false,
    };

    expect(findMatchingShortcut({
      code: 'KeyC',
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
    }, context, 'other')?.id).toBe('copySelection');
    expect(findMatchingShortcut({
      code: 'KeyV',
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
    }, context, 'other')?.id).toBe('pasteClipboard');
    expect(findMatchingShortcut({
      code: 'KeyD',
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
    }, context, 'other')?.id).toBe('duplicateSelection');

    expect(getShortcutLabel('copySelection', 'mac')).toBe('Cmd + C');
    expect(getShortcutLabel('pasteClipboard', 'other')).toBe('Ctrl + V');
    expect(getShortcutLabel('duplicateSelection', 'mac')).toBe('Cmd + D');
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

  it('matches the phase 2 view shortcuts', () => {
    const preview = findMatchingShortcut(
      {
        code: 'KeyP',
        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: true,
      },
      {
        interactiveFocus: false,
        hasSelection: false,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    const showHidden = findMatchingShortcut(
      {
        code: 'KeyV',
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

    const showGrid = findMatchingShortcut(
      {
        code: 'KeyR',
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

    const showDebugInfo = findMatchingShortcut(
      {
        code: 'KeyD',
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

    expect(preview?.id).toBe('openPreviewSite');
    expect(showHidden?.id).toBe('toggleShowHidden');
    expect(showGrid?.id).toBe('toggleShowGridLanes');
    expect(showDebugInfo?.id).toBe('toggleShowDebugInfo');
    expect(getShortcutLabel('openPreviewSite', 'other')).toBe('Ctrl + Alt + P');
    expect(getShortcutLabel('openPreviewSite', 'mac')).toBe('Cmd + Alt + P');
    expect(getShortcutLabel('toggleShowHidden', 'other')).toBe('Shift + V');
    expect(getShortcutLabel('toggleShowGridLanes', 'other')).toBe('Shift + R');
    expect(getShortcutLabel('toggleShowDebugInfo', 'other')).toBe('Shift + D');
  });

  it('lets browser undo and redo win in text-entry contexts', () => {
    const textInput = createMockFocusTarget({ textInput: true, interactive: true });
    const baseContext = {
      interactiveFocus: true,
      hasSelection: false,
      hasDismissiblePanels: false,
      hasStageFocus: false,
    };

    const undo = findMatchingShortcut(
      {
        code: 'KeyZ',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        target: textInput,
      },
      baseContext,
      'mac',
    );

    const redo = findMatchingShortcut(
      {
        code: 'KeyZ',
        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        target: textInput,
      },
      baseContext,
      'mac',
    );

    const undoOutsideTextInput = findMatchingShortcut(
      {
        code: 'KeyZ',
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      },
      {
        interactiveFocus: false,
        hasSelection: false,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'mac',
    );

    expect(undo).toBeNull();
    expect(redo).toBeNull();
    expect(undoOutsideTextInput?.id).toBe('undo');
  });

  it('matches the fonts, components, and pages panel shortcuts', () => {
    const fonts = findMatchingShortcut(
      {
        code: 'KeyF',
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

    const components = findMatchingShortcut(
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

    const panelInTextInput = findMatchingShortcut(
      {
        code: 'KeyF',
        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        target: createMockFocusTarget({ textInput: true, interactive: true }),
      },
      {
        interactiveFocus: true,
        hasSelection: false,
        hasDismissiblePanels: false,
        hasStageFocus: false,
      },
      'other',
    );

    expect(fonts?.id).toBe('toggleFontsPanel');
    expect(components?.id).toBe('toggleComponentsPanel');
    expect(pages?.id).toBe('togglePagesPanel');
    expect(panelInTextInput).toBeNull();
    expect(getShortcutLabel('toggleFontsPanel', 'other')).toBe('Shift + F');
    expect(getShortcutLabel('toggleComponentsPanel', 'other')).toBe('Shift + L');
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
