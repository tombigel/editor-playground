import { forwardRef, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { buildFontFamilyStack, buildFontPickerPreviewStylesheetHref, listFontWeightOptions, resolveNearestSupportedFontWeight } from '../../api/fontApi';
import type { DocumentFontFamily } from '../../model/types';
import { parseFontSizeValue, parseSpacingValue } from '../../api/documentApi';
import { Button } from '@/components/ui/button';
import { PopoverSurface } from '@/components/ui/popover';
import { ValueWithUnit, type ValueWithUnitOption, type ValueWithUnitSuggestion } from '@/components/ui/value-with-unit';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { useClickOutside } from '@/lib/useClickOutside';

import type { OrderedFontFamilyGroups } from '../inspector/fontPickerHelpers';
import {
  RECENT_FONT_FAMILIES_LIMIT,
  orderFontFamiliesForPicker,
  readRecentFontFamilies,
  writeRecentFontFamilies,
} from '../inspector/fontPickerHelpers';
import type { SpacingAxis, FontSizeMode, SpacingMode } from '../inspector/stageConversions';
import {
  FONT_SIZE_SUGGESTIONS_BY_UNIT,
  FONT_SIZE_UNIT_OPTIONS,
  convertStageFontSizeToInput,
  convertStageSpacingToInput,
  formatFieldNumber,
  validateNumberInputDraft,
} from '../inspector/stageConversions';
import { COMPACT_UNIT_SUFFIX_WIDTH } from './NumberFields';

export function resolveFontSizeMeasurementInput({
  nodeId,
  mode,
  resolveMeasurementInput,
}: {
  nodeId: string;
  mode: FontSizeMode;
  resolveMeasurementInput?: (mode: FontSizeMode) => string | null;
}) {
  if (resolveMeasurementInput) {
    return resolveMeasurementInput(mode);
  }
  return convertStageFontSizeToInput(nodeId, mode);
}

export function resolveSpacingMeasurementInput({
  nodeId,
  axis,
  mode,
  resolveMeasurementInput,
}: {
  nodeId: string;
  axis: SpacingAxis;
  mode: SpacingMode;
  resolveMeasurementInput?: (mode: SpacingMode) => string | null;
}) {
  if (resolveMeasurementInput) {
    return resolveMeasurementInput(mode);
  }
  return convertStageSpacingToInput(nodeId, axis, mode);
}

// ---------------------------------------------------------------------------
// Font picker constants
// ---------------------------------------------------------------------------

const FONT_PICKER_ROW_BASE_CLASS =
  'editor-text-strong flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[13px] leading-4 outline-none transition-colors';
const FONT_PICKER_ROW_HOVER_CLASS =
  'hover:text-[color:var(--editor-accent)] hover:[background:var(--editor-select-highlight-background)]';
const FONT_PICKER_ROW_ACTIVE_CLASS =
  'text-[color:var(--editor-accent)] [background:var(--editor-select-highlight-background)]';

// ---------------------------------------------------------------------------
// FontPickerRow (internal)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FontPickerPopover
// ---------------------------------------------------------------------------

export const FontPickerPopover = memo(function FontPickerPopover({
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
  recentFamilyNames: externalRecentFamilies,
  onRecentFamiliesChange,
  previewStylesheetHref: externalPreviewHref,
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
  /** When provided, the picker uses this list instead of reading localStorage. */
  recentFamilyNames?: string[];
  /** Called when the recent families list changes (selection). Caller is responsible for persistence. */
  onRecentFamiliesChange?: (families: string[]) => void;
  /** When provided, the picker skips its own stylesheet injection. Caller manages the preview link. */
  previewStylesheetHref?: string | null;
}) {
  const managedRecent = externalRecentFamilies === undefined;
  const [open, setOpen] = useState(defaultOpen);
  const [internalRecentFamilies, setInternalRecentFamilies] = useState<string[]>(() => managedRecent ? readRecentFontFamilies() : []);
  const recentFamilyNamesResolved = externalRecentFamilies ?? internalRecentFamilies;
  const setRecentFamilyNames = managedRecent ? setInternalRecentFamilies : (_updater: (current: string[]) => string[]) => {};
  const orderedFamilies = useMemo(() => orderFontFamiliesForPicker(families, recentFamilyNamesResolved), [families, recentFamilyNamesResolved]);
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

  const closePicker = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) {
      setActiveFamilyValue(familyValue);
      setActivePane('family');
      setFocusedWeightValue(weightValue);
    }
  }, [familyValue, open, weightValue]);

  useEscapeKey(closePicker, open);
  useClickOutside(rootRef, useCallback(() => setOpen(false), []), open);

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

  // When the caller provides previewStylesheetHref, they own the <link> element.
  // Otherwise, manage it internally (legacy behavior).
  useEffect(() => {
    if (externalPreviewHref !== undefined) {
      return; // Caller manages the stylesheet.
    }

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
  }, [externalPreviewHref, previewHref, previewLinkId]);

  function rememberRecentFontFamily(nextValue: string) {
    if (nextValue === systemOptionValue) {
      return;
    }

    const computeNext = (current: string[]) =>
      [nextValue, ...current.filter((familyName) => familyName !== nextValue)].slice(0, RECENT_FONT_FAMILIES_LIMIT);

    if (onRecentFamiliesChange) {
      const next = computeNext(recentFamilyNamesResolved);
      onRecentFamiliesChange(next);
    } else {
      setRecentFamilyNames((current) => {
        const next = computeNext(current);
        writeRecentFontFamilies(next);
        return next;
      });
    }
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
        className="editor-font-picker-trigger h-8 w-full justify-between overflow-hidden rounded-sm px-2 text-[13px]"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 truncate text-left" style={triggerStyle}>
          {triggerLabel}
        </span>
        <ChevronDown className="editor-text-muted size-4 shrink-0" />
      </Button>
      <PopoverSurface
        open={open}
        popoverMode="manual"
        className="fixed inset-0 m-0 overflow-visible border-0 bg-transparent p-0 shadow-none outline-none pointer-events-none"
      >
        <div
          className="editor-bg-surface editor-border-subtle pointer-events-auto fixed z-40 grid w-[352px] grid-cols-[minmax(0,1fr)_140px] overflow-hidden rounded-sm border shadow-md"
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
});

