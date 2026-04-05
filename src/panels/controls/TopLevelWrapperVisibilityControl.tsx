import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DocumentModel,
  DocumentPage,
  PageId,
  TopLevelWrapperVisibilityMode,
  TopLevelWrapperVisibilityState,
} from '@/api/editorApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopoverSurface } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const VISIBILITY_MENU_MIN_WIDTH_PX = 280;
const VISIBILITY_MENU_VIEWPORT_MARGIN_PX = 12;
const VISIBILITY_MENU_TRIGGER_GAP_PX = 8;

type TopLevelWrapperVisibilityControlProps = {
  document: DocumentModel;
  activePageId: PageId | null;
  value: TopLevelWrapperVisibilityState;
  onChange: (mode: TopLevelWrapperVisibilityMode, pageIds?: PageId[]) => void;
  className?: string;
};

export function TopLevelWrapperVisibilityControl({
  document,
  activePageId,
  value,
  onChange,
  className,
}: TopLevelWrapperVisibilityControlProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: VISIBILITY_MENU_MIN_WIDTH_PX });
  const pages: DocumentPage[] = document.pages ?? [];

  const selectedPageIds = useMemo(() => new Set(value.pageIds), [value.pageIds]);
  const filteredPages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return pages;
    }
    return pages.filter((page) => {
      const searchTarget = `${page.displayName} ${page.slug}`.toLowerCase();
      return searchTarget.includes(normalized);
    });
  }, [pages, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = Math.min(
        Math.max(rect.width, VISIBILITY_MENU_MIN_WIDTH_PX),
        window.innerWidth - VISIBILITY_MENU_VIEWPORT_MARGIN_PX * 2,
      );
      const maxLeft = Math.max(
        VISIBILITY_MENU_VIEWPORT_MARGIN_PX,
        window.innerWidth - width - VISIBILITY_MENU_VIEWPORT_MARGIN_PX,
      );
      const left = Math.min(Math.max(VISIBILITY_MENU_VIEWPORT_MARGIN_PX, rect.left), maxLeft);
      const top = Math.min(
        rect.bottom + VISIBILITY_MENU_TRIGGER_GAP_PX,
        Math.max(
          VISIBILITY_MENU_VIEWPORT_MARGIN_PX,
          window.innerHeight - 320 - VISIBILITY_MENU_VIEWPORT_MARGIN_PX,
        ),
      );

      setPosition({ top, left, width });
    };

    updatePosition();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && (triggerRef.current?.contains(target) || surfaceRef.current?.contains(target))) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const label =
    value.mode === 'hidden'
      ? 'Hidden'
      : value.mode === 'allPages'
        ? 'All pages'
        : value.mode === 'customPages'
          ? `Custom pages${value.pageIds.length > 0 ? ` (${value.pageIds.length})` : ''}`
          : 'Current page';

  function commitMode(nextMode: TopLevelWrapperVisibilityMode) {
    if (nextMode === 'customPages') {
      const nextPageIds = value.pageIds.length > 0 ? value.pageIds : activePageId ? [activePageId] : pages[0]?.id ? [pages[0].id] : [];
      if (nextPageIds.length === 0) {
        return;
      }
      onChange(nextMode, nextPageIds);
      return;
    }

    onChange(nextMode);
    setOpen(false);
  }

  function toggleCustomPage(pageId: PageId) {
    const nextPageIds = selectedPageIds.has(pageId)
      ? value.pageIds.filter((candidate) => candidate !== pageId)
      : [...value.pageIds, pageId];
    if (nextPageIds.length === 0) {
      return;
    }
    onChange('customPages', nextPageIds);
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        className="editor-pill-subtle editor-border-subtle h-7 gap-1 rounded-md border px-2 text-[11px] font-medium"
        data-layers-control="true"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Visibility: ${label}`}
        onClick={() => setOpen((current) => !current)}
      >
        {value.mode === 'hidden' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        <span className="max-w-[7rem] truncate">{label}</span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      <PopoverSurface
        ref={surfaceRef}
        open={open}
        onOpenChange={setOpen}
        className="fixed inset-0 m-0 border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className="editor-bg-surface editor-border-subtle fixed z-[420] overflow-hidden rounded-md border shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
          }}
        >
          <div className="editor-border-subtle border-b px-3 py-2">
            <div className="editor-text-strong text-xs font-medium">Visibility</div>
            <div className="editor-text-muted mt-0.5 text-[11px]">
              Choose where this top-level component appears.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3">
            <MenuChoice active={value.mode === 'currentPage'} label="Current page" onClick={() => commitMode('currentPage')} />
            <MenuChoice active={value.mode === 'allPages'} label="All pages" onClick={() => commitMode('allPages')} />
            <MenuChoice active={value.mode === 'customPages'} label="Custom pages" onClick={() => commitMode('customPages')} />
            <MenuChoice active={value.mode === 'hidden'} label="Hidden" onClick={() => commitMode('hidden')} />
          </div>

          {value.mode === 'customPages' ? (
            <div className="border-t p-3 pt-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages"
                className="h-8 text-xs"
              />
              <div className="editor-scrollbar mt-2 max-h-60 overflow-y-auto rounded-md border">
                {filteredPages.length > 0 ? (
                  filteredPages.map((page) => {
                    const selected = selectedPageIds.has(page.id);
                    return (
                      <button
                        key={page.id}
                        type="button"
                        className={cn(
                          'editor-text-strong flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-xs last:border-b-0',
                          selected ? 'bg-slate-100' : 'bg-transparent',
                        )}
                        data-ui="select-item"
                        onClick={() => toggleCustomPage(page.id)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{page.displayName}</span>
                          <span className="editor-text-muted block truncate text-[10px]">/{page.slug}</span>
                        </span>
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="editor-text-muted px-3 py-4 text-xs">No pages match.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PopoverSurface>
    </div>
  );
}

function MenuChoice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'editor-border-subtle editor-text-strong rounded-md border px-2.5 py-2 text-left text-xs transition-colors',
        active ? 'bg-slate-100' : 'bg-transparent',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
