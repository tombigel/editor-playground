import type { DocumentModel, DocumentNode, EditorTextField, FocusedMode, TopLevelWrapperVisibility } from '../../../api/editorApi';
import type { WrapperStyleField } from '../../../api/documentApi';
import type { TextConversionMode } from '../../../api/textConversion';
import type { NodeDebugInfo } from '../../../editor/types';
import type { ReactNode } from 'react';
import type { PageId, ContainerNode, MediaNode, TextDocumentContent, TextNode, TextSubtype } from '../../../api/documentViewApi';
import type { ContainerChildBoundary } from '../../../api/documentViewApi';
import type { AnimationTriggerType, AnimationTimingOptions, OngoingTimingOptions, HoverOutAction, KeyframeAnimationEffect, ReducedMotionResponse, DocumentAnimationSettings } from '../../../animations/types';

export type InspectorNode = DocumentNode;
export type NonSiteInspectorNode = Exclude<DocumentNode, { contentType: 'site' }>;
export type TextInspectorNode = TextNode;
export type ButtonInspectorNode = TextNode;
export type LinkInspectorNode = TextNode;
export type ImageInspectorNode = MediaNode;
export type VideoInspectorNode = MediaNode;
export type WrapperInspectorNode = ContainerNode;

export type InspectorActionHandlers = {
  onTextChange: (field: EditorTextField, value: string) => void;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
  onContainerChildBoundaryChange: (value: ContainerChildBoundary) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
  onSetNodeVisibility: (id: string, value: boolean) => void;
  onSetTopLevelWrapperVisibility: (nodeId: string, visibility: TopLevelWrapperVisibility, pageIds?: PageId[]) => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
  onStickyEnabled: (enabled: boolean) => void;
  onStickyTarget: (target: 'self' | 'contentWrapper') => void;
  onStickyEdges: (edge: 'top' | 'bottom' | 'both') => void;
  onStickyOffset: (value: number) => void;
  onStickyOffsetTop: (value: number) => void;
  onStickyOffsetBottom: (value: number) => void;
  onStickyDurationMode: (value: 'auto' | 'custom') => void;
  onStickyDuration: (value: number) => void;
  onStickyDurationTop: (value: number) => void;
  onStickyDurationBottom: (value: number) => void;
  onStickyElevation: (value: boolean) => void;
  onStickyElevated: (value: boolean) => void;
  onSwitchTextSubtype: (nodeId: string, subtype: TextSubtype, conversionMode?: TextConversionMode) => void;
  onApplyTextNodeMarkdown?: (nodeId: string, markdown: string) => void;
  onSetTextDocumentContent?: (nodeId: string, content: TextDocumentContent) => void;
  onSetTextDocumentBlockGap?: (nodeId: string, value: number) => void;
  onMergeTextSelectionToRich?: (nodeIds: string[]) => void;
  onSplitRichTextNode?: (nodeId: string) => void;
  onAnimationPresetChange: (trigger: AnimationTriggerType, preset: string, params?: Record<string, unknown>) => void;
  onAnimationKeyframeChange: (trigger: AnimationTriggerType, effect: KeyframeAnimationEffect) => void;
  onAnimationOptionsChange: (options: { outAction?: HoverOutAction; timing?: AnimationTimingOptions | OngoingTimingOptions; reducedMotion?: ReducedMotionResponse; requiresSticky?: boolean }) => void;
  onAnimationClear: () => void;
  onAnimationDocSettingsChange: (settings: DocumentAnimationSettings) => void;
  onEnterFocusedMode: (mode: FocusedMode) => void;
  onActivateRichEdit?: (nodeId: string) => void;
  onOpenManageFonts?: (options?: { category?: string }) => void;
};

export type InspectorOrderState = {
  showOrderControls: boolean;
  canOrderBack: boolean;
  canOrderForward: boolean;
  canSendToBack: boolean;
  canBringToFront: boolean;
  orderBackShortcut: string;
  orderForwardShortcut: string;
  sendToBackShortcut: string;
  bringToFrontShortcut: string;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onOrderBack: () => void;
  onOrderForward: () => void;
  onSendToBack: () => void;
  onBringToFront: () => void;
  onSectionBack: () => void;
  onSectionForward: () => void;
};

export type InspectorSectionContext = {
  document: DocumentModel;
  activePageId?: PageId | null;
  node: InspectorNode | null;
  hiddenSelection?: boolean;
  actions: InspectorActionHandlers;
  orderState: InspectorOrderState;
  focusedMode: FocusedMode;
  globalStickyElevation: boolean;
  showDebugInfo?: boolean;
  debugInfo?: NodeDebugInfo | null;
};

export type InspectorBlockBucket = 'summary' | 'primary' | 'behavior';
export type InspectorBlockAlign = 'stretch' | 'start';
export type InspectorBlockLayout = 'stack' | 'grid-2' | 'custom';

export type InspectorSectionDefinition = {
  id: string;
  when?: (context: InspectorSectionContext) => boolean;
  render: (context: InspectorSectionContext) => ReactNode;
};

export type InspectorBlockDefinition = {
  id: string;
  bucket: InspectorBlockBucket;
  title?: string;
  description?: string;
  align?: InspectorBlockAlign;
  layout?: InspectorBlockLayout;
  when?: (context: InspectorSectionContext) => boolean;
  sections?: readonly InspectorSectionDefinition[];
  render?: (context: InspectorSectionContext) => ReactNode;
};

export type ResolvedInspectorSection = {
  id: string;
  render: () => ReactNode;
};

export type ResolvedInspectorBlock = {
  id: string;
  bucket: InspectorBlockBucket;
  disabled?: boolean;
  title?: string;
  description?: string;
  align: InspectorBlockAlign;
  layout: InspectorBlockLayout;
  sections: ResolvedInspectorSection[];
  render?: () => ReactNode;
};
