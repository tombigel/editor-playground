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

export type GuideSnapSettings = {
  enabled: boolean;
  threshold: number;
  power: number;
  maxSpeedPxPerSecond: number;
};

export type ContainerSnapSettings = {
  enabled: boolean;
  threshold: number;
  power: number;
};

export type SnapSettings = {
  guideSnap: GuideSnapSettings;
  containerSnap: ContainerSnapSettings;
};

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  guideSnap: { enabled: true, threshold: 8, power: 1, maxSpeedPxPerSecond: 1200 },
  containerSnap: { enabled: true, threshold: 0, power: 1 },
};

export type AnimationPreviewState = {
  enabled: boolean;
  mode: 'passive' | 'interactive';
  triggers: Record<'entrance' | 'ongoing' | 'scroll' | 'mouse' | 'click' | 'hover', boolean>;
};

export type MeasuredNodeBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type NodeDebugInfo = {
  dataId: string;
  htmlId: string | null;
  stageId: string;
  name: string;
  family: 'wrapper' | 'leaf';
  role: string;
  parentId: string | null;
  authoredRect: { x: string; y: string; width: string; height: string };
  measuredBounds: MeasuredNodeBounds | null;
  sticky: {
    enabled: boolean;
    target: 'self' | 'contentWrapper' | null;
    edges: 'top' | 'bottom' | 'both' | 'none';
    durationMode: 'auto' | 'custom' | null;
    elevated: boolean | null;
    offsetTop: string | null;
    offsetBottom: string | null;
    duration: string | null;
    durationTop: string | null;
    durationBottom: string | null;
  };
  animation: {
    enabled: boolean;
    isTriggerTarget: boolean;
    triggerId: string | null;
    trigger: string | null;
    effect: string | null;
    effectKind: string | null;
    requiresSticky: boolean | null;
    rawConfig: object | null;
  };
};

export type EditorState = {
  document: DocumentModel;
  selectedId: NodeId | null;
  selectedIds: NodeId[];
  pendingRoleSwap: ConfirmReplaceRole | null;
  ui: {
    previewSticky: boolean;
    animationPreview: AnimationPreviewState;
    spacerVisibility: 'selected' | 'all';
    showGridLanes: boolean;
    showDebugInfo: boolean;
    snapSettings: SnapSettings;
    themeMode: ThemeMode;
    accentColor: string;
    lightTheme: EditorLightTheme;
    darkTheme: EditorDarkTheme;
    focusedMode: FocusedMode;
    startupFocusedMode: FocusedMode;
    inspectorCollapsed: boolean;
    temporaryInspectorOpen: boolean;
    focusedPanelOffset: FocusedPanelOffset;
  };
};
