import { memo } from 'react';
import { forceOpaqueColorValue } from '../../model/colors';
import { ColorPicker } from '@/components/ui/color-picker';
import { Label } from '@/components/ui/label';
import { LabeledNumberField, LabeledUnitField } from './NumberFields';

// ---------------------------------------------------------------------------
// HoverColorField
// ---------------------------------------------------------------------------

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
    <div className="flex justify-end">
      <div className="relative">
        <ColorPicker
          value={resolvedValue}
          fallback={resolvedFallback}
          allowAlpha={showOpacity}
          ariaLabel={ariaLabel}
          className="editor-color-picker editor-icon-button-subtle h-8 w-8 overflow-hidden rounded-md border shadow-sm"
          onChange={(nextValue) => onChange(showOpacity ? nextValue : forceOpaqueColorValue(nextValue) || resolvedFallback)}
        />
        {mixed ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-0.5 w-3 rounded-full bg-white/95 shadow-[0_0_0_1px_rgba(18,32,51,0.24)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BorderControlGroup
// ---------------------------------------------------------------------------

export const BorderControlGroup = memo(function BorderControlGroup({
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
});

// ---------------------------------------------------------------------------
// ShadowControlGroup
// ---------------------------------------------------------------------------

export const ShadowControlGroup = memo(function ShadowControlGroup({
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
});
