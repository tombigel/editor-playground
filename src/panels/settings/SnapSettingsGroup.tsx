import { BoxSelect, Magnet, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ControlGroup, LabeledControlRow, SettingRow } from '@/components/ui/settings-panel';

import type { SnapSettings } from '../../editor/types';
import { DEFAULT_SNAP_SETTINGS } from '../../editor/types';

type SnapSettingsGroupProps = {
  snapSettings: SnapSettings;
  onSnapSettingsChange: (value: Partial<SnapSettings>) => void;
};

function SnapSubRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <LabeledControlRow
      label={label}
      className="gap-3 px-3 py-2"
      labelClassName="editor-text-muted text-xs font-normal"
      controlClassName="shrink-0 gap-1.5"
    >
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="w-16">
          <Input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const next = Number.parseFloat(e.target.value);
              if (Number.isFinite(next)) {
                onChange(Math.min(max, Math.max(min, next)));
              }
            }}
            className="h-7 text-right text-xs"
          />
        </div>
        <span className="editor-text-muted w-8 text-right text-xs">{suffix}</span>
      </div>
    </LabeledControlRow>
  );
}

export function SnapSettingsGroup({ snapSettings, onSnapSettingsChange }: SnapSettingsGroupProps) {
  const { guideSnap, containerSnap } = snapSettings;

  return (
    <>
      <SettingRow
        icon={Magnet}
        title="Snap to guides"
        description="Aligns to component and page edges."
        note={guideSnap.enabled ? 'Hold Alt while dragging to invert.' : undefined}
        checked={guideSnap.enabled}
        onCheckedChange={(enabled) =>
          onSnapSettingsChange({ guideSnap: { ...guideSnap, enabled } })
        }
      />
      {guideSnap.enabled && (
        <div className="editor-border-subtle editor-bg-subtle -mt-2 mb-2 ml-11 overflow-hidden rounded-lg border">
          <ControlGroup className="space-y-0">
            <SnapSubRow
              label="Snap distance"
              value={guideSnap.threshold}
              min={1}
              max={32}
              suffix="px"
              onChange={(threshold) =>
                onSnapSettingsChange({ guideSnap: { ...guideSnap, threshold } })
              }
            />
            <SnapSubRow
              label="Snap strength"
              value={Math.round(guideSnap.power * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(pct) =>
                onSnapSettingsChange({ guideSnap: { ...guideSnap, power: pct / 100 } })
              }
            />
            <SnapSubRow
              label="Max snap speed"
              value={Math.round(guideSnap.maxSpeedPxPerSecond)}
              min={0}
              max={4000}
              suffix="px/s"
              onChange={(maxSpeedPxPerSecond) =>
                onSnapSettingsChange({ guideSnap: { ...guideSnap, maxSpeedPxPerSecond } })
              }
            />
          </ControlGroup>
        </div>
      )}

      <SettingRow
        icon={BoxSelect}
        title="Container snap"
        description="Magnetic pull at container boundaries."
        checked={containerSnap.enabled}
        onCheckedChange={(enabled) =>
          onSnapSettingsChange({ containerSnap: { ...containerSnap, enabled } })
        }
      />
      {containerSnap.enabled && (
        <div className="editor-border-subtle editor-bg-subtle -mt-2 mb-2 ml-11 overflow-hidden rounded-lg border">
          <ControlGroup className="space-y-0">
            <SnapSubRow
              label="Detection distance"
              value={containerSnap.threshold}
              min={0}
              max={40}
              suffix="px"
              onChange={(threshold) =>
                onSnapSettingsChange({ containerSnap: { ...containerSnap, threshold } })
              }
            />
            <SnapSubRow
              label="Snap-in strength"
              value={Math.round(containerSnap.power * 100)}
              min={0}
              max={100}
              suffix="%"
              onChange={(pct) =>
                onSnapSettingsChange({ containerSnap: { ...containerSnap, power: pct / 100 } })
              }
            />
          </ControlGroup>
        </div>
      )}

      <div className="editor-border-subtle flex justify-end border-t py-3">
        <Button
          variant="destructive"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => onSnapSettingsChange(DEFAULT_SNAP_SETTINGS)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset snap defaults
        </Button>
      </div>
    </>
  );
}
