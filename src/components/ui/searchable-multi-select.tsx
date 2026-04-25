import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PopoverSurface } from '@/components/ui/popover';
import { SelectOptionRow } from '@/components/ui/select';
import { type SearchableSelectOption, getSearchableSelectPosition } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/lib/useClickOutside';
import { useEscapeKey } from '@/lib/useEscapeKey';

const SEARCHABLE_MULTI_SELECT_MIN_WIDTH_PX = 240;
const SEARCHABLE_MULTI_SELECT_MAX_HEIGHT_PX = 256;

export type SearchableMultiSelectOption = SearchableSelectOption;

export function getSearchableMultiSelectSummary(
  values: string[],
  options: SearchableMultiSelectOption[],
  placeholder: string,
) {
  if (values.length === 0) {
    return placeholder;
  }

  if (values.length === 1) {
    return options.find((option) => option.value === values[0])?.label ?? placeholder;
  }

  return `${values.length} selected`;
}

export function toggleSearchableMultiSelectValue(
  values: string[],
  nextValue: string,
  options: SearchableMultiSelectOption[],
) {
  const nextValues = new Set(values);
  if (nextValues.has(nextValue)) {
    nextValues.delete(nextValue);
  } else {
    nextValues.add(nextValue);
  }
  return options.filter((option) => nextValues.has(option.value)).map((option) => option.value);
}

export function SearchableMultiSelect({
  values,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  className,
  contentClassName,
  triggerClassName,
  embedded = false,
  defaultOpen = false,
  maxHeight,
  autoFocusInput = false,
  onValuesChange,
}: {
  values: string[];
  options: SearchableMultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  embedded?: boolean;
  defaultOpen?: boolean;
  maxHeight?: number;
  autoFocusInput?: boolean;
  onValuesChange: (values: string[]) => void;
}) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(defaultOpen);
  const [query, setQuery] = React.useState('');
  const [position, setPosition] = React.useState({
    top: 0,
    left: 0,
    width: SEARCHABLE_MULTI_SELECT_MIN_WIDTH_PX,
    maxHeight: maxHeight ?? SEARCHABLE_MULTI_SELECT_MAX_HEIGHT_PX,
  });

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
    if (!rect) {
      return;
    }
    setPosition(
      getSearchableSelectPosition({
        triggerRect: rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        estimatedHeight: maxHeight ?? SEARCHABLE_MULTI_SELECT_MAX_HEIGHT_PX,
      }),
    );
  }, [maxHeight]);

  React.useEffect(() => {
    if (embedded || !open) {
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
  }, [embedded, open, updatePosition]);

  const closeAndFocus = React.useCallback(() => {
    if (embedded) {
      return;
    }
    setOpen(false);
    triggerRef.current?.focus();
  }, [embedded]);

  useEscapeKey(closeAndFocus, open && !embedded);
  useClickOutside([triggerRef, surfaceRef], React.useCallback(() => setOpen(false), []), open && !embedded);

  const listMarkup = (
    <div className={cn(embedded ? 'space-y-2' : undefined, className)} data-embedded={embedded ? 'true' : 'false'} data-ui="searchable-multi-select">
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-7 text-xs"
        autoFocus={autoFocusInput}
      />
      <div
        role="listbox"
        aria-multiselectable="true"
        className={cn(
          'editor-bg-surface editor-scrollbar editor-border-subtle overflow-y-auto rounded-sm border',
          !embedded && 'p-1',
          contentClassName,
        )}
        style={{ maxHeight: `${embedded ? maxHeight ?? SEARCHABLE_MULTI_SELECT_MAX_HEIGHT_PX : position.maxHeight}px` }}
      >
        {filteredOptions.length === 0 ? (
          <div className="editor-text-muted px-3 py-2 text-xs">{emptyText}</div>
        ) : (
          filteredOptions.map((option) => {
            const selected = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                data-ui="searchable-multi-select-item"
                data-selected={selected ? 'true' : 'false'}
                className={cn(
                  'editor-searchable-multi-select-item',
                  option.dividerAfter && 'editor-border-subtle mb-1 border-b pb-3',
                )}
                onClick={() => onValuesChange(toggleSearchableMultiSelectValue(values, option.value, options))}
              >
                <span className="flex min-w-0 flex-1 items-start gap-1.5">
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden="true" data-ui="searchable-multi-select-marker">
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <SelectOptionRow
                    label={option.label}
                    description={option.description}
                    className="min-w-0 flex-1 items-start gap-0"
                    labelClassName="text-xs"
                    descriptionClassName="text-[11px]"
                  />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  if (embedded) {
    return listMarkup;
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        data-ui="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'editor-bg-surface editor-border-subtle editor-text-strong flex h-7 w-full items-center justify-between rounded-sm border px-2.5 text-sm shadow-sm',
          triggerClassName,
        )}
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
      >
        <span className="min-w-0 truncate text-left">
          {getSearchableMultiSelectSummary(values, options, placeholder)}
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
          className="editor-bg-surface editor-border-subtle fixed z-[420] overflow-hidden rounded-sm border shadow-md"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
          }}
        >
          <div className="p-2">{listMarkup}</div>
        </div>
      </PopoverSurface>
    </div>
  );
}
