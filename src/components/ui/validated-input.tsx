import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Input } from './input';
import { PopoverTooltip } from './popover';

export type InputValidationStatus = {
  state: 'idle' | 'checking' | 'valid' | 'error';
  message?: string;
};

export function InputValidationIndicator({
  status,
  label,
}: {
  status: InputValidationStatus;
  label: string;
}) {
  if (status.state === 'idle') {
    return null;
  }

  const content = status.message ?? label;
  const icon =
    status.state === 'checking' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
    ) : status.state === 'valid' ? (
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
    );
  const className =
    status.state === 'valid'
      ? 'text-emerald-600 dark:text-emerald-400'
      : status.state === 'error'
        ? 'text-amber-600 dark:text-amber-400'
        : 'editor-text-muted';

  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5"
      content={content}
    >
      <span className={cn('inline-flex h-7 w-6 items-center justify-center', className)} role="img" aria-label={content}>
        {icon}
      </span>
    </PopoverTooltip>
  );
}

export type ValidatedInputProps = Omit<React.ComponentProps<typeof Input>, 'onChange'> & {
  onValueChange: (value: string) => void;
  status?: InputValidationStatus;
  statusLabel?: string;
  wrapperClassName?: string;
};

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ onValueChange, status, statusLabel, wrapperClassName, ...inputProps }, ref) => (
    <div className={cn('flex min-w-0 items-center gap-1', wrapperClassName)}>
      <Input ref={ref} {...inputProps} onChange={(event) => onValueChange(event.target.value)} />
      {status && statusLabel ? <InputValidationIndicator status={status} label={statusLabel} /> : null}
    </div>
  ),
);
ValidatedInput.displayName = 'ValidatedInput';
