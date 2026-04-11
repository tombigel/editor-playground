import type { ReactNode } from 'react';
import {
  ControlGroup,
  LabeledControlRow,
} from '@/components/ui/settings-panel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// ── Field layout types ────────────────────────────────────────────────────────
//
// Four layout modes for labeled inspector controls:
//
//  'stack'         Label above, field fills width (default).
//                  ┌──────────────────────┐
//                  │ Label                │
//                  │ [  control         ] │
//                  └──────────────────────┘
//
//  'inline'        Label left, control right, justify-between.
//                  ┌──────────────────────┐
//                  │ Label     [control]  │
//                  └──────────────────────┘
//
//  'inline-start'  Label left, control immediately after (no justify).
//                  ┌──────────────────────┐
//                  │ Label [control]      │
//                  └──────────────────────┘
//
//  'inline-group'  Label left, group of controls right, justify-between.
//                  ┌──────────────────────┐
//                  │ Label  [c1] [c2] [c3]│
//                  └──────────────────────┘

export type FieldLayout = 'stack' | 'inline' | 'inline-start' | 'inline-group';

export function FormField({
  label,
  layout = 'stack',
  children,
  className,
  labelClassName,
  controlClassName,
  controlWidth,
}: {
  label: string;
  layout?: FieldLayout;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  controlClassName?: string;
  controlWidth?: string;
}) {
  if (layout === 'stack') {
    return (
      <div className={cn('space-y-0.5', className)} data-ui="form-field" data-layout="stack">
        <Label className={cn('text-[11px] font-medium', labelClassName)}>{label}</Label>
        {children}
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className={cn('flex items-center gap-1', className)} data-ui="form-field" data-layout="inline">
        <Label className={cn('min-w-0 flex-1 whitespace-nowrap text-[11px] font-medium', labelClassName)}>{label}</Label>
        <div
          className={cn('ml-auto flex min-w-0 items-center justify-end', controlClassName)}
          style={controlWidth ? { width: controlWidth } : undefined}
        >
          {children}
        </div>
      </div>
    );
  }

  if (layout === 'inline-start') {
    return (
      <div className={cn('flex items-center gap-2', className)} data-ui="form-field" data-layout="inline-start">
        <Label className={cn('shrink-0 whitespace-nowrap text-[11px] font-medium', labelClassName)}>{label}</Label>
        <div className={cn('min-w-0', controlClassName)}>
          {children}
        </div>
      </div>
    );
  }

  // layout === 'inline-group'
  return (
    <div className={cn('flex items-center gap-1', className)} data-ui="form-field" data-layout="inline-group">
      <Label className={cn('shrink-0 whitespace-nowrap text-[11px] font-medium', labelClassName)}>{label}</Label>
      <div className={cn('ml-auto flex min-w-0 items-center gap-1', controlClassName)}>
        {children}
      </div>
    </div>
  );
}

export function InspectorInlineRow({
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
    <LabeledControlRow
      label={label}
      className={className}
      labelClassName={labelClassName}
      controlClassName={controlClassName}
      controlWidth={controlWidth}
    >
      {children}
    </LabeledControlRow>
  );
}

export function InspectorFieldGroup({
  children,
  className,
  separated = false,
  gap = false,
}: {
  children: ReactNode;
  className?: string;
  separated?: boolean;
  gap?: boolean;
}) {
  return <ControlGroup className={className} separated={separated} gap={gap}>{children}</ControlGroup>;
}

export function SwitchBlock({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="editor-bg-subtle editor-border-subtle rounded-md border">
      <div className="flex items-center justify-between gap-3 px-2.5 py-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="editor-text-strong text-xs font-medium">{title}</div>
            {description && (
              <div className="editor-text-muted text-[11px]">{description}</div>
            )}
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {children ? (
        <>
          <div className="editor-border-subtle mx-2.5 border-t" />
          <div className="px-2.5 py-2">{children}</div>
        </>
      ) : null}
    </div>
  );
}
