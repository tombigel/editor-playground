import { File, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TreeRowItem, VisibilityToggle } from '@/components/ui/tree-row';
import type { DocumentModel } from '../model/types';
import type { PageId, DocumentPage } from '../model/types/site';

export type PageTreeContentProps = {
  document: DocumentModel;
  activePageId: PageId | null;
  onSetActivePage: (pageId: PageId) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: PageId) => void;
  onOpenSettings: (pageId: PageId) => void;
  onSetPageParent: (pageId: PageId, parentPageId: PageId | null) => void;
  onReorderPage: (pageId: PageId, direction: 'back' | 'forward') => void;
  onSetPageVisibility: (pageId: PageId, visible: boolean) => void;
};

function computePageDepth(page: DocumentPage, pages: DocumentPage[]): number {
  let depth = 0;
  let current = page;
  const visited = new Set<PageId>();
  while (current.parentPageId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    const parent = pages.find((p) => p.id === current.parentPageId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

export function PageTreeContent({
  document,
  activePageId,
  onSetActivePage,
  onAddPage,
  onDeletePage,
  onOpenSettings,
  onSetPageVisibility,
}: PageTreeContentProps) {
  const pages = document.pages ?? [];

  return (
    <div className="flex flex-col">
      <div className="editor-scrollbar max-h-[64vh] overflow-y-auto p-1.5">
        {pages.length === 0 ? (
          <div className="editor-layers-empty editor-text-muted rounded-lg border border-dashed px-3 py-8 text-center text-sm">
            No pages yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {pages.map((page) => {
              const depth = computePageDepth(page, pages);
              const hasChildren = pages.some((p) => p.parentPageId === page.id);
              const isSelected = page.id === activePageId;

              const label = (
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="editor-layers-row-title truncate text-sm font-medium">
                      {page.displayName}
                    </span>
                  </span>
                  <span className="editor-layers-row-type mt-0.5 block truncate text-[11px] leading-4">
                    /{page.slug}
                  </span>
                </span>
              );

              const actions = (
                <>
                  <VisibilityToggle
                    isHidden={!page.visible}
                    onToggle={() => onSetPageVisibility(page.id, !page.visible)}
                    nodeId={page.id}
                    label={page.visible ? 'Hide' : 'Show'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="editor-layers-action h-7 w-7 rounded-md border"
                    data-layers-control="true"
                    aria-label={`Page settings for ${page.displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenSettings(page.id);
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="editor-layers-action h-7 w-7 rounded-md border"
                    data-layers-control="true"
                    aria-label={`Delete ${page.displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeletePage(page.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              );

              return (
                <TreeRowItem
                  key={page.id}
                  depth={depth}
                  hasChildren={hasChildren}
                  isExpanded={false}
                  isSelected={isSelected}
                  isHidden={!page.visible}
                  icon={<File className="h-3.5 w-3.5" />}
                  label={label}
                  actions={actions}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={(event) => {
                    const target = event.target as HTMLElement | null;
                    if (target?.closest('[data-layers-control="true"]')) {
                      return;
                    }
                    onSetActivePage(page.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      onSetActivePage(page.id);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      <div className="border-t px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          onClick={onAddPage}
        >
          + Add page
        </Button>
      </div>
    </div>
  );
}
