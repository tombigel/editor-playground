import type {
  ShortcutCombo,
  ShortcutContext,
  ShortcutDefinition,
  ShortcutGesture,
  ShortcutId,
  ShortcutPlatform,
} from './types';
export type {
  ShortcutContext,
  ShortcutContextPolicy,
  ShortcutDefinition,
  ShortcutGesture,
  ShortcutExecutionMetadata,
  ShortcutId,
  ShortcutPlatform,
} from './types';

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'dismissPanels',
    category: 'General',
    description: 'Close panels/dialogs',
    combos: [{ code: 'Escape', keyLabel: 'Esc' }],
    context: {
      allowInInteractive: true,
      requiresDismissiblePanels: true,
    },
    execution: { actionId: 'dismissPanels' },
  },
  {
    id: 'undo',
    category: 'Edit',
    description: 'Undo',
    combos: [{ code: 'KeyZ', keyLabel: 'Z', mod: true }],
    context: {
      allowInInteractive: true,
      allowInTextInput: false,
    },
    execution: { actionId: 'undo' },
  },
  {
    id: 'redo',
    category: 'Edit',
    description: 'Redo',
    combos: [
      { code: 'KeyZ', keyLabel: 'Z', mod: true, shift: true },
      { code: 'KeyY', keyLabel: 'Y', ctrl: true, platforms: ['other'] },
    ],
    context: {
      allowInInteractive: true,
      allowInTextInput: false,
    },
    execution: { actionId: 'redo' },
  },
  {
    id: 'openSettings',
    category: 'General',
    description: 'Open settings',
    combos: [{ code: 'Comma', keyLabel: ',', mod: true }],
    context: {
      allowInInteractive: true,
    },
    execution: { actionId: 'openSettings' },
  },
  {
    id: 'showShortcutHelp',
    category: 'General',
    description: 'Show shortcuts',
    combos: [{ code: 'Slash', keyLabel: '?', shift: true, omitShiftInDisplay: true }],
    context: {},
    execution: { actionId: 'showShortcutHelp' },
  },
  {
    id: 'openPreviewSite',
    category: 'View',
    description: 'Preview site',
    combos: [{ code: 'KeyV', keyLabel: 'V', shift: true }],
    context: {},
    execution: { actionId: 'openPreviewSite' },
  },
  {
    id: 'toggleFontsPanel',
    category: 'View',
    description: 'Fonts panel',
    combos: [{ code: 'KeyF', keyLabel: 'F', shift: true }],
    context: {},
    execution: { actionId: 'toggleFontsPanel' },
  },
  {
    id: 'toggleComponentsPanel',
    category: 'View',
    description: 'Components panel',
    combos: [{ code: 'KeyL', keyLabel: 'L', shift: true }],
    context: {},
    execution: { actionId: 'toggleComponentsPanel' },
  },
  {
    id: 'togglePagesPanel',
    category: 'View',
    description: 'Pages panel',
    combos: [{ code: 'KeyO', keyLabel: 'O', shift: true }],
    context: {},
    execution: { actionId: 'togglePagesPanel' },
  },
  {
    id: 'togglePreviewSticky',
    category: 'View',
    description: 'Sticky preview',
    combos: [{ code: 'KeyP', keyLabel: 'P', shift: true }],
    context: {},
    execution: { actionId: 'togglePreviewSticky' },
  },
  {
    id: 'toggleAnimationPreview',
    category: 'View',
    description: 'Animation preview',
    combos: [{ code: 'KeyA', keyLabel: 'A', shift: true }],
    context: {},
    execution: { actionId: 'toggleAnimationPreview' },
  },
  {
    id: 'toggleSpacerVisibility',
    category: 'View',
    description: 'Spacer visibility',
    combos: [{ code: 'KeyS', keyLabel: 'S', shift: true }],
    context: {},
    execution: { actionId: 'toggleSpacerVisibility' },
  },
  {
    id: 'toggleSnapEnabled',
    category: 'View',
    description: 'Snap to guides',
    combos: [{ code: 'KeyG', keyLabel: 'G', shift: true }],
    context: {},
    execution: { actionId: 'toggleSnapEnabled' },
  },
  {
    id: 'toggleShowHidden',
    category: 'View',
    description: 'Show hidden',
    combos: [{ code: 'KeyH', keyLabel: 'H', shift: true }],
    context: {},
    execution: { actionId: 'toggleShowHidden' },
  },
  {
    id: 'toggleShowGridLanes',
    category: 'View',
    description: 'Show grid',
    combos: [{ code: 'KeyR', keyLabel: 'R', shift: true }],
    context: {},
    execution: { actionId: 'toggleShowGridLanes' },
  },
  {
    id: 'toggleShowDebugInfo',
    category: 'View',
    description: 'Show debug info',
    combos: [{ code: 'KeyD', keyLabel: 'D', shift: true }],
    context: {},
    execution: { actionId: 'toggleShowDebugInfo' },
  },
  {
    id: 'nudgeSelectionLeft',
    category: 'Edit',
    description: 'Move left',
    combos: [
      { code: 'ArrowLeft', keyLabel: 'Left' },
      { code: 'ArrowLeft', keyLabel: 'Left', shift: true },
    ],
    context: {
      requiresSelection: true,
      requiresStageFocus: true,
    },
    execution: { actionId: 'nudgeSelectionLeft' },
  },
  {
    id: 'nudgeSelectionRight',
    category: 'Edit',
    description: 'Move right',
    combos: [
      { code: 'ArrowRight', keyLabel: 'Right' },
      { code: 'ArrowRight', keyLabel: 'Right', shift: true },
    ],
    context: {
      requiresSelection: true,
      requiresStageFocus: true,
    },
    execution: { actionId: 'nudgeSelectionRight' },
  },
  {
    id: 'nudgeSelectionUp',
    category: 'Edit',
    description: 'Move up',
    combos: [
      { code: 'ArrowUp', keyLabel: 'Up' },
      { code: 'ArrowUp', keyLabel: 'Up', shift: true },
    ],
    context: {
      requiresSelection: true,
      requiresStageFocus: true,
    },
    execution: { actionId: 'nudgeSelectionUp' },
  },
  {
    id: 'nudgeSelectionDown',
    category: 'Edit',
    description: 'Move down',
    combos: [
      { code: 'ArrowDown', keyLabel: 'Down' },
      { code: 'ArrowDown', keyLabel: 'Down', shift: true },
    ],
    context: {
      requiresSelection: true,
      requiresStageFocus: true,
    },
    execution: { actionId: 'nudgeSelectionDown' },
  },
  {
    id: 'deleteSelection',
    category: 'Edit',
    description: 'Delete selection',
    combos: [
      { code: 'Delete', keyLabel: 'Delete' },
      { code: 'Backspace', keyLabel: 'Backspace' },
    ],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'deleteSelection' },
  },
  {
    id: 'toggleBoldSelection',
    category: 'Edit',
    description: 'Bold',
    combos: [{ code: 'KeyB', keyLabel: 'B', mod: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'toggleBoldSelection' },
  },
  {
    id: 'toggleItalicSelection',
    category: 'Edit',
    description: 'Italic',
    combos: [{ code: 'KeyI', keyLabel: 'I', mod: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'toggleItalicSelection' },
  },
  {
    id: 'toggleUnderlineSelection',
    category: 'Edit',
    description: 'Underline',
    combos: [{ code: 'KeyU', keyLabel: 'U', mod: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'toggleUnderlineSelection' },
  },
  {
    id: 'toggleStrikethroughSelection',
    category: 'Edit',
    description: 'Strikethrough',
    combos: [{ code: 'KeyX', keyLabel: 'X', mod: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'toggleStrikethroughSelection' },
  },
  {
    id: 'alignSelectionLeft',
    category: 'Arrange',
    description: 'Align left',
    combos: [{ code: 'ArrowLeft', keyLabel: 'Left', mod: true, alt: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'alignSelectionLeft' },
  },
  {
    id: 'alignSelectionCenterX',
    category: 'Arrange',
    description: 'Align h-center',
    combos: [{ code: 'KeyH', keyLabel: 'H', mod: true, alt: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'alignSelectionCenterX' },
  },
  {
    id: 'alignSelectionRight',
    category: 'Arrange',
    description: 'Align right',
    combos: [{ code: 'ArrowRight', keyLabel: 'Right', mod: true, alt: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'alignSelectionRight' },
  },
  {
    id: 'alignSelectionTop',
    category: 'Arrange',
    description: 'Align top',
    combos: [{ code: 'ArrowUp', keyLabel: 'Up', mod: true, alt: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'alignSelectionTop' },
  },
  {
    id: 'alignSelectionCenterY',
    category: 'Arrange',
    description: 'Align v-center',
    combos: [{ code: 'KeyV', keyLabel: 'V', mod: true, alt: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'alignSelectionCenterY' },
  },
  {
    id: 'alignSelectionBottom',
    category: 'Arrange',
    description: 'Align bottom',
    combos: [{ code: 'ArrowDown', keyLabel: 'Down', mod: true, alt: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'alignSelectionBottom' },
  },
  {
    id: 'distributeSelectionHorizontal',
    category: 'Arrange',
    description: 'Distribute h-gaps',
    combos: [{ code: 'KeyH', keyLabel: 'H', mod: true, alt: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'distributeSelectionHorizontal' },
  },
  {
    id: 'distributeSelectionVertical',
    category: 'Arrange',
    description: 'Distribute v-gaps',
    combos: [{ code: 'KeyV', keyLabel: 'V', mod: true, alt: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'distributeSelectionVertical' },
  },
  {
    id: 'distributeSelectionLeft',
    category: 'Arrange',
    description: 'Distribute left',
    combos: [{ code: 'ArrowLeft', keyLabel: 'Left', mod: true, alt: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'distributeSelectionLeft' },
  },
  {
    id: 'distributeSelectionRight',
    category: 'Arrange',
    description: 'Distribute right',
    combos: [{ code: 'ArrowRight', keyLabel: 'Right', mod: true, alt: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'distributeSelectionRight' },
  },
  {
    id: 'distributeSelectionTop',
    category: 'Arrange',
    description: 'Distribute top',
    combos: [{ code: 'ArrowUp', keyLabel: 'Up', mod: true, alt: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'distributeSelectionTop' },
  },
  {
    id: 'distributeSelectionBottom',
    category: 'Arrange',
    description: 'Distribute bottom',
    combos: [{ code: 'ArrowDown', keyLabel: 'Down', mod: true, alt: true, shift: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'distributeSelectionBottom' },
  },
  {
    id: 'orderBack',
    category: 'Arrange',
    description: 'Send backward',
    combos: [{ code: 'BracketLeft', keyLabel: '[', mod: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'orderBack' },
  },
  {
    id: 'orderForward',
    category: 'Arrange',
    description: 'Bring forward',
    combos: [{ code: 'BracketRight', keyLabel: ']', mod: true }],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'orderForward' },
  },
  {
    id: 'orderSendToBack',
    category: 'Arrange',
    description: 'Send to back',
    combos: [
      { code: 'BracketLeft', keyLabel: '[', meta: true, alt: true, platforms: ['mac'] },
      { code: 'BracketLeft', keyLabel: '[', ctrl: true, shift: true, platforms: ['other'] },
    ],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'orderSendToBack' },
  },
  {
    id: 'orderBringToFront',
    category: 'Arrange',
    description: 'Bring to front',
    combos: [
      { code: 'BracketRight', keyLabel: ']', meta: true, alt: true, platforms: ['mac'] },
      { code: 'BracketRight', keyLabel: ']', ctrl: true, shift: true, platforms: ['other'] },
    ],
    context: {
      requiresSelection: true,
    },
    execution: { actionId: 'orderBringToFront' },
  },
];

export function getShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === 'undefined') {
    return 'mac';
  }

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent;

  return /mac|iphone|ipad|ipod/i.test(platform) ? 'mac' : 'other';
}

export function findMatchingShortcut(
  event: Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'> & {
    target?: EventTarget | null;
  },
  context: ShortcutContext,
  platform = getShortcutPlatform(),
): ShortcutDefinition | null {
  const textInputFocus = resolveTextInputFocus(context, event.target ?? null);

  for (const definition of SHORTCUT_DEFINITIONS) {
    if (!definition.context.allowInInteractive && context.interactiveFocus) {
      continue;
    }
    if (textInputFocus && definition.context.allowInTextInput === false) {
      continue;
    }
    if (definition.context.requiresSelection && !context.hasSelection) {
      continue;
    }
    if (definition.context.requiresStageFocus && !context.hasStageFocus) {
      continue;
    }
    if (definition.context.requiresDismissiblePanels && !context.hasDismissiblePanels) {
      continue;
    }

    if (definition.combos.some((combo) => matchesShortcutCombo(event, combo, platform))) {
      return definition;
    }
  }

  return null;
}

export function getShortcutLabel(shortcutId: ShortcutId, platform = getShortcutPlatform()) {
  const definition = SHORTCUT_DEFINITIONS.find((item) => item.id === shortcutId);
  if (!definition) {
    return '';
  }
  return definition.combos
    .filter((combo) => !combo.platforms || combo.platforms.includes(platform))
    .map((combo) => formatShortcutCombo(combo, platform))
    .join(' / ');
}

export function getShortcutDefinitionsByCategory(platform = getShortcutPlatform()) {
  const categories: ShortcutDefinition['category'][] = ['General', 'View', 'Edit', 'Arrange'];
  return categories.map((category) => ({
    category,
    items: SHORTCUT_DEFINITIONS.filter((definition) => definition.category === category).map((definition) => ({
      ...definition,
      label: getShortcutLabel(definition.id, platform),
    })),
  }));
}

export function getShortcutGestures(platform = getShortcutPlatform()): ShortcutGesture[] {
  const modLabel = platform === 'mac' ? 'Cmd' : 'Ctrl';

  return [
    {
      label: `${modLabel} + Click / Shift + Click`,
      description: 'Toggle multi-select',
    },
    {
      label: 'Shift + Drag',
      description: 'Lock axis',
    },
    {
      label: 'Shift + Corner Resize',
      description: 'Keep ratio',
    },
    {
      label: 'Alt + Drag',
      description: 'Invert snap',
    },
  ];
}

function matchesShortcutCombo(
  event: Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  combo: ShortcutCombo,
  platform: ShortcutPlatform,
) {
  if (combo.platforms && !combo.platforms.includes(platform)) {
    return false;
  }

  if (event.code !== combo.code) {
    return false;
  }

  const expectedMeta = combo.mod ? platform === 'mac' : Boolean(combo.meta);
  const expectedCtrl = combo.mod ? platform === 'other' : Boolean(combo.ctrl);
  const expectedShift = Boolean(combo.shift);
  const expectedAlt = Boolean(combo.alt);

  return (
    event.metaKey === expectedMeta &&
    event.ctrlKey === expectedCtrl &&
    event.shiftKey === expectedShift &&
    event.altKey === expectedAlt
  );
}

function resolveTextInputFocus(
  context: ShortcutContext,
  target: EventTarget | null,
): boolean {
  if (typeof context.textInputFocus === 'boolean') {
    return context.textInputFocus;
  }

  return isTextInputEventTarget(target);
}

function isTextInputEventTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const element = target as {
    isContentEditable?: boolean;
    closest?: (selector: string) => unknown;
  };

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(
    element.closest?.('input, textarea, [role="textbox"], [contenteditable="true"]'),
  );
}

function formatShortcutCombo(combo: ShortcutCombo, platform: ShortcutPlatform) {
  const parts: string[] = [];

  if (combo.mod) {
    parts.push(platform === 'mac' ? 'Cmd' : 'Ctrl');
  } else {
    if (combo.ctrl) {
      parts.push('Ctrl');
    }
    if (combo.meta) {
      parts.push('Cmd');
    }
  }

  if (combo.shift && !combo.omitShiftInDisplay) {
    parts.push('Shift');
  }
  if (combo.alt) {
    parts.push('Alt');
  }
  parts.push(combo.keyLabel);

  return parts.join(' + ');
}
