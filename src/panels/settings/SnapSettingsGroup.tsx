import { BoxSelect, Magnet, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  borderTop = true,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  borderTop?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 pl-11 ${
        borderTop ? 'editor-border-subtle border-t py-3' : 'pt-0 pb-3'
      }`}
    >
      <div className="editor-text-muted min-w-0 text-sm">{label}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="w-[72px]">
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
            className="h-8 text-right text-sm"
          />
        </div>
        <span className="editor-text-muted w-5 text-xs">{suffix}</span>
      </div>
    </div>
  );
}

export function SnapSettingsGroup({ snapSettings, onSnapSettingsChange }: SnapSettingsGroupProps) {
  const { guideSnap, containerSnap } = snapSettings;

  return (
    <>
      <div className="editor-border-subtle flex items-start justify-between gap-4 border-t py-4">
        <div className="flex min-w-0 gap-3">
          <div className="editor-icon-surface mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
            <Magnet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="editor-text-strong text-sm font-medium">Snap to guides</div>
            <div className="editor-text-muted mt-1 text-sm">Aligns to component and page edges.</div>
            {guideSnap.enabled ? (
              <div className="editor-text-muted mt-1 text-xs">Hold Alt while dragging to invert.</div>
            ) : null}
          </div>
        </div>
        <Switch
          checked={guideSnap.enabled}
          onCheckedChange={(enabled) =>
            onSnapSettingsChange({ guideSnap: { ...guideSnap, enabled } })
          }
        />
      </div>

      {guideSnap.enabled ? (
        <>
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
            borderTop={false}
            onChange={(pct) =>
              onSnapSettingsChange({ guideSnap: { ...guideSnap, power: pct / 100 } })
            }
          />
        </>
      ) : null}

      <div className="editor-border-subtle flex items-start justify-between gap-4 border-t py-4">
        <div className="flex min-w-0 gap-3">
          <div className="editor-icon-surface mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
            <BoxSelect className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="editor-text-strong text-sm font-medium">Container snap</div>
            <div className="editor-text-muted mt-1 text-sm">Magnetic pull at container boundaries.</div>
          </div>
        </div>
        <Switch
          checked={containerSnap.enabled}
          onCheckedChange={(enabled) =>
            onSnapSettingsChange({ containerSnap: { ...containerSnap, enabled } })
          }
        />
      </div>

      {containerSnap.enabled ? (
        <>
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
            borderTop={false}
            onChange={(pct) =>
              onSnapSettingsChange({ containerSnap: { ...containerSnap, power: pct / 100 } })
            }
          />
        </>
      ) : null}

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
