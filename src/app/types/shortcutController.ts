export type ShortcutUiState = {
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  snapEnabled: boolean;
};

export type ShortcutExecutionHandlers = {
  closePanels: () => void;
  undo: () => void;
  redo: () => void;
  toggleSettings: () => void;
  openShortcutHelp: () => void;
  setPreviewSticky: (value: boolean) => void;
  setSpacerVisibility: (value: 'selected' | 'all') => void;
  setSnapEnabled: (value: boolean) => void;
  nudgeSelection: (deltaX: number, deltaY: number) => void;
  deleteSelection: () => void;
  orderBack: () => void;
  orderForward: () => void;
  orderSendToBack: () => void;
  orderBringToFront: () => void;
};
