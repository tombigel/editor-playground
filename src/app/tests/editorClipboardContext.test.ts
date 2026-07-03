import { describe, expect, it } from 'vitest';
import { shouldUseEditorClipboard } from '../editorClipboardContext';

function createMockElement(matches: string[] = []) {
  return {
    closest(selector: string) {
      return matches.some((match) => selector.includes(match)) ? {} : null;
    },
  } as unknown as Element;
}

function createMockTextNode(parentElement: Element) {
  return { parentElement } as unknown as Node;
}

function createMockEvent(target: EventTarget, path: EventTarget[] = []) {
  return {
    target,
    composedPath: () => path,
  } as unknown as Event;
}

describe('app/editorClipboardContext', () => {
  it('blocks editor clipboard when selected text lives inside settings', () => {
    const settingsText = createMockTextNode(createMockElement(['.editor-settings-panel']));

    expect(
      shouldUseEditorClipboard(null, {
        activeElement: null,
        selection: {
          anchorNode: settingsText,
          focusNode: settingsText,
          isCollapsed: false,
        },
      }),
    ).toBe(false);
  });

  it('blocks editor clipboard when focus or event target is inside panel controls', () => {
    const panelButton = createMockElement(['.editor-floating-panel', 'button']);

    expect(
      shouldUseEditorClipboard(createMockEvent(panelButton), {
        activeElement: panelButton,
      }),
    ).toBe(false);
  });

  it('blocks editor clipboard when composed path crosses panel UI', () => {
    const textTarget = createMockTextNode(createMockElement());
    const panelShell = createMockElement(['.editor-settings-panel']);

    expect(
      shouldUseEditorClipboard(createMockEvent(textTarget, [textTarget, panelShell]), {
        activeElement: null,
      }),
    ).toBe(false);
  });

  it('blocks editor clipboard inside text inputs', () => {
    const input = createMockElement(['input']);

    expect(shouldUseEditorClipboard(createMockEvent(input), { activeElement: input })).toBe(false);
  });

  it('allows editor clipboard from stage and other non-panel contexts', () => {
    const stageElement = createMockElement(['[data-stage-focus-scope="true"]']);

    expect(
      shouldUseEditorClipboard(createMockEvent(stageElement), {
        activeElement: stageElement,
        selection: {
          anchorNode: createMockTextNode(stageElement),
          focusNode: createMockTextNode(stageElement),
          isCollapsed: false,
        },
      }),
    ).toBe(true);
  });

  it('does not treat rich-edit floating toolbar surfaces as panel UI', () => {
    const richToolbarButton = createMockElement([
      '.editor-floating-panel',
      '[data-stage-rich-toolbar="true"]',
    ]);

    expect(
      shouldUseEditorClipboard(createMockEvent(richToolbarButton), {
        activeElement: richToolbarButton,
      }),
    ).toBe(true);
  });
});
