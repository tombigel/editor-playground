import { useCallback, useState } from 'react';
import type { RichContent, NodeId } from '../model/types';

export type RichEditCallbacks = {
  onCommit: (id: NodeId, content: RichContent) => void;
};

export function useRichTextEditMode({ onCommit }: RichEditCallbacks) {
  const [editingId, setEditingId] = useState<NodeId | null>(null);

  const activateEdit = useCallback((id: NodeId) => {
    setEditingId(id);
  }, []);

  const commitEdit = useCallback(
    (id: NodeId, content: RichContent) => {
      setEditingId(null);
      onCommit(id, content);
    },
    [onCommit],
  );

  const discardEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return { editingId, activateEdit, commitEdit, discardEdit };
}
