import { createContext, useContext } from 'react';
import type { NodeId, TextDocumentContent } from '../model/types';

export type RichEditContextValue = {
  editingId: NodeId | null;
  activateEdit: (id: NodeId) => void;
  commitEdit: (id: NodeId, content: TextDocumentContent) => void;
  updateBlockGap: (id: NodeId, value: number) => void;
  discardEdit: () => void;
};

export const RichEditContext = createContext<RichEditContextValue>({
  editingId: null,
  activateEdit: () => {},
  commitEdit: () => {},
  updateBlockGap: () => {},
  discardEdit: () => {},
});

export function useRichEditContext() {
  return useContext(RichEditContext);
}
