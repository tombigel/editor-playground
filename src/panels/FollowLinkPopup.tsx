// A popup shown when a link node is selected on stage.
// Position: below the selected node's bounding box, or above if it would overflow.

import type { DocumentModel, LinkLeaf, NodeId } from '../model/types';

// PageId is a string alias defined in model/types/site.ts (Wave 2 addition).
// Re-declared locally for forward compatibility until site.ts is available in this module's scope.
type PageId = string;

type FollowLinkPopupProps = {
  node: LinkLeaf;
  document: DocumentModel;
  stageRect: DOMRect;
  onNavigateToPage: (pageId: PageId) => void;
  onScrollToAnchor: (nodeId: NodeId) => void;
};

const POPUP_HEIGHT = 40;

export function FollowLinkPopup({
  node,
  document,
  stageRect,
  onNavigateToPage,
  onScrollToAnchor,
}: FollowLinkPopupProps) {
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : Infinity;
  const flipped = stageRect.bottom + 8 + POPUP_HEIGHT > viewportHeight;
  const top = flipped ? stageRect.top - 8 - POPUP_HEIGHT : stageRect.bottom + 8;
  const left = stageRect.left;

  function buildLabel(): string {
    // 'page' is a LinkKind added in Wave 2; use loose comparison for forward compatibility.
    const linkType = (node.linkType as string | undefined);
    if (linkType === 'page') {
      const targetPageId = (node as LinkLeaf & { targetPageId?: string }).targetPageId;
      if (!targetPageId) return '→ Broken page link';
      const pages = (document as DocumentModel & { pages?: Array<{ id: string; displayName: string }> }).pages ?? [];
      const page = pages.find((p) => p.id === targetPageId);
      return page ? `→ Go to ${page.displayName}` : '→ Broken page link';
    }
    if (linkType === 'external') {
      const href = node.href ?? '';
      const truncated = href.length > 40 ? href.slice(0, 40) + '…' : href;
      return `↗ ${truncated}`;
    }
    // 'anchor' or undefined
    return '↓ Jump to section';
  }

  function handleClick() {
    const linkType = (node.linkType as string | undefined);
    if (linkType === 'page') {
      const targetPageId = (node as LinkLeaf & { targetPageId?: string }).targetPageId;
      if (targetPageId) {
        onNavigateToPage(targetPageId);
      }
      return;
    }
    if (linkType === 'external') {
      if (node.href) {
        window.open(node.href, '_blank');
      }
      return;
    }
    // 'anchor' or undefined
    if (node.anchorTargetId) {
      onScrollToAnchor(node.anchorTargetId);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9000,
      }}
    >
      <div
        className="editor-bg-surface editor-border-subtle flex items-center rounded-md border px-3 py-1 shadow-md"
        style={{ height: POPUP_HEIGHT }}
      >
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
