import type { DocumentNode, EditorState } from '../api/editorApi';
export type { HistoryEntry, NodePatch } from './types/history';
import type { HistoryEntry, NodePatch } from './types/history';

export function appendHistoryEntry(past: HistoryEntry[], entry: HistoryEntry, historyLimit: number) {
  const last = past[past.length - 1];
  const shouldDebounceMerge =
    Boolean(
      last &&
      last.debounceKey &&
      entry.debounceKey &&
      last.debounceKey === entry.debounceKey &&
      entry.createdAt - last.createdAt <= 450,
    );

  const nextPast = shouldDebounceMerge
    ? [...past.slice(0, -1), composeHistoryEntries(last!, entry)]
    : [...past, entry];

  if (nextPast.length > historyLimit) {
    return nextPast.slice(nextPast.length - historyLimit);
  }
  return nextPast;
}

export function clampHistoryLimit(value: number, defaultValue: number, minValue: number, maxValue: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : defaultValue;
  return Math.min(maxValue, Math.max(minValue, parsed));
}

export function buildHistoryEntry(
  before: EditorState,
  after: EditorState,
  debounceKey: string | null,
  createdAt: number,
): HistoryEntry | null {
  const patches: NodePatch[] = [];
  const nodeIds = new Set<string>([
    ...Object.keys(before.document.nodes),
    ...Object.keys(after.document.nodes),
  ]);

  for (const id of nodeIds) {
    const beforeNode = before.document.nodes[id];
    const afterNode = after.document.nodes[id];
    if (!beforeNode && afterNode) {
      patches.push({ id, before: undefined, after: afterNode });
      continue;
    }
    if (beforeNode && !afterNode) {
      patches.push({ id, before: beforeNode, after: undefined });
      continue;
    }
    if (beforeNode && afterNode && !nodesEqual(beforeNode, afterNode)) {
      patches.push({ id, before: beforeNode, after: afterNode });
    }
  }

  const selectedChanged = before.selectedId !== after.selectedId;
  const pendingChanged = !deepEqual(before.pendingRoleSwap, after.pendingRoleSwap);
  const rootChanged = before.document.rootId !== after.document.rootId;

  if (!selectedChanged && !pendingChanged && !rootChanged && patches.length === 0) {
    return null;
  }

  return {
    rootIdBefore: before.document.rootId,
    rootIdAfter: after.document.rootId,
    nodePatches: patches,
    selectedBefore: before.selectedId,
    selectedAfter: after.selectedId,
    pendingBefore: before.pendingRoleSwap,
    pendingAfter: after.pendingRoleSwap,
    debounceKey,
    createdAt,
  };
}

export function composeHistoryEntries(previous: HistoryEntry, next: HistoryEntry): HistoryEntry {
  const byId = new Map<string, NodePatch>();

  for (const patch of previous.nodePatches) {
    byId.set(patch.id, patch);
  }

  for (const patch of next.nodePatches) {
    const existing = byId.get(patch.id);
    if (!existing) {
      byId.set(patch.id, patch);
      continue;
    }

    const composed: NodePatch = {
      id: patch.id,
      before: existing.before,
      after: patch.after,
    };

    if (
      (composed.before === undefined && composed.after === undefined) ||
      (composed.before && composed.after && nodesEqual(composed.before, composed.after))
    ) {
      byId.delete(patch.id);
    } else {
      byId.set(patch.id, composed);
    }
  }

  return {
    rootIdBefore: previous.rootIdBefore,
    rootIdAfter: next.rootIdAfter,
    nodePatches: Array.from(byId.values()),
    selectedBefore: previous.selectedBefore,
    selectedAfter: next.selectedAfter,
    pendingBefore: previous.pendingBefore,
    pendingAfter: next.pendingAfter,
    debounceKey: next.debounceKey,
    createdAt: next.createdAt,
  };
}

export function applyHistoryEntry(
  present: EditorState,
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
): EditorState {
  const nodes = { ...present.document.nodes };
  for (const patch of entry.nodePatches) {
    const snapshot = direction === 'undo' ? patch.before : patch.after;
    if (!snapshot) {
      delete nodes[patch.id];
    } else {
      nodes[patch.id] = structuredClone(snapshot);
    }
  }

  const rootId = direction === 'undo' ? entry.rootIdBefore : entry.rootIdAfter;
  const selectedCandidate = direction === 'undo' ? entry.selectedBefore : entry.selectedAfter;
  const selectedId = selectedCandidate && nodes[selectedCandidate] ? selectedCandidate : null;

  return {
    ...present,
    document: {
      rootId,
      nodes,
    },
    selectedId,
    pendingRoleSwap: direction === 'undo' ? entry.pendingBefore : entry.pendingAfter,
  };
}

export function nodesEqual(left: DocumentNode, right: DocumentNode) {
  return deepEqual(left, right);
}

export function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== typeof right || left == null || right == null) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => deepEqual(value, right[index]));
  }

  if (typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(rightRecord, key)) {
      return false;
    }
    if (!deepEqual(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }

  return true;
}
