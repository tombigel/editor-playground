import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionsSelector } from '@/components/ui/options-selector';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabeledControlRow } from '@/components/ui/settings-panel';
import { Switch } from '@/components/ui/switch';
import { FormField, HoverColorField, NumberInput, NumericUnitInlineField } from '../../InspectorControls';
import {
  type GradientStop,
  type GradientStopPosition,
  type GradientType,
  type ParsedGradient,
  type RadialExtentKeyword,
  addGradientStop,
  changeGradientType,
  moveGradientStopColor,
  parseGradient,
  removeGradientStop,
  serializeGradient,
} from '../../../api/documentViewApi';

const GRADIENT_TYPES = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Conic' },
] as const;

const RADIAL_SHAPES = [
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'circle', label: 'Circle' },
] as const;

const RADIAL_EXTENTS: { value: RadialExtentKeyword; label: string }[] = [
  { value: 'closest-side', label: 'Closest side' },
  { value: 'closest-corner', label: 'Closest corner' },
  { value: 'farthest-side', label: 'Farthest side' },
  { value: 'farthest-corner', label: 'Farthest corner' },
];

const DEFAULT_POSITION = { x: { value: 50, unit: '%' as const }, y: { value: 50, unit: '%' as const } };
const AXIS_FIELD_CLASS = 'w-[4.5rem]';
const AXIS_GROUP_GRID_CLASS = 'grid grid-cols-2 gap-1.5';
const STOP_ACTION_BUTTON_CLASS = 'h-6 w-6';
const STOP_ACTION_ICON_CLASS = 'h-3.5 w-3.5';

/**
 * Editor for a single CSS gradient stored as text. Parses the stored string,
 * applies structured edits, and serializes back through onChange. The parent
 * owns the on/off toggle, so this always renders with a present gradient value;
 * it falls back to a raw-text field when the value is not one this editor
 * round-trips.
 */
