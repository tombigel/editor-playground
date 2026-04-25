import { BookOpenText } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import type { DocumentModel, DocumentPage, PageId, SiteSettings } from '@/api/editorApi';
import { PopoverSurface } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorPanelHeader } from './EditorPanelHeader';
import { PageEditorContent } from './PageEditorContent';
import { PageTreeContent } from './PageTreeContent';
import { PagesSiteSettingsContent } from './PagesSiteSettingsContent';

export type PagesPanelProps = {
  position: { top: number; left: number };
  onPositionChange: (position: { top: number; left: number }) => void;
  panelRef?: Ref<HTMLDivElement>;
  document: DocumentModel;
  activePageId: PageId | null;
  selectedPageId?: PageId | null;
  initialTab?: 'page' | 'settings';
  onClose: () => void;
  onSetSiteSettings: (patch: Partial<SiteSettings>) => void;
  onSetActivePage: (pageId: PageId) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: PageId) => void;
  onSetPageDisplayName: (pageId: PageId, name: string) => void;
  onSetPageAsHome: (pageId: PageId) => void;
  onSetPageLang: (pageId: PageId, lang?: string) => void;
  onSetPageSlug: (pageId: PageId, slug: string) => void;
  onAddPageAlias: (pageId: PageId, alias: string) => void;
  onRemovePageAlias: (pageId: PageId, alias: string) => void;
  onSetPageVisibility: (pageId: PageId, visible: boolean) => void;
  onSetPageViewTransition: (pageId: PageId, transition: DocumentPage['viewTransition']) => void;
  onSetPageParent: (pageId: PageId, parentPageId: PageId | null) => void;
  onReorderPage: (pageId: PageId, direction: 'back' | 'forward') => void;
  onSyncPageLinks: (oldUrl: string, newUrl: string) => void;
  onValidateLinks: () => void;
};

type PanelDragState = {
  pointerId: number;
  originX: number;
  originY: number;
  originTop: number;
  originLeft: number;
};

const PANEL_VIEWPORT_MARGIN_PX = 16;

