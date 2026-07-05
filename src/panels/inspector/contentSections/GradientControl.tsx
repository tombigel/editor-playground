import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, HoverColorField, NumberInput, NumericUnitInlineField } from '../../InspectorControls';
import {
  createDefaultGradient,
  parseGradient,
  serializeGradient,
  type GradientStop,
  type GradientStopPosition,
  type GradientType,
  type ParsedGradient,
  type RadialExtentKeyword,
} from '../../../api/documentViewApi';

const GRADIENT_TYPES: { value: GradientType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Conic' },
];

const RADIAL_EXTENTS: { value: RadialExtentKeyword; label: string }[] = [
  { value: 'closest-side', label: 'Closest side' },
  { value: 'closest-corner', label: 'Closest corner' },
  { value: 'farthest-side', label: 'Farthest side' },
  { value: 'farthest-corner', label: 'Farthest corner' },
];

const DEFAULT_POSITION = { x: { value: 50, unit: '%' as const }, y: { value: 50, unit: '%' as const } };

/**
 * Editor for a single CSS gradient stored as text. Parses the stored string on
 * every render, applies structured edits, and serializes back through onChange.
 * Falls back to a raw-text field when the stored value is not a gradient this
 * editor round-trips (e.g. hand-authored `to top` syntax).
 */
export function GradientControl({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (nextGradientText: string) => void;
}) {
  const enabled = Boolean(value);
  const parsed = value ? parseGradient(value) : null;

  if (!enabled) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange(serializeGradient(createDefaultGradient()))}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Add gradient
      </Button>
    );
  }

  // Unparseable but present: expose the raw text so nothing is silently lost.
  if (!parsed) {
    return (
      <div className="space-y-1.5">
        <FormField label="Gradient">
          <input
            className="editor-input h-7 w-full rounded-md px-2 text-[11px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
        <RemoveButton onRemove={() => onChange('')} />
      </div>
    );
  }

  const update = (next: ParsedGradient) => onChange(serializeGradient(next));

  return (
    <div className="space-y-2">
      <FormField label="Type" layout="inline">
        <Select
          size="compact"
          value={parsed.type}
          onValueChange={(next) => update(changeType(parsed, next as GradientType))}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRADIENT_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <LeadingParams gradient={parsed} onUpdate={update} />

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
            onMove={(direction) => update(moveStop(parsed, index, direction))}
            onRemove={() => update(removeStop(parsed, index))}
          />
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => update(addStop(parsed))}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add stop
        </Button>
      </div>

      <FormField label="Repeat" layout="inline">
        <Select
          size="compact"
          value={parsed.repeating ? 'on' : 'off'}
          onValueChange={(next) => update({ ...parsed, repeating: next === 'on' })}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="on">On</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <RemoveButton onRemove={() => onChange('')} />
    </div>
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
        <Select
          size="compact"
          value={gradient.shape ?? 'ellipse'}
          onValueChange={(shape) => onUpdate({ ...gradient, shape: shape as 'circle' | 'ellipse' })}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ellipse">Ellipse</SelectItem>
            <SelectItem value="circle">Circle</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Size" layout="inline">
        <Select
          size="compact"
          value={gradient.extent ?? 'farthest-corner'}
          onValueChange={(extent) =>
            onUpdate({ ...gradient, extent: extent as RadialExtentKeyword, sizes: undefined })
          }
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
          </SelectContent>
        </Select>
      </FormField>
      <PositionFields gradient={gradient} onUpdate={onUpdate} />
    </>
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
    <FormField label="Position" layout="inline">
      <div className="flex gap-1">
        <NumericUnitInlineField
          value={`${position.x.value}${position.x.unit}`}
          units={['%', 'px']}
          aria-label="Gradient position X"
          onChange={(raw) => setAxis('x', raw)}
        />
        <NumericUnitInlineField
          value={`${position.y.value}${position.y.unit}`}
          units={['%', 'px']}
          aria-label="Gradient position Y"
          onChange={(raw) => setAxis('y', raw)}
        />
      </div>
    </FormField>
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
      <HoverColorField value={stop.color} ariaLabel={`Stop ${index + 1} color`} onChange={onColorChange} />
      <NumericUnitInlineField
        value={`${stop.position?.value ?? 0}${stop.position?.unit ?? '%'}`}
        units={['%', 'px']}
        aria-label={`Stop ${index + 1} position`}
        onChange={(raw) => {
          const next = parseAxis(raw);
          if (next) onPositionChange(next);
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        disabled={index === 0}
        aria-label={`Move stop ${index + 1} up`}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        disabled={index === count - 1}
        aria-label={`Move stop ${index + 1} down`}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        disabled={count <= 2}
        aria-label={`Remove stop ${index + 1}`}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <Button type="button" size="sm" variant="ghost" className="editor-text-muted" onClick={onRemove}>
      <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove gradient
    </Button>
  );
}

// --- pure structural transforms -------------------------------------------

function parseAxis(raw: string): { value: number; unit: '%' | 'px' } | null {
  const match = raw.match(/^(-?\d+(?:\.\d+)?)(%|px)$/);
  return match ? { value: Number.parseFloat(match[1]), unit: match[2] as '%' | 'px' } : null;
}

function changeType(gradient: ParsedGradient, type: GradientType): ParsedGradient {
  if (type === gradient.type) return gradient;
  const base: ParsedGradient = { type, repeating: gradient.repeating, stops: gradient.stops };
  if (type === 'linear') {
    return { ...base, angle: gradient.angle ?? 180 };
  }
  if (type === 'conic') {
    return { ...base, angle: gradient.angle ?? 0, position: gradient.position ?? DEFAULT_POSITION };
  }
  return { ...base, shape: 'ellipse', extent: 'farthest-corner', position: gradient.position ?? DEFAULT_POSITION };
}

function patchStop(gradient: ParsedGradient, index: number, patch: Partial<GradientStop>): ParsedGradient {
  const stops = gradient.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop));
  return { ...gradient, stops };
}

function addStop(gradient: ParsedGradient): ParsedGradient {
  const last = gradient.stops[gradient.stops.length - 1];
  return {
    ...gradient,
    stops: [...gradient.stops, { color: last?.color ?? 'rgba(0,0,0,1)', position: { value: 100, unit: '%' } }],
  };
}

function removeStop(gradient: ParsedGradient, index: number): ParsedGradient {
  if (gradient.stops.length <= 2) return gradient;
  return { ...gradient, stops: gradient.stops.filter((_, i) => i !== index) };
}

function moveStop(gradient: ParsedGradient, index: number, direction: -1 | 1): ParsedGradient {
  const target = index + direction;
  if (target < 0 || target >= gradient.stops.length) return gradient;
  const stops = [...gradient.stops];
  [stops[index], stops[target]] = [stops[target], stops[index]];
  return { ...gradient, stops };
}
