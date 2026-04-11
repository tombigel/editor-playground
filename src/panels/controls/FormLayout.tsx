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
  description,
  className,
  labelClassName,
  descriptionClassName,
  controlClassName,
  controlWidth,
}: {
  label: ReactNode;
  layout?: FieldLayout;
  children: ReactNode;
  description?: ReactNode;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  controlClassName?: string;
  controlWidth?: string;
}) {
  const labelContent = renderFieldLabel(label, labelClassName, {
    stack: 'text-[11px] font-medium',
    inline: 'min-w-0 flex-1 whitespace-nowrap text-[11px] font-medium',
    inlineStart: 'shrink-0 whitespace-nowrap text-[11px] font-medium',
    inlineGroup: 'shrink-0 whitespace-nowrap text-[11px] font-medium',
  });
  const descriptionContent = description ? (
    <div
      className={cn('editor-text-muted text-[11px] leading-4', descriptionClassName)}
      data-ui="form-field-description"
    >
      {description}
    </div>
  ) : null;

  if (layout === 'stack') {
    const field = (
      <div className={cn('space-y-0.5', className)} data-ui="form-field" data-layout="stack">
        {labelContent.stack}
        {children}
      </div>
    );

    return descriptionContent ? (
      <div className="space-y-0.5">
        {field}
        {descriptionContent}
      </div>
    ) : field;
  }

  if (layout === 'inline') {
    const field = (
      <div className={cn('flex items-center gap-1', className)} data-ui="form-field" data-layout="inline">
        {labelContent.inline}
        <div
          className={cn('ml-auto flex min-w-0 items-center justify-end', controlClassName)}
          style={controlWidth ? { width: controlWidth } : undefined}
        >
          {children}
        </div>
      </div>
    );

    return descriptionContent ? (
      <div className="space-y-0.5">
        {field}
        {descriptionContent}
      </div>
    ) : field;
  }

  if (layout === 'inline-start') {
    const field = (
      <div className={cn('flex items-center gap-2', className)} data-ui="form-field" data-layout="inline-start">
        {labelContent.inlineStart}
        <div className={cn('min-w-0', controlClassName)}>
          {children}
        </div>
      </div>
    );

    return descriptionContent ? (
      <div className="space-y-0.5">
        {field}
        {descriptionContent}
      </div>
    ) : field;
  }

  // layout === 'inline-group'
  const field = (
    <div className={cn('flex items-center gap-1', className)} data-ui="form-field" data-layout="inline-group">
      {labelContent.inlineGroup}
      <div
        className={cn('ml-auto flex min-w-0 items-center justify-end gap-1', controlClassName)}
        style={controlWidth ? { width: controlWidth } : undefined}
      >
        {children}
      </div>
    </div>
  );

  return descriptionContent ? (
    <div className="space-y-0.5">
      {field}
      {descriptionContent}
    </div>
  ) : field;
}

function renderFieldLabel(
  label: ReactNode,
  labelClassName: string | undefined,
  classes: {
    stack: string;
    inline: string;
    inlineStart: string;
    inlineGroup: string;
  },
) {
  if (typeof label === 'string') {
    return {
      stack: <Label className={cn(classes.stack, labelClassName)}>{label}</Label>,
      inline: <Label className={cn(classes.inline, labelClassName)}>{label}</Label>,
      inlineStart: <Label className={cn(classes.inlineStart, labelClassName)}>{label}</Label>,
      inlineGroup: <Label className={cn(classes.inlineGroup, labelClassName)}>{label}</Label>,
    };
  }

  return {
    stack: <div className={cn(classes.stack, labelClassName)}>{label}</div>,
    inline: <div className={cn(classes.inline, labelClassName)}>{label}</div>,
    inlineStart: <div className={cn(classes.inlineStart, labelClassName)}>{label}</div>,
    inlineGroup: <div className={cn(classes.inlineGroup, labelClassName)}>{label}</div>,
  };
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
