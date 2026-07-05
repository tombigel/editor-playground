import type {
  DocumentModel,
  DocumentNode,
  EditorTextField,
  FontLibrary,
  NodeId,
  SectionTemplateId,
  StickyDefinition,
  TextDocumentContent,
  TextSubtype,
  WrapperStyleField,
  ContainerChildBoundary,
} from '../../api/documentViewApi';
import type { EditorState, FocusedMode, FocusedPanelOffset, SnapSettings, AnimationPreviewState } from '../../editor/types';
import type { PageId, DocumentPage, SiteSettings } from '../../api/documentViewApi';
import type { TopLevelWrapperVisibility } from '../../api/editorApi';
import type { TextConversionMode } from '../../api/textConversion';
import type {
  EditorNodeClipboardPayload,
  ExternalClipboardData,
  ParentExpansionRequest,
  SetTextDocumentContentOptions,
  SvgMarkupPayload,
} from '../../api/documentApi';
import type { AnimationTriggerType, AnimationTimingOptions, OngoingTimingOptions, HoverOutAction, KeyframeAnimationEffect, ReducedMotionResponse, DocumentAnimationSettings } from '../../animations/types';
import type { EditorNavigationUrlState, EditorNodeTarget } from '../../api/editorNavigationApi';
import type { AiDocumentCommand } from '../../api/ai/types/index';

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

export type DragCommitOptions = {
  parentExpansion?: ParentExpansionRequest;
};

export type EditorAction =
  | { type: 'select'; id: string | null }
  | { type: 'toggleSelect'; id: string }
  | { type: 'clearSelection' }
  | { type: 'selectMany'; ids: string[]; mode: 'replace' | 'toggle' }
  | { type: 'insertWrapper'; role: 'section' | 'container' }
  | { type: 'insertSectionTemplate'; templateId: SectionTemplateId }
  | { type: 'insertLeaf'; role: 'text' | 'heading' | 'list' | 'richtext' | 'code' | 'image' | 'video' | 'svg' | 'link' | 'button' }
  | { type: 'adoptVideoIntrinsicRatio'; id: NodeId; ratio: number }
  | { type: 'setSvgMarkup'; id: NodeId; payload: SvgMarkupPayload }
  | { type: 'convertImageToSvg'; id: NodeId; payload: SvgMarkupPayload }
  | { type: 'switchTextSubtype'; nodeId: string; subtype: TextSubtype; conversionMode?: TextConversionMode }
  | { type: 'mergeTextSelectionToRich'; nodeIds?: NodeId[] }
  | { type: 'splitRichTextNode'; nodeId?: NodeId }
  | { type: 'move'; id: string; x: string; y: string; options?: DragCommitOptions }
  | { type: 'moveSelection'; moves: BulkMoveOperation[]; options?: DragCommitOptions }
  | { type: 'reparent'; id: string; parentId: string; x: string; y: string; options?: DragCommitOptions }
  | { type: 'reparentSelection'; parentId: string; moves: BulkMoveOperation[]; options?: DragCommitOptions }
  | { type: 'moveNodeInTree'; id: string; targetParentId: string; targetIndex: number }
  | { type: 'resize'; id: string; width: string; height: string }
  | { type: 'text'; field: EditorTextField; value: string; id?: string }
  | { type: 'wrapperStyle'; field: WrapperStyleField; value: string }
  | { type: 'containerChildBoundary'; value: ContainerChildBoundary }
  | { type: 'rect'; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'promote'; role: 'header' | 'footer' }
  | { type: 'confirmPromote' }
  | { type: 'cancelPromote' }
  | { type: 'demote' }
  | { type: 'delete' }
  | { type: 'deleteNode'; id: string }
  | { type: 'duplicateSelection'; nodeIds?: NodeId[] }
  | { type: 'pasteClipboardNodes'; payload: EditorNodeClipboardPayload }
  | { type: 'pasteExternalClipboard'; data: ExternalClipboardData }
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
  | { type: 'animationPreset'; trigger: AnimationTriggerType; preset: string; params?: Record<string, unknown> }
  | { type: 'animationKeyframe'; trigger: AnimationTriggerType; name: string; keyframes: KeyframeAnimationEffect['keyframes']; duration?: number; easing?: string }
  | { type: 'animationOptions'; options: { outAction?: HoverOutAction; timing?: AnimationTimingOptions | OngoingTimingOptions; reducedMotion?: ReducedMotionResponse; requiresSticky?: boolean } }
  | { type: 'animationClear' }
  | { type: 'animationDocSettings'; settings: DocumentAnimationSettings }
  | { type: 'orderBack' }
  | { type: 'orderForward' }
  | { type: 'orderSendToBack' }
  | { type: 'orderBringToFront' }
  | { type: 'alignSelection'; mode: AlignmentAction; rects: Record<NodeId, SelectionRect> }
  | { type: 'distributeSelection'; mode: DistributionMode; rects: Record<NodeId, SelectionRect> }
  | { type: 'bulkEdit'; operations: BulkEditOperation[] }
  | { type: 'applyEditorNavigation'; navigation: EditorNavigationUrlState; nodeTarget?: EditorNodeTarget }
  | { type: 'nudgeSelection'; deltaX: number; deltaY: number }
  | { type: 'importDocument'; document: DocumentModel }
  | { type: 'setShowHidden'; value: boolean }
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
  | { type: 'duplicatePage'; pageId: PageId }
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
  | { type: 'applyTextNodeMarkdown'; id: NodeId; markdown: string }
  | { type: 'setTextDocumentContent'; id: NodeId; content: TextDocumentContent; options?: SetTextDocumentContentOptions }
  | { type: 'setTextDocumentBlockGap'; id: NodeId; value: number }
  | { type: 'syncPageLinks'; oldUrl: string; newUrl: string }
  | { type: 'setSiteSettings'; patch: Partial<SiteSettings> }
  | { type: 'applyAiCommands'; commands: AiDocumentCommand[] };

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
  showHidden: boolean;
  previewSticky: boolean;
  animationPreview: AnimationPreviewState;
  spacerVisibility: 'selected' | 'all';
  snapSettings: SnapSettings;
  showGridLanes: boolean;
  showDebugInfo: boolean;
};

export type ShortcutExecutionHandlers = {
  app: {
    openDocumentation: () => void;
    openPreviewSite: () => void;
  };
  history: {
    undo: () => void;
    redo: () => void;
  };
  panels: {
    closePanels: () => void;
    toggleSettings: () => void;
    openShortcuts: () => void;
    toggleAiPanel: () => void;
    toggleFontsPanel: () => void;
    toggleComponentsPanel: () => void;
    togglePagesPanel: () => void;
  };
  viewState: {
    setShowHidden: (value: boolean) => void;
    setPreviewSticky: (value: boolean) => void;
    setAnimationPreview: (value: Partial<AnimationPreviewState>) => void;
    setSpacerVisibility: (value: 'selected' | 'all') => void;
    setSnapSettings: (value: Partial<SnapSettings>) => void;
    setShowGridLanes: (value: boolean) => void;
    setShowDebugInfo: (value: boolean) => void;
  };
  selection: {
    nudgeSelection: (deltaX: number, deltaY: number) => void;
    deleteSelection: () => void;
    copySelection: () => void;
    pasteClipboard: () => void;
    duplicateSelection: () => void;
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
};
