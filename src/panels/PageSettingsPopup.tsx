import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { validatePageSlug, resolvePageUrl } from '../api/pageApi';
import { normalizeSlug } from '../model/pageDefaults';
import type { DocumentModel } from '../model/types';
import type { DocumentPage, PageId } from '../model/types/site';
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

export type PageSettingsPopupProps = {
  page: DocumentPage;
  document: DocumentModel;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSetDisplayName: (pageId: PageId, name: string) => void;
  onSetSlug: (pageId: PageId, slug: string) => void;
  onAddAlias: (pageId: PageId, alias: string) => void;
  onRemoveAlias: (pageId: PageId, alias: string) => void;
  onSetVisibility: (pageId: PageId, visible: boolean) => void;
  onSetViewTransition: (pageId: PageId, transition: DocumentPage['viewTransition']) => void;
  onSetParent: (pageId: PageId, parentPageId: PageId | null) => void;
  onSyncPageLinks: (oldUrl: string, newUrl: string) => void;
};

type PendingSlugChange = {
  from: string;
  to: string;
};

export function PageSettingsPopup({
  page,
  document,
  anchorEl,
  onClose,
  onSetDisplayName,
  onSetSlug,
  onAddAlias,
  onRemoveAlias,
  onSetVisibility,
  onSetViewTransition,
  onSetParent,
  onSyncPageLinks,
}: PageSettingsPopupProps) {
  const [pendingSlugChange, setPendingSlugChange] = useState<PendingSlugChange | null>(null);
  const [pendingDisplayName, setPendingDisplayName] = useState<string | null>(null);
  const [slugDraft, setSlugDraft] = useState(page.slug);
  const [slugErrors, setSlugErrors] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const siteSettings = document.siteSettings;
  const autoSyncSlugs = siteSettings?.autoSyncSlugs ?? true;
  const isAutoSlug = page.slug === normalizeSlug(page.displayName);

  useEffect(() => {
    setSlugDraft(page.slug);
    setSlugErrors([]);
  }, [page.slug]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    if (!anchorEl) {
      popover.style.top = '50vh';
      popover.style.left = '50vw';
      popover.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const rect = anchorEl.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = Math.min(rect.left, window.innerWidth - 320 - 16);
    popover.style.top = `${Math.max(8, top)}px`;
    popover.style.left = `${Math.max(8, left)}px`;
    popover.style.transform = 'none';
  }, [anchorEl]);

  function handleDisplayNameCommit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === page.displayName) return;

    if (autoSyncSlugs) {
      const newSlug = normalizeSlug(trimmed);
      if (newSlug !== page.slug && newSlug !== '') {
        setPendingDisplayName(trimmed);
        setPendingSlugChange({ from: page.slug, to: newSlug });
        return;
      }
    }
    onSetDisplayName(page.id, trimmed);
  }

  function handleSlugCommit() {
    const errors = validatePageSlug(slugDraft);
    if (errors.length > 0) {
      setSlugErrors(errors);
      return;
    }
    setSlugErrors([]);
    if (slugDraft !== page.slug) {
      onSetSlug(page.id, slugDraft);
    }
  }

  function handleSlugReset() {
    const slug = normalizeSlug(page.displayName);
    setSlugDraft(slug);
    setSlugErrors([]);
    if (slug !== page.slug) {
      onSetSlug(page.id, slug);
    }
  }

  function handlePendingSlugYes() {
    if (!pendingSlugChange || !pendingDisplayName) return;
    const isPublished = siteSettings?.status === 'published';
    const oldUrl = resolvePageUrl(document, page.id);
    const parentUrl = page.parentPageId ? resolvePageUrl(document, page.parentPageId) : '/';
    const newUrl = parentUrl === '/'
      ? `/${pendingSlugChange.to}/`
      : `${parentUrl}${pendingSlugChange.to}/`;
    onSetDisplayName(page.id, pendingDisplayName);
    onSetSlug(page.id, pendingSlugChange.to);
    onSyncPageLinks(oldUrl, newUrl);
    if (isPublished) {
      onAddAlias(page.id, pendingSlugChange.from);
    }
    setPendingSlugChange(null);
    setPendingDisplayName(null);
  }

  function handlePendingSlugNo() {
    if (!pendingSlugChange || !pendingDisplayName) return;
    onSetDisplayName(page.id, pendingDisplayName);
    onSetSlug(page.id, pendingSlugChange.to);
    setPendingSlugChange(null);
    setPendingDisplayName(null);
  }

  function handlePendingSlugRevert() {
    setPendingSlugChange(null);
    setPendingDisplayName(null);
  }

  function handleAddAlias() {
    const trimmed = newAlias.trim();
    if (!trimmed) return;
    const errors = validatePageSlug(trimmed);
    if (errors.length > 0) return;
    onAddAlias(page.id, trimmed);
    setNewAlias('');
  }

  const pages = document.pages ?? [];

  function isDescendant(candidateId: PageId, ancestorId: PageId): boolean {
    if (candidateId === ancestorId) return true;
    const candidate = pages.find((p) => p.id === candidateId);
    if (!candidate || !candidate.parentPageId) return false;
    return isDescendant(candidate.parentPageId, ancestorId);
  }

  const parentOptions = pages.filter(
    (p) => p.id !== page.id && !isDescendant(p.id, page.id),
  );

  const currentParentId = page.parentPageId ?? null;

  return (
    <PopoverSurface
      ref={popoverRef}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="editor-floating-panel editor-bg-surface editor-border-subtle fixed z-[400] w-[300px] rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
      style={{ top: 0, left: 0 }}
    >
      <div className="editor-panel-header editor-border-subtle flex items-center justify-between border-b px-3 py-2.5">
        <span className="editor-text-strong text-sm font-medium">Page Settings</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="editor-icon-button-subtle h-7 w-7 rounded-lg border"
          aria-label="Close page settings"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="editor-scrollbar max-h-[70vh] overflow-y-auto">
        <div className="flex flex-col gap-4 px-3 py-3">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="editor-text-muted text-xs">Display Name</Label>
            <Input
              defaultValue={page.displayName}
              key={page.displayName}
              className="editor-bg-surface editor-border-subtle editor-text-strong"
              onBlur={(e) => handleDisplayNameCommit(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
            />
          </div>

          {/* Pending slug change banner */}
          {pendingSlugChange && (
            <div className="editor-bg-subtle editor-border-subtle rounded-lg border p-2.5">
              <p className="editor-text-strong mb-2 text-xs">
                Slug will change to <span className="font-medium">/{pendingSlugChange.to}</span>. Sync internal links?
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handlePendingSlugYes}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handlePendingSlugNo}
                >
                  No
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handlePendingSlugRevert}
                >
                  Revert
                </Button>
              </div>
            </div>
          )}

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="editor-text-muted text-xs">Slug</Label>
              <div className="flex items-center gap-1.5">
                <span className="editor-text-muted rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-current/20">
                  {isAutoSlug ? 'auto' : 'custom'}
                </span>
                {!isAutoSlug && (
                  <button
                    type="button"
                    className="editor-text-muted text-[10px] hover:underline"
                    onClick={handleSlugReset}
                  >
                    ↺ Reset
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="editor-text-muted text-sm">/</span>
              <Input
                value={slugDraft}
                className="editor-bg-surface editor-border-subtle editor-text-strong flex-1"
                onChange={(e) => {
                  setSlugDraft(e.currentTarget.value);
                  setSlugErrors(validatePageSlug(e.currentTarget.value));
                }}
                onBlur={handleSlugCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            {slugErrors.length > 0 && (
              <p className="text-[11px] text-red-500">{slugErrors[0]}</p>
            )}
          </div>

          {/* Slug Aliases */}
          <div className="flex flex-col gap-1.5">
            <Label className="editor-text-muted text-xs">Slug Aliases</Label>
            {(page.slugAliases ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {(page.slugAliases ?? []).map((alias) => (
                  <span
                    key={alias}
                    className="editor-bg-subtle editor-border-subtle editor-text-strong flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                  >
                    /{alias}
                    <button
                      type="button"
                      className="editor-text-muted hover:text-red-500"
                      aria-label={`Remove alias /${alias}`}
                      onClick={() => onRemoveAlias(page.id, alias)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="editor-text-muted text-xs">No aliases yet.</p>
            )}
            <div className="flex items-center gap-1.5">
              <span className="editor-text-muted text-sm">/</span>
              <Input
                value={newAlias}
                placeholder="add-alias"
                className="editor-bg-surface editor-border-subtle editor-text-strong flex-1 text-xs"
                onChange={(e) => setNewAlias(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAlias();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddAlias}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between gap-3">
            <Label className="editor-text-strong text-sm">Visible</Label>
            <Switch
              checked={page.visible}
              onCheckedChange={(checked) => onSetVisibility(page.id, checked)}
            />
          </div>

          {/* View Transition */}
          <div className="flex flex-col gap-1.5">
            <Label className="editor-text-muted text-xs">View Transition</Label>
            <Select
              value={page.viewTransition ?? '__inherit__'}
              onValueChange={(value) => {
                const transition =
                  value === '__inherit__'
                    ? undefined
                    : (value as DocumentPage['viewTransition']);
                onSetViewTransition(page.id, transition);
              }}
            >
              <SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inherit__">Inherit from site</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="crossfade">Cross-fade</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parent Page */}
          <div className="flex flex-col gap-1.5">
            <Label className="editor-text-muted text-xs">Parent Page</Label>
            <Select
              value={currentParentId ?? '__top__'}
              onValueChange={(value) => {
                onSetParent(page.id, value === '__top__' ? null : value);
              }}
            >
              <SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__top__">Top level</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.displayName} — {resolvePageUrl(document, p.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </PopoverSurface>
  );
}
