import type { DocumentModel, NodeId } from '../../model/types';
import type { EditorDarkTheme, EditorLightTheme, ThemeMode } from '../../lib/types';

export type FocusedMode = null | 'layout' | 'sticky' | 'content' | 'design';
export type FocusedPanelOffset = { x: number; y: number };

export type ConfirmReplaceRole = {
  requestedId: NodeId;
  targetRole: 'header' | 'footer';
  existingId: NodeId;
};

export type NodeOrderAction = 'back' | 'forward' | 'sendToBack' | 'bringToFront';

export type EditorState = {
  document: DocumentModel;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  pendingRoleSwap: ConfirmReplaceRole | null;
  ui: {
    previewSticky: boolean;
    spacerVisibility: 'selected' | 'all';
    showGridLanes: boolean;
    snapEnabled: boolean;
    themeMode: ThemeMode;
    accentColor: string;
    paperAccentColor: string;
    monokaiAccentColor: string;
    lightTheme: EditorLightTheme;
    darkTheme: EditorDarkTheme;
    focusedMode: FocusedMode;
    startupFocusedMode: FocusedMode;
    inspectorCollapsed: boolean;
    temporaryInspectorOpen: boolean;
    focusedPanelOffset: FocusedPanelOffset;
  };
};
