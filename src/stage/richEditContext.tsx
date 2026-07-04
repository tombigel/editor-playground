import { createContext, useContext } from 'react';
import type { NodeId, TextDocumentContent } from '../model/types';
import type { RichEditCommitOptions } from './useRichTextEditMode';

export type RichEditContextValue = {
  editingId: NodeId | null;
  activateEdit: (id: NodeId) => void;
  commitEdit: (
    id: NodeId,
    content: TextDocumentContent,
    options?: RichEditCommitOptions,
  ) => void;
  updateBlockGap: (id: NodeId, value: number) => void;
  discardEdit: () => void;
  onOpenManageFonts: (options?: { category?: string }) => void;
  adoptVideoIntrinsicRatio: (id: NodeId, ratio: number) => void;
};

export const RichEditContext = createContext<RichEditContextValue>({
  editingId: null,
  activateEdit: () => {},
  commitEdit: () => {},
  updateBlockGap: () => {},
  discardEdit: () => {},
  onOpenManageFonts: () => {},
  adoptVideoIntrinsicRatio: () => {},
});

export function useRichEditContext() {
  return useContext(RichEditContext);
}
