import * as editorStore from '../editor/editorStore';
import * as stageNavigation from '../editor/stageNavigation';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../model/defaults';
import { getNode } from '../model/selectors';
import { parseUnitValue } from '../model/units';
import {
  deleteNodeDoc,
  deleteNodesDoc,
  insertLeafDoc,
  insertWrapperDoc,
  reorderNodeDoc,
  reparentNodeDoc,
  resolveStickyLayout,
  resolveWrapperStickyState,
  serializeDocumentJson,
  type DocumentModel,
  type DocumentNode,
  type EditorTextField,
  type NodeId,
  type NodeOrderAction,
  type StickyGeometrySnapshot,
  type StickyLayoutState,
} from './documentApi';

export type {
  DocumentModel,
  DocumentNode,
  EditorTextField,
  NodeId,
  NodeOrderAction,
  StickyGeometrySnapshot,
  StickyLayoutState,
  SectionTemplateId,
};
export type { EditorState, FocusedMode } from '../editor/editorStore';

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
export const nudgeNode = editorStore.nudgeNode;
export const persistDefaultDocument = editorStore.persistDefaultDocument;
export const persistState = editorStore.persistState;
export const parseImportedDocumentJson = editorStore.parseImportedDocumentJson;
export const reparentNode = editorStore.reparentNode;
export const reorderNode = editorStore.reorderNode;
export const requestPromoteWrapperRole = editorStore.requestPromoteWrapperRole;
export const resizeNode = editorStore.resizeNode;
export const selectNode = editorStore.selectNode;
export const selectManyNodes = editorStore.selectManyNodes;
export const toggleNodeSelection = editorStore.toggleNodeSelection;
export const updateRectField = editorStore.updateRectField;
export const updateStickyField = editorStore.updateStickyField;
export const updateTextField = editorStore.updateTextField;
export const updateWrapperStyleField = editorStore.updateWrapperStyleField;
export const reorderNodes = editorStore.reorderNodes;

export const getAdjacentStageSelection = stageNavigation.getAdjacentStageSelection;
export const getStageSelectableNodeIds = stageNavigation.getStageSelectableNodeIds;

export {
  SECTION_TEMPLATES,
  deleteNodeDoc,
  deleteNodesDoc,
  getNode,
  insertLeafDoc,
  insertWrapperDoc,
  parseUnitValue,
  reorderNodeDoc,
  reparentNodeDoc,
  resolveStickyLayout,
  resolveWrapperStickyState,
  serializeDocumentJson,
};
