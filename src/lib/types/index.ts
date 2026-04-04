export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';
export type EditorLightTheme = 'air' | 'paper' | 'midday' | 'clarity';
export type EditorDarkTheme = 'graphite' | 'midnight' | 'monokai' | 'ink';

export type ShortcutPlatform = 'mac' | 'other';

export type ShortcutId =
  | 'dismissPanels'
  | 'undo'
  | 'redo'
  | 'openSettings'
  | 'showShortcutHelp'
  | 'toggleLayersPanel'
  | 'togglePagesPanel'
  | 'togglePreviewSticky'
  | 'toggleAnimationPreview'
  | 'toggleSpacerVisibility'
  | 'toggleSnapEnabled'
  | 'nudgeSelectionLeft'
  | 'nudgeSelectionRight'
  | 'nudgeSelectionUp'
  | 'nudgeSelectionDown'
  | 'deleteSelection'
  | 'toggleBoldSelection'
  | 'toggleItalicSelection'
  | 'toggleUnderlineSelection'
  | 'toggleStrikethroughSelection'
  | 'alignSelectionLeft'
  | 'alignSelectionCenterX'
  | 'alignSelectionRight'
  | 'alignSelectionTop'
  | 'alignSelectionCenterY'
  | 'alignSelectionBottom'
  | 'distributeSelectionHorizontal'
  | 'distributeSelectionVertical'
  | 'distributeSelectionLeft'
  | 'distributeSelectionRight'
  | 'distributeSelectionTop'
  | 'distributeSelectionBottom'
  | 'orderBack'
  | 'orderForward'
  | 'orderSendToBack'
  | 'orderBringToFront';

export type ShortcutCombo = {
  code: string;
  keyLabel: string;
  mod?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  platforms?: ShortcutPlatform[];
  omitShiftInDisplay?: boolean;
};

export type ShortcutDefinition = {
  id: ShortcutId;
  category: 'General' | 'View' | 'Edit' | 'Arrange';
  description: string;
  combos: ShortcutCombo[];
  allowInInteractive?: boolean;
  requiresSelection?: boolean;
  requiresStageFocus?: boolean;
};

export type ShortcutContext = {
  interactiveFocus: boolean;
  hasSelection: boolean;
  hasDismissiblePanels: boolean;
  hasStageFocus: boolean;
};

export type ShortcutGesture = {
  label: string;
  description: string;
};
