import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Eye, Grid3X3, SearchCode, StickyNote } from 'lucide-react';
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
  moveNode,
  persistState,
  reparentNode,
  requestPromoteWrapperRole,
  resizeNode,
  selectNode,
  updateRectField,
  updateStickyField,
  updateTextField,
  updateWrapperStyleField,
} from '../model/documentStore';
import { parseUnitValue } from '../model/units';
import { getNode } from '../model/selectors';
import { InsertPanel } from '../panels/InsertPanel';
import { InspectorPanel } from '../panels/InspectorPanel';
import { DebugPanel } from '../panels/DebugPanel';
import { Stage } from '../stage/Stage';
import { computeStickyState } from '../sticky/stickyCompute';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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
  | { type: 'stickyDurationMode'; value: 'auto' | 'custom' }
  | { type: 'stickyDuration'; value: number }
  | { type: 'setPreviewSticky'; value: boolean }
  | { type: 'setSpacerVisibility'; value: 'selected' | 'all' }
  | { type: 'setShowGridLanes'; value: boolean };

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
        offsetTop: selectedNodeHasTopEdge(state, selectedId) ? parseUnitValue(`${action.value}vh`) : undefined,
        offsetBottom:
          selectedNodeHasBottomEdge(state, selectedId) ? parseUnitValue(`${action.value}vh`) : undefined,
      });
    case 'stickyDurationMode':
      return selectedId ? updateStickyField(state, selectedId, { durationMode: action.value }) : state;
    case 'stickyDuration':
      return selectedId
        ? updateStickyField(state, selectedId, { duration: parseUnitValue(`${action.value}vh`) })
        : state;
    case 'setPreviewSticky':
      return { ...state, ui: { ...state.ui, previewSticky: action.value } };
    case 'setSpacerVisibility':
      return { ...state, ui: { ...state.ui, spacerVisibility: action.value } };
    case 'setShowGridLanes':
      return { ...state, ui: { ...state.ui, showGridLanes: action.value } };
    default:
      return state;
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState);
  const [debugOpen, setDebugOpen] = useState(false);
  const [spacerMenuOpen, setSpacerMenuOpen] = useState(false);
  const spacerMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedNode = getNode(state.document, state.selectedId);
  const errors = useMemo(() => getValidationErrors(state), [state]);
  const stickyState = useMemo(() => computeStickyState(state.document), [state.document]);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!spacerMenuRef.current) {
        return;
      }

      if (!spacerMenuRef.current.contains(event.target as Node)) {
        setSpacerMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!state.selectedId) {
        return;
      }
      if (event.key !== 'Backspace' && event.key !== 'Delete') {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (isInteractiveFocus(active)) {
        return;
      }

      event.preventDefault();
      dispatch({ type: 'delete' });
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedId]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#eef2f7] text-slate-900">
      <div className="grid h-full grid-rows-[56px_minmax(0,1fr)]">
        <header className="border-b border-white/10 bg-[#131720] px-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex h-full items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3772ff] to-[#1a243a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
                <StickyNote className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-[0.01em]">Sticky Playground</div>
                <div className="truncate text-[11px] text-white/55">
                  Editor bootstrap · mesh layout · spacer-based sticky behavior
                </div>
              </div>
            </div>
            <div className="ml-auto" />
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[84px_minmax(0,1fr)_300px]">
          <aside className="relative z-30 overflow-visible border-r border-slate-200/80 bg-white/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur">
            <div className="flex h-full flex-col gap-4 overflow-visible p-3">
              <div className="overflow-visible rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                <InsertPanel
                  onInsertWrapper={(role) => dispatch({ type: 'insertWrapper', role })}
                  onInsertLeaf={(role) => dispatch({ type: 'insertLeaf', role })}
                />
              </div>
              <div className="mt-auto flex justify-center">
                <div className="relative flex flex-col gap-2 overflow-visible">
                  <button
                    type="button"
                    aria-pressed={state.ui.previewSticky}
                    onClick={() => dispatch({ type: 'setPreviewSticky', value: !state.ui.previewSticky })}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      state.ui.previewSticky
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {state.ui.previewSticky ? 'Disable sticky preview' : 'Enable sticky preview'}
                    </span>
                  </button>
                  <div ref={spacerMenuRef} className="group relative">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={spacerMenuOpen}
                      onClick={() => setSpacerMenuOpen((open) => !open)}
                      aria-pressed={state.ui.spacerVisibility === 'all'}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                        state.ui.spacerVisibility === 'all'
                          ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <SpacerIcon className="h-4 w-4" />
                    </button>
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      Spacer visibility
                    </span>
                    {spacerMenuOpen ? (
                      <div className="absolute left-[calc(100%+8px)] top-1/2 z-[95] min-w-[140px] -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_12px_24px_rgba(18,32,51,0.12)]">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'setSpacerVisibility', value: 'selected' });
                          setSpacerMenuOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                          state.ui.spacerVisibility === 'selected'
                            ? 'bg-[#3772ff] text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Selected spacers
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'setSpacerVisibility', value: 'all' });
                          setSpacerMenuOpen(false);
                        }}
                        className={`mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                          state.ui.spacerVisibility === 'all'
                            ? 'bg-[#3772ff] text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        All spacers
                      </button>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-pressed={state.ui.showGridLanes}
                    onClick={() => dispatch({ type: 'setShowGridLanes', value: !state.ui.showGridLanes })}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      state.ui.showGridLanes
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {state.ui.showGridLanes ? 'Hide grid lanes' : 'Show grid lanes'}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={debugOpen}
                    onClick={() => setDebugOpen((open) => !open)}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                      debugOpen
                        ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22)]'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <SearchCode className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[90] hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-[0_12px_24px_rgba(18,32,51,0.12)] group-hover:block">
                      {debugOpen ? 'Hide debug tools' : 'Show debug tools'}
                    </span>
                  </button>
                  {debugOpen ? (
                    <div className="absolute bottom-0 left-[calc(100%+16px)] z-40 w-[368px]">
                      <div className="rounded-2xl border border-slate-200 bg-white/96 shadow-[0_18px_40px_rgba(18,32,51,0.12)] backdrop-blur">
                        <div className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">Debug tools</div>
                          <div className="text-xs text-slate-500">Validation, sticky math, stage reset</div>
                        </div>
                        <Separator />
                        <DebugPanel
                          errors={errors}
                          stickyState={stickyState}
                          selectedNode={selectedNode}
                          onExport={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                JSON.stringify(state.document, null, 2),
                              );
                              return true;
                            } catch {
                              return false;
                            }
                          }}
                          onReset={() => {
                            clearPersistedState();
                            window.location.reload();
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <main className="relative min-h-0 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0)),#eef2f7]">
            <Stage
              document={state.document}
              selectedId={state.selectedId}
              previewSticky={state.ui.previewSticky}
              spacerVisibility={state.ui.spacerVisibility}
              showGridLanes={state.ui.showGridLanes}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
              onReparent={(id, parentId, x, y) => dispatch({ type: 'reparent', id, parentId, x, y })}
              onResize={(id, width, height) => dispatch({ type: 'resize', id, width, height })}
            />

          </main>

          <aside className="min-h-0 overflow-hidden border-l border-slate-200/80 bg-white/97 shadow-[-8px_0_24px_rgba(18,32,51,0.03)]">
            <InspectorPanel
              node={selectedNode}
              onTextChange={(field, value) => dispatch({ type: 'text', field, value })}
              onWrapperStyleChange={(field, value) => dispatch({ type: 'wrapperStyle', field, value })}
              onRectChange={(field, value) => dispatch({ type: 'rect', field, value })}
              onPromote={(role) => dispatch({ type: 'promote', role })}
              onDemote={() => dispatch({ type: 'demote' })}
              onStickyEnabled={(value) => dispatch({ type: 'stickyEnabled', value })}
              onStickyTarget={(value) => dispatch({ type: 'stickyTarget', value })}
              onStickyEdges={(value) => dispatch({ type: 'stickyEdges', value })}
              onStickyOffset={(value) => dispatch({ type: 'stickyOffset', value })}
              onStickyDurationMode={(value) => dispatch({ type: 'stickyDurationMode', value })}
              onStickyDuration={(value) => dispatch({ type: 'stickyDuration', value })}
            />
          </aside>
        </div>
      </div>

      <Dialog
        open={Boolean(state.pendingRoleSwap)}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ type: 'cancelPromote' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current {state.pendingRoleSwap?.targetRole}?</DialogTitle>
            <DialogDescription>
              A {state.pendingRoleSwap?.targetRole} already exists. Demote the current one and promote
              this wrapper instead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({ type: 'cancelPromote' })}>
              Cancel
            </Button>
            <Button onClick={() => dispatch({ type: 'confirmPromote' })}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isInteractiveFocus(element: HTMLElement | null) {
  if (!element) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  return Boolean(
    element.closest(
      'input, textarea, select, button, [role="textbox"], [contenteditable="true"], [data-radix-slider-thumb], [data-radix-select-trigger]',
    ),
  );
}

function SpacerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="4" rx="1" />
      <path d="M12 8v8" />
      <path d="M8 12h8" opacity="0.65" />
      <rect x="4" y="16" width="16" height="4" rx="1" />
    </svg>
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
