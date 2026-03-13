import { useEffect, useMemo, useReducer } from 'react';
import {
  cancelPromoteWrapperRole,
  clearPersistedState,
  confirmPromoteWrapperRole,
  createInitialState,
  deleteNode,
  demoteWrapperRole,
  getValidationErrors,
  insertLeaf,
  insertWrapper,
  loadPersistedState,
  persistState,
  requestPromoteWrapperRole,
  reparentNode,
  selectNode,
  moveNode,
  resizeNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
} from '../model/documentStore';
import { getNode } from '../model/selectors';
import { InsertPanel } from '../panels/InsertPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { DebugPanel } from '../panels/DebugPanel';
import { Stage } from '../stage/Stage';
import { parseUnitValue } from '../model/units';
import { computeStickyState } from '../sticky/stickyCompute';
import { FloatingPanel } from './FloatingPanel';

type Action =
  | { type: 'select'; id: string | null }
  | { type: 'insertWrapper'; role: 'section' | 'container' }
  | { type: 'insertLeaf'; role: 'text' | 'image' | 'link' | 'button' }
  | { type: 'move'; id: string; x: string; y: string }
  | { type: 'reparent'; id: string; parentId: string; x: string; y: string }
  | { type: 'resize'; id: string; width: string; height: string }
  | { type: 'text'; field: string; value: string }
  | { type: 'wrapperStyle'; field: 'background'; value: string }
  | { type: 'rect'; field: 'x' | 'y' | 'width' | 'height'; value: string }
  | { type: 'promote'; role: 'header' | 'footer' }
  | { type: 'confirmPromote' }
  | { type: 'cancelPromote' }
  | { type: 'demote' }
  | { type: 'delete' }
  | { type: 'stickyEnabled'; value: boolean }
  | { type: 'stickyTarget'; value: 'self' | 'contentWrapper' }
  | { type: 'stickyEdges'; value: 'top' | 'bottom' | 'both' }
  | { type: 'stickyOffset'; value: number }
  | { type: 'stickyDuration'; value: number }
  | { type: 'setPreviewSticky'; value: boolean }
  | { type: 'setShowSpacers'; value: boolean };