// ---------------------------------------------------------------------------
// FontSizeField
// ---------------------------------------------------------------------------

export function FontSizeField({
  nodeId,
  value,
  onChange,
  mixed = false,
  mixedUnit = mixed,
  defaultSuggestionsOpen = false,
  resolveMeasurementInput,
}: {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
  mixed?: boolean;
  mixedUnit?: boolean;
  defaultSuggestionsOpen?: boolean;
  resolveMeasurementInput?: (mode: FontSizeMode) => string | null;
}) {
  const parsed = parseFontSizeValue(value);
  const [draft, setDraft] = useState(mixed ? '' : String(parsed.parsed.value));
  const [invalid, setInvalid] = useState(false);
  const options: ValueWithUnitOption[] = FONT_SIZE_UNIT_OPTIONS.map((option) => ({
    type: 'option',
    value: option,
    label: option,
    inputMode: 'numeric',
  }));
  const suggestions: ValueWithUnitSuggestion[] = FONT_SIZE_SUGGESTIONS_BY_UNIT[parsed.parsed.unit].map((option) => ({
    value: formatFieldNumber(option),
    label: `${formatFieldNumber(option)}${parsed.parsed.unit}`,
  }));

  useEffect(() => {
    setDraft(mixed ? '' : String(parsed.parsed.value));
    setInvalid(false);
  }, [mixed, parsed.parsed.value]);

  return (
    <ValueWithUnit
      mode="number-select"
      value={value}
      onChange={onChange}
      options={options}
      inputValue={draft}
      selectedOption={parsed.parsed.unit}
      min={1}
      step="any"
      mixed={mixed}
      mixedSegment={mixedUnit}
      invalid={invalid}
      segmentWidth={COMPACT_UNIT_SUFFIX_WIDTH}
      suggestions={suggestions}
      defaultSuggestionsOpen={defaultSuggestionsOpen}
      onInputBlur={() => {
        setDraft(mixed ? '' : String(parsed.parsed.value));
        setInvalid(false);
      }}
      onInputValueChange={(nextDraft) => {
        setDraft(nextDraft);
        const validation = validateNumberInputDraft(nextDraft, 0.0000001, Number.POSITIVE_INFINITY);
        setInvalid(!validation.isValid);
        if (validation.nextValue != null) {
          onChange(`${validation.nextValue}${parsed.parsed.unit}`);
        }
      }}
      onResolveOptionValue={(nextUnit) => {
        const converted = resolveFontSizeMeasurementInput({
          nodeId,
          mode: nextUnit as FontSizeMode,
          resolveMeasurementInput,
        });
        if (converted == null) {
          return null;
        }
        return `${converted}${nextUnit as FontSizeMode}`;
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// SpacingField
// ---------------------------------------------------------------------------

export function SpacingField({
  nodeId,
  axis,
  value,
  onChange,
  resolveMeasurementInput,
}: {
  nodeId: string;
  axis: SpacingAxis;
  value: string;
  onChange: (value: string) => void;
  resolveMeasurementInput?: (mode: SpacingMode) => string | null;
}) {
  const parsed = parseSpacingValue(value);
  const options: ValueWithUnitOption[] = FONT_SIZE_UNIT_OPTIONS.map((option) => ({
    type: 'option',
    value: option,
    label: option,
    inputMode: 'numeric',
  }));

  return (
    <ValueWithUnit
      mode="number-select"
      value={value}
      onChange={onChange}
      options={options}
      inputValue={String(parsed.parsed.value)}
      selectedOption={parsed.parsed.unit}
      min={0}
      step="any"
      segmentWidth={COMPACT_UNIT_SUFFIX_WIDTH}
      onResolveOptionValue={(nextUnit) => {
        const converted = resolveSpacingMeasurementInput({
          nodeId,
          axis,
          mode: nextUnit as SpacingMode,
          resolveMeasurementInput,
        });
        if (converted == null) {
          return null;
        }
        return `${converted}${nextUnit as SpacingMode}`;
      }}
    />
  );
}
