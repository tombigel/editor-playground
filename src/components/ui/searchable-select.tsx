import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PopoverSurface } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useClickOutside } from '@/lib/useClickOutside';

const SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX = 12;
const SEARCHABLE_SELECT_MIN_WIDTH_PX = 240;
const SEARCHABLE_SELECT_TRIGGER_GAP_PX = 6;
const SEARCHABLE_SELECT_MAX_HEIGHT_PX = 256;

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string[];
  description?: string;
  dividerAfter?: boolean;
};

export function getSearchableSelectPosition(options: {
  triggerRect: DOMRect;
  viewportWidth: number;
  viewportHeight: number;
  estimatedHeight?: number;
}) {
  const {
    triggerRect,
    viewportWidth,
    viewportHeight,
    estimatedHeight = SEARCHABLE_SELECT_MAX_HEIGHT_PX,
  } = options;
  const width = Math.max(triggerRect.width, SEARCHABLE_SELECT_MIN_WIDTH_PX);
  const availableWidth = Math.max(
    SEARCHABLE_SELECT_MIN_WIDTH_PX,
    viewportWidth - SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX * 2,
  );
  const clampedWidth = Math.min(width, availableWidth);
  const maxLeft = Math.max(
    SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX,
    viewportWidth - clampedWidth - SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX,
  );
  const left = Math.min(
    Math.max(SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX, triggerRect.left),
    maxLeft,
  );

  const availableBelow =
    viewportHeight - triggerRect.bottom - SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX;
  const availableAbove =
    triggerRect.top - SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX;
  const shouldOpenAbove =
    availableBelow < estimatedHeight && availableAbove > availableBelow;
  const top = shouldOpenAbove
    ? Math.max(
        SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX,
        triggerRect.top - SEARCHABLE_SELECT_TRIGGER_GAP_PX - estimatedHeight,
      )
    : Math.min(
        triggerRect.bottom + SEARCHABLE_SELECT_TRIGGER_GAP_PX,
        Math.max(
          SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX,
          viewportHeight - estimatedHeight - SEARCHABLE_SELECT_VIEWPORT_MARGIN_PX,
        ),
      );

  const maxHeight = Math.max(
    96,
    shouldOpenAbove ? availableAbove - SEARCHABLE_SELECT_TRIGGER_GAP_PX : availableBelow - SEARCHABLE_SELECT_TRIGGER_GAP_PX,
  );

  return { top, left, width: clampedWidth, maxHeight, side: shouldOpenAbove ? 'top' : 'bottom' as const };
}

export function SearchableSelect({
  value,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  className,
  contentClassName,
  triggerClassName,
  onValueChange,
}: {
  value?: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  onValueChange: (value: string) => void;
}) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [position, setPosition] = React.useState({
    top: 0,
    left: 0,
    width: SEARCHABLE_SELECT_MIN_WIDTH_PX,
    maxHeight: SEARCHABLE_SELECT_MAX_HEIGHT_PX,
  });

  const activeOption = options.find((option) => option.value === value) ?? null;
  const filteredOptions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) => {
      if (option.label.toLowerCase().includes(normalized)) {
        return true;
      }
      return option.keywords?.some((keyword) => keyword.toLowerCase().includes(normalized)) ?? false;
    });
  }, [options, query]);

  const updatePosition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(
      getSearchableSelectPosition({
        triggerRect: rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }),
    );
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
    inputRef.current?.focus();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  const closeAndFocus = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useEscapeKey(closeAndFocus, open);
  useClickOutside([triggerRef, surfaceRef], React.useCallback(() => setOpen(false), []), open);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        data-ui="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'editor-bg-surface editor-border-subtle editor-text-strong flex h-8 w-full items-center justify-between rounded-sm border px-3 text-sm shadow-sm',
          triggerClassName,
        )}
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
      >
        <span className="min-w-0 truncate text-left">
          {activeOption?.label ?? placeholder}
        </span>
        <ChevronDown className="editor-text-muted h-4 w-4 shrink-0" />
      </button>
      <PopoverSurface
        ref={surfaceRef}
        open={open}
        onOpenChange={setOpen}
        className="fixed inset-0 m-0 border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className={cn(
            'editor-bg-surface editor-border-subtle fixed z-[420] overflow-hidden rounded-sm border shadow-md',
            contentClassName,
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
          }}
        >
          <div className="editor-border-subtle border-b p-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 text-xs"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filteredOptions[0]) {
                  onValueChange(filteredOptions[0].value);
                  setOpen(false);
                }
              }}
            />
          </div>
          <div
            role="listbox"
            className="editor-scrollbar overflow-y-auto p-1"
            style={{ maxHeight: `${position.maxHeight}px` }}
          >
            {filteredOptions.length === 0 ? (
              <div className="editor-text-muted px-3 py-2 text-xs">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-ui="searchable-select-item"
                    className={cn(
                      'editor-text-strong flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-xs',
                      option.dividerAfter && 'editor-border-subtle mb-1 border-b pb-3',
                    )}
                    onClick={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="flex h-4 w-4 items-center justify-center pt-0.5">
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description ? (
                        <span className="editor-text-muted block truncate text-[11px]">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverSurface>
    </div>
  );
}
