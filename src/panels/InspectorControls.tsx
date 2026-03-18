import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BetweenHorizontalStart,
  Check,
  ChevronDown,
  ListEnd,
  ListStart,
  PanelBottom,
  PanelTop,
  Proportions,
} from 'lucide-react';
import {
  convertRenderedPxToBorderRadiusUnit,
  convertRenderedPxToFontRelativeUnit,
  convertRenderedPxToGeometryUnit,
  convertRenderedPxToSpacingUnit,
  formatDisplayValue,
} from '../model/conversion';
import { buildFontFamilyStack, buildFontPickerPreviewStylesheetHref, listFontWeightOptions, resolveNearestSupportedFontWeight } from '../api/fontApi';
import { forceOpaqueColorValue } from '../model/colors';
import type { BorderStyle, DocumentFontFamily, ShadowStyle, ViewportMeasurement, WrapperNode } from '../model/types';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverSurface, PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type FontWeightOption = {
  value: number;
  label: string;
};

type OrderedFontFamilyGroups = {
  recent: DocumentFontFamily[];
  byLanguage: DocumentFontFamily[];
};

const RECENT_FONT_FAMILIES_STORAGE_KEY = 'sticky-playground.recent-font-families';
const RECENT_FONT_FAMILIES_LIMIT = 8;
const FONT_PICKER_ROW_BASE_CLASS =
  'editor-text-strong flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[13px] leading-4 outline-none transition-colors';
const FONT_PICKER_ROW_HOVER_CLASS =
  'hover:text-[color:var(--editor-accent)] hover:[background:var(--editor-select-highlight-background)]';
const FONT_PICKER_ROW_ACTIVE_CLASS =
  'text-[color:var(--editor-accent)] [background:var(--editor-select-highlight-background)]';

export function applyPersistentSelectValueChange(options: {
  nextValue: string;
  keepOpenOnSelect: boolean;
  onChange: (value: string) => void;
  reopen: () => void;
}) {
  options.onChange(options.nextValue);
  if (options.keepOpenOnSelect) {
    options.reopen();
  }
}

export function orderFontFamiliesForPicker(families: DocumentFontFamily[], recentFamilyNames: string[]): OrderedFontFamilyGroups {
  const familyMap = new Map(families.map((family) => [family.family, family]));
  const recent: DocumentFontFamily[] = [];

  for (const familyName of recentFamilyNames.map((name) => name.trim()).filter(Boolean)) {
    const family = familyMap.get(familyName);
    if (!family) {
      continue;
    }
    recent.push(family);
    familyMap.delete(familyName);
  }

  const byLanguage = [...familyMap.values()].sort((left, right) => {
    const subsetDelta = (left.subsets[0] ?? '').localeCompare(right.subsets[0] ?? '');
    if (subsetDelta !== 0) {
      return subsetDelta;
    }
    return left.family.localeCompare(right.family);
  });

  return { recent, byLanguage };
}

export type SizeFieldAxis = 'x' | 'y' | 'width' | 'height';
type SizeFieldMode =
  | 'px'
  | '%'
  | 'vw'
  | 'vh'
  | 'vmin'
  | 'vmax'
  | 'fit-content'
  | 'min-content'
  | 'max-content'
  | 'auto'
  | 'aspect-ratio';
type NumericSizeFieldMode = Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>;
type FontSizeMode = 'px' | 'em' | 'rem';
type SpacingMode = 'px' | 'em' | 'rem';
export type SpacingAxis = 'block' | 'inline' | 'top' | 'right' | 'bottom' | 'left';
export type SizeFieldDescriptor =
  | { kind: 'numeric'; mode: NumericSizeFieldMode; input: string }
  | { kind: 'keyword'; mode: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content' | 'auto'>; input: '' }
  | { kind: 'aspect-ratio'; mode: 'aspect-ratio'; input: string };

const WIDTH_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content'>[] = [
  'fit-content',
  'min-content',
  'max-content',
];
const HEIGHT_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'auto' | 'aspect-ratio'>[] = ['auto', 'aspect-ratio'];
const FONT_SIZE_UNIT_OPTIONS: FontSizeMode[] = ['px', 'em', 'rem'];
const FONT_SIZE_SUGGESTIONS_BY_UNIT: Record<FontSizeMode, number[]> = {
  px: [12, 14, 16, 18, 20, 24, 30, 36, 48, 64, 72],
  em: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4],
  rem: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4],
};
const COMPACT_UNIT_SUFFIX_WIDTH = 36;
const COMPACT_UNIT_ICON_SUFFIX_WIDTH = 40;
const MINIMAL_UNIT_SUFFIX_WIDTH = 24;

