import { TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  getPageRole,
  normalizeSlug,
  resolvePageSystemAliasUrl,
  resolvePageUrl,
  validatePageSlug,
} from '@/api/pageApi';
import type { DocumentModel, DocumentPage, PageId } from '@/api/editorApi';
import { createLanguageSelectOptions } from '@/i18n/languages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { InspectorInlineRow } from './controls/FormLayout';
import { isDescendant } from './pageTree';
import { PlainGroup } from '@/components/ui/settings-panel';

type PendingSlugChange = {
  from: string;
  to: string;
};

const VIEW_TRANSITION_LABELS: Record<NonNullable<DocumentPage['viewTransition']>, string> = {
  none: 'None',
  crossfade: 'Cross-fade',
  slide: 'Slide',
};

export function PageEditorContent({
  page,
  document,
  onSetDisplayName,
  onSetHomePage,
  onSetSlug,
  onSetLang,
  onAddAlias,
  onRemoveAlias,
  onSetVisibility,
  onSetViewTransition,
  onSetParent,
  onSyncPageLinks,
  onValidateLinks,
  className = '',
}: {
  page: DocumentPage;
  document: DocumentModel;
  onSetDisplayName: (pageId: PageId, name: string) => void;
  onSetHomePage: (pageId: PageId) => void;
  onSetSlug: (pageId: PageId, slug: string) => void;
  onSetLang: (pageId: PageId, lang?: string) => void;
  onAddAlias: (pageId: PageId, alias: string) => void;
  onRemoveAlias: (pageId: PageId, alias: string) => void;
  onSetVisibility: (pageId: PageId, visible: boolean) => void;
  onSetViewTransition: (pageId: PageId, transition: DocumentPage['viewTransition']) => void;
  onSetParent: (pageId: PageId, parentPageId: PageId | null) => void;
  onSyncPageLinks: (oldUrl: string, newUrl: string) => void;
  onValidateLinks: () => void;
  className?: string;
}) {
  const [slugDraft, setSlugDraft] = useState(page.slug);
  const [slugErrors, setSlugErrors] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [pendingSlugChange, setPendingSlugChange] = useState<PendingSlugChange | null>(null);
  const [pendingDisplayName, setPendingDisplayName] = useState<string | null>(null);

  useEffect(() => {
    setSlugDraft(page.slug);
    setSlugErrors([]);
  }, [page.slug]);

  const siteSettings = document.siteSettings;
  const autoSyncSlugs = siteSettings?.autoSyncSlugs ?? true;
  const isAutoSlug = page.slug === normalizeSlug(page.displayName);
  const isHomePage = getPageRole(page) === 'home';
  const systemAliasUrl = resolvePageSystemAliasUrl(document, page.id);
  const parentOptions = useMemo(() => {
    const pages = document.pages ?? [];
    return pages.filter(
      (candidate) => candidate.id !== page.id && !isDescendant(candidate.id, page.id, pages),
    );
  }, [document.pages, page.id]);

  function handleDisplayNameCommit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === page.displayName) {
      return;
    }

    if (autoSyncSlugs) {
      const nextSlug = normalizeSlug(trimmed);
      if (nextSlug && nextSlug !== page.slug) {
        setPendingDisplayName(trimmed);
        setPendingSlugChange({ from: page.slug, to: nextSlug });
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
    const nextSlug = normalizeSlug(page.displayName);
    setSlugDraft(nextSlug);
    setSlugErrors([]);
    if (nextSlug !== page.slug) {
      onSetSlug(page.id, nextSlug);
    }
  }

  function handleAddAlias() {
    const trimmed = newAlias.trim();
    if (!trimmed) {
      return;
    }
    const errors = validatePageSlug(trimmed);
    if (errors.length > 0) {
      return;
    }
    onAddAlias(page.id, trimmed);
    setNewAlias('');
  }

  function commitPendingSlug(syncLinks: boolean) {
    if (!pendingSlugChange || !pendingDisplayName) {
      return;
    }
    const oldUrl = resolvePageUrl(document, page.id);
    const parentUrl = page.parentPageId ? resolvePageUrl(document, page.parentPageId) : '/';
    const nextUrl =
      parentUrl === '/' ? `/${pendingSlugChange.to}/` : `${parentUrl}${pendingSlugChange.to}/`;
    onSetDisplayName(page.id, pendingDisplayName);
    onSetSlug(page.id, pendingSlugChange.to);
    if (syncLinks) {
      onSyncPageLinks(oldUrl, nextUrl);
    }
    setPendingDisplayName(null);
    setPendingSlugChange(null);
  }

  const inheritedTransition = document.siteSettings?.viewTransition ?? 'none';
  const languageOptions = createLanguageSelectOptions({
    includeSiteLanguage: true,
    siteLanguageTag: document.siteSettings?.lang,
  });

  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()}>
      <PlainGroup title="Page details">
        <div className="editor-bg-subtle editor-border-subtle flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div className="min-w-0">
            <p className="editor-text-strong text-xs font-medium">Home page</p>
            <p className="editor-text-muted text-xs">
              {isHomePage ? 'Canonical URL is / for this page.' : 'Promote this page to canonical /.'}
            </p>
          </div>
          <Button
            type="button"
            variant={isHomePage ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={isHomePage}
            onClick={() => onSetHomePage(page.id)}
          >
            {isHomePage ? 'Home page' : 'Set as home'}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="editor-text-muted text-xs">Display name</Label>
          <Input
            defaultValue={page.displayName}
            key={`${page.id}:${page.displayName}`}
            onBlur={(event) => handleDisplayNameCommit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </div>

        {pendingSlugChange ? (
          <div className="editor-warning-surface editor-border-subtle rounded-lg border px-3 py-2.5">
            <div className="editor-warning-text flex items-start gap-2 text-xs">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">
                  Slug will change to <span>/{pendingSlugChange.to}</span>. Sync internal links?
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => commitPendingSlug(true)}>
                    Yes
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => commitPendingSlug(false)}>
                    No
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setPendingDisplayName(null);
                      setPendingSlugChange(null);
                    }}
                  >
                    Revert
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label className="editor-text-muted text-xs">Slug</Label>
          <div className="flex items-center gap-2">
            <span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">
              {isAutoSlug ? 'auto' : 'custom'}
            </span>
            {!isAutoSlug ? (
              <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={handleSlugReset}>
                Reset
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="editor-text-muted text-sm">/</span>
          <Input
            value={slugDraft}
            className="flex-1 font-mono"
            onChange={(event) => {
              setSlugDraft(event.currentTarget.value);
              setSlugErrors(validatePageSlug(event.currentTarget.value));
            }}
            onBlur={handleSlugCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={onValidateLinks}>
            Validate links
          </Button>
        </div>
        {slugErrors[0] ? (
          <div className="editor-warning-text flex items-center gap-1 text-[11px]">
            <TriangleAlert className="h-3 w-3 shrink-0" />
            <span>{slugErrors[0]}</span>
          </div>
        ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="editor-text-muted text-xs">Slug aliases</Label>
          {isHomePage || (page.slugAliases ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {isHomePage ? (
                <span className="editor-pill-subtle editor-text-strong inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs">
                  / <span className="editor-text-muted">system canonical</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-sm border-0 p-0 shadow-none"
                    aria-label="System canonical alias cannot be removed"
                    disabled
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              ) : null}
              {isHomePage && systemAliasUrl ? (
                <span className="editor-pill-subtle editor-text-strong inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs">
                  {systemAliasUrl} <span className="editor-text-muted">system alias</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-sm border-0 p-0 shadow-none"
                    aria-label={`${systemAliasUrl} alias cannot be removed`}
                    disabled
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              ) : null}
              {(page.slugAliases ?? []).map((alias) => (
                <span
                  key={alias}
                  className="editor-pill-subtle editor-text-strong inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
                >
                  /{alias}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-sm border-0 p-0 shadow-none"
                    aria-label={`Remove alias /${alias}`}
                    onClick={() => onRemoveAlias(page.id, alias)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
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
              className="flex-1 text-xs"
              onChange={(event) => setNewAlias(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAddAlias();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={handleAddAlias}>
              Add
            </Button>
          </div>
        </div>
      </PlainGroup>

      <PlainGroup title="Page behavior">
        <div className="flex flex-col gap-1.5">
          <Label className="editor-text-muted text-xs">Language</Label>
          <SearchableSelect
            value={page.lang ?? '__site__'}
            options={languageOptions}
            placeholder="Site language"
            searchPlaceholder="Search languages"
            triggerClassName="h-8 text-xs"
            onValueChange={(value) => onSetLang(page.id, value === '__site__' ? undefined : value)}
          />
        </div>

        <InspectorInlineRow label="Visible">
          <Switch
            checked={page.visible}
            disabled={isHomePage}
            onCheckedChange={(checked) => onSetVisibility(page.id, checked)}
          />
        </InspectorInlineRow>

        <InspectorInlineRow label="Transition">
          <Select
            value={page.viewTransition ?? '__inherit__'}
            onValueChange={(value) =>
              onSetViewTransition(page.id, value === '__inherit__' ? undefined : (value as DocumentPage['viewTransition']))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__inherit__">{`Site transition (${VIEW_TRANSITION_LABELS[inheritedTransition]})`}</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="crossfade">Cross-fade</SelectItem>
              <SelectItem value="slide">Slide</SelectItem>
            </SelectContent>
          </Select>
        </InspectorInlineRow>

        <InspectorInlineRow label="Parent">
          <Select
            value={page.parentPageId ?? '__top__'}
            onValueChange={(value) => onSetParent(page.id, value === '__top__' ? null : value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__top__">Top level</SelectItem>
              {parentOptions.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.displayName} — {resolvePageUrl(document, candidate.id)}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>
          </InspectorInlineRow>
      </PlainGroup>
    </div>
  );
}
