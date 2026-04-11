import { ArrowLeft, ChevronDown, ChevronRight, EyeOff, File, FileCheck, Files } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '@/lib/useClickOutside';
import { useEscapeKey } from '@/lib/useEscapeKey';
import type {
  DocumentModel,
  DocumentPage,
  PageId,
  TopLevelWrapperVisibilityMode,
  TopLevelWrapperVisibilityState,
} from '@/api/editorApi';
import { Button } from '@/components/ui/button';
import { PopoverSurface, PopoverTooltip } from '@/components/ui/popover';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { getSearchableSelectPosition } from '@/components/ui/searchable-select';
import { SelectOptionRow } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const VISIBILITY_MENU_ESTIMATED_HEIGHT_PX = 188;
const CUSTOM_PAGES_ESTIMATED_HEIGHT_PX = 320;
const VISIBILITY_TOOLTIP_CLASS_NAME = 'editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5';

type VisibilityMenuView = 'modes' | 'customPages';

type VisibilityModeOption = {
  mode: TopLevelWrapperVisibilityMode;
  label: string;
  icon: typeof File;
};

const VISIBILITY_MODE_OPTIONS: VisibilityModeOption[] = [
  { mode: 'currentPage', label: 'Current page', icon: File },
  { mode: 'allPages', label: 'All pages', icon: Files },
  { mode: 'customPages', label: 'Custom pages', icon: FileCheck },
  { mode: 'hidden', label: 'Hidden', icon: EyeOff },
];

type VisibilityDropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function TopLevelWrapperVisibilityControl({
  document,
  activePageId,
  value,
  onChange,
  className,
  triggerDisplay = 'icon-label',
}: {
  document: DocumentModel;
  activePageId: PageId | null;
  value: TopLevelWrapperVisibilityState;
  onChange: (mode: TopLevelWrapperVisibilityMode, pageIds?: PageId[]) => void;
  className?: string;
  triggerDisplay?: 'icon-label' | 'icon';
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<VisibilityMenuView>('modes');
  const [position, setPosition] = useState<VisibilityDropdownPosition>({
    top: 0,
    left: 0,
    width: 240,
    maxHeight: CUSTOM_PAGES_ESTIMATED_HEIGHT_PX,
  });
  const pages: DocumentPage[] = document.pages ?? [];

  const selectedLabel =
    value.mode === 'hidden'
      ? 'Hidden'
      : value.mode === 'allPages'
        ? 'All pages'
        : value.mode === 'customPages'
          ? `Custom pages${value.pageIds.length > 0 ? ` (${value.pageIds.length})` : ''}`
          : 'Current page';

  const selectedModeOption = VISIBILITY_MODE_OPTIONS.find((option) => option.mode === value.mode) ?? VISIBILITY_MODE_OPTIONS[0];
  const TriggerIcon = selectedModeOption.icon;
  const isIconOnlyTrigger = triggerDisplay === 'icon';

  const customPageOptions = useMemo(
    () =>
      pages.map((page) => ({
        value: page.id,
        label: page.displayName,
        description: `/${page.slug}`,
        keywords: [page.slug],
      })),
    [pages],
  );

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const nextPosition = getSearchableSelectPosition({
      triggerRect: rect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      estimatedHeight: view === 'customPages' ? CUSTOM_PAGES_ESTIMATED_HEIGHT_PX : VISIBILITY_MENU_ESTIMATED_HEIGHT_PX,
    });

    setPosition({
      top: nextPosition.top,
      left: nextPosition.left,
      width: nextPosition.width,
      maxHeight: nextPosition.maxHeight,
    });
  }, [view]);

  useEffect(() => {
    if (!open) {
      setView('modes');
      return;
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  const closeAndFocus = useCallback(() => {
    setOpen(false);
    setView('modes');
    triggerRef.current?.focus();
  }, []);

  useEscapeKey(closeAndFocus, open);
  useClickOutside([triggerRef, surfaceRef], useCallback(() => setOpen(false), []), open);

  function getInitialCustomPageIds() {
    if (value.pageIds.length > 0) {
      return value.pageIds;
    }
    if (activePageId) {
      return [activePageId];
    }
    if (pages[0]?.id) {
      return [pages[0].id];
    }
    return [];
  }

  function openCustomPagesView() {
    const nextPageIds = getInitialCustomPageIds();
    if (nextPageIds.length === 0) {
      return;
    }

    if (value.mode !== 'customPages' || value.pageIds.length === 0) {
      onChange('customPages', nextPageIds);
    }
    setView('customPages');
  }

  function handleModeSelection(nextMode: TopLevelWrapperVisibilityMode) {
    if (nextMode === 'customPages') {
      openCustomPagesView();
      return;
    }

    onChange(nextMode);
    setOpen(false);
  }

  function handleCustomPagesChange(nextPageIds: string[]) {
    if (nextPageIds.length === 0) {
      return;
    }
    onChange('customPages', nextPageIds);
  }

  const trigger = isIconOnlyTrigger ? (
    <Button
      ref={triggerRef}
      type="button"
      variant="menu"
      size="icon"
      className="h-7 w-7 rounded-sm"
      data-layers-control="true"
      data-selected={open ? 'true' : undefined}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`Visibility: ${selectedLabel}`}
      onClick={() => {
        updatePosition();
        setOpen((current) => !current);
      }}
    >
      <TriggerIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
    </Button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      data-ui="select-trigger"
      className="editor-bg-surface editor-border-subtle editor-text-strong flex h-7 min-w-[124px] items-center justify-between gap-2 rounded-sm border px-2.5 text-[11px] shadow-sm"
      data-layers-control="true"
      data-state={open ? 'open' : 'closed'}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`Visibility: ${selectedLabel}`}
      onClick={() => {
        updatePosition();
        setOpen((current) => !current);
      }}
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <TriggerIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown aria-hidden="true" className="h-3 w-3 shrink-0" />
      </span>
    </button>
  );

  return (
    <div className={cn('relative', className)}>
      {isIconOnlyTrigger ? (
        <PopoverTooltip
          side="top"
          align="center"
          className={VISIBILITY_TOOLTIP_CLASS_NAME}
          content={`Visibility: ${selectedLabel}`}
        >
          {trigger}
        </PopoverTooltip>
      ) : (
        trigger
      )}

      <PopoverSurface
        ref={surfaceRef}
        open={open}
        onOpenChange={setOpen}
        className="fixed inset-0 m-0 border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className="editor-bg-surface editor-border-subtle fixed z-[420] overflow-hidden rounded-sm border shadow-md"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
          }}
        >
          {view === 'modes' ? (
            <div className="p-1" role="menu" aria-label="Visibility options">
              {VISIBILITY_MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = value.mode === option.mode;
                const suffix =
                  option.mode === 'customPages'
                    ? isActive
                      ? <span className="editor-text-muted text-[11px]">{value.pageIds.length}</span>
                      : <ChevronRight className="h-3.5 w-3.5" />
                    : null;

                return (
                  <button
                    key={option.mode}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    data-ui="visibility-mode-option"
                    data-selected={isActive ? 'true' : 'false'}
                    className={cn(
                      'editor-menubar-item',
                    )}
                    onClick={() => handleModeSelection(option.mode)}
                  >
                    <SelectOptionRow
                      icon={<Icon className="h-3.5 w-3.5" />}
                      label={option.label}
                      meta={suffix}
                      labelClassName="text-xs font-medium"
                      metaClassName="editor-text-strong"
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="min-h-0">
              <div className="editor-border-subtle flex items-center gap-1 border-b p-1">
                <button
                  type="button"
                  aria-label="Back to visibility options"
                  className="editor-text-muted inline-flex h-7 w-7 items-center justify-center rounded-sm outline-none transition-colors hover:bg-[var(--editor-settings-nav-hover-background)] hover:text-[color:var(--editor-utility-text-strong)] focus-visible:bg-[var(--editor-settings-nav-hover-background)] focus-visible:text-[color:var(--editor-utility-text-strong)]"
                  onClick={() => setView('modes')}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <div className="editor-text-strong min-w-0 flex-1 text-xs font-medium">Custom pages</div>
                <div className="editor-text-muted pr-2 text-[11px]">{value.pageIds.length} selected</div>
              </div>
              <div className="p-2">
                <SearchableMultiSelect
                  embedded
                  autoFocusInput
                  values={getInitialCustomPageIds()}
                  options={customPageOptions}
                  searchPlaceholder="Search pages"
                  emptyText="No pages match."
                  maxHeight={Math.max(120, position.maxHeight - 56)}
                  onValuesChange={handleCustomPagesChange}
                />
              </div>
            </div>
          )}
        </div>
      </PopoverSurface>
    </div>
  );
}
