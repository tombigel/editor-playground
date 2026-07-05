import { Input } from '@/components/ui/input';
import type { OptionsSelectorOption } from '@/components/ui/options-selector';
import { InfoTooltip } from '@/components/ui/settings-panel';
import { Switch } from '@/components/ui/switch';
import { ValueWithUnit, type ValueWithUnitOption } from '@/components/ui/value-with-unit';

const SVG_STROKE_LENGTH_UNITS: ValueWithUnitOption[] = [
  { type: 'option', value: 'px', label: 'px', inputMode: 'numeric' },
  { type: 'option', value: 'em', label: 'em', inputMode: 'numeric' },
];
const SVG_DASH_SLOT_COUNT = 6;

export const SVG_STROKE_CAP_OPTIONS: OptionsSelectorOption[] = [
  { value: 'butt', label: 'Butt cap', icon: <StrokeCapIcon cap="butt" />, tooltip: 'Butt cap: flat line ends.' },
  { value: 'round', label: 'Round cap', icon: <StrokeCapIcon cap="round" />, tooltip: 'Round cap: rounded line ends.' },
  { value: 'square', label: 'Square cap', icon: <StrokeCapIcon cap="square" />, tooltip: 'Square cap: squared line ends.' },
];

export const SVG_STROKE_JOIN_OPTIONS: OptionsSelectorOption[] = [
  { value: 'miter', label: 'Miter join', icon: <StrokeJoinIcon join="miter" />, tooltip: 'Miter join: sharp path corners.' },
  { value: 'round', label: 'Round join', icon: <StrokeJoinIcon join="round" />, tooltip: 'Round join: rounded path corners.' },
  { value: 'bevel', label: 'Bevel join', icon: <StrokeJoinIcon join="bevel" />, tooltip: 'Bevel join: flattened path corners.' },
];

function parseSvgStrokeLength(value: string | number | undefined, fallback: string) {
  const raw = typeof value === 'number' ? `${value}px` : (value ?? fallback);
  const trimmed = raw.trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(px|em)?$/);
  if (!match) {
    return { value: fallback.replace(/(px|em)$/, ''), unit: fallback.endsWith('em') ? 'em' : 'px' };
  }
  return { value: match[1], unit: match[2] ?? 'px' };
}

function formatSvgStrokeLength(value: string | number | undefined, fallback = '1px') {
  const parsed = parseSvgStrokeLength(value, fallback);
  return `${parsed.value}${parsed.unit}`;
}

export function deriveSvgStrokeJoinFromCap(cap: string | undefined) {
  if (cap === 'round') {
    return 'round';
  }
  if (cap === 'square') {
    return 'bevel';
  }
  return 'miter';
}

function StrokeCapIcon({ cap }: { cap: 'butt' | 'round' | 'square' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M6 12h12" fill="none" stroke="currentColor" strokeLinecap={cap} strokeWidth="3" />
      {cap === 'butt' ? (
        <path d="M6 7v10M18 7v10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      ) : null}
      {cap === 'square' ? (
        <path d="M4.5 9.5h3v5h-3zM16.5 9.5h3v5h-3z" fill="currentColor" opacity="0.28" />
      ) : null}
    </svg>
  );
}

function StrokeJoinIcon({ join }: { join: 'miter' | 'round' | 'bevel' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 18 12 7l7 11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="butt"
        strokeLinejoin={join}
        strokeWidth="3"
      />
    </svg>
  );
}

export function SvgStrokeLengthField({
  value,
  fallback = '1px',
  min,
  ariaLabel,
  className = 'w-[5rem]',
  onChange,
}: {
  value: string | number | undefined;
  fallback?: string;
  min?: number;
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseSvgStrokeLength(value, fallback);

  return (
    <ValueWithUnit
      mode="number-select"
      value={formatSvgStrokeLength(value, fallback)}
      options={SVG_STROKE_LENGTH_UNITS}
      inputValue={parsed.value}
      selectedOption={parsed.unit}
      min={min}
      step="any"
      ariaLabel={ariaLabel}
      className={className}
      segmentWidth={34}
      onChange={onChange}
      onInputValueChange={(nextInput) => onChange(`${nextInput}${parsed.unit}`)}
    />
  );
}

export function ScaleWithShapeControl({
  nonScaling,
  onChange,
}: {
  nonScaling: boolean | undefined;
  onChange: (nextNonScaling: boolean) => void;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium whitespace-nowrap">
        Scale with shape
        <InfoTooltip>
          When on, stroke width scales as the SVG is resized. Turn it off to keep the stroke width constant.
        </InfoTooltip>
      </span>
      <Switch
        checked={!(nonScaling ?? false)}
        aria-label="Scale stroke with shape"
        onCheckedChange={(checked) => onChange(!checked)}
      />
    </span>
  );
}

function readSvgDashSlots(value: string | undefined) {
  const parts = value?.trim() ? value.trim().split(/[\s,]+/) : [];
  return Array.from({ length: SVG_DASH_SLOT_COUNT }, (_, index) => parts[index] ?? '');
}

function composeSvgDashSlots(slots: string[]) {
  let lastValueIndex = -1;
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (slots[index]?.trim()) {
      lastValueIndex = index;
      break;
    }
  }
  if (lastValueIndex < 0) {
    return '';
  }
  return slots
    .slice(0, lastValueIndex + 1)
    .map((slot) => slot.trim() || '0')
    .join(' ');
}

export function SvgDashPatternFields({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const slots = readSvgDashSlots(value);
  return (
    <div className="grid grid-cols-6 gap-1">
      {slots.map((slot, index) => {
        const dashIndex = Math.floor(index / 2) + 1;
        const isDash = index % 2 === 0;
        const label = isDash ? `SVG dash ${dashIndex} length` : `SVG gap ${dashIndex} length`;
        return (
          <Input
            key={label}
            value={slot}
            inputMode="decimal"
            placeholder="0"
            aria-label={label}
            className="h-7 w-7 px-1 text-center text-[12px]"
            onChange={(event) => {
              const next = [...slots];
              next[index] = event.target.value;
              onChange(composeSvgDashSlots(next));
            }}
          />
        );
      })}
    </div>
  );
}
