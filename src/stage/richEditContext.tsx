import { createContext, useContext } from 'react';
import type { NodeId, RichContent } from '../model/types';

export type RichEditContextValue = {
  editingId: NodeId | null;
  activateEdit: (id: NodeId) => void;
  commitEdit: (id: NodeId, content: RichContent) => void;
  discardEdit: () => void;
};

export const RichEditContext = createContext<RichEditContextValue>({
  editingId: null,
  activateEdit: () => {},
  commitEdit: () => {},
  discardEdit: () => {},
});

export function useRichEditContext() {
  return useContext(RichEditContext);
}
