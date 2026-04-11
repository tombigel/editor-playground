import {
  ChevronDown,
  ChevronRight,
  CircleQuestionMark,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { lazy, Suspense, type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ListCard } from '@/components/ui/list-card';
import { NoticeSurface, SettingsNavItem } from '@/components/ui/settings-panel';
import { AboutContent } from './AboutContent';
import { EditorPanelHeader } from './EditorPanelHeader';
import {
  buildHelpTreeRows,
  getHelpBreadcrumbs,
  getHelpChildEntries,
  getHelpEntryById,
  getHelpEntryByPath,
  getHelpInitialExpandedIds,
  getHelpRootEntries,
  type HelpEntry,
  type HelpHeading,
  type HelpLinkTarget,
  type MarkdownHelpEntry,
} from './helpDocs';
import { ShortcutHelpContent } from './ShortcutHelpContent';

export const HELP_NAV_EXPANDED_WIDTH_PX = 260;
export const HELP_NAV_COLLAPSED_WIDTH_PX = 56;

const LazyHelpMarkdownDocument = lazy(async () => {
  const module = await import('./HelpMarkdownDocument');
  return { default: module.HelpMarkdownDocument };
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEntryId?: HelpEntry['id'];
};

type HelpDialogState = {
  activeEntryId: HelpEntry['id'];
  pendingAnchor: string | null;
  navCollapsed: boolean;
  expandedIds: string[];
};

export function getHelpDialogGridTemplateColumns(navCollapsed: boolean) {
  const navWidth = navCollapsed ? HELP_NAV_COLLAPSED_WIDTH_PX : HELP_NAV_EXPANDED_WIDTH_PX;
  return `${navWidth}px minmax(0,1fr)`;
}

export function getHelpNavToggleLabel(navCollapsed: boolean) {
  return navCollapsed ? 'Expand help navigation' : 'Collapse help navigation';
}

export function closeHelpDialogState(state: HelpDialogState): HelpDialogState {
  return {
    ...state,
    pendingAnchor: null,
    navCollapsed: false,
    expandedIds: [...getHelpInitialExpandedIds(state.activeEntryId)],
  };
}

export function HelpDialog({ open, onOpenChange, initialEntryId }: Props) {
  const rootEntries = useMemo(() => getHelpRootEntries(), []);
  const markdownEntries = rootEntries
    .flatMap((entry) => collectMarkdownEntries(entry.id))
    .filter((entry, index, source) => source.findIndex((candidate) => candidate.id === entry.id) === index);
  const availableDocPaths = useMemo(() => new Set(markdownEntries.map((entry) => entry.path)), [markdownEntries]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastScrollContextKeyRef = useRef<string | null>(null);
  const [contentReadyVersion, setContentReadyVersion] = useState(0);
  const [tableOfContents, setTableOfContents] = useState<HelpHeading[]>([]);
  const [state, setState] = useState<HelpDialogState>(() => createHelpDialogState(initialEntryId ?? 'about'));
  const activeEntry = getHelpEntryById(state.activeEntryId) ?? rootEntries[0];
  const activeEntryKind = activeEntry.kind;
  const NavToggleIcon = state.navCollapsed ? PanelLeftOpen : PanelLeftClose;
  const breadcrumbs = activeEntry ? getHelpBreadcrumbs(activeEntry.id) : [];
  const expandedIdSet = useMemo(() => new Set(state.expandedIds), [state.expandedIds]);

  useEffect(() => {
    if (open) {
      return;
    }
    setTableOfContents([]);
    setContentReadyVersion(0);
    setState((current) => closeHelpDialogState(current));
  }, [open]);

  useEffect(() => {
    if (!open || !initialEntryId) {
      return;
    }
    setTableOfContents([]);
    setContentReadyVersion(0);
    setState(createHelpDialogState(initialEntryId));
  }, [initialEntryId, open]);

  useEffect(() => {
    if (!open || !contentRef.current || !activeEntry) {
      return;
    }

    const container = contentRef.current;
    const scrollContextKey = `${activeEntry.id}:${activeEntryKind === 'markdown' ? contentReadyVersion : 0}`;
    const entryChanged = lastScrollContextKeyRef.current !== scrollContextKey;
    lastScrollContextKeyRef.current = scrollContextKey;

    if (entryChanged) {
      container.scrollTop = 0;
    }

    if (!state.pendingAnchor) {
      container.scrollTop = 0;
      return;
    }

    const anchorTarget = Array.from(container.querySelectorAll<HTMLElement>('[data-help-anchor]')).find(
      (element) => element.dataset.helpAnchor === state.pendingAnchor,
    );

    if (anchorTarget) {
      anchorTarget.scrollIntoView({ block: 'start' });
      return;
    }

    container.scrollTop = 0;
  }, [activeEntry, activeEntryKind, contentReadyVersion, open, state.pendingAnchor]);

  if (!activeEntry) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        backdropVariant="transparent"
        surfaceClassName="bg-transparent p-5 backdrop-blur-none"
        className="editor-help-dialog max-h-[calc(100vh-1.5rem)] max-w-[min(1320px,calc(100vw-32px))] gap-0 overflow-hidden p-0"
      >
        <EditorPanelHeader
          icon={CircleQuestionMark}
          title="Help"
          description="Product guidance, reference docs, and development documentation."
          closeLabel="Close help"
          onClose={() => onOpenChange(false)}
        />
        <div
          data-help-nav-collapsed={state.navCollapsed ? 'true' : 'false'}
          className="grid h-[min(78vh,760px)] min-h-0 transition-[grid-template-columns] duration-200 ease-out"
          style={{ gridTemplateColumns: getHelpDialogGridTemplateColumns(state.navCollapsed) }}
        >
          <aside
            id="help-dialog-nav"
            className={`editor-bg-subtle editor-border-subtle min-h-0 border-r ${
              state.navCollapsed ? 'flex items-start justify-center' : 'editor-scrollbar help-nav-scroll overflow-y-auto'
            }`}
          >
            {state.navCollapsed ? (
              <Button
                type="button"
                variant="menu"
                size="icon"
                className="m-2 h-7 w-7 rounded-sm p-0"
                aria-label={getHelpNavToggleLabel(state.navCollapsed)}
                aria-controls="help-dialog-nav"
                aria-expanded={!state.navCollapsed}
                onClick={() => setState((current) => ({ ...current, navCollapsed: false }))}
              >
                <NavToggleIcon className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <div className="help-nav-header editor-bg-subtle sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="editor-text-muted text-xs font-medium">Browse docs</div>
                  <Button
                    type="button"
                    variant="menu"
                    size="icon"
                    className="h-7 w-7 rounded-sm p-0"
                    aria-label={getHelpNavToggleLabel(state.navCollapsed)}
                    aria-controls="help-dialog-nav"
                    aria-expanded={!state.navCollapsed}
                    onClick={() => setState((current) => ({ ...current, navCollapsed: true }))}
                  >
                    <NavToggleIcon className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="px-3 pb-4 pt-2">
                  <div className="space-y-2.5">
                    {rootEntries.map((entry) =>
                      entry.kind === 'section' ? (
                        <HelpNavSection
                          key={entry.id}
                          entry={entry}
                          activeEntryId={activeEntry?.id ?? 'shortcuts'}
                          expandedIds={expandedIdSet}
                          onToggle={(entryId, isExpanded) => handleToggle(entryId, isExpanded, setState)}
                          onSelect={(entryId) => {
                            setTableOfContents([]);
                            setContentReadyVersion(0);
                            handleEntrySelect(entryId, setState);
                          }}
                        />
                      ) : (
                        <div key={entry.id} data-help-entry={entry.id}>
                          <SettingsNavItem
                            type="button"
                            compact
                            variant="accent-hover"
                            active={entry.id === activeEntry?.id}
                            title={entry.title}
                            description={formatHelpEntryDescription(entry)}
                            titleClassName="text-[13px] font-medium"
                            descriptionClassName="text-[11px] leading-4"
                            aria-current={entry.id === activeEntry?.id ? 'true' : undefined}
                            onClick={() => {
                              setTableOfContents([]);
                              setContentReadyVersion(0);
                              handleEntrySelect(entry.id, setState);
                            }}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </nav>
              </>
            )}
          </aside>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="editor-bg-subtle editor-border-subtle border-b px-6 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {breadcrumbs.map((entry, index) => (
                  <span key={entry.id} className="flex items-center gap-2">
                    {index > 0 ? <span className="editor-text-muted">/</span> : null}
                    {entry.parentId == null && entry.kind === 'section' ? (
                      <span className="editor-text-muted px-1.5 py-1">{entry.title}</span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`help-breadcrumb-button h-auto px-1.5 py-1 text-left whitespace-normal ${entry.id === activeEntry.id ? 'editor-text-strong font-medium' : 'editor-text-muted'}`}
                        onClick={() => {
                          setTableOfContents([]);
                          setContentReadyVersion(0);
                          handleEntrySelect(entry.id, setState);
                        }}
                      >
                        {entry.title}
                      </Button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div ref={contentRef} className="editor-scrollbar editor-scrollbar-gutter min-h-0 overflow-y-auto p-6">
                {activeEntry.kind === 'shortcuts' ? (
                  <ShortcutHelpContent />
                ) : activeEntry.kind === 'about' ? (
                  <AboutContent
                    onOpenHelpEntry={(entryId) => {
                      setTableOfContents([]);
                      setContentReadyVersion(0);
                      handleEntrySelect(entryId, setState);
                    }}
                  />
                ) : activeEntry.kind === 'section' ? (
                  <HelpSectionLanding
                    entry={activeEntry}
                    onSelect={(entryId) => {
                      setTableOfContents([]);
                      setContentReadyVersion(0);
                      handleEntrySelect(entryId, setState);
                    }}
                  />
                ) : (
                  <Suspense fallback={<HelpMarkdownFallback fileName={activeEntry.fileName} />}>
                    <LazyHelpMarkdownDocument
                      entry={activeEntry}
                      availableDocPaths={availableDocPaths}
                      onNavigate={(target) => {
                        if (target.kind === 'document') {
                          setTableOfContents([]);
                          setContentReadyVersion(0);
                        }
                        handleNavigate(target, setState);
                      }}
                      onContentReady={(headings) => {
                        setTableOfContents(headings);
                        setContentReadyVersion((current) => current + 1);
                      }}
                    />
                  </Suspense>
                )}
              </div>

              <aside className="editor-border-subtle hidden min-h-0 border-l lg:block">
                <div className="border-b border-[color:var(--editor-utility-border)] px-4 py-3">
                  <div className="editor-text-muted text-xs font-medium">On this page</div>
                </div>
                <div className="editor-scrollbar editor-scrollbar-gutter max-h-full overflow-y-auto p-3">
                  {tableOfContents.length > 0 ? (
                    <div className="space-y-1">
                      {tableOfContents.map((heading) => (
                        <Button
                          key={`${heading.anchor}-${heading.depth}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="help-toc-link h-auto w-full justify-start px-2 py-1.5 text-left text-sm whitespace-normal"
                          data-active={state.pendingAnchor === heading.anchor ? 'true' : 'false'}
                          style={{ paddingLeft: `${8 + (heading.depth - 1) * 12}px` }}
                          onClick={() => handleNavigate({ kind: 'anchor', anchor: heading.anchor }, setState)}
                        >
                          {heading.text}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="editor-text-muted px-2 py-1 text-sm">This page has no heading outline yet.</div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function createHelpDialogState(initialEntryId: string): HelpDialogState {
  const resolvedEntryId = getHelpEntryById(initialEntryId)?.id ?? 'about';
  return {
    activeEntryId: resolvedEntryId,
    pendingAnchor: null,
    navCollapsed: false,
    expandedIds: [...getHelpInitialExpandedIds(resolvedEntryId)],
  };
}

function handleEntrySelect(entryId: HelpEntry['id'], setState: Dispatch<SetStateAction<HelpDialogState>>) {
  setState((current) => {
    const expandedIds = new Set(current.expandedIds);
    for (const breadcrumb of getHelpBreadcrumbs(entryId)) {
      if (getHelpChildEntries(breadcrumb.id).length > 0) {
        expandedIds.add(breadcrumb.id);
      }
    }

    return {
      ...current,
      activeEntryId: entryId,
      pendingAnchor: null,
      expandedIds: [...expandedIds],
    };
  });
}

function handleNavigate(target: HelpLinkTarget, setState: Dispatch<SetStateAction<HelpDialogState>>) {
  if (target.kind === 'anchor') {
    setState((current) => ({
      ...current,
      pendingAnchor: target.anchor,
    }));
    return;
  }

  if (target.kind === 'document') {
    const nextEntry = getHelpEntryByPath(target.path);
    if (!nextEntry) {
      return;
    }

    setState((current) => {
      const expandedIds = new Set(current.expandedIds);
      for (const breadcrumb of getHelpBreadcrumbs(nextEntry.id)) {
        if (getHelpChildEntries(breadcrumb.id).length > 0) {
          expandedIds.add(breadcrumb.id);
        }
      }

      return {
        ...current,
        activeEntryId: nextEntry.id,
        pendingAnchor: target.anchor,
        expandedIds: [...expandedIds],
      };
    });
  }
}

function handleToggle(
  entryId: string,
  isExpanded: boolean,
  setState: Dispatch<SetStateAction<HelpDialogState>>,
) {
  setState((current) => {
    const nextExpandedIds = new Set(current.expandedIds);
    if (isExpanded) {
      nextExpandedIds.delete(entryId);
    } else {
      nextExpandedIds.add(entryId);
    }
    return {
      ...current,
      expandedIds: [...nextExpandedIds],
    };
  });
}

function collectMarkdownEntries(entryId: string): MarkdownHelpEntry[] {
  const root = getHelpEntryById(entryId);
  if (!root) {
    return [];
  }

  const result: MarkdownHelpEntry[] = [];

  function visit(id: string) {
    const entry = getHelpEntryById(id);
    if (!entry) {
      return;
    }
    if (entry.kind === 'markdown') {
      result.push(entry);
    }
    for (const child of getHelpChildEntries(id)) {
      visit(child.id);
    }
  }

  visit(entryId);
  return result;
}

function HelpSectionLanding({ entry, onSelect }: { entry: Extract<HelpEntry, { kind: 'section' }>; onSelect: (entryId: string) => void }) {
  const primaryChildren = getHelpChildEntries(entry.id).filter((child) => child.navVisibility === 'primary');
  const secondaryChildren = getHelpChildEntries(entry.id).filter((child) => child.navVisibility === 'secondary');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="editor-text-strong text-2xl font-semibold tracking-tight">{entry.title}</h1>
        <p className="editor-text-muted mt-2 max-w-2xl text-sm leading-6">
          Browse the curated pages in this section. Stable docs appear first; planning and lower-priority material stays visible but secondary.
        </p>
      </div>

      <div className="space-y-3">
        {primaryChildren.map((child) => (
          <Button
            key={child.id}
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start p-0 text-left whitespace-normal"
            onClick={() => onSelect(child.id)}
          >
            <ListCard
              tone="default"
              className="rounded-md"
              title={child.title}
              description={child.subtitle ?? getSectionLandingDescription(child)}
              meta={child.kind === 'markdown' ? child.fileName : 'Section'}
            />
          </Button>
        ))}
      </div>

      {secondaryChildren.length > 0 ? (
        <div className="space-y-3">
          <div className="editor-text-muted text-xs font-medium">Secondary</div>
          {secondaryChildren.map((child) => (
            <Button
              key={child.id}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start p-0 text-left whitespace-normal opacity-85"
              onClick={() => onSelect(child.id)}
            >
              <ListCard
                tone="default"
                className="rounded-md"
                title={child.title}
                description={child.subtitle ?? getSectionLandingDescription(child)}
                meta={child.kind === 'markdown' ? child.fileName : 'Section'}
              />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HelpNavSection({
  entry,
  activeEntryId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  entry: Extract<HelpEntry, { kind: 'section' }>;
  activeEntryId: string;
  expandedIds: Set<string>;
  onToggle: (entryId: string, isExpanded: boolean) => void;
  onSelect: (entryId: string) => void;
}) {
  const rows = buildHelpTreeRows(activeEntryId, expandedIds, entry.id, 0);

  return (
    <div data-help-section-root={entry.id} className="space-y-1.5">
      <div className="editor-text-muted px-2 text-[15px] font-bold tracking-normal">{entry.title}</div>
      <div className="space-y-0.5">
        {rows.map((row) => (
          <HelpNavRow key={row.entry.id} row={row} onToggle={onToggle} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function HelpNavRow({
  row,
  onToggle,
  onSelect,
}: {
  row: ReturnType<typeof buildHelpTreeRows>[number];
  onToggle: (entryId: string, isExpanded: boolean) => void;
  onSelect: (entryId: string) => void;
}) {
  const DisclosureIcon = row.isExpanded ? ChevronDown : ChevronRight;

  return (
    <div
      data-help-entry={row.entry.id}
      className="flex items-start gap-1"
      style={{ paddingLeft: `${row.depth * 14}px` }}
    >
      {row.hasChildren ? (
        <Button
          type="button"
          variant="menu"
          size="icon"
          className="mt-0.5 h-7 w-7 rounded-sm p-0"
          aria-label={`${row.isExpanded ? 'Collapse' : 'Expand'} ${row.entry.title}`}
          onClick={() => onToggle(row.entry.id, row.isExpanded)}
        >
          <DisclosureIcon className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <span aria-hidden="true" className="mt-0.5 block h-7 w-7 shrink-0" />
      )}

      <SettingsNavItem
        type="button"
        compact
        variant="accent-hover"
        active={row.isSelected}
        className="min-w-0 flex-1"
        title={row.entry.title}
        description={formatHelpEntryDescription(row.entry)}
        titleClassName="text-[13px] font-medium"
        descriptionClassName="text-[11px] leading-4"
        aria-current={row.isSelected ? 'true' : undefined}
        onClick={() => onSelect(row.entry.id)}
      />
    </div>
  );
}

function formatHelpEntryDescription(entry: HelpEntry) {
  const parts = [entry.subtitle];
  if (entry.navVisibility === 'secondary') {
    parts.push('Secondary');
  }
  return parts.filter(Boolean).join(' · ') || undefined;
}

function getSectionLandingDescription(entry: HelpEntry) {
  if (entry.kind === 'section') {
    return `${getHelpChildEntries(entry.id).length} entries`;
  }
  if (entry.kind === 'markdown') {
    return entry.path;
  }
  return undefined;
}

function HelpMarkdownFallback({ fileName }: { fileName: string }) {
  return (
    <div className="space-y-3">
      <NoticeSurface tone="muted" className="px-0 py-0 text-sm">
        Loading {fileName}…
      </NoticeSurface>
      <div className="editor-bg-subtle editor-border-subtle h-24 rounded-lg border" />
      <div className="editor-bg-subtle editor-border-subtle h-24 rounded-lg border" />
    </div>
  );
}
