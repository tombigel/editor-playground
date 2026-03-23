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

export type SnapFeatureSettings = {
  enabled: boolean;
  threshold: number;
  power: number;
};

export type SnapSettings = {
  guideSnap: SnapFeatureSettings;
  containerSnap: SnapFeatureSettings;
};

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  guideSnap: { enabled: true, threshold: 8, power: 1 },
  containerSnap: { enabled: true, threshold: 0, power: 1 },
};

export type EditorState = {
  document: DocumentModel;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  pendingRoleSwap: ConfirmReplaceRole | null;
  ui: {
    previewSticky: boolean;
    spacerVisibility: 'selected' | 'all';
    showGridLanes: boolean;
    snapSettings: SnapSettings;
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
