import { CircleQuestionMark, FilePlus2, FileText, Keyboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditorPanelHeader } from './EditorPanelHeader';
import {
  getHelpEntries,
  HELP_BROWSER_DOC_PATH,
  type HelpEntry,
  type MarkdownHelpEntry,
  type HelpLinkTarget,
} from './helpDocs';
import { ShortcutHelpContent } from './ShortcutHelpContent';

export const HELP_NAV_EXPANDED_WIDTH_PX = 240;
export const HELP_NAV_COLLAPSED_WIDTH_PX = 56;

const LazyHelpMarkdownDocument = lazy(async () => {
  const module = await import('./HelpMarkdownDocument');
  return { default: module.HelpMarkdownDocument };
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type HelpDialogState = {
  activeEntryId: HelpEntry['id'];
  pendingAnchor: string | null;
  navCollapsed: boolean;
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
  };
}

export function HelpDialog({ open, onOpenChange }: Props) {
  const entries = useMemo(() => getHelpEntries(), []);
  const markdownEntries = entries.filter((entry): entry is MarkdownHelpEntry => entry.kind === 'markdown');
  const mainEntries = entries.filter((entry) => !(entry.kind === 'markdown' && entry.path === HELP_BROWSER_DOC_PATH));
  const footerEntry = entries.find(
    (entry): entry is MarkdownHelpEntry => entry.kind === 'markdown' && entry.path === HELP_BROWSER_DOC_PATH,
  );
  const availableDocPaths = useMemo(() => new Set(markdownEntries.map((entry) => entry.path)), [markdownEntries]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledEntryIdRef = useRef<HelpEntry['id'] | null>(null);
  const [state, setState] = useState<HelpDialogState>({
    activeEntryId: 'shortcuts',
    pendingAnchor: null,
    navCollapsed: false,
  });
  const { activeEntryId, pendingAnchor, navCollapsed } = state;
  const activeEntry = entries.find((entry) => entry.id === activeEntryId) ?? entries[0];
  const NavToggleIcon = navCollapsed ? PanelLeftOpen : PanelLeftClose;

  useEffect(() => {
    if (open) {
      return;
    }
    setState((current) => closeHelpDialogState(current));
  }, [open]);

  useEffect(() => {
    if (!open || !contentRef.current) {
      return;
    }

    const container = contentRef.current;
    const entryChanged = lastScrolledEntryIdRef.current !== activeEntryId;
    lastScrolledEntryIdRef.current = activeEntryId;

    if (entryChanged) {
      container.scrollTop = 0;
    }

    if (!pendingAnchor) {
      container.scrollTop = 0;
      return;
    }

    const anchorTarget = Array.from(container.querySelectorAll<HTMLElement>('[data-help-anchor]')).find(
      (element) => element.dataset.helpAnchor === pendingAnchor,
    );

    if (anchorTarget) {
      anchorTarget.scrollIntoView({ block: 'start' });
      return;
    }

    container.scrollTop = 0;
  }, [open, activeEntryId, pendingAnchor]);

  function handleEntrySelect(entryId: HelpEntry['id']) {
    setState((current) => ({
      ...current,
      activeEntryId: entryId,
      pendingAnchor: null,
    }));
  }

  function handleNavigate(target: HelpLinkTarget) {
    if (target.kind === 'anchor') {
      setState((current) => ({
        ...current,
        pendingAnchor: target.anchor,
      }));
      return;
    }

    if (target.kind === 'document') {
      const nextEntry = markdownEntries.find((entry) => entry.path === target.path);
      if (!nextEntry) {
        return;
      }

      setState((current) => ({
        ...current,
        activeEntryId: nextEntry.id,
        pendingAnchor: target.anchor,
      }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        backdropVariant="transparent"
        surfaceClassName="bg-transparent p-5 backdrop-blur-none"
        className="editor-help-dialog max-h-[calc(100vh-1.5rem)] max-w-[min(1100px,calc(100vw-32px))] gap-0 overflow-hidden p-0"
      >
        <EditorPanelHeader
          icon={CircleQuestionMark}
          title="Help"
          description="Keyboard shortcuts and project documentation."
          closeLabel="Close help"
          onClose={() => onOpenChange(false)}
        />
        <div
          data-help-nav-collapsed={navCollapsed ? 'true' : 'false'}
          className="grid h-[min(78vh,760px)] min-h-0 transition-[grid-template-columns] duration-200 ease-out"
          style={{ gridTemplateColumns: getHelpDialogGridTemplateColumns(navCollapsed) }}
        >
          <aside
            className={`editor-bg-subtle editor-border-subtle min-h-0 border-r ${
              navCollapsed ? 'flex items-start justify-center px-2 py-3' : 'grid grid-rows-[auto_minmax(0,1fr)_auto] px-3 py-4'
            }`}
          >
            {navCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="editor-icon-button-subtle rounded-lg border"
                aria-label={getHelpNavToggleLabel(navCollapsed)}
                aria-controls="help-dialog-nav"
                aria-expanded={!navCollapsed}
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    navCollapsed: false,
                  }))
                }
              >
                <NavToggleIcon className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2 px-2">
                  <div className="editor-text-muted text-[11px] font-medium">Browse help</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="editor-icon-button-subtle rounded-lg border"
                    aria-label={getHelpNavToggleLabel(navCollapsed)}
                    aria-controls="help-dialog-nav"
                    aria-expanded={!navCollapsed}
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        navCollapsed: true,
                      }))
                    }
                  >
                    <NavToggleIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div id="help-dialog-nav" className="min-h-0">
                  <nav className="editor-scrollbar max-h-full space-y-1 overflow-y-auto pr-1">
                    {mainEntries.map((entry) =>
                      renderEntryButton({
                        entry,
                        active: entry.id === activeEntry.id,
                        onSelect: handleEntrySelect,
                      }),
                    )}
                  </nav>
                </div>

                {footerEntry ? (
                  <div className="editor-border-subtle mt-4 border-t pt-4">
                    {renderEntryButton({
                      entry: footerEntry,
                      active: footerEntry.id === activeEntry.id,
                      onSelect: handleEntrySelect,
                      compact: true,
                    })}
                  </div>
                ) : null}
              </>
            )}
          </aside>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            {activeEntry.kind === 'markdown' ? (
              <div className="editor-bg-subtle editor-border-subtle flex items-center justify-between gap-3 border-b px-6 py-2.5">
                <div className="editor-text-muted text-xs">File</div>
                <div className="editor-text-strong font-mono text-[11px] leading-5">{activeEntry.fileName}</div>
              </div>
            ) : null}

            <div ref={contentRef} className="editor-scrollbar min-h-0 overflow-y-auto p-6">
              {activeEntry.kind === 'shortcuts' ? (
                <ShortcutHelpContent />
              ) : (
                <Suspense fallback={<HelpMarkdownFallback fileName={activeEntry.fileName} />}>
                  <LazyHelpMarkdownDocument entry={activeEntry} availableDocPaths={availableDocPaths} onNavigate={handleNavigate} />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderEntryButton({
  entry,
  active,
  onSelect,
  compact = false,
}: {
  entry: HelpEntry;
  active: boolean;
  onSelect: (entryId: HelpEntry['id']) => void;
  compact?: boolean;
}) {
  const Icon =
    entry.kind === 'shortcuts' ? Keyboard : compact ? FilePlus2 : FileText;

  return (
    <button
      key={entry.id}
      type="button"
      data-help-entry={entry.id}
      data-active={active ? 'true' : 'false'}
      onClick={() => onSelect(entry.id)}
      className={`settings-nav-link flex w-full items-start gap-3 rounded-lg text-left transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-inset ${
        compact ? 'px-3 py-2' : 'px-3 py-2.5'
      } ${
        active ? 'shadow-sm' : ''
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className={compact ? 'text-[13px] font-medium leading-4' : 'text-sm font-medium'}>{entry.title}</div>
        {entry.subtitle ? (
          <div className={`settings-nav-link-copy mt-0.5 ${compact ? 'text-[11px] leading-4' : 'text-xs leading-5'}`}>
            {entry.subtitle}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function HelpMarkdownFallback({ fileName }: { fileName: string }) {
  return (
    <div className="space-y-3">
      <div className="editor-text-muted text-sm">Loading {fileName}…</div>
      <div className="editor-bg-subtle editor-border-subtle h-24 rounded-lg border" />
      <div className="editor-bg-subtle editor-border-subtle h-24 rounded-lg border" />
    </div>
  );
}
