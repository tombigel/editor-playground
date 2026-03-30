import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
    <div className={cn('flex items-center gap-1', className)}>
      <Label className={cn('min-w-0 flex-1 whitespace-nowrap text-[11px] font-medium', labelClassName)}>{label}</Label>
      <div className={cn('ml-auto flex min-w-0 items-center justify-end', controlClassName)} style={controlWidth ? { width: controlWidth } : undefined}>
        {children}
      </div>
    </div>
  );
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
