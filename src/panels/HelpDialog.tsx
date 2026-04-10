import {
  BookMarked,
  BookOpen,
  CircleQuestionMark,
  FileText,
  FolderTree,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { lazy, Suspense, type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ListCard } from '@/components/ui/list-card';
import { NoticeSurface } from '@/components/ui/settings-panel';
import { TreeRowItem, TreeRowLabelContent } from '@/components/ui/tree-row';
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
  const [state, setState] = useState<HelpDialogState>(() => createHelpDialogState(initialEntryId ?? 'shortcuts'));
  const activeEntry = getHelpEntryById(state.activeEntryId) ?? rootEntries[0];
  const activeEntryKind = activeEntry.kind;
  const NavToggleIcon = state.navCollapsed ? PanelLeftOpen : PanelLeftClose;
  const breadcrumbs = activeEntry ? getHelpBreadcrumbs(activeEntry.id) : [];
  const expandedIdSet = useMemo(() => new Set(state.expandedIds), [state.expandedIds]);
  const treeRows = useMemo(
    () => buildHelpTreeRows(activeEntry?.id ?? 'shortcuts', expandedIdSet),
    [activeEntry?.id, expandedIdSet],
  );

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
            className={`editor-bg-subtle editor-border-subtle min-h-0 border-r ${
              state.navCollapsed ? 'flex items-start justify-center px-2 py-3' : 'grid grid-rows-[auto_minmax(0,1fr)] px-3 py-4'
            }`}
          >
            {state.navCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="editor-icon-button-subtle rounded-lg border"
                aria-label={getHelpNavToggleLabel(state.navCollapsed)}
                aria-controls="help-dialog-nav"
                aria-expanded={!state.navCollapsed}
                onClick={() => setState((current) => ({ ...current, navCollapsed: false }))}
              >
                <NavToggleIcon className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2 px-2">
                  <div className="editor-text-muted text-[11px] font-medium uppercase tracking-[0.12em]">Browse docs</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="editor-icon-button-subtle rounded-lg border"
                    aria-label={getHelpNavToggleLabel(state.navCollapsed)}
                    aria-controls="help-dialog-nav"
                    aria-expanded={!state.navCollapsed}
                    onClick={() => setState((current) => ({ ...current, navCollapsed: true }))}
                  >
                    <NavToggleIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div id="help-dialog-nav" className="min-h-0">
                  <nav className="editor-scrollbar editor-scrollbar-gutter max-h-full overflow-y-auto pr-1">
                    {treeRows.map((row) => (
                      <TreeRowItem
                        key={row.entry.id}
                        data-help-entry={row.entry.id}
                        depth={row.depth}
                        hasChildren={row.hasChildren}
                        isExpanded={row.isExpanded}
                        isSelected={row.isSelected}
                        className="help-nav-row my-1 rounded-lg"
                        icon={renderEntryIcon(row.entry)}
                        label={
                          <TreeRowLabelContent
                            title={row.entry.title}
                            subtitle={row.entry.subtitle}
                            badges={
                              row.entry.navVisibility === 'secondary' ? (
                                <span className="help-nav-badge">Secondary</span>
                              ) : undefined
                            }
                          />
                        }
                        onToggleAriaLabel={`${row.isExpanded ? 'Collapse' : 'Expand'} ${row.entry.title}`}
                        onToggle={() => handleToggle(row.entry.id, row.isExpanded, setState)}
                        onClick={() => {
                          setTableOfContents([]);
                          setContentReadyVersion(0);
                          handleEntrySelect(row.entry.id, setState);
                        }}
                      />
                    ))}
                  </nav>
                </div>
              </>
            )}
          </aside>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="editor-bg-subtle editor-border-subtle space-y-2 border-b px-6 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                      {breadcrumbs.map((entry, index) => (
                        <span key={entry.id} className="flex items-center gap-2">
                          {index > 0 ? <span className="editor-text-muted">/</span> : null}
                          <button
                            type="button"
                            className={`text-left ${entry.id === activeEntry.id ? 'editor-text-strong font-medium' : 'editor-text-muted hover:text-[color:var(--editor-accent)]'}`}
                            onClick={() => {
                              setTableOfContents([]);
                              setContentReadyVersion(0);
                              handleEntrySelect(entry.id, setState);
                            }}
                          >
                            {entry.title}
                          </button>
                  </span>
                ))}
              </div>

              {activeEntry.kind === 'markdown' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="editor-text-strong text-sm font-medium">{activeEntry.title}</div>
                    {activeEntry.subtitle ? (
                      <div className="editor-text-muted mt-0.5 text-xs leading-5">{activeEntry.subtitle}</div>
                    ) : null}
                  </div>
                  <div className="editor-text-muted flex items-center gap-2 text-[11px]">
                    <span>File</span>
                    <span className="editor-text-strong font-mono leading-5">{activeEntry.fileName}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="editor-text-strong text-sm font-medium">{activeEntry.title}</div>
                  {activeEntry.subtitle ? (
                    <div className="editor-text-muted mt-0.5 text-xs leading-5">{activeEntry.subtitle}</div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div ref={contentRef} className="editor-scrollbar editor-scrollbar-gutter min-h-0 overflow-y-auto p-6">
                {activeEntry.kind === 'shortcuts' ? (
                  <ShortcutHelpContent />
                ) : activeEntry.kind === 'about' ? (
                  <AboutContent />
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

              <aside className="editor-bg-subtle editor-border-subtle hidden min-h-0 border-l lg:block">
                <div className="border-b border-[color:var(--editor-utility-border)] px-4 py-3">
                  <div className="editor-text-muted text-[11px] font-medium uppercase tracking-[0.12em]">
                    On this page
                  </div>
                </div>
                <div className="editor-scrollbar editor-scrollbar-gutter max-h-full overflow-y-auto p-3">
                  {tableOfContents.length > 0 ? (
                    <div className="space-y-1">
                      {tableOfContents.map((heading) => (
                        <button
                          key={`${heading.anchor}-${heading.depth}`}
                          type="button"
                          className={`help-toc-link w-full rounded-md px-2 py-1.5 text-left text-sm ${
                            state.pendingAnchor === heading.anchor ? 'data-[active=true]' : ''
                          }`}
                          data-active={state.pendingAnchor === heading.anchor ? 'true' : 'false'}
                          style={{ paddingLeft: `${8 + (heading.depth - 1) * 12}px` }}
                          onClick={() => handleNavigate({ kind: 'anchor', anchor: heading.anchor }, setState)}
                        >
                          {heading.text}
                        </button>
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
  const resolvedEntryId = getHelpEntryById(initialEntryId)?.id ?? 'shortcuts';
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

function renderEntryIcon(entry: HelpEntry) {
  if (entry.kind === 'about') {
    return <CircleQuestionMark className="h-4 w-4" />;
  }
  if (entry.kind === 'shortcuts') {
    return <Keyboard className="h-4 w-4" />;
  }
  if (entry.kind === 'section') {
    return <FolderTree className="h-4 w-4" />;
  }
  if (entry.id === 'doc:docs/USAGE.md') {
    return <BookOpen className="h-4 w-4" />;
  }
  if (entry.id === 'doc:docs/REFERENCE.md' || entry.id === 'doc:docs/DEVELOPERS.md') {
    return <BookMarked className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
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
          <button key={child.id} type="button" className="block w-full text-left" onClick={() => onSelect(child.id)}>
            <ListCard
              tone="subtle"
              title={child.title}
              description={child.subtitle ?? getSectionLandingDescription(child)}
              meta={child.kind === 'markdown' ? child.fileName : 'Section'}
            />
          </button>
        ))}
      </div>

      {secondaryChildren.length > 0 ? (
        <div className="space-y-3">
          <div className="editor-text-muted text-xs font-medium uppercase tracking-[0.12em]">Secondary</div>
          {secondaryChildren.map((child) => (
            <button key={child.id} type="button" className="block w-full text-left opacity-85" onClick={() => onSelect(child.id)}>
              <ListCard
                tone="subtle"
                title={child.title}
                description={child.subtitle ?? getSectionLandingDescription(child)}
                meta={child.kind === 'markdown' ? child.fileName : 'Section'}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
