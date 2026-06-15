import type { DocumentNode, EditorState } from '../api/editorApi';
export type { HistoryEntry, NodePatch } from './types';
import type { HistoryEntry, NodePatch } from './types';

export function appendHistoryEntry(past: HistoryEntry[], entry: HistoryEntry, historyLimit: number) {
  const last = past[past.length - 1];
  const shouldDebounceMerge =
    Boolean(
      last?.debounceKey &&
      entry.debounceKey &&
      last.debounceKey === entry.debounceKey &&
      entry.createdAt - last.createdAt <= 450,
    );

  const nextPast = shouldDebounceMerge
    ? [...past.slice(0, -1), composeHistoryEntries(last, entry)]
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
    if (beforeNode && afterNode) {
      if (beforeNode === afterNode) continue;
      if (!nodesEqual(beforeNode, afterNode)) {
        patches.push({ id, before: beforeNode, after: afterNode });
      }
    }
  }

  const beforeSelectedIds = before.selectedIds ?? (before.selectedId ? [before.selectedId] : []);
  const afterSelectedIds = after.selectedIds ?? (after.selectedId ? [after.selectedId] : []);
  const selectedChanged =
    before.selectedId !== after.selectedId ||
    !deepEqual(beforeSelectedIds, afterSelectedIds);
  const pendingChanged = !deepEqual(before.pendingRoleSwap, after.pendingRoleSwap);
  const rootChanged = before.document.rootId !== after.document.rootId;
  const fontLibraryChanged = !deepEqual(before.document.fontLibrary, after.document.fontLibrary);
  const pagesChanged = !deepEqual(before.document.pages, after.document.pages);
  const siteSettingsChanged = !deepEqual(before.document.siteSettings, after.document.siteSettings);
  const sharedRegionIdsChanged = !deepEqual(before.document.sharedRegionIds, after.document.sharedRegionIds);
  const activePageIdChanged = before.activePageId !== after.activePageId;

  if (!selectedChanged && !pendingChanged && !rootChanged && !fontLibraryChanged && !pagesChanged && !siteSettingsChanged && !sharedRegionIdsChanged && !activePageIdChanged && patches.length === 0) {
    return null;
  }

  return {
    rootIdBefore: before.document.rootId,
    rootIdAfter: after.document.rootId,
    fontLibraryBefore: fontLibraryChanged ? structuredClone(before.document.fontLibrary) : before.document.fontLibrary,
    fontLibraryAfter: fontLibraryChanged ? structuredClone(after.document.fontLibrary) : after.document.fontLibrary,
    nodePatches: patches,
    selectedBefore: before.selectedId,
    selectedAfter: after.selectedId,
    selectedIdsBefore: beforeSelectedIds,
    selectedIdsAfter: afterSelectedIds,
    pendingBefore: before.pendingRoleSwap,
    pendingAfter: after.pendingRoleSwap,
    debounceKey,
    createdAt,
    pagesBefore: pagesChanged ? structuredClone(before.document.pages) : before.document.pages,
    pagesAfter: pagesChanged ? structuredClone(after.document.pages) : after.document.pages,
    siteSettingsBefore: siteSettingsChanged ? structuredClone(before.document.siteSettings) : before.document.siteSettings,
    siteSettingsAfter: siteSettingsChanged ? structuredClone(after.document.siteSettings) : after.document.siteSettings,
    sharedRegionIdsBefore: sharedRegionIdsChanged ? structuredClone(before.document.sharedRegionIds) : before.document.sharedRegionIds,
    sharedRegionIdsAfter: sharedRegionIdsChanged ? structuredClone(after.document.sharedRegionIds) : after.document.sharedRegionIds,
    activePageIdBefore: before.activePageId,
    activePageIdAfter: after.activePageId,
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
    fontLibraryBefore: previous.fontLibraryBefore,
    fontLibraryAfter: next.fontLibraryAfter,
    nodePatches: Array.from(byId.values()),
    selectedBefore: previous.selectedBefore,
    selectedAfter: next.selectedAfter,
    selectedIdsBefore: previous.selectedIdsBefore,
    selectedIdsAfter: next.selectedIdsAfter,
    pendingBefore: previous.pendingBefore,
    pendingAfter: next.pendingAfter,
    debounceKey: next.debounceKey,
    createdAt: next.createdAt,
    pagesBefore: previous.pagesBefore,
    pagesAfter: next.pagesAfter,
    siteSettingsBefore: previous.siteSettingsBefore,
    siteSettingsAfter: next.siteSettingsAfter,
    sharedRegionIdsBefore: previous.sharedRegionIdsBefore,
    sharedRegionIdsAfter: next.sharedRegionIdsAfter,
    activePageIdBefore: previous.activePageIdBefore,
    activePageIdAfter: next.activePageIdAfter,
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
  const selectedIdsCandidate = direction === 'undo' ? entry.selectedIdsBefore : entry.selectedIdsAfter;
  const selectedIds = selectedIdsCandidate.filter((selectedId) => Boolean(nodes[selectedId]));
  const selectedId =
    selectedIds[0] ?? (selectedCandidate && nodes[selectedCandidate] ? selectedCandidate : null);
  const pages = direction === 'undo' ? entry.pagesBefore : entry.pagesAfter;
  const siteSettings = direction === 'undo' ? entry.siteSettingsBefore : entry.siteSettingsAfter;
  const sharedRegionIds = direction === 'undo' ? entry.sharedRegionIdsBefore : entry.sharedRegionIdsAfter;
  const activePageId = direction === 'undo' ? entry.activePageIdBefore : entry.activePageIdAfter;

  return {
    ...present,
    document: {
      rootId,
      nodes,
      fontLibrary: structuredClone(direction === 'undo' ? entry.fontLibraryBefore : entry.fontLibraryAfter),
      ...(present.document.animationSettings ? { animationSettings: present.document.animationSettings } : {}),
      ...(pages !== undefined ? { pages: structuredClone(pages) } : {}),
      ...(siteSettings !== undefined ? { siteSettings: structuredClone(siteSettings) } : {}),
      ...(sharedRegionIds !== undefined ? { sharedRegionIds: structuredClone(sharedRegionIds) } : {}),
    },
    activePageId: activePageId ?? present.activePageId,
    selectedId,
    selectedIds,
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
    if (!Object.hasOwn(rightRecord, key)) {
      return false;
    }
    if (!deepEqual(leftRecord[key], rightRecord[key])) {
      return false;
    }
  }

  return true;
}
