import type { DocumentModel, DocumentNode, EditorTextField, FocusedMode } from '../../../api/editorApi';
import type { WrapperStyleField } from '../../../api/documentApi';
import type { ReactNode } from 'react';

export type InspectorNode = DocumentNode;
export type NonSiteInspectorNode = Exclude<DocumentNode, { type: 'site' }>;
export type TextInspectorNode = Extract<DocumentNode, { type: 'leaf'; role: 'text' }>;
export type ButtonInspectorNode = Extract<DocumentNode, { type: 'leaf'; role: 'button' }>;
export type LinkInspectorNode = Extract<DocumentNode, { type: 'leaf'; role: 'link' }>;
export type ImageInspectorNode = Extract<DocumentNode, { type: 'leaf'; role: 'image' }>;
export type WrapperInspectorNode = Extract<DocumentNode, { type: 'wrapper' }>;

export type InspectorActionHandlers = {
  onTextChange: (field: EditorTextField, value: string) => void;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
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
  onEnterFocusedMode: (mode: FocusedMode) => void;
  onOpenManageFonts?: () => void;
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
  node: InspectorNode | null;
  actions: InspectorActionHandlers;
  orderState: InspectorOrderState;
  focusedMode: FocusedMode;
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
  title?: string;
  description?: string;
  align: InspectorBlockAlign;
  layout: InspectorBlockLayout;
  sections: ResolvedInspectorSection[];
  render?: () => ReactNode;
};
