import { useEffect, useRef } from 'react';
import type { DocumentModel } from '../model/types';

type NodeSnapshot = {
  rect: string | null;
  sticky: string;
  animation: string;
  style: string;
};

function snapshotNode(
  node: Exclude<DocumentModel['nodes'][string], { type: 'site' }>,
): NodeSnapshot {
  return {
    rect: 'rect' in node ? JSON.stringify(node.rect) : null,
    sticky: JSON.stringify(node.sticky ?? null),
    animation: JSON.stringify(node.animation ?? null),
    style: 'style' in node ? JSON.stringify(node.style ?? null) : 'null',
  };
}

export function useDebugLogger(
  showDebugInfo: boolean,
  document: DocumentModel,
  selectedId: string | null,
): void {
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const prevSelectedRef = useRef<{ id: string; snapshot: NodeSnapshot } | null>(null);

  // Effect 1: Log node additions and removals
  useEffect(() => {
    const currentIds = new Set(Object.keys(document.nodes));

    if (!showDebugInfo) {
      prevNodeIdsRef.current = currentIds;
      return;
    }

    const prevNodeIds = prevNodeIdsRef.current;

    for (const id of currentIds) {
      if (!prevNodeIds.has(id)) {
        const node = document.nodes[id];
        if (node && node.type !== 'site') {
          const { name, role } = node;
          console.log('%c[debug:add]', 'color:#22c55e;font-weight:bold', `+ ${role} "${name}" (${id})`);
        }
      }
    }

    for (const id of prevNodeIds) {
      if (!currentIds.has(id)) {
        console.log('%c[debug:remove]', 'color:#ef4444;font-weight:bold', `- ${id}`);
      }
    }

    prevNodeIdsRef.current = currentIds;
  }, [showDebugInfo, document.nodes]);

  // Effect 2: Log selection and full payload changes
  useEffect(() => {
    if (!showDebugInfo || !selectedId) {
      prevSelectedRef.current = null;
      return;
    }

    const node = document.nodes[selectedId];
    if (!node || node.type === 'site') return;

    const { name, role } = node;
    const snapshot = snapshotNode(node);
    const prev = prevSelectedRef.current;

    if (prev?.id !== selectedId) {
      // New selection
      console.groupCollapsed(
        '%c[debug:select]',
        'color:#60a5fa;font-weight:bold',
        `→ "${name}" ${role} · ${selectedId}`,
      );
      if (snapshot.rect) console.log('rect', JSON.parse(snapshot.rect));
      if (snapshot.sticky !== 'null') console.log('sticky', JSON.parse(snapshot.sticky));
      if (snapshot.animation !== 'null') console.log('animation', JSON.parse(snapshot.animation));
      if (snapshot.style !== 'null') console.log('style', JSON.parse(snapshot.style));
      console.groupEnd();
    } else {
      // Check for data/style changes
      const changed: Array<[string, unknown, unknown]> = [];
      for (const key of Object.keys(snapshot) as Array<keyof NodeSnapshot>) {
        if (snapshot[key] !== prev.snapshot[key]) {
          changed.push([key, JSON.parse(prev.snapshot[key] ?? 'null'), JSON.parse(snapshot[key] ?? 'null')]);
        }
      }
      if (changed.length > 0) {
        console.groupCollapsed(
          '%c[debug:change]',
          'color:#f59e0b;font-weight:bold',
          `∆ "${name}" · ${changed.map(([k]) => k).join(', ')}`,
        );
        for (const [key, before, after] of changed) {
          console.log(`${key}:before`, before);
          console.log(`${key}:after`, after);
        }
        console.groupEnd();
      }
    }

    prevSelectedRef.current = { id: selectedId, snapshot };
  }, [showDebugInfo, selectedId, document]);
}
