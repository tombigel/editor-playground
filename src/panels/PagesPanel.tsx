import { LayoutGrid } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DocumentModel } from '../model/types';
import type { DocumentPage, PageId, SiteSettings } from '../model/types/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverSurface } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EditorPanelHeader } from './EditorPanelHeader';
import { PageSettingsPopup } from './PageSettingsPopup';
import { PageTreeContent } from './PageTreeContent';

export type PagesPanelProps = {
  document: DocumentModel;
  activePageId: PageId | null;
  onClose: () => void;
  onSetSiteSettings: (patch: Partial<SiteSettings>) => void;
  onSetActivePage: (pageId: PageId) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: PageId) => void;
  onSetPageDisplayName: (pageId: PageId, name: string) => void;
  onSetPageSlug: (pageId: PageId, slug: string) => void;
  onAddPageAlias: (pageId: PageId, alias: string) => void;
  onRemovePageAlias: (pageId: PageId, alias: string) => void;
  onSetPageVisibility: (pageId: PageId, visible: boolean) => void;
  onSetPageParent: (pageId: PageId, parentPageId: PageId | null) => void;
  onReorderPage: (pageId: PageId, direction: 'back' | 'forward') => void;
  onExport: () => void;
};

export function PagesPanel({
  document,
  activePageId,
  onClose,
  onSetSiteSettings,
  onSetActivePage,
  onAddPage,
  onDeletePage,
  onSetPageDisplayName,
  onSetPageSlug,
  onAddPageAlias,
  onRemovePageAlias,
  onSetPageVisibility,
  onSetPageParent,
  onReorderPage,
  onExport,
}: PagesPanelProps) {
  const [settingsPageId, setSettingsPageId] = useState<PageId | null>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(null);
  const gearButtonRefs = useRef(new Map<PageId, HTMLElement>());

  const siteSettings = document.siteSettings;
  const pages = document.pages ?? [];

  function handleOpenSettings(pageId: PageId) {
    const el = gearButtonRefs.current.get(pageId) ?? null;
    setSettingsAnchorEl(el);
    setSettingsPageId(pageId);
  }

  function handleCloseSettings() {
    setSettingsPageId(null);
    setSettingsAnchorEl(null);
  }

  const settingsPage = settingsPageId != null ? pages.find((p) => p.id === settingsPageId) ?? null : null;

  function handleSetPageViewTransition(pageId: PageId, transition: DocumentPage['viewTransition']) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    // Store viewTransition on the page via setPageSlug-equivalent (use importDocument workaround via setSiteSettings is not right)
    // Since there's no setPageViewTransition action in the reducer yet, we call onSetSiteSettings as a no-op placeholder.
    // TODO: Wire a dedicated setPageViewTransition action when added to the reducer.
    // For now we silently ignore since it's not in the action types.
    void pageId;
    void transition;
  }

  return (
    <>
      <PopoverSurface
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        className="editor-floating-panel editor-bg-surface editor-border-subtle fixed z-[380] w-[480px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-[0_22px_64px_rgba(15,23,42,0.18)]"
        style={{ top: '50vh', left: '50vw', transform: 'translate(-50%, -50%)' }}
      >
        <EditorPanelHeader
          icon={LayoutGrid}
          title="Pages"
          description="Manage pages, site settings, and export."
          closeLabel="Close pages panel"
          onClose={onClose}
        />

        <div className="editor-scrollbar max-h-[calc(80vh-56px)] overflow-y-auto">
          {/* Section 1 — Site */}
          <section className="editor-border-subtle border-b px-4 py-4">
            <h3 className="editor-text-strong mb-3 text-xs font-semibold uppercase tracking-wider">
              Site
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="editor-text-muted text-xs">Title</Label>
                <Input
                  defaultValue={siteSettings?.title ?? ''}
                  key={siteSettings?.title}
                  className="editor-bg-surface editor-border-subtle editor-text-strong"
                  placeholder="My Site"
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim();
                    onSetSiteSettings({ title: val || undefined });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="editor-text-muted text-xs">Status</Label>
                <Select
                  value={siteSettings?.status ?? 'draft'}
                  onValueChange={(value) =>
                    onSetSiteSettings({ status: value as SiteSettings['status'] })
                  }
                >
                  <SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="editor-text-muted text-xs">Default Transition</Label>
                <Select
                  value={siteSettings?.viewTransition ?? 'none'}
                  onValueChange={(value) =>
                    onSetSiteSettings({ viewTransition: value as SiteSettings['viewTransition'] })
                  }
                >
                  <SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="crossfade">Cross-fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="editor-text-muted text-xs">Language</Label>
                <Input
                  defaultValue={siteSettings?.lang ?? 'en'}
                  key={siteSettings?.lang}
                  className="editor-bg-surface editor-border-subtle editor-text-strong"
                  placeholder="en"
                  maxLength={10}
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim() || 'en';
                    onSetSiteSettings({ lang: val });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label className="editor-text-strong text-sm">Auto-sync slugs with page names</Label>
                <Switch
                  checked={siteSettings?.autoSyncSlugs ?? true}
                  onCheckedChange={(checked) => onSetSiteSettings({ autoSyncSlugs: checked })}
                />
              </div>
            </div>
          </section>

          {/* Section 2 — Pages */}
          <section className="editor-border-subtle border-b">
            <div className="px-4 pt-4 pb-2">
              <h3 className="editor-text-strong text-xs font-semibold uppercase tracking-wider">
                Pages
              </h3>
            </div>
            <PageTreeContent
              document={document}
              activePageId={activePageId}
              onSetActivePage={onSetActivePage}
              onAddPage={onAddPage}
              onDeletePage={onDeletePage}
              onOpenSettings={handleOpenSettings}
              onSetPageParent={onSetPageParent}
              onReorderPage={onReorderPage}
              onSetPageVisibility={onSetPageVisibility}
            />
          </section>

          {/* Section 3 — Export */}
          <section className="px-4 py-4">
            <h3 className="editor-text-strong mb-3 text-xs font-semibold uppercase tracking-wider">
              Export
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="editor-text-muted text-xs">Output Structure</Label>
                <Select
                  value={siteSettings?.outputStructure ?? 'directory'}
                  onValueChange={(value) =>
                    onSetSiteSettings({ outputStructure: value as SiteSettings['outputStructure'] })
                  }
                >
                  <SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directory">Directory</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-sm"
                  disabled
                  aria-label="Validate links (coming soon)"
                >
                  Validate links
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 text-sm"
                  onClick={onExport}
                  aria-label="Export site"
                >
                  Export site
                </Button>
              </div>
            </div>
          </section>
        </div>
      </PopoverSurface>

      {settingsPage && (
        <PageSettingsPopup
          page={settingsPage}
          document={document}
          anchorEl={settingsAnchorEl}
          onClose={handleCloseSettings}
          onSetDisplayName={onSetPageDisplayName}
          onSetSlug={onSetPageSlug}
          onAddAlias={onAddPageAlias}
          onRemoveAlias={onRemovePageAlias}
          onSetVisibility={onSetPageVisibility}
          onSetViewTransition={handleSetPageViewTransition}
          onSetParent={onSetPageParent}
        />
      )}
    </>
  );
}
