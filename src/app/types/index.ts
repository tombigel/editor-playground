import type {
  DocumentModel,
  DocumentNode,
  EditorTextField,
  FontLibrary,
  NodeId,
  SectionTemplateId,
  StickyDefinition,
  WrapperStyleField,
} from '../../model/types';
import type { EditorState, FocusedMode, FocusedPanelOffset, SnapSettings, AnimationPreviewState } from '../../editor/types';
import type { PageId, DocumentPage, SiteSettings } from '../../model/types/site';
import type { TopLevelWrapperVisibility } from '../../api/editorApi';

export type { SnapSettings, AnimationPreviewState };

export type NodePatch = {
  id: NodeId;
  before?: DocumentNode;
  after?: DocumentNode;
};

export type HistoryEntry = {
  rootIdBefore: NodeId;
  rootIdAfter: NodeId;
  fontLibraryBefore: FontLibrary;
  fontLibraryAfter: FontLibrary;
  nodePatches: NodePatch[];
  selectedBefore: NodeId | null;
  selectedAfter: NodeId | null;
  selectedIdsBefore: NodeId[];
  selectedIdsAfter: NodeId[];
  pendingBefore: EditorState['pendingRoleSwap'];
  pendingAfter: EditorState['pendingRoleSwap'];
  debounceKey: string | null;
  createdAt: number;
  pagesBefore: DocumentPage[] | undefined;
  pagesAfter: DocumentPage[] | undefined;
  siteSettingsBefore: SiteSettings | undefined;
  siteSettingsAfter: SiteSettings | undefined;
  sharedRegionIdsBefore: NodeId[] | undefined;
  sharedRegionIdsAfter: NodeId[] | undefined;
  activePageIdBefore: PageId | null;
  activePageIdAfter: PageId | null;
};

export type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type AlignmentAction =
  | 'left'
  | 'center-x'
  | 'right'
  | 'top'
  | 'center-y'
  | 'bottom';

export type DistributionMode = 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom';

export type BulkEditOperation =
  | { kind: 'text'; targetIds: NodeId[]; field: EditorTextField; value: string }
  | { kind: 'wrapperStyle'; targetIds: NodeId[]; field: WrapperStyleField; value: string }
  | { kind: 'sticky'; targetIds: NodeId[]; patch: Partial<StickyDefinition> };

export type BulkMoveOperation = {
  id: NodeId;
  x: string;
  y: string;
};

