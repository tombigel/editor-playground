import type { NodeTextField, NodeId, StickyDefinition } from '../../model/types';

export type DocumentCommand =
  | { type: 'setRect'; nodeId: NodeId; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'setSticky'; nodeId: NodeId; patch: Partial<StickyDefinition> }
  | { type: 'setText'; nodeId: NodeId; field: NodeTextField; value: string };
