import { useCallback, useState } from 'react';
import type { NodeId, TextDocumentContent } from '../model/types';

export type RichEditCommitOptions = {
  clearBlockNodeLink?: boolean;
};

export type RichEditCallbacks = {
  onCommit: (
    id: NodeId,
    content: TextDocumentContent,
    options?: RichEditCommitOptions,
  ) => void;
};

export function useRichTextEditMode({ onCommit }: RichEditCallbacks) {
  const [editingId, setEditingId] = useState<NodeId | null>(null);

  const activateEdit = useCallback((id: NodeId) => {
    setEditingId(id);
  }, []);

  const commitEdit = useCallback(
    (id: NodeId, content: TextDocumentContent, options?: RichEditCommitOptions) => {
      setEditingId(null);
      onCommit(id, content, options);
    },
    [onCommit],
  );

  const discardEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return { editingId, activateEdit, commitEdit, discardEdit };
}