export function FontFamilySelect({
  value,
  families,
  onChange,
  mixed = false,
  systemOptionValue,
  systemLabel = 'Sans Serif',
  className,
  keepOpenOnSelect = false,
}: {
  value: string;
  families: DocumentFontFamily[];
  onChange: (value: string) => void;
  mixed?: boolean;
  systemOptionValue: string;
  systemLabel?: string;
  className?: string;
  keepOpenOnSelect?: boolean;
}) {
  const activeLabel = value === systemOptionValue ? systemLabel : value;
  const activeStyle = value !== systemOptionValue ? { fontFamily: buildFontFamilyStack(value) } : undefined;
  const [open, setOpen] = useState(false);
  const [recentFamilyNames, setRecentFamilyNames] = useState<string[]>(() => readRecentFontFamilies());
  const orderedFamilies = useMemo(() => orderFontFamiliesForPicker(families, recentFamilyNames), [families, recentFamilyNames]);
  const [frozenFamilies, setFrozenFamilies] = useState<OrderedFontFamilyGroups | null>(null);
  const visibleFamilies = open ? (frozenFamilies ?? orderedFamilies) : orderedFamilies;

  useEffect(() => {
    if (!open) {
      setFrozenFamilies(null);
      return;
    }
    setFrozenFamilies((current) => current ?? orderedFamilies);
  }, [open, orderedFamilies]);

  return (
    <Select
      value={mixed ? undefined : value}
      open={open}
      onOpenChange={setOpen}
      onValueChange={(nextValue) => {
        if (nextValue !== systemOptionValue) {
          setRecentFamilyNames((current) => {
            const next = [nextValue, ...current.filter((familyName) => familyName !== nextValue)].slice(0, RECENT_FONT_FAMILIES_LIMIT);
            writeRecentFontFamilies(next);
            return next;
          });
        }
        applyPersistentSelectValueChange({
          nextValue,
          keepOpenOnSelect,
          onChange,
          reopen: () => requestAnimationFrame(() => setOpen(true)),
        });
      }}
    >
      <SelectTrigger className={cn('h-8 min-w-0 rounded-sm text-[13px]', className)}>
        {mixed ? (
          <span>Mixed</span>
        ) : (
          <span className="min-w-0 truncate text-left" style={activeStyle}>
            {activeLabel}
          </span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-[18rem]">
        <SelectItem value={systemOptionValue} className="py-2">
          <div className="min-w-0 truncate text-[13px] font-medium">{systemLabel}</div>
        </SelectItem>
        {visibleFamilies.recent.map((family) => (
          <SelectItem key={family.family} value={family.family} className="py-2">
            <div className="min-w-0 truncate text-[13px] font-medium" style={{ fontFamily: buildFontFamilyStack(family.family) }}>
              {family.family}
            </div>
          </SelectItem>
        ))}
        {visibleFamilies.recent.length > 0 && visibleFamilies.byLanguage.length > 0 ? <SelectSeparator /> : null}
        {visibleFamilies.byLanguage.map((family) => (
          <SelectItem key={family.family} value={family.family} className="py-2">
            <div className="min-w-0 truncate text-[13px] font-medium" style={{ fontFamily: buildFontFamilyStack(family.family) }}>
              {family.family}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FontWeightSelect({
  value,
  options,
  onChange,
  familyName,
  mixed = false,
  className,
}: {
  value: number;
  options: FontWeightOption[];
  onChange: (value: string) => void;
  familyName?: string;
  mixed?: boolean;
  className?: string;
}) {
  const activeOption = options.find((option) => option.value === value) ?? options[0];
  const familyStack = familyName ? buildFontFamilyStack(familyName) : undefined;

  return (
    <Select value={mixed ? undefined : String(value)} onValueChange={onChange}>
      <SelectTrigger className={cn('h-8 rounded-sm text-[11px]', className)}>
        {mixed ? (
          <span>Mixed</span>
        ) : (
          <span style={familyStack ? { fontFamily: familyStack, fontWeight: activeOption?.value ?? value } : undefined}>
            {activeOption?.label ?? value}
          </span>
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)} className="py-2">
            <div className="min-w-0">
              <div
                className="truncate text-[13px] leading-5"
                style={familyStack ? { fontFamily: familyStack, fontWeight: option.value } : { fontWeight: option.value }}
              >
                {option.label}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FontPickerPopover({
  familyValue,
  weightValue,
  families,
  systemOptionValue,
  systemLabel = 'Sans Serif',
  onFamilyChange,
  onWeightChange,
  className,
  defaultOpen = false,
  mixedFamily = false,
  mixedWeight = false,
}: {
  familyValue: string;
  weightValue: number;
  families: DocumentFontFamily[];
  systemOptionValue: string;
  systemLabel?: string;
  onFamilyChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  className?: string;
  defaultOpen?: boolean;
  mixedFamily?: boolean;
  mixedWeight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [recentFamilyNames, setRecentFamilyNames] = useState<string[]>(() => readRecentFontFamilies());
  const orderedFamilies = useMemo(() => orderFontFamiliesForPicker(families, recentFamilyNames), [families, recentFamilyNames]);
  const [frozenFamilies, setFrozenFamilies] = useState<OrderedFontFamilyGroups | null>(null);
  const visibleFamilies = open ? (frozenFamilies ?? orderedFamilies) : orderedFamilies;
  const [activeFamilyValue, setActiveFamilyValue] = useState(familyValue);
  const [activePane, setActivePane] = useState<'family' | 'weight'>('family');
  const [focusedWeightValue, setFocusedWeightValue] = useState(weightValue);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({ top: 0, left: 0, visibility: 'hidden' });
  const previewLinkId = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const familyRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const weightRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) {
      setFrozenFamilies(null);
      return;
    }
    setFrozenFamilies((current) => current ?? orderedFamilies);
  }, [open, orderedFamilies]);

  function closePicker() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (open) {
      setActiveFamilyValue(familyValue);
      setActivePane('family');
      setFocusedWeightValue(weightValue);
    }
  }, [familyValue, open, weightValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePicker();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const familyOptions = useMemo(
    () => [
      { value: systemOptionValue, label: systemLabel },
      ...visibleFamilies.recent.map((family) => ({
        value: family.family,
        label: family.family,
        style: { fontFamily: buildFontFamilyStack(family.family) },
      })),
      ...visibleFamilies.byLanguage.map((family) => ({
        value: family.family,
        label: family.family,
        style: { fontFamily: buildFontFamilyStack(family.family) },
      })),
    ],
    [systemLabel, systemOptionValue, visibleFamilies.byLanguage, visibleFamilies.recent],
  );
  const activeFamily = activeFamilyValue === systemOptionValue ? undefined : families.find((family) => family.family === activeFamilyValue);
  const activeWeightOptions = listFontWeightOptions(activeFamily, weightValue);
  const activeWeightOption = activeWeightOptions.find((option) => option.value === weightValue) ?? activeWeightOptions[0];
  const previewFamilies = useMemo(
    () => [
      ...visibleFamilies.recent,
      ...visibleFamilies.byLanguage,
      ...(activeFamily ? [activeFamily] : []),
    ],
    [activeFamily, visibleFamilies.byLanguage, visibleFamilies.recent],
  );
  const previewHref = useMemo(
    () => open
      ? buildFontPickerPreviewStylesheetHref({
          families: previewFamilies,
          activeFamilyName: activeFamily?.family,
          activeWeights: activeWeightOptions.map((option) => option.value),
        })
      : null,
    [activeFamily?.family, activeWeightOptions, open, previewFamilies],
  );
  const triggerLabel = mixedFamily ? 'Mixed' : familyValue === systemOptionValue ? systemLabel : familyValue;
  const triggerStyle =
    mixedFamily
      ? undefined
      : familyValue !== systemOptionValue
        ? mixedWeight
          ? { fontFamily: buildFontFamilyStack(familyValue) }
          : { fontFamily: buildFontFamilyStack(familyValue), fontWeight: activeWeightOption?.value ?? weightValue }
        : mixedWeight
          ? undefined
          : { fontWeight: activeWeightOption?.value ?? weightValue };
  const activeFamilyIndex = Math.max(
    0,
    familyOptions.findIndex((option) => option.value === activeFamilyValue),
  );
  const activeWeightIndex = Math.max(
    0,
    activeWeightOptions.findIndex((option) => option.value === weightValue),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function updatePopoverPosition() {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const width = 320;
      const margin = 12;
      const nextLeft = Math.min(
        Math.max(margin, triggerRect.right - width),
        Math.max(margin, window.innerWidth - width - margin),
      );
      const nextTop = Math.min(triggerRect.bottom + 4, window.innerHeight - margin);
      setPopoverStyle({ top: nextTop, left: nextLeft, visibility: 'visible' });
    }

    updatePopoverPosition();
    const focusId = requestAnimationFrame(() => {
      familyRefs.current[activeFamilyIndex]?.focus();
    });
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      cancelAnimationFrame(focusId);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [activeFamilyIndex, open]);

  useEffect(() => {
    if (open) {
      return;
    }
    setPopoverStyle((current) => ({ ...current, visibility: 'hidden' }));
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = window.document.getElementById(previewLinkId) as HTMLLinkElement | null;
    if (!previewHref) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.href = previewHref;
      return;
    }

    const link = window.document.createElement('link');
    link.id = previewLinkId;
    link.rel = 'stylesheet';
    link.href = previewHref;
    window.document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [previewHref, previewLinkId]);

  function rememberRecentFontFamily(nextValue: string) {
    if (nextValue === systemOptionValue) {
      return;
    }

    setRecentFamilyNames((current) => {
      const next = [nextValue, ...current.filter((familyName) => familyName !== nextValue)].slice(0, RECENT_FONT_FAMILIES_LIMIT);
      writeRecentFontFamilies(next);
      return next;
    });
  }
  function focusFamilyOptionAt(index: number) {
    const clampedIndex = Math.max(0, Math.min(familyOptions.length - 1, index));
    const nextOption = familyOptions[clampedIndex];
    if (!nextOption) {
      return;
    }
    setActivePane('family');
    setActiveFamilyValue(nextOption.value);
    familyRefs.current[clampedIndex]?.focus();
  }

  function focusWeightOptionAt(index: number) {
    const clampedIndex = Math.max(0, Math.min(activeWeightOptions.length - 1, index));
    setActivePane('weight');
    weightRefs.current[clampedIndex]?.focus();
  }

  function handleFamilySelect(nextValue: string) {
    setActiveFamilyValue(nextValue);
    onFamilyChange(nextValue);
    rememberRecentFontFamily(nextValue);
    if (nextValue !== systemOptionValue) {
      const nextFamily = families.find((family) => family.family === nextValue);
      const resolvedWeight = resolveNearestSupportedFontWeight(weightValue, nextFamily);
      if (resolvedWeight !== weightValue) {
        onWeightChange(String(resolvedWeight));
      }
    }
  }

  function handleWeightSelect(nextWeight: number) {
    if (activeFamilyValue !== familyValue) {
      onFamilyChange(activeFamilyValue);
      rememberRecentFontFamily(activeFamilyValue);
    }
    onWeightChange(String(nextWeight));
    closePicker();
  }

  function handleFamilyKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusFamilyOptionAt(index + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusFamilyOptionAt(index - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusWeightOptionAt(activeWeightIndex);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFamilySelect(familyOptions[index]?.value ?? familyValue);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closePicker();
    }
  }

  function handleWeightKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusWeightOptionAt(index + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusWeightOptionAt(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusFamilyOptionAt(activeFamilyIndex);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleWeightSelect(activeWeightOptions[index]?.value ?? weightValue);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closePicker();
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full justify-start overflow-hidden rounded-sm px-[3px] text-[13px]"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 truncate text-left" style={triggerStyle}>
          {triggerLabel}
        </span>
      </Button>
      <PopoverSurface
        open={open}
        popoverMode="manual"
        className="fixed inset-0 m-0 overflow-visible border-0 bg-transparent p-0 shadow-none outline-none pointer-events-none"
      >
        <div
          className="editor-bg-surface editor-border-subtle pointer-events-auto fixed z-40 grid w-[352px] grid-cols-[minmax(0,1fr)_140px] overflow-hidden rounded-md border shadow-md"
          style={popoverStyle}
        >
          <div className="editor-scrollbar max-h-[18rem] overflow-auto p-1">
            <FontPickerRow
              label={systemLabel}
              active={activeFamilyValue === systemOptionValue}
              selected={!mixedFamily && familyValue === systemOptionValue}
              focused={activePane === 'family' && activeFamilyValue === systemOptionValue}
              ref={(node) => {
                familyRefs.current[0] = node;
              }}
              onMouseEnter={() => setActiveFamilyValue(systemOptionValue)}
              onFocus={() => {
                setActivePane('family');
                setActiveFamilyValue(systemOptionValue);
              }}
              onClick={() => handleFamilySelect(systemOptionValue)}
              onKeyDown={(event) => handleFamilyKeyDown(event, 0)}
            />
            {visibleFamilies.recent.map((family, index) => (
              <FontPickerRow
                key={family.family}
                label={family.family}
                active={activeFamilyValue === family.family}
                selected={!mixedFamily && familyValue === family.family}
                focused={activePane === 'family' && activeFamilyValue === family.family}
                ref={(node) => {
                  familyRefs.current[index + 1] = node;
                }}
                style={{ fontFamily: buildFontFamilyStack(family.family) }}
                onMouseEnter={() => setActiveFamilyValue(family.family)}
                onFocus={() => {
                  setActivePane('family');
                  setActiveFamilyValue(family.family);
                }}
                onClick={() => handleFamilySelect(family.family)}
                onKeyDown={(event) => handleFamilyKeyDown(event, index + 1)}
              />
            ))}
            {visibleFamilies.recent.length > 0 && visibleFamilies.byLanguage.length > 0 ? <div className="editor-border-subtle my-1 border-t" /> : null}
            {visibleFamilies.byLanguage.map((family, index) => (
              <FontPickerRow
                key={family.family}
                label={family.family}
                active={activeFamilyValue === family.family}
                selected={!mixedFamily && familyValue === family.family}
                focused={activePane === 'family' && activeFamilyValue === family.family}
                ref={(node) => {
                  familyRefs.current[visibleFamilies.recent.length + index + 1] = node;
                }}
                style={{ fontFamily: buildFontFamilyStack(family.family) }}
                onMouseEnter={() => setActiveFamilyValue(family.family)}
                onFocus={() => {
                  setActivePane('family');
                  setActiveFamilyValue(family.family);
                }}
                onClick={() => handleFamilySelect(family.family)}
                onKeyDown={(event) => handleFamilyKeyDown(event, visibleFamilies.recent.length + index + 1)}
              />
            ))}
          </div>
          <div className="editor-border-subtle editor-scrollbar max-h-[18rem] overflow-auto border-l p-1">
            {activeWeightOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  FONT_PICKER_ROW_BASE_CLASS,
                  activePane === 'weight' && option.value === focusedWeightValue
                    ? FONT_PICKER_ROW_ACTIVE_CLASS
                    : FONT_PICKER_ROW_HOVER_CLASS,
                )}
                style={activeFamily ? { fontFamily: buildFontFamilyStack(activeFamily.family), fontWeight: option.value } : { fontWeight: option.value }}
                ref={(node) => {
                  weightRefs.current[index] = node;
                }}
                onMouseEnter={() => {
                  setActivePane('weight');
                  setFocusedWeightValue(option.value);
                }}
                onFocus={() => {
                  setActivePane('weight');
                  setFocusedWeightValue(option.value);
                }}
                onClick={() => handleWeightSelect(option.value)}
                onKeyDown={(event) => handleWeightKeyDown(event, index)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {!mixedWeight && option.value === weightValue ? <Check className="editor-text-muted h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="truncate">{option.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </PopoverSurface>
    </div>
  );
}

const FontPickerRow = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    active: boolean;
    selected?: boolean;
    focused?: boolean;
    style?: CSSProperties;
    onMouseEnter: () => void;
    onFocus: () => void;
    onClick: () => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  }
>(function FontPickerRow({ label, active, selected = false, focused = false, style, onMouseEnter, onFocus, onClick, onKeyDown }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        FONT_PICKER_ROW_BASE_CLASS,
        active || focused ? FONT_PICKER_ROW_ACTIVE_CLASS : FONT_PICKER_ROW_HOVER_CLASS,
      )}
      style={style}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {selected ? <Check className="editor-text-muted h-3.5 w-3.5" /> : null}
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </span>
    </button>
  );
});

export function SizeInlineField({
  label,
  nodeId,
  axis,
  value,
  onChange,
  isSectionHeight = false,
  disabled = false,
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
  isSectionHeight?: boolean;
  disabled?: boolean;
}) {
  const modeOptions = getSizeModeOptions(axis, { isSectionHeight });
  const [mode, setMode] = useState<SizeFieldMode>(() => getInitialSizeFieldMode(value, axis, isSectionHeight));
  const [numericDraft, setNumericDraft] = useState(() => getInitialNumericDraft(value, axis, nodeId, isSectionHeight));
  const [aspectDraft, setAspectDraft] = useState(() => getInitialAspectDraft(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const descriptor = describeSizeFieldValue(value, axis);
    setMode(resolveSizeFieldMode(descriptor, axis, isSectionHeight));
    if (descriptor.kind === 'numeric') {
      setNumericDraft(getInitialNumericDraft(value, axis, nodeId, isSectionHeight));
    }
    if (descriptor.kind === 'aspect-ratio') {
      setAspectDraft(descriptor.input);
    }
    setInvalid(false);
  }, [axis, isSectionHeight, nodeId, value]);

  const descriptor = describeSizeFieldValue(value, axis);
  const showNumericInput = isNumericSizeFieldMode(mode);
  const showAspectInput = mode === 'aspect-ratio';
  const showKeywordTriggerOnly = !showNumericInput && !showAspectInput;
  const hasStaticNumericUnitSuffix = showNumericInput && modeOptions.selectableModes.length === 1;
  const suffixWidth = showAspectInput ? COMPACT_UNIT_ICON_SUFFIX_WIDTH : COMPACT_UNIT_SUFFIX_WIDTH;
  const usesIconSuffix = mode === 'aspect-ratio';
  const numericMin = axis === 'width' || axis === 'height' ? 0 : undefined;
  const shellClass = invalid
    ? 'editor-inline-field editor-inline-field-invalid focus-within:border-red-400'
    : 'editor-inline-field focus-within:border-blue-500';

  function commitDraft(nextMode: SizeFieldMode, nextInput?: string) {
    const candidateInput = nextInput ?? (nextMode === 'aspect-ratio' ? aspectDraft : numericDraft);
    const nextRaw = buildSizeFieldValue(axis, nextMode, candidateInput, { isSectionHeight });
    if (!nextRaw) {
      setInvalid(true);
      return false;
    }
    setInvalid(false);
    if (!disabled) {
      onChange(nextRaw);
    }
    return true;
  }

  function handleModeChange(nextMode: string) {
    const resolvedMode = nextMode as SizeFieldMode;

    if (resolvedMode === 'aspect-ratio') {
      const nextAspect = descriptor.kind === 'aspect-ratio' ? descriptor.input : aspectDraft || '16/9';
      setAspectDraft(nextAspect);
      if (commitDraft(resolvedMode, nextAspect)) {
        setMode(resolvedMode);
      }
      return;
    }

    if (
      resolvedMode === 'auto' ||
      resolvedMode === 'fit-content' ||
      resolvedMode === 'min-content' ||
      resolvedMode === 'max-content'
    ) {
      if (commitDraft(resolvedMode)) {
        setMode(resolvedMode);
      }
      return;
    }

    const convertedNumeric = convertStageMeasurementToInput(nodeId, axis, resolvedMode);
    if (convertedNumeric == null) {
      return;
    }
    setNumericDraft(convertedNumeric);
    if (commitDraft(resolvedMode, convertedNumeric)) {
      setMode(resolvedMode);
    }
  }

  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium">{label}</Label>
      {showKeywordTriggerOnly ? (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
          <SelectTrigger className="peer/keywordtrigger h-full w-full justify-start rounded-sm border-0 bg-transparent px-2.5 pr-8 text-left text-[10px] tracking-[-0.01em] whitespace-nowrap shadow-none [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-default disabled:opacity-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{renderSizeModeOptions(axis, { isSectionHeight })}</SelectContent>
          </Select>
          <div
            className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/keywordtrigger:opacity-100 peer-data-[state=open]/keywordtrigger:opacity-100 peer-disabled/keywordtrigger:opacity-0"
            style={{ width: `${COMPACT_UNIT_SUFFIX_WIDTH}px` }}
          >
            <ChevronDown className="editor-text-strong h-3 w-3" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ width: `${COMPACT_UNIT_SUFFIX_WIDTH}px` }}
          />
        </div>
      ) : (
        <div
          className={`group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          {showNumericInput ? (
            <Input
              type="number"
              step="any"
              min={numericMin}
              value={numericDraft}
              onChange={(e) => {
                const next = e.target.value;
                setNumericDraft(next);
                const nextRaw = buildSizeFieldValue(axis, mode, next, { isSectionHeight });
                setInvalid(!nextRaw);
                if (nextRaw && !disabled) {
                  onChange(nextRaw);
                }
              }}
              disabled={disabled}
              className="editor-inline-field-value peer/valueinput h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] shadow-none [appearance:textfield] [padding-inline-end:0] focus-visible:border-0 focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          ) : (
            <Input
              value={aspectDraft}
              onChange={(e) => {
                const next = e.target.value;
                setAspectDraft(next);
                const nextRaw = buildSizeFieldValue(axis, 'aspect-ratio', next);
                setInvalid(!nextRaw);
                if (nextRaw && !disabled) {
                  onChange(nextRaw);
                }
              }}
              disabled={disabled}
              className="editor-inline-field-value peer/valueinput h-full flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-3 text-[11px] shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          )}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ right: `${suffixWidth}px` }}
          />
          <div className="group/unitsuffix relative shrink-0" style={{ width: `${suffixWidth}px`, minWidth: `${suffixWidth}px` }}>
            {hasStaticNumericUnitSuffix ? (
              <div
                className="editor-inline-field-trigger editor-inline-field-trigger-static pointer-events-none relative z-10 flex h-full w-full items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center text-[10px] font-medium tracking-[-0.01em] shadow-none"
              >
                {mode}
              </div>
            ) : (
              <>
                <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
                  <SelectTrigger
                    className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full w-full justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0 disabled:cursor-default disabled:opacity-60"
                  >
                    {usesIconSuffix ? (
                      <span className="flex w-full items-center justify-center">
                        <Proportions className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <SelectValue />
                    )}
                  </SelectTrigger>
                  <SelectContent>{renderSizeModeOptions(axis, { isSectionHeight })}</SelectContent>
                </Select>
                <div
                  className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/unitsuffix:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
                  style={{ width: `${suffixWidth}px` }}
                >
                  <ChevronDown className="editor-text-strong h-3 w-3" />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
                  style={{ width: `${suffixWidth}px` }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NumericUnitInlineField({
  value,
  units,
  onChange,
  placeholder,
  className = '',
  onUnitChangeValue,
  min,
  max,
  mixed = false,
}: {
  value: string;
  units: ('px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' | 'em' | 'rem')[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onUnitChangeValue?: (nextUnit: string, currentValue: string) => string | null;
  min?: number;
  max?: number;
  mixed?: boolean;
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const initialUnit = parsed && units.includes(parsed.parsed.unit) ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(mixed ? '' : parsed ? String(parsed.parsed.value) : '');
  const [unit, setUnit] = useState(initialUnit);
  const [invalid, setInvalid] = useState(false);
  const hasUnitSelector = units.length > 1;
  const suffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    const nextUnit = nextParsed && units.includes(nextParsed.parsed.unit) ? nextParsed.parsed.unit : units[0];
    setDraft(mixed ? '' : nextParsed ? String(nextParsed.parsed.value) : '');
    setUnit(nextUnit);
    setInvalid(false);
  }, [mixed, units, value]);

  function commit(nextDraft: string, nextUnit: typeof unit) {
    const validation = validateNumberInputDraft(nextDraft, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY);
    setInvalid(!validation.isValid);
    if (validation.nextValue == null) {
      return false;
    }

    onChange(`${nextDraft}${nextUnit}`);
    return true;
  }

  return (
    <div
      className={`editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${
        invalid ? 'editor-inline-field-invalid focus-within:border-red-400' : 'focus-within:border-blue-500'
      } ${className}`.trim()}
    >
      <Input
        type="number"
        step="any"
        min={min}
        max={max}
        value={draft}
        placeholder={placeholder}
        onBlur={() => {
          const nextParsed = value ? parseUnitValue(value) : null;
          setDraft(mixed ? '' : nextParsed ? String(nextParsed.parsed.value) : '');
          setInvalid(false);
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          commit(nextDraft, unit);
        }}
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: suffixWidth }}
      />
      {hasUnitSelector ? (
        <>
          <Select
            value={unit}
            onValueChange={(nextUnit) => {
              const resolvedUnit = nextUnit as typeof unit;
              if (onUnitChangeValue) {
                const nextValue = onUnitChangeValue(resolvedUnit, value);
                if (!nextValue) {
                  return;
                }
                const nextParsed = parseUnitValue(nextValue);
                setDraft(formatDisplayValue(nextParsed.parsed.value));
                setUnit(nextParsed.parsed.unit);
                setInvalid(false);
                onChange(nextValue);
                return;
              }
              setUnit(resolvedUnit);
              commit(draft, resolvedUnit);
            }}
          >
            <SelectTrigger
              className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0"
              style={{ width: suffixWidth }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div
            className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
            style={{ width: suffixWidth }}
          >
            <ChevronDown className="editor-text-strong h-3 w-3" />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ width: suffixWidth }}
          />
        </>
      ) : (
        <div
          className="editor-inline-field-trigger editor-inline-field-trigger-static pointer-events-none relative z-10 flex h-full items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center text-[10px] font-medium tracking-[-0.01em] shadow-none"
          style={{ width: suffixWidth }}
        >
          {unit}
        </div>
      )}
    </div>
  );
}

export function HoverColorField({
  value,
  onChange,
  ariaLabel,
  fallback = '#ffffff',
  showOpacity = true,
  mixed = false,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  ariaLabel: string;
  fallback?: string;
  showOpacity?: boolean;
  mixed?: boolean;
}) {
  const resolvedValue = showOpacity ? value : forceOpaqueColorValue(value);
  const resolvedFallback = showOpacity ? fallback : forceOpaqueColorValue(fallback) || '#ffffff';

  return (
    <div className="relative flex justify-end">
      <ColorPicker
        value={resolvedValue}
        fallback={resolvedFallback}
        allowAlpha={showOpacity}
        ariaLabel={ariaLabel}
        className="editor-color-picker editor-icon-button-subtle h-8 w-8 overflow-hidden rounded-sm border shadow-sm"
        onChange={(nextValue) => onChange(showOpacity ? nextValue : forceOpaqueColorValue(nextValue) || resolvedFallback)}
      />
      {mixed ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-0.5 w-3 rounded-full bg-white/95 shadow-[0_0_0_1px_rgba(18,32,51,0.24)]" />
        </div>
      ) : null}
    </div>
  );
}

export function BorderControlGroup({
  nodeId,
  colorValue,
  widthValue,
  radiusValue,
  onColorChange,
  onWidthChange,
  onRadiusChange,
  showRadius = true,
  colorFallback = '#d8e0ea',
  widthPlaceholder = '1',
  radiusPlaceholder = '16',
}: {
  nodeId: string;
  colorValue: string;
  widthValue: string;
  radiusValue: string;
  onColorChange: (value: string) => void;
  onWidthChange: (value: string) => void;
  onRadiusChange: (value: string) => void;
  showRadius?: boolean;
  colorFallback?: string;
  widthPlaceholder?: string;
  radiusPlaceholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-end">
        <HoverColorField value={colorValue || undefined} onChange={onColorChange} ariaLabel="Border color" fallback={colorFallback} />
      </div>
      <div className={`grid gap-1.5 ${showRadius ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <LabeledUnitField
          label="Width"
          value={widthValue}
          units={['px']}
          onChange={onWidthChange}
          placeholder={widthPlaceholder}
          min={0}
        />
        {showRadius ? (
          <LabeledUnitField
            nodeId={nodeId}
            label="Radius"
            value={radiusValue}
            units={['px', '%']}
            onChange={onRadiusChange}
            placeholder={radiusPlaceholder}
            min={0}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ShadowControlGroup({
  label = 'Shadow',
  color,
  blur,
  spread,
  distance,
  angle,
  onColorChange,
  onBlurChange,
  onSpreadChange,
  onDistanceChange,
  onAngleChange,
  colorFallback,
  supportsSpread = false,
  mixed = false,
}: {
  label?: string;
  color: string;
  blur: number;
  spread?: number;
  distance: number;
  angle: number;
  onColorChange: (value: string) => void;
  onBlurChange: (value: number) => void;
  onSpreadChange?: (value: number) => void;
  onDistanceChange: (value: number) => void;
  onAngleChange: (value: number) => void;
  colorFallback: string;
  supportsSpread?: boolean;
  mixed?: boolean;
}) {
  return (
    <div className="w-full space-y-1.5">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
        <Label className="text-[11px] font-medium">{label}</Label>
        <div className="ml-auto flex items-center gap-2">
          <HoverColorField value={color || undefined} mixed={mixed} onChange={onColorChange} ariaLabel="Shadow color" fallback={colorFallback} />
        </div>
      </div>
      <div className={`grid w-full gap-1.5 ${supportsSpread ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <LabeledNumberField label="Blur" value={blur} mixed={mixed} onChange={onBlurChange} min={0} max={200} step={1} unitLabel="px" />
        {supportsSpread ? (
          <LabeledNumberField
            label="Spread"
            value={spread ?? 0}
            mixed={mixed}
            onChange={(value) => onSpreadChange?.(value)}
            min={-200}
            max={200}
            step={1}
            unitLabel="px"
          />
        ) : null}
        <LabeledNumberField label="Distance" value={distance} mixed={mixed} onChange={onDistanceChange} min={0} max={400} step={1} unitLabel="px" />
        <LabeledNumberField label="Angle" value={angle} mixed={mixed} onChange={onAngleChange} min={0} max={360} step={1} unitLabel="°" />
      </div>
    </div>
  );
}

export function LabeledNumberField({
  label,
  value,
  mixed = false,
  onChange,
  min,
  max,
  step,
  unitLabel,
}: {
  label: string;
  value: number;
  mixed?: boolean;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unitLabel?: string;
}) {
  return (
    <div className="min-w-0 w-full space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <NumberInput value={value} mixed={mixed} min={min} max={max} step={step} onChange={onChange} unitLabel={unitLabel} />
    </div>
  );
}

export function LabeledImplicitUnitField({
  label,
  value,
  units,
  onChange,
  placeholder,
  min,
  step,
}: {
  label: string;
  value: string;
  units: ('px' | '%')[];
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  step?: number | 'any';
}) {
  const parsed = value ? parseUnitValue(value) : null;
  const resolvedUnit = parsed && units.includes(parsed.parsed.unit as 'px' | '%') ? parsed.parsed.unit : units[0];
  const [draft, setDraft] = useState(parsed ? formatFieldNumber(clampFieldNumber(parsed.parsed.value)) : '');

  useEffect(() => {
    const nextParsed = value ? parseUnitValue(value) : null;
    setDraft(nextParsed ? formatFieldNumber(clampFieldNumber(nextParsed.parsed.value)) : '');
  }, [value]);

  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <Input
        type="number"
        min={min}
        step={step}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          if (nextDraft.trim() === '') {
            onChange('');
            return;
          }
          const nextValue = Number.parseFloat(nextDraft);
          if (Number.isFinite(nextValue)) {
            onChange(`${nextValue}${resolvedUnit}`);
          }
        }}
        className="h-8 rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}

export function LabeledUnitField({
  nodeId,
  label,
  value,
  units,
  onChange,
  placeholder,
  min,
}: {
  nodeId?: string;
  label: string;
  value: string;
  units: ('px' | '%')[];
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
}) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <NumericUnitInlineField
        value={value}
        units={units}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        onUnitChangeValue={
          nodeId
            ? (nextUnit) => convertStageBorderRadiusToValue(nodeId, nextUnit as 'px' | '%')
            : undefined
        }
      />
    </div>
  );
}

export function readUnifiedBorderColor(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderColor) {
    return style.borderColor;
  }
  const values = [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor].filter(
    (value): value is string => Boolean(value),
  );
  return values.length === 4 && values.every((value) => value === values[0]) ? values[0] : '';
}

export function readUnifiedBorderWidth(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderWidth) {
    return style.borderWidth.raw;
  }
  return readUnifiedParsedValue([
    style.borderTopWidth?.raw,
    style.borderRightWidth?.raw,
    style.borderBottomWidth?.raw,
    style.borderLeftWidth?.raw,
  ]);
}

export function readUnifiedBorderRadius(style: BorderStyle | undefined) {
  if (!style) {
    return '';
  }
  if (style.borderRadius) {
    return style.borderRadius.raw;
  }
  return readUnifiedParsedValue([
    style.borderTopLeftRadius?.raw,
    style.borderTopRightRadius?.raw,
    style.borderBottomRightRadius?.raw,
    style.borderBottomLeftRadius?.raw,
  ]);
}

export function readShadowFieldValues(
  style: ShadowStyle | undefined,
  fallback: { color: string; blur: number; spread: number; distance: number; angle: number },
) {
  const fallbackVector = offsetsFromDistanceAndAngle(fallback.distance, fallback.angle);
  const offsetX = style?.shadowOffsetX ?? fallbackVector.offsetX;
  const offsetY = style?.shadowOffsetY ?? fallbackVector.offsetY;
  return {
    color: style?.shadowColor ?? fallback.color,
    blur: style?.shadowBlur ?? fallback.blur,
    spread: style?.shadowSpread ?? fallback.spread,
    distance: roundShadowNumber(Math.sqrt(offsetX ** 2 + offsetY ** 2)),
    angle: roundShadowNumber(normalizeShadowAngle((Math.atan2(offsetY, offsetX) * 180) / Math.PI)),
  };
}

export function offsetsFromDistanceAndAngle(distance: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    offsetX: Math.cos(radians) * distance,
    offsetY: Math.sin(radians) * distance,
  };
}

export function getSizeModeOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const scalarUnits: NumericSizeFieldMode[] = axis === 'x' || axis === 'y' ? ['px'] : ['px', '%'];
  const viewportUnits: NumericSizeFieldMode[] = axis === 'height' && isSectionHeight ? ['vh', 'vmin', 'vmax'] : [];
  const keywords =
    axis === 'width'
      ? WIDTH_KEYWORD_OPTIONS
      : axis === 'height'
        ? HEIGHT_KEYWORD_OPTIONS
        : null;
  const selectableModes: SizeFieldMode[] = [...scalarUnits, ...(keywords ?? []), ...viewportUnits];

  return {
    scalarUnits,
    viewportUnits,
    keywords,
    selectableModes,
  };
}

function renderSizeModeOptions(
  axis: SizeFieldAxis,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const { scalarUnits, viewportUnits, keywords } = getSizeModeOptions(axis, { isSectionHeight });
  const hasKeywords = Boolean(keywords?.length);
  const hasViewportUnits = viewportUnits.length > 0;

  return (
    <>
      {scalarUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      {hasKeywords ? <SelectSeparator /> : null}
      {keywords?.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      {hasViewportUnits ? <SelectSeparator /> : null}
      {viewportUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
    </>
  );
}

export function OrderIconButton({
  label,
  shortcut,
  onClick,
  disabled,
  compact = false,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={
        <>
          <div className="leading-3.5 font-medium">{label}</div>
          {shortcut ? (
            <div className="editor-tooltip-shortcut mt-0.5 font-mono text-[10px] font-light leading-3">{shortcut}</div>
          ) : null}
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`${compact ? 'h-8 w-8' : 'h-8 w-8'} p-0 text-xs`}
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

function TypeIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

export function TextStyleIconButton({
  label,
  active,
  disabled = false,
  mixed = false,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  mixed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={mixed ? 'mixed' : active}
        onClick={onClick}
        disabled={disabled}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function FontSizeField({
  nodeId,
  value,
  onChange,
  mixed = false,
  defaultSuggestionsOpen = false,
}: {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
  mixed?: boolean;
  defaultSuggestionsOpen?: boolean;
}) {
  const parsed = parseFontSizeValue(value);
  const fontSizeSuffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;
  const [draft, setDraft] = useState(mixed ? '' : String(parsed.parsed.value));
  const [invalid, setInvalid] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(defaultSuggestionsOpen);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft(mixed ? '' : String(parsed.parsed.value));
    setInvalid(false);
  }, [mixed, parsed.parsed.unit, parsed.parsed.value]);

  useEffect(() => {
    if (!suggestionsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSuggestionsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [suggestionsOpen]);

  const suggestions = FONT_SIZE_SUGGESTIONS_BY_UNIT[parsed.parsed.unit].map((option) => ({
    value: option,
    label: `${formatFieldNumber(option)}${parsed.parsed.unit}`,
  }));

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`editor-inline-field group/sizefield relative flex h-8 min-w-0 flex-1 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${
          invalid ? 'editor-inline-field-invalid focus-within:border-red-400' : 'focus-within:border-blue-500'
        }`}
      >
        <Input
          type="number"
          min={1}
          step="any"
          value={draft}
          placeholder={mixed ? '-' : undefined}
          onBlur={() => {
            setDraft(mixed ? '' : String(parsed.parsed.value));
            setInvalid(false);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onChange={(e) => {
            const nextDraft = e.target.value;
            setDraft(nextDraft);
            const validation = validateNumberInputDraft(nextDraft, 0.0000001, Number.POSITIVE_INFINITY);
            setInvalid(!validation.isValid);
            if (validation.nextValue != null) {
              onChange(`${validation.nextValue}${parsed.parsed.unit}`);
            }
          }}
          className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent pr-5 text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
          style={{ right: fontSizeSuffixWidth }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 flex items-center text-zinc-500"
          style={{ right: `calc(${fontSizeSuffixWidth} + 4px)` }}
        >
          <ChevronDown className="h-3 w-3" />
        </div>
        <Select
          value={parsed.parsed.unit}
          onValueChange={(nextUnit) => {
            const converted = convertStageFontSizeToInput(nodeId, nextUnit as FontSizeMode);
            if (converted == null) {
              return;
            }
            onChange(`${converted}${nextUnit as FontSizeMode}`);
          }}
        >
          <SelectTrigger
            className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0"
            style={{ width: fontSizeSuffixWidth }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_UNIT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
          style={{ width: fontSizeSuffixWidth }}
        >
          <ChevronDown className="editor-text-strong h-3 w-3" />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
          style={{ width: fontSizeSuffixWidth }}
        />
      </div>
      {suggestionsOpen ? (
        <div className="editor-bg-surface editor-border-subtle editor-scrollbar absolute left-0 top-[calc(100%+4px)] z-30 max-h-[220px] min-w-full overflow-y-auto rounded-md border p-1 shadow-md">
          {suggestions.map((option) => (
            <button
              key={option.label}
              type="button"
              className="editor-text-strong flex w-full items-center justify-between rounded-sm bg-transparent px-2 py-2 text-[11px] leading-5 hover:[background:var(--editor-select-highlight-background)] focus-visible:[background:var(--editor-select-highlight-background)]"
              onClick={() => {
                const formatted = formatFieldNumber(option.value);
                setDraft(formatted);
                setInvalid(false);
                setSuggestionsOpen(false);
                onChange(`${formatted}${parsed.parsed.unit}`);
              }}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SpacingField({
  nodeId,
  axis,
  value,
  onChange,
}: {
  nodeId: string;
  axis: SpacingAxis;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseSpacingValue(value);
  const suffixWidth = `${COMPACT_UNIT_SUFFIX_WIDTH}px`;

  return (
    <div className="editor-inline-field group/sizefield relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] focus-within:border-blue-500">
      <Input
        type="number"
        min={0}
        step="any"
        value={String(parsed.parsed.value)}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (Number.isFinite(next) && next >= 0) {
            onChange(`${next}${parsed.parsed.unit}`);
          }
        }}
        className="editor-inline-field-value peer/valueinput h-full overflow-visible rounded-l-sm border-0 bg-transparent text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ right: suffixWidth }}
      />
      <Select
        value={parsed.parsed.unit}
        onValueChange={(nextUnit) => {
          const converted = convertStageSpacingToInput(nodeId, axis, nextUnit as SpacingMode);
          if (converted == null) {
            return;
          }
          onChange(`${converted}${nextUnit as SpacingMode}`);
        }}
      >
        <SelectTrigger
          className="editor-inline-field-trigger peer/unittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[10px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:ring-0"
          style={{ width: suffixWidth }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZE_UNIT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div
        className="editor-inline-field-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100 peer-disabled/unittrigger:opacity-0"
        style={{ width: suffixWidth }}
      >
        <ChevronDown className="editor-text-strong h-3 w-3" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
        style={{ width: suffixWidth }}
      />
    </div>
  );
}

export function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
  unitLabel,
  mixed = false,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unitLabel?: string;
  mixed?: boolean;
}) {
  const formattedValue = formatFieldNumber(clampFieldNumber(value));
  const [draft, setDraft] = useState(mixed ? '' : formattedValue);
  const [invalid, setInvalid] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraft(mixed ? '' : formattedValue);
    setInvalid(false);
  }, [formattedValue, isEditing, mixed]);

  function handleDraftChange(nextDraft: string) {
    setDraft(nextDraft);
    const validation = validateNumberInputDraft(nextDraft, min, max);
    setInvalid(!validation.isValid);
    if (validation.nextValue != null) {
      onChange(validation.nextValue);
    }
  }

  function handleBlur() {
    setIsEditing(false);
    setDraft(mixed ? '' : formattedValue);
    setInvalid(false);
  }

  if (unitLabel) {
    const suffixWidth = `${unitLabel === '°' ? MINIMAL_UNIT_SUFFIX_WIDTH - 2 : MINIMAL_UNIT_SUFFIX_WIDTH}px`;
    return (
      <div
        className={`editor-inline-field relative flex h-8 overflow-hidden rounded-sm border shadow-sm transition-[border-color,box-shadow] ${
          invalid ? 'editor-inline-field-invalid focus-within:border-red-400' : 'focus-within:border-blue-500'
        }`}
      >
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          placeholder="-"
          onFocus={() => setIsEditing(true)}
          onBlur={handleBlur}
          onChange={(e) => handleDraftChange(e.target.value)}
          className="editor-inline-field-value peer/valueinput h-full w-full overflow-visible rounded-l-sm border-0 bg-transparent px-2.5 text-center text-[11px] [appearance:textfield] [padding-inline-end:0] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
          style={{ right: suffixWidth }}
        />
        <div
          className="editor-inline-field-trigger editor-inline-field-trigger-static pointer-events-none relative z-10 flex h-full shrink-0 items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent pl-0 pr-0 text-center text-[10px] font-medium tracking-[-0.01em] shadow-none"
          style={{ width: suffixWidth }}
        >
          {unitLabel}
        </div>
      </div>
    );
  }

  return (
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        placeholder="-"
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onChange={(e) => handleDraftChange(e.target.value)}
        className={`h-8 w-full rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          invalid ? 'border-red-400 focus-visible:ring-red-200' : ''
        }`}
      />
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onValueChange,
  mixed = false,
}: {
  label: string | null;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (value: number) => void;
  mixed?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] font-medium">{label}</Label>
          <span className={`editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium ${mixed ? 'border border-dashed' : ''}`}>
            {mixed ? '-' : `${value}${unit}`}
          </span>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className={`editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium ${mixed ? 'border border-dashed' : ''}`}>
            {mixed ? '-' : `${value}${unit}`}
          </span>
        </div>
      )}
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onValueChange(next ?? value)} />
    </div>
  );
}

export function StickyOffsetBandField({
  topOffset,
  bottomOffset,
  min,
  max,
  step,
  unit,
  onValueChange,
  mixed = false,
}: {
  topOffset: number;
  bottomOffset: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (topOffset: number, bottomOffset: number) => void;
  mixed?: boolean;
}) {
  const topValue = clamp(topOffset, min, max);
  const bottomValue = clamp(bottomOffset, min, max);
  const sliderEndFromTop = clamp(max - bottomValue, min, max);
  const sliderStart = Math.min(topValue, sliderEndFromTop);
  const sliderEnd = Math.max(topValue, sliderEndFromTop);
  const rangeSpan = Math.max(0, sliderEnd - sliderStart);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium">Offset Range</Label>
        <span className={`editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium ${mixed ? 'border border-dashed' : ''}`}>
          {mixed ? '-' : `Span ${Math.round(rangeSpan)}${unit}`}
        </span>
      </div>
      <div className="editor-text-muted grid grid-cols-2 gap-1 text-[10px]">
        <span className="editor-bg-subtle inline-flex items-center gap-1 rounded-md px-2 py-0.5">
          <ArrowUp className="editor-text-muted h-3 w-3" />
          {mixed ? 'Top -' : `Top ${Math.round(topValue)}${unit}`}
        </span>
        <span className="editor-bg-subtle inline-flex items-center justify-end gap-1 rounded-md px-2 py-0.5 text-right">
          {mixed ? 'Bottom -' : `Bottom ${Math.round(bottomValue)}${unit}`}
          <ArrowDown className="editor-text-muted h-3 w-3" />
        </span>
      </div>
      <Slider
        value={[sliderStart, sliderEnd]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          if (next.length < 2) {
            return;
          }
          const rawStart = next[0] ?? sliderStart;
          const rawEnd = next[1] ?? sliderEnd;
          const nextStart = Math.min(rawStart, rawEnd);
          const nextEnd = Math.max(rawStart, rawEnd);
          const nextTop = clamp(Math.round(nextStart), min, max);
          const nextBottom = clamp(Math.round(max - nextEnd), min, max);
          onValueChange(nextTop, nextBottom);
        }}
      />
    </div>
  );
}

export function WrapperActions({
  node,
  canSectionBack,
  canSectionForward,
  onSectionBack,
  onSectionForward,
  onPromote,
  onDemote,
}: {
  node: WrapperNode;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onSectionBack: () => void;
  onSectionForward: () => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  const currentType =
    node.role === 'section' || node.role === 'header' || node.role === 'footer' ? node.role : null;

  if (node.role === 'section') {
    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Order</Label>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
            <OrderIconButton compact label="Move Section Up" onClick={onSectionBack} disabled={!canSectionBack}>
              <ListStart className="h-3.5 w-3.5" />
            </OrderIconButton>
            <OrderIconButton compact label="Move Section Down" onClick={onSectionForward} disabled={!canSectionForward}>
              <ListEnd className="h-3.5 w-3.5" />
            </OrderIconButton>
          </div>
        </div>
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Section type</Label>
          <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium">Section type</Label>
      <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
    </div>
  );
}

function SectionTypeSelector({
  currentType,
  onPromote,
  onDemote,
}: {
  currentType: 'section' | 'header' | 'footer' | null;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
      <TypeIconButton
        label="Set type to Section"
        active={currentType === 'section'}
        onClick={currentType === 'section' ? () => {} : onDemote}
      >
        <BetweenHorizontalStart className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Header"
        active={currentType === 'header'}
        onClick={currentType === 'header' ? () => {} : () => onPromote('header')}
      >
        <PanelTop className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Footer"
        active={currentType === 'footer'}
        onClick={currentType === 'footer' ? () => {} : () => onPromote('footer')}
      >
        <PanelBottom className="h-3.5 w-3.5" />
      </TypeIconButton>
    </div>
  );
}

export function describeSizeFieldValue(value: string, axis: SizeFieldAxis): SizeFieldDescriptor {
  const parsed =
    axis === 'width'
      ? parseWidthValue(value)
      : axis === 'height'
        ? parseHeightValue(value)
        : parseUnitValue(value);
  if ('unit' in parsed.parsed) {
    return {
      kind: 'numeric',
      mode: parsed.parsed.unit,
      input: formatNumericFieldInput(parsed.parsed.value),
    };
  }
  if (parsed.parsed.keyword === 'aspect-ratio') {
    return {
      kind: 'aspect-ratio',
      mode: 'aspect-ratio',
      input: extractAspectRatioExpression(parsed.raw),
    };
  }
  return {
    kind: 'keyword',
    mode: parsed.parsed.keyword,
    input: '',
  };
}

export function buildSizeFieldValue(
  axis: SizeFieldAxis,
  mode: SizeFieldMode,
  input: string,
  { isSectionHeight = false }: { isSectionHeight?: boolean } = {},
) {
  const allowedNumericModes = getAllowedNumericSizeModes(axis, isSectionHeight);

  if (axis === 'x' || axis === 'y') {
    if (mode !== 'px') {
      return null;
    }
    const numeric = input.trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
      return null;
    }
    const nextRaw = `${numeric}${mode}`;
    try {
      parseUnitValue(nextRaw);
      return nextRaw;
    } catch {
      return null;
    }
  }

  if (isNumericSizeFieldMode(mode) && !allowedNumericModes.includes(mode)) {
    return null;
  }

  if (mode === 'fit-content' || mode === 'min-content' || mode === 'max-content') {
    return axis === 'width' ? mode : null;
  }
  if (mode === 'auto') {
    return axis === 'height' ? mode : null;
  }
  if (mode === 'aspect-ratio') {
    if (axis !== 'height') {
      return null;
    }
    const normalized = normalizeAspectRatioExpression(input);
    return normalized ? `aspect-ratio(${normalized})` : null;
  }

  const numeric = input.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
    return null;
  }
  const numericValue = Number.parseFloat(numeric);
  if ((axis === 'width' || axis === 'height') && numericValue < 0) {
    return null;
  }
  const nextRaw = `${numeric}${mode}`;
  try {
    if (axis === 'width') {
      parseWidthValue(nextRaw);
    } else {
      parseHeightValue(nextRaw);
    }
    return nextRaw;
  } catch {
    return null;
  }
}

export function normalizeAspectRatioExpression(input: string) {
  const trimmed = input.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) > 0 ? trimmed : null;
  }

  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!fractionMatch) {
    return null;
  }

  const left = Number(fractionMatch[1]);
  const right = Number(fractionMatch[2]);
  if (left <= 0 || right <= 0) {
    return null;
  }

  return `${fractionMatch[1]}/${fractionMatch[2]}`;
}

export function convertRenderedPxToUnitValue(
  px: number,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  parentSizePx?: number,
  viewportSizePx?: number,
) {
  const viewport =
    mode === 'vw'
      ? { width: viewportSizePx ?? 0, height: 1 }
      : mode === 'vh'
        ? { width: 1, height: viewportSizePx ?? 0 }
        : mode === 'vmin' || mode === 'vmax'
          ? { width: viewportSizePx ?? 0, height: viewportSizePx ?? 0 }
          : null;
  return convertRenderedPxToGeometryUnit(px, axis, mode, {
    referenceSizePx: parentSizePx,
    viewport,
  });
}

export function convertStageMeasurementToInput(
  nodeId: string,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  ownerDocument: Document = document,
) {
  const measurement = measureStageGeometry(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const px =
    axis === 'x'
      ? measurement.offsetX
      : axis === 'y'
        ? measurement.offsetY
        : axis === 'width'
          ? measurement.width
          : measurement.height;
  const parentSize =
    axis === 'width'
      ? measurement.parentWidth
      : axis === 'height'
        ? measurement.parentHeightReliable
          ? measurement.parentHeight
          : undefined
        : undefined;
  const viewportSize =
    mode === 'vw'
      ? measurement.viewport?.width
      : mode === 'vh'
        ? measurement.viewport?.height
        : mode === 'vmin'
          ? measurement.viewport
            ? Math.min(measurement.viewport.width, measurement.viewport.height)
            : undefined
          : mode === 'vmax'
            ? measurement.viewport
              ? Math.max(measurement.viewport.width, measurement.viewport.height)
              : undefined
            : undefined;

  const converted = convertRenderedPxToUnitValue(px, axis, mode, parentSize, viewportSize);
  return converted == null ? null : formatNumericFieldInput(converted);
}

export function convertRenderedPxToFontSizeValue(
  px: number,
  mode: FontSizeMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  return convertRenderedPxToFontRelativeUnit(px, mode, reference);
}

export function convertStageFontSizeToInput(
  nodeId: string,
  mode: FontSizeMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageFontSize(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToFontSizeValue(measurement.fontSizePx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.inheritedFontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

export function convertRenderedPxToSpacingValue(
  px: number,
  mode: SpacingMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  return convertRenderedPxToSpacingUnit(px, mode, reference);
}

export function convertStageSpacingToInput(
  nodeId: string,
  axis: SpacingAxis,
  mode: SpacingMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageSpacing(nodeId, axis, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToSpacingValue(measurement.spacingPx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.fontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

export function convertRenderedPxToBorderRadiusValue(
  px: number,
  mode: 'px' | '%',
  box: { width: number; height: number },
) {
  return convertRenderedPxToBorderRadiusUnit(px, mode, box);
}

export function convertStageBorderRadiusToValue(
  nodeId: string,
  mode: 'px' | '%',
  ownerDocument: Document = document,
) {
  const measurement = measureStageBorderRadius(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToBorderRadiusValue(measurement.radiusPx, mode, measurement.box);
  return converted == null ? null : `${formatFieldNumber(converted)}${mode}`;
}

function measureStageGeometry(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const element = getStageGeometryMeasurementTarget(nodeId, ownerDocument) ?? root;
  const rect = element.getBoundingClientRect();
  const parentContent =
    element.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    root.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    element.parentElement ??
    root.parentElement;
  const parentRect = parentContent?.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    offsetX: parentRect ? rect.left - parentRect.left : rect.left,
    offsetY: parentRect ? rect.top - parentRect.top : rect.top,
    parentWidth: parentRect?.width,
    parentHeight: parentRect?.height,
    parentHeightReliable: isReliablePercentHeightReference(parentContent),
    viewport: measureEditorViewport(ownerDocument),
  };
}

function measureStageFontSize(nodeId: string, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const parentComputed = defaultView.getComputedStyle(element.parentElement ?? element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const inheritedFontSizePx = Number.parseFloat(parentComputed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  if (!Number.isFinite(fontSizePx) || !Number.isFinite(inheritedFontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    fontSizePx,
    inheritedFontSizePx,
    rootFontSizePx,
  };
}

function measureStageSpacing(nodeId: string, axis: SpacingAxis, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const top = Number.parseFloat(computed.paddingTop);
  const bottom = Number.parseFloat(computed.paddingBottom);
  const left = Number.parseFloat(computed.paddingLeft);
  const right = Number.parseFloat(computed.paddingRight);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  const spacingPx =
    axis === 'block'
      ? Number.isFinite(top) && Number.isFinite(bottom) && top > 0 && bottom > 0
        ? (top + bottom) / 2
        : Number.isFinite(top) && top > 0
          ? top
          : Number.isFinite(bottom) && bottom > 0
            ? bottom
            : null
      : axis === 'inline'
        ? Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0
          ? (left + right) / 2
          : Number.isFinite(left) && left > 0
            ? left
            : Number.isFinite(right) && right > 0
              ? right
              : null
        : axis === 'top'
          ? Number.isFinite(top)
            ? top
            : null
          : axis === 'right'
            ? Number.isFinite(right)
              ? right
              : null
            : axis === 'bottom'
              ? Number.isFinite(bottom)
                ? bottom
                : null
              : Number.isFinite(left)
                ? left
                : null;

  if (spacingPx == null || !Number.isFinite(fontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    spacingPx,
    fontSizePx,
    rootFontSizePx,
  };
}

function measureStageBorderRadius(nodeId: string, ownerDocument: Document) {
  const element = getStageStyleMeasurementTarget(nodeId, ownerDocument);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const radiusPx = parseComputedBorderRadiusPx(computed.borderTopLeftRadius, {
    width: rect.width,
    height: rect.height,
  });
  if (radiusPx == null) {
    return null;
  }

  return {
    radiusPx,
    box: {
      width: rect.width,
      height: rect.height,
    },
  };
}

function measureEditorViewport(ownerDocument: Document): ViewportMeasurement | null {
  const stageShell = ownerDocument.querySelector
    ? ownerDocument.querySelector<HTMLElement>('.stage-shell')
    : null;
  const defaultView = ownerDocument.defaultView;
  if (!stageShell || !defaultView) {
    return null;
  }

  const rawWidth = stageShell.clientWidth || stageShell.getBoundingClientRect().width;
  const rawHeight = stageShell.clientHeight || stageShell.getBoundingClientRect().height;
  if (rawWidth <= 0 || rawHeight <= 0) {
    return null;
  }

  const computed = defaultView.getComputedStyle(stageShell);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const width = rawWidth - paddingLeft - paddingRight;
  const height = rawHeight - paddingTop - paddingBottom;

  return width > 0 && height > 0 ? { width, height } : null;
}

function isReliablePercentHeightReference(parentContent: Element | null | undefined) {
  const wrapper = parentContent?.parentElement;
  if (!wrapper?.classList) {
    return true;
  }
  return !(
    wrapper.classList.contains('role-section') ||
    wrapper.classList.contains('role-header') ||
    wrapper.classList.contains('role-footer')
  );
}

function getStageStyleMeasurementTarget(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const contentWrapper = 'querySelector' in root
    ? root.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
    : null;
  if (contentWrapper) {
    return contentWrapper;
  }

  const leafContent = 'querySelector' in root
    ? root.querySelector<HTMLElement>('.stage-leaf-body > *')
    : null;
  return leafContent ?? root;
}

function getStageGeometryMeasurementTarget(nodeId: string, ownerDocument: Document) {
  const root = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!root) {
    return null;
  }

  const contentWrapper = 'querySelector' in root
    ? root.querySelector<HTMLElement>(`[data-content-wrapper-for="${nodeId}"]`)
    : null;
  return contentWrapper ?? root;
}

function parseComputedBorderRadiusPx(
  raw: string,
  box: { width: number; height: number },
) {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  const [horizontalRaw, verticalRaw = horizontalRaw] = normalized.split(/\s+/);
  const horizontal = resolveComputedRadiusSegmentPx(horizontalRaw, box.width, box);
  const vertical = resolveComputedRadiusSegmentPx(verticalRaw, box.height, box);
  if (horizontal == null || vertical == null) {
    return null;
  }
  return (horizontal + vertical) / 2;
}

function resolveComputedRadiusSegmentPx(
  raw: string,
  axisSize: number,
  box: { width: number; height: number },
) {
  if (raw.endsWith('px')) {
    const px = Number.parseFloat(raw);
    return Number.isFinite(px) ? px : null;
  }
  if (raw.endsWith('%')) {
    const percent = Number.parseFloat(raw);
    if (!Number.isFinite(percent)) {
      return null;
    }
    const basis = raw === `${percent}%` && box.width !== box.height ? axisSize : (box.width + box.height) / 2;
    return (percent / 100) * basis;
  }
  return null;
}

function formatNumericFieldInput(value: number) {
  return formatFieldNumber(value);
}

function clampFieldNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function formatFieldNumber(value: number) {
  return formatDisplayValue(value);
}

function extractAspectRatioExpression(raw: string) {
  const match = raw.trim().match(/^aspect-ratio\(\s*(.+?)\s*\)$/);
  return match?.[1] ?? '16/9';
}

function getInitialSizeFieldMode(value: string, axis: SizeFieldAxis, isSectionHeight: boolean) {
  return resolveSizeFieldMode(describeSizeFieldValue(value, axis), axis, isSectionHeight);
}

function getInitialNumericDraft(
  value: string,
  axis: SizeFieldAxis,
  nodeId: string,
  isSectionHeight: boolean,
) {
  const descriptor = describeSizeFieldValue(value, axis);
  if (descriptor.kind !== 'numeric') {
    return getDefaultNumericDraft(axis);
  }
  if (getAllowedNumericSizeModes(axis, isSectionHeight).includes(descriptor.mode)) {
    return descriptor.input;
  }
  if (typeof document === 'undefined') {
    return descriptor.input;
  }
  const fallbackMode = getDefaultNumericMode(axis, isSectionHeight);
  return convertStageMeasurementToInput(nodeId, axis, fallbackMode, document) ?? descriptor.input;
}

function getInitialAspectDraft(value: string) {
  try {
    const descriptor = describeSizeFieldValue(value, 'height');
    return descriptor.kind === 'aspect-ratio' ? descriptor.input : '16/9';
  } catch {
    return '16/9';
  }
}

function getDefaultNumericDraft(axis: SizeFieldAxis) {
  if (axis === 'width') {
    return '240';
  }
  if (axis === 'height') {
    return '120';
  }
  return '0';
}

function resolveSizeFieldMode(descriptor: SizeFieldDescriptor, axis: SizeFieldAxis, isSectionHeight: boolean): SizeFieldMode {
  if (descriptor.kind !== 'numeric') {
    return descriptor.mode;
  }
  return getAllowedNumericSizeModes(axis, isSectionHeight).includes(descriptor.mode)
    ? descriptor.mode
    : getDefaultNumericMode(axis, isSectionHeight);
}

function getAllowedNumericSizeModes(axis: SizeFieldAxis, isSectionHeight: boolean): NumericSizeFieldMode[] {
  const { scalarUnits, viewportUnits } = getSizeModeOptions(axis, { isSectionHeight });
  return [...scalarUnits, ...viewportUnits];
}

function getDefaultNumericMode(axis: SizeFieldAxis, isSectionHeight: boolean): NumericSizeFieldMode {
  return getAllowedNumericSizeModes(axis, isSectionHeight)[0] ?? 'px';
}

function isNumericSizeFieldMode(mode: SizeFieldMode): mode is NumericSizeFieldMode {
  return mode === 'px' || mode === '%' || mode === 'vw' || mode === 'vh' || mode === 'vmin' || mode === 'vmax';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readUnifiedParsedValue(values: Array<string | undefined>) {
  const defined = values.filter((value): value is string => Boolean(value));
  return defined.length === values.length && defined.every((value) => value === defined[0]) ? defined[0] : '';
}

function roundShadowNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeShadowAngle(angle: number) {
  const normalized = ((angle % 360) + 360) % 360;
  return normalized === 0 ? 0 : normalized;
}

export function validateNumberInputDraft(draft: string, min: number, max: number) {
  if (draft.trim() === '') {
    return { isValid: false, nextValue: null };
  }

  const nextValue = Number.parseFloat(draft);
  if (!Number.isFinite(nextValue) || nextValue < min || nextValue > max) {
    return { isValid: false, nextValue: null };
  }

  return { isValid: true, nextValue };
}

function readRecentFontFamilies() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_FONT_FAMILIES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, RECENT_FONT_FAMILIES_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function writeRecentFontFamilies(families: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(RECENT_FONT_FAMILIES_STORAGE_KEY, JSON.stringify(families));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}
