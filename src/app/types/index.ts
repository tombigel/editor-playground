import type {
  DocumentModel,
  DocumentNode,
  EditorTextField,
  NodeId,
  SectionTemplateId,
  WrapperStyleField,
} from '../../model/types';
import type { EditorState, FocusedMode } from '../../editor/types';

export type NodePatch = {
  id: NodeId;
  before?: DocumentNode;
  after?: DocumentNode;
};

export type HistoryEntry = {
  rootIdBefore: NodeId;
  rootIdAfter: NodeId;
  nodePatches: NodePatch[];
  selectedBefore: NodeId | null;
  selectedAfter: NodeId | null;
  pendingBefore: EditorState['pendingRoleSwap'];
  pendingAfter: EditorState['pendingRoleSwap'];
  debounceKey: string | null;
  createdAt: number;
};

export type EditorAction =
  | { type: 'select'; id: string | null }
  | { type: 'insertWrapper'; role: 'section' | 'container' }
  | { type: 'insertSectionTemplate'; templateId: SectionTemplateId }
  | { type: 'insertLeaf'; role: 'text' | 'image' | 'link' | 'button' }
  | { type: 'move'; id: string; x: string; y: string }
  | { type: 'reparent'; id: string; parentId: string; x: string; y: string }
  | { type: 'resize'; id: string; width: string; height: string }
  | { type: 'text'; field: EditorTextField; value: string }
  | { type: 'wrapperStyle'; field: WrapperStyleField; value: string }
  | { type: 'rect'; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'promote'; role: 'header' | 'footer' }
  | { type: 'confirmPromote' }
  | { type: 'cancelPromote' }
  | { type: 'demote' }
  | { type: 'delete' }
  | { type: 'stickyEnabled'; value: boolean }
  | { type: 'stickyTarget'; value: 'self' | 'contentWrapper' }
  | { type: 'stickyEdges'; value: 'top' | 'bottom' | 'both' }
  | { type: 'stickyOffset'; value: number }
  | { type: 'stickyOffsetTop'; value: number }
  | { type: 'stickyOffsetBottom'; value: number }
  | { type: 'stickyDurationMode'; value: 'auto' | 'custom' }
  | { type: 'stickyDuration'; value: number }
  | { type: 'stickyDurationTop'; value: number }
  | { type: 'stickyDurationBottom'; value: number }
  | { type: 'orderBack' }
  | { type: 'orderForward' }
  | { type: 'orderSendToBack' }
  | { type: 'orderBringToFront' }
  | { type: 'nudgeSelection'; deltaX: number; deltaY: number }
  | { type: 'importDocument'; document: DocumentModel }
  | { type: 'setPreviewSticky'; value: boolean }
  | { type: 'setSpacerVisibility'; value: 'selected' | 'all' }
  | { type: 'setShowGridLanes'; value: boolean }
  | { type: 'setSnapEnabled'; value: boolean }
  | { type: 'setThemeMode'; value: EditorState['ui']['themeMode'] }
  | { type: 'setFocusedMode'; value: FocusedMode }
  | { type: 'setStartupFocusedMode'; value: FocusedMode }
  | { type: 'setInspectorCollapsed'; value: boolean }
  | { type: 'setTemporaryInspectorOpen'; value: boolean };

export type HistoryAction =
  | EditorAction
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clearHistory' }
  | { type: 'resetData' }
  | { type: 'resetAll' }
  | { type: 'setHistoryLimit'; value: number }
  | { type: 'beginResize'; id: NodeId }
  | { type: 'endResize'; id: NodeId };

export type HistoryState = {
  present: EditorState;
  past: HistoryEntry[];
  future: HistoryEntry[];
  historyLimit: number;
  activeResize:
    | {
        nodeId: NodeId;
        before: EditorState;
      }
    | null;
};

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
