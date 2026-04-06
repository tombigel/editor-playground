import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info, TriangleAlert } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { PopoverTooltip } from './popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from './select';
import { Switch } from './switch';
import { cn } from '@/lib/utils';

export type CompactSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function LabeledControlRow({
  label,
  children,
  className,
  labelClassName,
  controlClassName,
  controlWidth,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  controlClassName?: string;
  controlWidth?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)} data-ui="labeled-control-row">
      <Label className={cn('min-w-0 flex-1 whitespace-nowrap text-[11px] font-medium', labelClassName)}>{label}</Label>
      <div
        className={cn('ml-auto flex min-w-0 items-center justify-end', controlClassName)}
        style={controlWidth ? { width: controlWidth } : undefined}
        data-ui="labeled-control-row-control"
      >
        {children}
      </div>
    </div>
  );
}

export function LabeledFieldStack({
  label,
  children,
  className,
  labelClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={cn('space-y-0.5', className)} data-ui="labeled-field-stack">
      <Label className={cn('text-[12px] font-medium', labelClassName)}>{label}</Label>
      {children}
    </div>
  );
}

export function ControlGroup({
  children,
  className,
  separated = false,
}: {
  children: ReactNode;
  className?: string;
  separated?: boolean;
}) {
  return (
    <div
      className={cn(
        'space-y-2.5',
        separated && 'editor-border-subtle border-t pt-2.5',
        className,
      )}
      data-ui="control-group"
      data-separated={separated ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}

export function ValuePill({
  value,
  mixed = false,
  className,
}: {
  value: ReactNode;
  mixed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium',
        mixed && 'border border-dashed',
        className,
      )}
      data-ui="value-pill"
      data-mixed={mixed ? 'true' : 'false'}
    >
      {mixed ? '-' : value}
    </span>
  );
}

const NOTICE_TONE_CLASSES = {
  muted: 'editor-text-muted',
  info: 'editor-bg-subtle editor-border-subtle editor-text-muted rounded-lg border',
  success: 'rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700',
  danger: 'rounded-lg border border-red-200 bg-red-50 text-red-700',
  warning: 'editor-warning-surface editor-border-subtle editor-warning-text rounded-lg border',
} as const;

export function NoticeSurface({
  children,
  tone = 'info',
  className,
  icon,
}: {
  children: ReactNode;
  tone?: keyof typeof NOTICE_TONE_CLASSES;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn('flex items-start gap-2 px-3 py-2 text-xs leading-5', NOTICE_TONE_CLASSES[tone], className)}
      data-ui="notice-surface"
      data-tone={tone}
    >
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function InlineNotice({
  children,
  tone = 'warning',
  className,
  icon = <TriangleAlert className="h-3 w-3 shrink-0" />,
}: {
  children: ReactNode;
  tone?: 'muted' | 'warning' | 'danger';
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-[11px]',
        tone === 'muted' ? 'editor-text-muted' : tone === 'danger' ? 'text-red-700' : 'editor-warning-text',
        className,
      )}
      data-ui="inline-notice"
      data-tone={tone}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

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
          <SelectTrigger aria-label={ariaLabel} size="compact" className="text-xs">
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
