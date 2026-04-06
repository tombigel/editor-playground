/**
 * @module editorApi
 *
 * Editor-layer API. Wraps documentApi operations with EditorState, selection
 * management, and history. The editor UI always calls these variants.
 * For pure model mutations without editor state, use documentApi directly.
 */

import * as editorStore from '../editor/editorStore';
import * as stageNavigation from '../editor/stageNavigation';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../model/defaults';
import { getNode } from '../model/selectors';
import { parseUnitValue } from '../model/units';
import {
  deleteNodeDoc,
  deleteNodesDoc,
  getTopLevelWrapperVisibilityState,
  insertContainerDoc,
  insertLeafDoc,
  insertMediaDoc,
  insertTextDoc,
  insertWrapperDoc,
  moveNodeInTreeDoc,
  reorderNodeDoc,
  reparentNodeDoc,
  resolveStickyLayout,
  resolveWrapperStickyState,
  serializeDocumentJson,
  setNodeRichContent,
  setNodeVisibilityDoc,
  setTopLevelWrapperVisibility,
  setPageTopLevelWrapperPlacement,
  validateLinks,
  type ContainerNode,
  type ContainerSubtype,
  type DocumentModel,
  type DocumentNode,
  type EditorTextField,
  type NodeId,
  type NodeOrderAction,
  type StickyGeometrySnapshot,
  type StickyLayoutState,
  type TopLevelWrapperVisibility,
  type TopLevelWrapperVisibilityMode,
  type TopLevelWrapperVisibilityState,
  type TopLevelWrapperPlacement,
} from './documentApi';

/** Types shared between documentApi and editorApi, plus editor-specific types. */
export type {
  ContainerNode,
  ContainerSubtype,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  NodeId,
  NodeOrderAction,
  StickyGeometrySnapshot,
  StickyLayoutState,
  SectionTemplateId,
  TopLevelWrapperVisibility,
  TopLevelWrapperVisibilityMode,
  TopLevelWrapperVisibilityState,
  TopLevelWrapperPlacement,
};
export type { EditorState, FocusedMode } from '../editor/editorStore';

/** State lifecycle: create, load, persist, and reset editor state. */
export const cancelPromoteWrapperRole = editorStore.cancelPromoteWrapperRole;
export const clearSessionState = editorStore.clearSessionState;
export const clearPersistedState = editorStore.clearPersistedState;
export const clearSelection = editorStore.clearSelection;
export const confirmPromoteWrapperRole = editorStore.confirmPromoteWrapperRole;
export const createFactoryResetState = editorStore.createFactoryResetState;
export const createInitialState = editorStore.createInitialState;
export const deleteNode = editorStore.deleteNode;
export const deleteNodes = editorStore.deleteNodes;
export const demoteWrapperRole = editorStore.demoteWrapperRole;
export const distributeNodes = editorStore.distributeNodes;
export const importDocument = editorStore.importDocument;
export const getValidationErrors = editorStore.getValidationErrors;
export const alignNodes = editorStore.alignNodes;
export const insertLeaf = editorStore.insertLeaf;
export const insertSectionTemplate = editorStore.insertSectionTemplate;
export const insertWrapper = editorStore.insertWrapper;
export const loadPersistedState = editorStore.loadPersistedState;
export const moveNode = editorStore.moveNode;
export const moveNodes = editorStore.moveNodes;
export const moveNodeInTree = editorStore.moveNodeInTree;
export const nudgeNode = editorStore.nudgeNode;
export const persistDefaultDocument = editorStore.persistDefaultDocument;
export const persistState = editorStore.persistState;
export const parseImportedDocumentJson = editorStore.parseImportedDocumentJson;
export const reparentNode = editorStore.reparentNode;
export const reparentNodes = editorStore.reparentNodes;
export const reorderNode = editorStore.reorderNode;
export const requestPromoteWrapperRole = editorStore.requestPromoteWrapperRole;
export const resizeNode = editorStore.resizeNode;
export const selectNode = editorStore.selectNode;
export const selectManyNodes = editorStore.selectManyNodes;
export const setNodeVisibility = editorStore.setNodeVisibility;
export const toggleNodeSelection = editorStore.toggleNodeSelection;
export const updateRectField = editorStore.updateRectField;
export const updateStickyField = editorStore.updateStickyField;
export const updateTextField = editorStore.updateTextField;
export const updateWrapperStyleField = editorStore.updateWrapperStyleField;
export const reorderNodes = editorStore.reorderNodes;
export const setActivePage = editorStore.setActivePage;

export {
  addPage,
  deletePage,
  getAllPageRoutes,
  getHomePage,
  getPageRole,
  getPageRoutes,
  reorderPage,
  resolvePageHierarchyUrl,
  resolvePageManualAliasUrls,
  resolvePageSystemAliasUrl,
  setPageDisplayName,
  setPageAsHome,
  setPageLang,
  setPageSlug,
  setPageParent,
  setPageVisibility,
  setPageViewTransition,
  setSiteSettings,
  moveSectionToPage,
  getPageForSection,
  getActiveSections,
  resolvePageUrl,
  resolvePageLanguage,
  resolveSiteLanguage,
  resolveTextLeafLanguage,
  syncPageHrefLinks,
  validatePageSlug,
} from './pageApi';
export type { DocumentPage, PageId, SiteSettings } from '../model/types/site';
export type { LinkValidationError } from '../model/validation';

/** Stage keyboard navigation: enumerate selectable nodes and move between them. */
export const getAdjacentStageSelection = stageNavigation.getAdjacentStageSelection;
export const getStageSelectableNodeIds = stageNavigation.getStageSelectableNodeIds;

/** documentApi pass-throughs: pure model utilities re-exported for consumer convenience. */
export {
  SECTION_TEMPLATES,
  deleteNodeDoc,
  deleteNodesDoc,
  getNode,
  insertContainerDoc,
  insertLeafDoc,
  insertMediaDoc,
  insertTextDoc,
  insertWrapperDoc,
  moveNodeInTreeDoc,
  parseUnitValue,
  reorderNodeDoc,
  reparentNodeDoc,
  resolveStickyLayout,
  resolveWrapperStickyState,
  serializeDocumentJson,
  setNodeRichContent,
  setNodeVisibilityDoc,
  setTopLevelWrapperVisibility,
  setPageTopLevelWrapperPlacement,
  getTopLevelWrapperVisibilityState,
  validateLinks,
};
