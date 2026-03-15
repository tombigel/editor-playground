import {
  cancelPromoteWrapperRole,
  clearPersistedState,
  confirmPromoteWrapperRole,
  createInitialState,
  deleteNode,
  demoteWrapperRole,
  importDocument,
  getValidationErrors,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  moveNode,
  nudgeNode,
  persistState,
  parseImportedDocumentJson,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  resizeNode,
  selectNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
  type EditorState,
} from '../editor/editorStore';
import { getAdjacentStageSelection, getStageSelectableNodeIds } from '../editor/stageNavigation';
import { computeStickyState } from '../sticky/stickyCompute';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../model/defaults';
import { getNode } from '../model/selectors';
import type { DocumentModel, DocumentNode, NodeId } from '../model/types';
import { parseUnitValue } from '../model/units';
import { serializeDocumentJson } from './documentApi';

export type { DocumentModel, DocumentNode, EditorState, NodeId, SectionTemplateId };

export {
  SECTION_TEMPLATES,
  cancelPromoteWrapperRole,
  clearPersistedState,
  computeStickyState,
  confirmPromoteWrapperRole,
  createInitialState,
  deleteNode,
  demoteWrapperRole,
  importDocument,
  getNode,
  getAdjacentStageSelection,
  getStageSelectableNodeIds,
  getValidationErrors,
  insertLeaf,
  insertSectionTemplate,
  insertWrapper,
  loadPersistedState,
  moveNode,
  nudgeNode,
  parseUnitValue,
  persistState,
  parseImportedDocumentJson,
  reparentNode,
  reorderNode,
  requestPromoteWrapperRole,
  resizeNode,
  serializeDocumentJson,
  selectNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
};
