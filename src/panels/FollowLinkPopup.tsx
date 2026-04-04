// Rendered inside the stage frame, positioned below the selected node's edit box.
// Uses the same frame-relative coordinate system as SingleSelectionOverlay.

import type { DocumentModel, LinkLeaf, NodeId } from '../model/types';
import type { PageId } from '../model/types/site';

const POPUP_HEIGHT = 40;
const POPUP_OFFSET = 8;

export type FollowLinkPopupProps = {
  node: LinkLeaf;
  document: DocumentModel;
  bounds: { left: number; top: number; width: number; height: number };
  onNavigateToPage: (pageId: PageId) => void;
  onScrollToAnchor: (nodeId: NodeId) => void;
};

export function FollowLinkPopup({
  node,
  document,
  bounds,
  onNavigateToPage,
  onScrollToAnchor,
}: FollowLinkPopupProps) {
  function buildLabel(): string {
    const { linkType } = node;
    if (linkType === 'page') {
      const { targetPageId } = node;
      if (!targetPageId) return '→ Broken page link';
      const pages = document.pages ?? [];
      const page = pages.find((p) => p.id === targetPageId);
      return page ? `→ Go to ${page.displayName}` : '→ Broken page link';
    }
    if (linkType === 'external') {
      const href = node.href ?? '';
      const truncated = href.length > 40 ? href.slice(0, 40) + '…' : href;
      return `↗ ${truncated}`;
    }
    return '↓ Jump to section';
  }

  function handleClick() {
    const { linkType } = node;
    if (linkType === 'page') {
      if (node.targetPageId) onNavigateToPage(node.targetPageId);
      return;
    }
    if (linkType === 'external') {
      if (node.href) window.open(node.href, '_blank');
      return;
    }
    if (node.anchorTargetId) onScrollToAnchor(node.anchorTargetId);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: bounds.top + bounds.height + POPUP_OFFSET,
        left: bounds.left,
        height: POPUP_HEIGHT,
        zIndex: 200,
        pointerEvents: 'auto',
      }}
    >
      <div className="editor-bg-surface editor-border-subtle flex h-full items-center rounded-md border px-3 py-1 shadow-md">
        <button
          type="button"
          className="editor-text-strong text-xs font-medium hover:underline"
          onClick={handleClick}
        >
          {buildLabel()}
        </button>
      </div>
    </div>
  );
}