export function PagesPanel({
  position,
  onPositionChange,
  panelRef,
  document,
  activePageId,
  selectedPageId = null,
  initialTab = 'page',
  onClose,
  onSetSiteSettings,
  onSetActivePage,
  onAddPage,
  onDeletePage,
  onSetPageDisplayName,
  onSetPageAsHome,
  onSetPageLang,
  onSetPageSlug,
  onAddPageAlias,
  onRemovePageAlias,
  onSetPageVisibility,
  onSetPageViewTransition,
  onSetPageParent,
  onReorderPage,
  onSyncPageLinks,
  onValidateLinks,
}: PagesPanelProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [panelDragState, setPanelDragState] = useState<PanelDragState | null>(null);
  const [activeTab, setActiveTab] = useState<'page' | 'settings'>(initialTab);
  const [focusedPageId, setFocusedPageId] = useState<PageId | null>(selectedPageId);
  const pages = document.pages ?? [];

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setFocusedPageId(selectedPageId ?? activePageId ?? pages[0]?.id ?? null);
  }, [activePageId, pages, selectedPageId]);

  useEffect(() => {
    if (!panelDragState) {
      return;
    }

    const { cursor, userSelect } = window.document.body.style;
    window.document.body.style.cursor = 'grabbing';
    window.document.body.style.userSelect = 'none';
    return () => {
      window.document.body.style.cursor = cursor;
      window.document.body.style.userSelect = userSelect;
    };
  }, [panelDragState]);

  useEffect(() => {
    if (!panelDragState) {
      return;
    }

    const currentDrag = panelDragState;

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== currentDrag.pointerId) {
        return;
      }
      event.preventDefault();
      const rect = surfaceRef.current?.getBoundingClientRect();
      const panelWidth = rect?.width ?? 860;
      const panelHeight = rect?.height ?? 620;
      onPositionChange({
        top: clampToViewport(currentDrag.originTop + (event.clientY - currentDrag.originY), panelHeight, window.innerHeight),
        left: clampToViewport(currentDrag.originLeft + (event.clientX - currentDrag.originX), panelWidth, window.innerWidth),
      });
    }

    function handlePointerEnd(event: PointerEvent) {
      if (event.pointerId !== currentDrag.pointerId) {
        return;
      }
      setPanelDragState(null);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [onPositionChange, panelDragState]);

  function setCombinedRef(node: HTMLDivElement | null) {
    surfaceRef.current = node;
    if (typeof panelRef === 'function') {
      panelRef(node);
    } else if (panelRef) {
      panelRef.current = node;
    }
  }

  function handleHeaderPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (
      event.button !== 0 ||
      !target ||
      target.closest('button, input, textarea, select, [data-prevent-panel-drag="true"]')
    ) {
      return;
    }
    event.preventDefault();
    setPanelDragState({
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      originTop: position.top,
      originLeft: position.left,
    });
  }

  const selectedPage = pages.find((page) => page.id === focusedPageId) ?? null;

  function handlePageSelect(pageId: PageId) {
    setActiveTab('page');
    setFocusedPageId(pageId);
    onSetActivePage(pageId);
  }

  function handleAddPage() {
    setActiveTab('page');
    onAddPage();
  }

  return (
    <PopoverSurface
      ref={setCombinedRef}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="editor-floating-panel editor-pages-panel editor-settings-panel editor-bg-surface editor-border-subtle fixed z-[380] w-[760px] max-w-[calc(100vw-32px)] rounded-xl border shadow-[0_22px_64px_rgba(15,23,42,0.18)]"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="editor-panel-drag-zone" onPointerDown={handleHeaderPointerDown}>
        <EditorPanelHeader
          icon={BookOpenText}
          title="Pages"
          description="Manage pages and site page settings."
          closeLabel="Close pages panel"
          onClose={onClose}
          className="cursor-grab px-3 py-2.5 active:cursor-grabbing"
          actions={(
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'page' | 'settings')}>
              <TabsList variant="segmented">
                <TabsTrigger value="page" variant="segmented" size="compact">
                  Page
                </TabsTrigger>
                <TabsTrigger value="settings" variant="segmented" size="compact">
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
      </div>

      <div className="min-h-0">
        <div className="grid min-h-[560px] grid-cols-[280px_minmax(0,1fr)]">
          <aside className="editor-bg-subtle editor-border-subtle min-h-0 border-r">
            <PageTreeContent
              document={document}
              activePageId={activePageId}
              onSetActivePage={handlePageSelect}
              onAddPage={handleAddPage}
              onDeletePage={onDeletePage}
              onSetPageParent={onSetPageParent}
              onReorderPage={onReorderPage}
              onSetPageVisibility={onSetPageVisibility}
            />
          </aside>

          <div className="editor-scrollbar editor-scrollbar-gutter min-h-0 overflow-y-auto px-5 py-4">
            <div className="max-w-[420px]">
              {activeTab === 'settings' ? (
                <PagesSiteSettingsContent
                  siteSettings={document.siteSettings}
                  onSetSiteSettings={onSetSiteSettings}
                />
              ) : selectedPage ? (
                <PageEditorContent
                  page={selectedPage}
                  document={document}
                  onSetDisplayName={onSetPageDisplayName}
                  onSetHomePage={onSetPageAsHome}
                  onSetLang={onSetPageLang}
                  onSetSlug={onSetPageSlug}
                  onAddAlias={onAddPageAlias}
                  onRemoveAlias={onRemovePageAlias}
                  onSetVisibility={onSetPageVisibility}
                  onSetViewTransition={onSetPageViewTransition}
                  onSetParent={onSetPageParent}
                  onSyncPageLinks={onSyncPageLinks}
                  onValidateLinks={onValidateLinks}
                />
              ) : (
                <div className="editor-text-muted text-sm">No page selected.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PopoverSurface>
  );
}

function clampToViewport(position: number, panelSize: number, viewportSize: number) {
  const maxPosition = Math.max(
    PANEL_VIEWPORT_MARGIN_PX,
    viewportSize - panelSize - PANEL_VIEWPORT_MARGIN_PX,
  );
  return Math.min(Math.max(PANEL_VIEWPORT_MARGIN_PX, position), maxPosition);
}