export type EditorAction =
  | { type: 'select'; id: string | null }
  | { type: 'toggleSelect'; id: string }
  | { type: 'clearSelection' }
  | { type: 'selectMany'; ids: string[]; mode: 'replace' | 'toggle' }
  | { type: 'insertWrapper'; role: 'section' | 'container' }
  | { type: 'insertSectionTemplate'; templateId: SectionTemplateId }
  | { type: 'insertLeaf'; role: 'text' | 'image' | 'link' | 'button' }
  | { type: 'move'; id: string; x: string; y: string }
  | { type: 'moveSelection'; moves: BulkMoveOperation[] }
  | { type: 'reparent'; id: string; parentId: string; x: string; y: string }
  | { type: 'reparentSelection'; parentId: string; moves: BulkMoveOperation[] }
  | { type: 'moveNodeInTree'; id: string; targetParentId: string; targetIndex: number }
  | { type: 'resize'; id: string; width: string; height: string }
  | { type: 'text'; field: EditorTextField; value: string; id?: string }
  | { type: 'wrapperStyle'; field: WrapperStyleField; value: string }
  | { type: 'rect'; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'promote'; role: 'header' | 'footer' }
  | { type: 'confirmPromote' }
  | { type: 'cancelPromote' }
  | { type: 'demote' }
  | { type: 'delete' }
  | { type: 'deleteNode'; id: string }
  | { type: 'setNodeVisibility'; id: string; value: boolean }
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
  | { type: 'stickyElevation'; value: boolean }
  | { type: 'stickyElevated'; value: boolean }
  | { type: 'orderBack' }
  | { type: 'orderForward' }
  | { type: 'orderSendToBack' }
  | { type: 'orderBringToFront' }
  | { type: 'alignSelection'; mode: AlignmentAction; rects: Record<NodeId, SelectionRect> }
  | { type: 'distributeSelection'; mode: DistributionMode; rects: Record<NodeId, SelectionRect> }
  | { type: 'bulkEdit'; operations: BulkEditOperation[] }
  | { type: 'nudgeSelection'; deltaX: number; deltaY: number }
  | { type: 'importDocument'; document: DocumentModel }
  | { type: 'setPreviewSticky'; value: boolean }
  | { type: 'setAnimationPreview'; value: Partial<AnimationPreviewState> }
  | { type: 'setSpacerVisibility'; value: 'selected' | 'all' }
  | { type: 'setShowGridLanes'; value: boolean }
  | { type: 'setShowDebugInfo'; value: boolean }
  | { type: 'setSnapSettings'; value: Partial<SnapSettings> }
  | { type: 'setThemeMode'; value: EditorState['ui']['themeMode'] }
  | { type: 'setAccentColor'; value: EditorState['ui']['accentColor'] }
  | { type: 'setLightTheme'; value: EditorState['ui']['lightTheme'] }
  | { type: 'setDarkTheme'; value: EditorState['ui']['darkTheme'] }
  | { type: 'setFocusedMode'; value: FocusedMode }
  | { type: 'setStartupFocusedMode'; value: FocusedMode }
  | { type: 'setInspectorCollapsed'; value: boolean }
  | { type: 'setTemporaryInspectorOpen'; value: boolean }
  | { type: 'setFocusedPanelOffset'; value: FocusedPanelOffset }
  | { type: 'setActivePage'; pageId: PageId }
  | { type: 'addPage'; options?: Partial<DocumentPage> }
  | { type: 'deletePage'; pageId: PageId }
  | { type: 'reorderPage'; pageId: PageId; direction: 'back' | 'forward' }
  | { type: 'setPageDisplayName'; pageId: PageId; displayName: string }
  | { type: 'setPageAsHome'; pageId: PageId }
  | { type: 'setPageLang'; pageId: PageId; lang?: string }
  | { type: 'setPageSlug'; pageId: PageId; slug: string }
  | { type: 'setPageParent'; pageId: PageId; parentPageId: PageId | null }
  | { type: 'setTopLevelWrapperVisibility'; pageId: PageId; nodeId: NodeId; visibility: TopLevelWrapperVisibility; pageIds?: PageId[] }
  | { type: 'setPageTopLevelWrapperPlacement'; pageId: PageId; nodeId: NodeId; placement: 'currentPage' | 'global' }
  | { type: 'setPageVisibility'; pageId: PageId; visible: boolean }
  | { type: 'setPageViewTransition'; pageId: PageId; transition: DocumentPage['viewTransition'] }
  | { type: 'addPageSlugAlias'; pageId: PageId; alias: string }
  | { type: 'removePageSlugAlias'; pageId: PageId; alias: string }
  | { type: 'syncPageLinks'; oldUrl: string; newUrl: string }
  | { type: 'setSiteSettings'; patch: Partial<SiteSettings> };

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
  animationPreview: AnimationPreviewState;
  spacerVisibility: 'selected' | 'all';
  snapSettings: SnapSettings;
};

export type ShortcutExecutionHandlers = {
  closePanels: () => void;
  undo: () => void;
  redo: () => void;
  toggleSettings: () => void;
  openShortcuts: () => void;
  toggleFontsPanel: () => void;
  toggleLayersPanel: () => void;
  togglePagesPanel: () => void;
  setPreviewSticky: (value: boolean) => void;
  setAnimationPreview: (value: Partial<AnimationPreviewState>) => void;
  setSpacerVisibility: (value: 'selected' | 'all') => void;
  setSnapSettings: (value: Partial<SnapSettings>) => void;
  nudgeSelection: (deltaX: number, deltaY: number) => void;
  deleteSelection: () => void;
  toggleBoldSelection: () => void;
  toggleItalicSelection: () => void;
  toggleUnderlineSelection: () => void;
  toggleStrikethroughSelection: () => void;
  alignSelection: (mode: AlignmentAction) => void;
  distributeSelection: (mode: DistributionMode) => void;
  orderBack: () => void;
  orderForward: () => void;
  orderSendToBack: () => void;
  orderBringToFront: () => void;
};
