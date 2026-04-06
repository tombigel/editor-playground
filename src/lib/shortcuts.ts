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
  ShortcutDefinition,
  ShortcutGesture,
  ShortcutId,
  ShortcutPlatform,
} from './types';

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'dismissPanels',
    category: 'General',
    description: 'Close panels/dialogs',
    combos: [{ code: 'Escape', keyLabel: 'Esc' }],
    allowInInteractive: true,
  },
  {
    id: 'undo',
    category: 'Edit',
    description: 'Undo',
    combos: [{ code: 'KeyZ', keyLabel: 'Z', mod: true }],
    allowInInteractive: true,
  },
  {
    id: 'redo',
    category: 'Edit',
    description: 'Redo',
    combos: [
      { code: 'KeyZ', keyLabel: 'Z', mod: true, shift: true },
      { code: 'KeyY', keyLabel: 'Y', ctrl: true, platforms: ['other'] },
    ],
    allowInInteractive: true,
  },
  {
    id: 'openSettings',
    category: 'General',
    description: 'Open settings',
    combos: [{ code: 'Comma', keyLabel: ',', mod: true }],
    allowInInteractive: true,
  },
  {
    id: 'showShortcutHelp',
    category: 'General',
    description: 'Show shortcuts',
    combos: [{ code: 'Slash', keyLabel: '?', shift: true, omitShiftInDisplay: true }],
  },
  {
    id: 'toggleFontsPanel',
    category: 'View',
    description: 'Fonts panel',
    combos: [{ code: 'KeyF', keyLabel: 'F', shift: true }],
  },
  {
    id: 'toggleLayersPanel',
    category: 'View',
    description: 'Layers panel',
    combos: [{ code: 'KeyL', keyLabel: 'L', shift: true }],
  },
  {
    id: 'togglePagesPanel',
    category: 'View',
    description: 'Pages panel',
    combos: [{ code: 'KeyO', keyLabel: 'O', shift: true }],
  },
  {
    id: 'togglePreviewSticky',
    category: 'View',
    description: 'Sticky preview',
    combos: [{ code: 'KeyP', keyLabel: 'P', shift: true }],
  },
  {
    id: 'toggleAnimationPreview',
    category: 'View',
    description: 'Animation preview',
    combos: [{ code: 'KeyA', keyLabel: 'A', shift: true }],
  },
  {
    id: 'toggleSpacerVisibility',
    category: 'View',
    description: 'Spacer visibility',
    combos: [{ code: 'KeyS', keyLabel: 'S', shift: true }],
  },
  {
    id: 'toggleSnapEnabled',
    category: 'View',
    description: 'Snap to guides',
    combos: [{ code: 'KeyG', keyLabel: 'G', shift: true }],
  },
  {
    id: 'nudgeSelectionLeft',
    category: 'Edit',
    description: 'Move left',
    combos: [
      { code: 'ArrowLeft', keyLabel: 'Left' },
      { code: 'ArrowLeft', keyLabel: 'Left', shift: true },
    ],
    requiresSelection: true,
    requiresStageFocus: true,
  },
  {
    id: 'nudgeSelectionRight',
    category: 'Edit',
    description: 'Move right',
    combos: [
      { code: 'ArrowRight', keyLabel: 'Right' },
      { code: 'ArrowRight', keyLabel: 'Right', shift: true },
    ],
    requiresSelection: true,
    requiresStageFocus: true,
  },
  {
    id: 'nudgeSelectionUp',
    category: 'Edit',
    description: 'Move up',
    combos: [
      { code: 'ArrowUp', keyLabel: 'Up' },
      { code: 'ArrowUp', keyLabel: 'Up', shift: true },
    ],
    requiresSelection: true,
    requiresStageFocus: true,
  },
  {
    id: 'nudgeSelectionDown',
    category: 'Edit',
    description: 'Move down',
    combos: [
      { code: 'ArrowDown', keyLabel: 'Down' },
      { code: 'ArrowDown', keyLabel: 'Down', shift: true },
    ],
    requiresSelection: true,
    requiresStageFocus: true,
  },
  {
    id: 'deleteSelection',
    category: 'Edit',
    description: 'Delete selection',
    combos: [
      { code: 'Delete', keyLabel: 'Delete' },
      { code: 'Backspace', keyLabel: 'Backspace' },
    ],
    requiresSelection: true,
  },
  {
    id: 'toggleBoldSelection',
    category: 'Edit',
    description: 'Bold',
    combos: [{ code: 'KeyB', keyLabel: 'B', mod: true }],
    requiresSelection: true,
  },
  {
    id: 'toggleItalicSelection',
    category: 'Edit',
    description: 'Italic',
    combos: [{ code: 'KeyI', keyLabel: 'I', mod: true }],
    requiresSelection: true,
  },
  {
    id: 'toggleUnderlineSelection',
    category: 'Edit',
    description: 'Underline',
    combos: [{ code: 'KeyU', keyLabel: 'U', mod: true }],
    requiresSelection: true,
  },
  {
    id: 'toggleStrikethroughSelection',
    category: 'Edit',
    description: 'Strikethrough',
    combos: [{ code: 'KeyX', keyLabel: 'X', mod: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'alignSelectionLeft',
    category: 'Arrange',
    description: 'Align left',
    combos: [{ code: 'ArrowLeft', keyLabel: 'Left', mod: true, alt: true }],
    requiresSelection: true,
  },
  {
    id: 'alignSelectionCenterX',
    category: 'Arrange',
    description: 'Align h-center',
    combos: [{ code: 'KeyH', keyLabel: 'H', mod: true, alt: true }],
    requiresSelection: true,
  },
  {
    id: 'alignSelectionRight',
    category: 'Arrange',
    description: 'Align right',
    combos: [{ code: 'ArrowRight', keyLabel: 'Right', mod: true, alt: true }],
    requiresSelection: true,
  },
  {
    id: 'alignSelectionTop',
    category: 'Arrange',
    description: 'Align top',
    combos: [{ code: 'ArrowUp', keyLabel: 'Up', mod: true, alt: true }],
    requiresSelection: true,
  },
  {
    id: 'alignSelectionCenterY',
    category: 'Arrange',
    description: 'Align v-center',
    combos: [{ code: 'KeyV', keyLabel: 'V', mod: true, alt: true }],
    requiresSelection: true,
  },
  {
    id: 'alignSelectionBottom',
    category: 'Arrange',
    description: 'Align bottom',
    combos: [{ code: 'ArrowDown', keyLabel: 'Down', mod: true, alt: true }],
    requiresSelection: true,
  },
  {
    id: 'distributeSelectionHorizontal',
    category: 'Arrange',
    description: 'Distribute h-gaps',
    combos: [{ code: 'KeyH', keyLabel: 'H', mod: true, alt: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'distributeSelectionVertical',
    category: 'Arrange',
    description: 'Distribute v-gaps',
    combos: [{ code: 'KeyV', keyLabel: 'V', mod: true, alt: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'distributeSelectionLeft',
    category: 'Arrange',
    description: 'Distribute left',
    combos: [{ code: 'ArrowLeft', keyLabel: 'Left', mod: true, alt: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'distributeSelectionRight',
    category: 'Arrange',
    description: 'Distribute right',
    combos: [{ code: 'ArrowRight', keyLabel: 'Right', mod: true, alt: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'distributeSelectionTop',
    category: 'Arrange',
    description: 'Distribute top',
    combos: [{ code: 'ArrowUp', keyLabel: 'Up', mod: true, alt: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'distributeSelectionBottom',
    category: 'Arrange',
    description: 'Distribute bottom',
    combos: [{ code: 'ArrowDown', keyLabel: 'Down', mod: true, alt: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'orderBack',
    category: 'Arrange',
    description: 'Send backward',
    combos: [{ code: 'BracketLeft', keyLabel: '[', mod: true }],
    requiresSelection: true,
  },
  {
    id: 'orderForward',
    category: 'Arrange',
    description: 'Bring forward',
    combos: [{ code: 'BracketRight', keyLabel: ']', mod: true }],
    requiresSelection: true,
  },
  {
    id: 'orderSendToBack',
    category: 'Arrange',
    description: 'Send to back',
    combos: [{ code: 'BracketLeft', keyLabel: '[', mod: true, shift: true }],
    requiresSelection: true,
  },
  {
    id: 'orderBringToFront',
    category: 'Arrange',
    description: 'Bring to front',
    combos: [{ code: 'BracketRight', keyLabel: ']', mod: true, shift: true }],
    requiresSelection: true,
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
  event: Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  context: ShortcutContext,
  platform = getShortcutPlatform(),
): ShortcutDefinition | null {
  for (const definition of SHORTCUT_DEFINITIONS) {
    if (!definition.allowInInteractive && context.interactiveFocus) {
      continue;
    }
    if (definition.requiresSelection && !context.hasSelection) {
      continue;
    }
    if (definition.requiresStageFocus && !context.hasStageFocus) {
      continue;
    }
    if (definition.id === 'dismissPanels' && !context.hasDismissiblePanels) {
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
