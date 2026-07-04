import type { PageId } from '../../model/types/site';
import type { NodeId } from '../../model/types';
import type {
  TopLevelWrapperVisibilityMode as TopLevelWrapperVisibilityModeModel,
  TopLevelWrapperVisibilityState as TopLevelWrapperVisibilityStateModel,
} from '../../model/topLevelWrapperVisibility';

export type NodeOrderAction = 'back' | 'forward' | 'sendToBack' | 'bringToFront';
export type TopLevelWrapperPlacement = 'currentPage' | 'global';
export type TopLevelWrapperVisibilityMode = TopLevelWrapperVisibilityModeModel;
export type TopLevelWrapperVisibilityState = TopLevelWrapperVisibilityStateModel;
export type TopLevelWrapperVisibility = TopLevelWrapperVisibilityModeModel;
export type LeafInsertionRole = 'text' | 'heading' | 'list' | 'richtext' | 'code' | 'image' | 'video' | 'svg' | 'link' | 'button';
export type SectionTemplateInsertionOptions = {
  selectedId?: NodeId | null;
  pageId?: PageId | null;
};
