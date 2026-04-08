import { createContext, useContext } from 'react';
import type { EditorTextField, NodeId, RichContent } from '../model/types';

export type RichEditContextValue = {
  editingId: NodeId | null;
  activateEdit: (id: NodeId) => void;
  commitEdit: (id: NodeId, content: RichContent) => void;
  updateTextField: (id: NodeId, field: EditorTextField, value: string) => void;
  discardEdit: () => void;
};

export const RichEditContext = createContext<RichEditContextValue>({
  editingId: null,
  activateEdit: () => {},
  commitEdit: () => {},
  updateTextField: () => {},
  discardEdit: () => {},
});

export function useRichEditContext() {
  return useContext(RichEditContext);
}
