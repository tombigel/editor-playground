import * as editorStore from '../editor/editorStore';
import * as stageNavigation from '../editor/stageNavigation';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../model/defaults';
import { getNode } from '../model/selectors';
import { parseUnitValue } from '../model/units';
import {
  resolveStickyLayout,
  resolveWrapperStickyState,
  serializeDocumentJson,
  type DocumentModel,
  type DocumentNode,
  type EditorTextField,
  type NodeId,
  type StickyGeometrySnapshot,
  type StickyLayoutState,
} from './documentApi';

export type {
  DocumentModel,
  DocumentNode,
  EditorTextField,
  NodeId,
  StickyGeometrySnapshot,
  StickyLayoutState,
  SectionTemplateId,
};
export type { EditorState } from '../editor/editorStore';

export const cancelPromoteWrapperRole = editorStore.cancelPromoteWrapperRole;
export const clearSessionState = editorStore.clearSessionState;
export const clearPersistedState = editorStore.clearPersistedState;
export const confirmPromoteWrapperRole = editorStore.confirmPromoteWrapperRole;
export const createFactoryResetState = editorStore.createFactoryResetState;
export const createInitialState = editorStore.createInitialState;
export const deleteNode = editorStore.deleteNode;
export const demoteWrapperRole = editorStore.demoteWrapperRole;
export const importDocument = editorStore.importDocument;
export const getValidationErrors = editorStore.getValidationErrors;
export const insertLeaf = editorStore.insertLeaf;
export const insertSectionTemplate = editorStore.insertSectionTemplate;
export const insertWrapper = editorStore.insertWrapper;
export const loadPersistedState = editorStore.loadPersistedState;
export const moveNode = editorStore.moveNode;
export const nudgeNode = editorStore.nudgeNode;
export const persistDefaultDocument = editorStore.persistDefaultDocument;
export const persistState = editorStore.persistState;
export const parseImportedDocumentJson = editorStore.parseImportedDocumentJson;
export const reparentNode = editorStore.reparentNode;
export const reorderNode = editorStore.reorderNode;
export const requestPromoteWrapperRole = editorStore.requestPromoteWrapperRole;
export const resizeNode = editorStore.resizeNode;
export const selectNode = editorStore.selectNode;
export const updateRectField = editorStore.updateRectField;
export const updateStickyField = editorStore.updateStickyField;
export const updateTextField = editorStore.updateTextField;
export const updateWrapperStyleField = editorStore.updateWrapperStyleField;

export const getAdjacentStageSelection = stageNavigation.getAdjacentStageSelection;
export const getStageSelectableNodeIds = stageNavigation.getStageSelectableNodeIds;

export {
  SECTION_TEMPLATES,
  getNode,
  parseUnitValue,
  resolveStickyLayout,
  resolveWrapperStickyState,
  serializeDocumentJson,
};