export function GradientControl({
  value,
  onChange,
  clipBackgroundToText,
  onClipBackgroundToTextChange,
}: {
  value: string;
  onChange: (nextGradientText: string) => void;
  clipBackgroundToText?: boolean;
  onClipBackgroundToTextChange?: (checked: boolean) => void;
}) {
  const parsed = parseGradient(value);

  if (!parsed) {
    return (
      <div className="space-y-2">
        <FormField label="Gradient">
          <Input
            aria-label="Gradient CSS"
            className="text-[11px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
        <ClipBackgroundToTextControl
          checked={clipBackgroundToText ?? false}
          onCheckedChange={onClipBackgroundToTextChange}
        />
      </div>
    );
  }

  const update = (next: ParsedGradient) => onChange(serializeGradient(next));

  return (
    <div className="space-y-2">
      <FormField label="Type" layout="inline">
        <OptionsSelector
          ariaLabel="Gradient type"
          size="compact"
          value={parsed.type}
          options={GRADIENT_TYPES.map((t) => ({ ...t }))}
          onValueChange={(next) => update(changeGradientType(parsed, next as GradientType))}
        />
      </FormField>

      <div className="space-y-1.5">
        <div className="editor-text-muted text-[11px] font-medium">Color stops</div>
        {parsed.stops.map((stop, index) => (
          <StopRow
            // biome-ignore lint/suspicious/noArrayIndexKey: stop identity is its ordinal position
            key={index}
            stop={stop}
            index={index}
            count={parsed.stops.length}
            onColorChange={(color) => update(patchStop(parsed, index, { color }))}
            onPositionChange={(position) => update(patchStop(parsed, index, { position }))}
            onMove={(direction) => update(moveGradientStopColor(parsed, index, direction))}
            onRemove={() => update(removeGradientStop(parsed, index))}
          />
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => update(addGradientStop(parsed))}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add stop
        </Button>
      </div>

      <LeadingParams gradient={parsed} onUpdate={update} />

      <Label className="flex items-center justify-between gap-2 text-[11px] font-medium">
        Repeat
        <Switch
          checked={parsed.repeating}
          onCheckedChange={(checked) => update({ ...parsed, repeating: checked })}
        />
      </Label>
      <ClipBackgroundToTextControl
        checked={clipBackgroundToText ?? false}
        onCheckedChange={onClipBackgroundToTextChange}
      />
    </div>
  );
}

function ClipBackgroundToTextControl({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  if (!onCheckedChange) {
    return null;
  }

  return (
    <Label className="flex items-center justify-between gap-2 text-[11px] font-medium">
      Clip background to text
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </Label>
  );
}

function LeadingParams({ gradient, onUpdate }: { gradient: ParsedGradient; onUpdate: (next: ParsedGradient) => void }) {
  if (gradient.type === 'linear') {
    return (
      <FormField label="Angle" layout="inline">
        <NumberInput
          value={gradient.angle ?? 180}
          min={0}
          max={360}
          step={1}
          unitLabel="°"
          onChange={(angle) => onUpdate({ ...gradient, angle })}
        />
      </FormField>
    );
  }

  if (gradient.type === 'conic') {
    return (
      <>
        <FormField label="From" layout="inline">
          <NumberInput
            value={gradient.angle ?? 0}
            min={0}
            max={360}
            step={1}
            unitLabel="°"
            onChange={(angle) => onUpdate({ ...gradient, angle })}
          />
        </FormField>
        <PositionFields gradient={gradient} onUpdate={onUpdate} />
      </>
    );
  }

  // radial
  return (
    <>
      <FormField label="Shape" layout="inline">
        <OptionsSelector
          ariaLabel="Radial shape"
          size="compact"
          value={gradient.shape ?? 'ellipse'}
          options={RADIAL_SHAPES.map((s) => ({ ...s }))}
          onValueChange={(shape) => onUpdate({ ...gradient, shape: shape as 'circle' | 'ellipse' })}
        />
      </FormField>
      <RadialSizeFields gradient={gradient} onUpdate={onUpdate} />
      <PositionFields gradient={gradient} onUpdate={onUpdate} />
    </>
  );
}

function RadialSizeFields({ gradient, onUpdate }: { gradient: ParsedGradient; onUpdate: (next: ParsedGradient) => void }) {
  const usingExplicit = (gradient.sizes?.length ?? 0) > 0;
  const mode = usingExplicit ? 'custom' : gradient.extent ?? 'farthest-corner';
  const isEllipse = (gradient.shape ?? 'ellipse') === 'ellipse';

  const setSize = (axis: 0 | 1, raw: string) => {
    const parsedAxis = parseAxis(raw);
    if (!parsedAxis) return;
    const sizes = [...(gradient.sizes ?? [])];
    sizes[axis] = parsedAxis;
    if (!isEllipse) sizes.length = 1;
    onUpdate({ ...gradient, extent: undefined, sizes });
  };

  return (
    <>
      <FormField label="Size" layout="inline">
        <Select
          size="compact"
          value={mode}
          onValueChange={(next) => {
            if (next === 'custom') {
              const seed: GradientStopPosition = { value: 50, unit: '%' };
              onUpdate({ ...gradient, extent: undefined, sizes: isEllipse ? [seed, seed] : [seed] });
            } else {
              onUpdate({ ...gradient, extent: next as RadialExtentKeyword, sizes: undefined });
            }
          }}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIAL_EXTENTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom…</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      {usingExplicit ? (
        <GradientAxisGroup label={isEllipse ? 'Radii' : 'Radius'}>
          <GradientAxisField
            label="W"
            value={formatPosition(gradient.sizes?.[0])}
            units={['px', '%']}
            ariaLabel="Radial size X"
            onChange={(raw) => setSize(0, raw)}
          />
          {isEllipse ? (
            <GradientAxisField
              label="H"
              value={formatPosition(gradient.sizes?.[1])}
              units={['px', '%']}
              ariaLabel="Radial size Y"
              onChange={(raw) => setSize(1, raw)}
            />
          ) : null}
        </GradientAxisGroup>
      ) : null}
    </>
  );
}

export function GradientAxisGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      <div className={AXIS_GROUP_GRID_CLASS}>{children}</div>
    </div>
  );
}

/** Layout-section letter pattern: leading single-letter label + unit field, two per row. */
export function GradientAxisField({
  label,
  value,
  units,
  ariaLabel,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  units: ('px' | '%')[];
  ariaLabel: string;
  placeholder?: string;
  onChange: (raw: string) => void;
}) {
  return (
    <LabeledControlRow
      label={label}
      className="gap-1.5"
      labelClassName="w-4 shrink-0 flex-none text-right text-[12px] font-medium"
      controlClassName="ml-0 flex-1"
    >
      <NumericUnitInlineField
        value={value}
        units={units}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={onChange}
      />
    </LabeledControlRow>
  );
}

function PositionFields({ gradient, onUpdate }: { gradient: ParsedGradient; onUpdate: (next: ParsedGradient) => void }) {
  const position = gradient.position ?? DEFAULT_POSITION;
  const setAxis = (axis: 'x' | 'y', raw: string) => {
    const parsedAxis = parseAxis(raw);
    if (!parsedAxis) return;
    onUpdate({ ...gradient, position: { ...position, [axis]: parsedAxis } });
  };
  return (
    <GradientAxisGroup label="Position">
      <GradientAxisField
        label="X"
        value={formatPosition(position.x)}
        units={['%', 'px']}
        ariaLabel="Gradient position X"
        onChange={(raw) => setAxis('x', raw)}
      />
      <GradientAxisField
        label="Y"
        value={formatPosition(position.y)}
        units={['%', 'px']}
        ariaLabel="Gradient position Y"
        onChange={(raw) => setAxis('y', raw)}
      />
    </GradientAxisGroup>
  );
}

function StopRow({
  stop,
  index,
  count,
  onColorChange,
  onPositionChange,
  onMove,
  onRemove,
}: {
  stop: GradientStop;
  index: number;
  count: number;
  onColorChange: (color: string) => void;
  onPositionChange: (position: GradientStopPosition) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <StopActionButton
          label={`Move stop ${index + 1} up`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          icon={<ArrowUp className={STOP_ACTION_ICON_CLASS} />}
        />
        <StopActionButton
          label={`Move stop ${index + 1} down`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          icon={<ArrowDown className={STOP_ACTION_ICON_CLASS} />}
        />
        <StopActionButton
          label={`Remove stop ${index + 1}`}
          disabled={count <= 2}
          onClick={onRemove}
          icon={<Trash2 className={STOP_ACTION_ICON_CLASS} />}
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
        <NumericUnitInlineField
          value={formatPosition(stop.position)}
          units={['%', 'px']}
          className={AXIS_FIELD_CLASS}
          aria-label={`Stop ${index + 1} position`}
          onChange={(raw) => {
            const next = parseAxis(raw);
            if (next) onPositionChange(next);
          }}
        />
        <HoverColorField value={stop.color} ariaLabel={`Stop ${index + 1} color`} onChange={onColorChange} />
      </div>
    </div>
  );
}

function StopActionButton({
  label,
  disabled,
  icon,
  onClick,
}: {
  label: string;
  disabled: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <PopoverTooltip content={label}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={STOP_ACTION_BUTTON_CLASS}
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
      >
        {icon}
      </Button>
    </PopoverTooltip>
  );
}

// --- pure structural transforms -------------------------------------------

function formatPosition(position: GradientStopPosition | undefined): string {
  return position ? `${position.value}${position.unit}` : '';
}

function parseAxis(raw: string): GradientStopPosition | null {
  const match = raw.match(/^(-?\d+(?:\.\d+)?)(%|px)$/);
  return match ? { value: Number.parseFloat(match[1]), unit: match[2] as '%' | 'px' } : null;
}

function patchStop(gradient: ParsedGradient, index: number, patch: Partial<GradientStop>): ParsedGradient {
  const stops = gradient.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop));
  return { ...gradient, stops };
}
