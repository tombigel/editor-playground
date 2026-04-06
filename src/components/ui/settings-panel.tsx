import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { PopoverTooltip } from './popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from './select';
import { Switch } from './switch';

export type CompactSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="editor-text-muted text-[11px] font-medium">{eyebrow}</div>
      <div className="editor-text-strong mt-1 text-lg font-medium">{title}</div>
      <div className="editor-text-muted mt-1 text-sm">{description}</div>
    </div>
  );
}

export function PlainGroup({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="editor-text-strong mb-3 text-sm font-medium">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function SettingRow({
  icon,
  title,
  description,
  note,
  tooltip,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  note?: string;
  tooltip?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const Icon = icon;

  return (
    <div className="editor-border-subtle flex items-start justify-between gap-4 border-t py-4 first:border-t-0">
      <div className="flex min-w-0 gap-3">
        <div className="editor-icon-surface mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="editor-text-strong text-sm font-medium">{title}</div>
            {tooltip ? <InfoTooltip>{tooltip}</InfoTooltip> : null}
          </div>
          <div className="editor-text-muted mt-1 text-sm">{description}</div>
          {note ? <div className="editor-text-muted mt-1 text-xs">{note}</div> : null}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function ActionRow({
  icon,
  title,
  description,
  actions,
  actionsClassName,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actions: ReactNode;
  actionsClassName?: string;
}) {
  const Icon = icon;

  return (
    <div className="editor-border-subtle flex flex-col gap-3 border-t py-3 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className={`min-w-0 ${icon ? 'flex gap-3' : ''}`}>
        {Icon ? (
          <div className="editor-icon-surface mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="editor-text-strong text-sm font-medium">{title}</div>
          <div className="editor-text-muted mt-1 text-sm">{description}</div>
        </div>
      </div>
      <div className={`shrink-0 sm:justify-self-end ${actionsClassName ?? ''}`}>{actions}</div>
    </div>
  );
}

export function NumericRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="editor-border-subtle flex items-center justify-between gap-4 border-t py-4">
      <div className="min-w-0">
        <div className="editor-text-strong text-sm font-medium">{title}</div>
        <div className="editor-text-muted mt-1 text-sm">{description}</div>
      </div>
      <div className="w-[96px] shrink-0">
        <Input
          type="number"
          min={1}
          max={500}
          value={value}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(next)) {
              onChange(next);
            }
          }}
          className="text-sm"
        />
      </div>
    </div>
  );
}

export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <PopoverTooltip
      side="bottom"
      align="end"
      className="editor-tooltip-panel w-64 rounded-lg border px-3 py-2 text-xs font-normal leading-5"
      content={children}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="editor-icon-button-subtle inline-flex h-5 w-5 rounded-full border"
        aria-label="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </Button>
    </PopoverTooltip>
  );
}

export function CompactSelectRow({
  title,
  description,
  value,
  ariaLabel,
  options,
  onChange,
}: {
  title: string;
  description?: string;
  value: string;
  ariaLabel: string;
  options: CompactSelectOption[];
  onChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="editor-bg-subtle editor-border-subtle rounded-xl border px-3 py-3">
      <div className="editor-text-strong text-sm font-medium">{title}</div>
      {description ? <div className="editor-text-muted mt-1 text-xs leading-5">{description}</div> : null}
      <div className={description ? 'mt-2' : 'mt-1.5'}>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label={ariaLabel} className="h-8 text-xs">
            <span className="truncate">{selectedOption?.label ?? value}</span>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex min-w-0 flex-col">
                  <span>{option.label}</span>
                  {option.description ? (
                    <span className="editor-text-muted mt-0.5 text-[11px] leading-4">{option.description}</span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
