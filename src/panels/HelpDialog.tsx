import { CircleQuestionMark, FilePlus2, FileText, Keyboard } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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

const LazyHelpMarkdownDocument = lazy(async () => {
  const module = await import('./HelpMarkdownDocument');
  return { default: module.HelpMarkdownDocument };
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HelpDialog({ open, onOpenChange }: Props) {
  const entries = useMemo(() => getHelpEntries(), []);
  const markdownEntries = entries.filter((entry): entry is MarkdownHelpEntry => entry.kind === 'markdown');
  const mainEntries = entries.filter((entry) => !(entry.kind === 'markdown' && entry.path === HELP_BROWSER_DOC_PATH));
  const footerEntry = entries.find(
    (entry): entry is MarkdownHelpEntry => entry.kind === 'markdown' && entry.path === HELP_BROWSER_DOC_PATH,
  );
  const availableDocPaths = useMemo(() => new Set(markdownEntries.map((entry) => entry.path)), [markdownEntries]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<HelpEntry['id']>('shortcuts');
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const activeEntry = entries.find((entry) => entry.id === activeEntryId) ?? entries[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveEntryId('shortcuts');
    setPendingAnchor(null);
  }, [open]);

  useEffect(() => {
    if (!open || !contentRef.current) {
      return;
    }

    const container = contentRef.current;
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
  }, [open, pendingAnchor]);

  function handleEntrySelect(entryId: HelpEntry['id']) {
    setActiveEntryId(entryId);
    setPendingAnchor(null);
  }

  function handleNavigate(target: HelpLinkTarget) {
    if (target.kind === 'anchor') {
      setPendingAnchor(target.anchor);
      return;
    }

    if (target.kind === 'document') {
      const nextEntry = markdownEntries.find((entry) => entry.path === target.path);
      if (!nextEntry) {
        return;
      }

      setActiveEntryId(nextEntry.id);
      setPendingAnchor(target.anchor);
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
        <div className="grid h-[min(78vh,760px)] min-h-0 grid-cols-[240px_minmax(0,1fr)]">
          <aside className="editor-bg-subtle editor-border-subtle grid min-h-0 grid-rows-[minmax(0,1fr)_auto] border-r px-3 py-4">
            <div className="min-h-0">
              <div className="editor-text-muted mb-3 px-2 text-[11px] font-medium">Browse help</div>
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
