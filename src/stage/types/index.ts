import type { DocumentModel, NodeId } from '../../model/types';
import type { StickyGeometrySnapshot } from '../../sticky/resolve';

export type StageProps = {
  document: DocumentModel;
  selectedId: NodeId | null;
  previewSticky: boolean;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  snapEnabled: boolean;
  onStageFocus: () => void;
  onSelect: (id: NodeId) => void;
  onMove: (id: NodeId, x: string, y: string) => void;
  onReparent: (id: NodeId, parentId: NodeId, x: string, y: string) => void;
  onResize: (id: NodeId, width: string, height: string) => void;
  onResizeStart: (id: NodeId) => void;
  onResizeEnd: (id: NodeId) => void;
  onStickyGeometryChange?: (geometry: StickyGeometrySnapshot) => void;
};
