import { useState, useMemo, useEffect, useRef } from 'react';
import { Settings2, TextCursorInput } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { NumberInput } from '@/components/ui/number-input';
import { PopoverTooltip } from '@/components/ui/popover';

type SliderNumberFieldProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  unitLabel?: string;
  onChange: (value: number) => void;
};

function deriveStep(min: number, max: number): number {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  return 1;
}

export function SliderNumberField({
  value,
  min,
  max,
  step,
  unitLabel,
  onChange,
}: SliderNumberFieldProps) {
  const [mode, setMode] = useState<'slider' | 'number'>('slider');
  const effectiveStep = useMemo(() => step ?? deriveStep(min, max), [step, min, max]);

  // Local state for smooth dragging — only commit on pointer up
  const [localValue, setLocalValue] = useState(value);
  const dragging = useRef(false);

  // Sync from parent when not dragging
  useEffect(() => {
    if (!dragging.current) {
      setLocalValue(value);
    }
  }, [value]);

  if (mode === 'number') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <NumberInput
            value={value}
            min={min}
            max={max}
            step={effectiveStep}
            unitLabel={unitLabel}
            onChange={onChange}
          />
        </div>
        <PopoverTooltip content="Simple">
          <button
            type="button"
            className="editor-text-muted hover:editor-text-strong flex h-6 w-6 shrink-0 items-center justify-center rounded-sm transition-colors"
            onClick={() => setMode('slider')}
            aria-label="Switch to slider"
          >
            <Settings2 className="h-3 w-3" />
          </button>
        </PopoverTooltip>
      </div>
    );
  }

  return (
    <div className="flex h-8 min-w-[150px] items-center gap-1.5">
      <span className="editor-text-muted shrink-0 text-[10px] tabular-nums">{min}{unitLabel}</span>
      <Slider
        className="min-w-0 flex-1"
        value={[localValue]}
        min={min}
        max={max}
        step={effectiveStep}
        onValueChange={([v]) => {
          dragging.current = true;
          setLocalValue(v);
        }}
        onValueCommit={([v]) => {
          dragging.current = false;
          onChange(v);
        }}
      />
      <span className="editor-text-muted shrink-0 text-[10px] tabular-nums">{max}{unitLabel}</span>
      <PopoverTooltip content="Advanced">
        <button
          type="button"
          className="editor-text-muted hover:editor-text-strong flex h-6 w-6 shrink-0 items-center justify-center rounded-sm transition-colors"
          onClick={() => setMode('number')}
          aria-label="Switch to number input"
        >
          <TextCursorInput className="h-3 w-3" />
        </button>
      </PopoverTooltip>
    </div>
  );
}