function reducer(state: ReturnType<typeof createInitialState>, action: Action) {
  const selectedId = state.selectedId;
  switch (action.type) {
    case 'select':
      return selectNode(state, action.id);
    case 'insertWrapper':
      return insertWrapper(state, action.role);
    case 'insertLeaf':
      return insertLeaf(state, action.role);
    case 'move':
      return moveNode(state, action.id, { x: action.x, y: action.y });
    case 'reparent':
      return reparentNode(state, action.id, action.parentId, action.x, action.y);
    case 'resize':
      return resizeNode(state, action.id, { width: action.width, height: action.height });
    case 'text':
      return selectedId ? updateTextField(state, selectedId, action.field, action.value) : state;
    case 'wrapperStyle':
      return selectedId ? updateWrapperStyleField(state, selectedId, action.field, action.value) : state;
    case 'rect':
      return selectedId ? updateRectField(state, selectedId, action.field, action.value) : state;
    case 'promote':
      return selectedId ? requestPromoteWrapperRole(state, selectedId, action.role) : state;
    case 'confirmPromote':
      return confirmPromoteWrapperRole(state);
    case 'cancelPromote':
      return cancelPromoteWrapperRole(state);
    case 'demote':
      return selectedId ? demoteWrapperRole(state, selectedId) : state;
    case 'delete':
      return selectedId ? deleteNode(state, selectedId) : state;
    case 'stickyEnabled':
      return selectedId ? updateStickyField(state, selectedId, { enabled: action.value }) : state;
    case 'stickyTarget':
      return selectedId ? updateStickyField(state, selectedId, { target: action.value }) : state;
    case 'stickyEdges':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        edges:
          action.value === 'both'
            ? { top: true, bottom: true }
            : action.value === 'bottom'
              ? { top: false, bottom: true }
              : { top: true, bottom: false },
      });
    case 'stickyOffset':
      if (!selectedId) {
        return state;
      }
      return updateStickyField(state, selectedId, {
        offsetTop:
          selectedNodeHasTopEdge(state, selectedId) ? parseUnitValue(`${action.value}vh`) : undefined,
        offsetBottom:
          selectedNodeHasBottomEdge(state, selectedId) ? parseUnitValue(`${action.value}vh`) : undefined,
      });
    case 'stickyDuration':
      return selectedId
        ? updateStickyField(state, selectedId, { duration: parseUnitValue(`${action.value}vh`) })
        : state;
    case 'setPreviewSticky':
      return { ...state, ui: { ...state.ui, previewSticky: action.value } };
    case 'setShowSpacers':
      return { ...state, ui: { ...state.ui, showSpacers: action.value } };
    default:
      return state;
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);
  const selectedNode = getNode(state.document, state.selectedId);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyState = useMemo(() => computeStickyState(state.document), [state.document]);

  useEffect(() => {
    persistState(state);
  }, [state]);

  return (
    <div className="app-shell">
      <Stage
        document={state.document}
        selectedId={state.selectedId}
        previewSticky={state.ui.previewSticky}
        showSpacers={state.ui.showSpacers}
        onSelect={(id) => dispatch({ type: 'select', id })}
        onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
        onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
        onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
      />
      <FloatingPanel title="Insert" initialPosition={{ x: 12, y: 12 }} width={220}>
        <InsertPanel
          onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
          onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
        />
      </FloatingPanel>
      <FloatingPanel
        title="Inspector"
        initialPosition={{
          x: Math.max(260, (typeof window !== 'undefined' ? window.innerWidth : 1440) - 340),
          y: 12,
        }}
        width={320}
      >
        <InspectorPanel
          node={selectedNode}
          onTextChange={(field, value) => dispatch({ type: 'text', field, value })}
          onWrapperStyleChange={(field, value) => dispatch({ type: 'wrapperStyle', field, value })}
          onRectChange={(field, value) => dispatch({ type: 'rect', field, value })}
          onPromote={(role) => dispatch({ type: 'promote', role })}
          onDemote={() => dispatch({ type: 'demote' })}
          onDelete={() => dispatch({ type: 'delete' })}
          onStickyEnabled={(value) => dispatch({ type: 'stickyEnabled', value })}
          onStickyTarget={(value) => dispatch({ type: 'stickyTarget', value })}
          onStickyEdges={(value) => dispatch({ type: 'stickyEdges', value })}
          onStickyOffset={(value) => dispatch({ type: 'stickyOffset', value })}
          onStickyDuration={(value) => dispatch({ type: 'stickyDuration', value })}
        />
      </FloatingPanel>
      <FloatingPanel
        title="Debug"
        initialPosition={{
          x: 244,
          y: Math.max(12, (typeof window !== 'undefined' ? window.innerHeight : 900) - 180),
        }}
        width={520}
      >
        <DebugPanel
          errors={errors}
          stickyState={stickyState}
          previewSticky={state.ui.previewSticky}
          showSpacers={state.ui.showSpacers}
          onPreviewStickyChange={(value) => dispatch({ type: 'setPreviewSticky', value })}
          onShowSpacersChange={(value) => dispatch({ type: 'setShowSpacers', value })}
          onReset={() => {
            clearPersistedState();
            window.location.reload();
          }}
        />
      </FloatingPanel>
      {state.pendingRoleSwap ? (
        <div className="dialog-backdrop">
          <div className="dialog">
            <h3>Replace current {state.pendingRoleSwap.targetRole}?</h3>
            <p>
              A {state.pendingRoleSwap.targetRole} already exists. Demote the current one and promote
              this section?
            </p>
            <div className="dialog-actions">
              <button onClick={() => dispatch({ type: 'cancelPromote' })}>Cancel</button>
              <button onClick={() => dispatch({ type: 'confirmPromote' })}>Replace</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function selectedNodeHasTopEdge(state: ReturnType<typeof createInitialState>, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || node.type === 'site') {
    return false;
  }
  return node.sticky?.edges.top ?? !node.sticky?.edges.bottom;
}

function selectedNodeHasBottomEdge(state: ReturnType<typeof createInitialState>, selectedId: string) {
  const node = getNode(state.document, selectedId);
  if (!node || node.type === 'site') {
    return false;
  }
  return node.sticky?.edges.bottom ?? false;
}
