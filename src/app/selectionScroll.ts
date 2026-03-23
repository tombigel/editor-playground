import type { NodeId } from '../api/editorApi';

type ScrollableElement = {
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
};

type SelectionScrollDocument = {
  getElementById: (id: string) => ScrollableElement | null;
};

export function scrollSelectedStageNodeIntoView(
  selectedId: NodeId | null,
  ownerDocument: SelectionScrollDocument = document,
) {
  if (!selectedId) {
    return false;
  }

  const target = ownerDocument.getElementById(`stage-node-${selectedId}`);
  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: "smooth", block: 'nearest', inline: 'nearest' });
  return true;
}
