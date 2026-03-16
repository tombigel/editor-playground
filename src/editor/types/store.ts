import type {
  DocumentModel,
  NodeId,
} from '../../model/types';
import type { ThemeMode } from '../../lib/theme';

export type ConfirmReplaceRole = {
  requestedId: NodeId;
  targetRole: 'header' | 'footer';
  existingId: NodeId;
};

export type NodeOrderAction = 'back' | 'forward' | 'sendToBack' | 'bringToFront';

export type EditorState = {
  document: DocumentModel;
  selectedId: NodeId | null;
  pendingRoleSwap: ConfirmReplaceRole | null;
  ui: {
    previewSticky: boolean;
    spacerVisibility: 'selected' | 'all';
    showGridLanes: boolean;
    snapEnabled: boolean;
    themeMode: ThemeMode;
  };
};
