import type { ReactNode } from 'react';
import {
  ControlGroup,
  LabeledControlRow,
} from '@/components/ui/settings-panel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium">{label}</Label>
      {children}
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
}: {
  children: ReactNode;
  className?: string;
  separated?: boolean;
}) {
  return <ControlGroup className={className} separated={separated}>{children}</ControlGroup>;
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
