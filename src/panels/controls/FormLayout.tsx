import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
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
