import * as React from 'react';

import { cn } from '@/lib/utils';

export function stringifyControlledInputValue(value: React.ComponentProps<'input'>['value'] | null) {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return String(value);
}

export function resolveDisplayedInputValue(options: {
  isControlled: boolean;
  isFocused: boolean;
  controlledValue: React.ComponentProps<'input'>['value'] | null;
  draftValue: string;
}) {
  if (!options.isControlled) {
    return options.controlledValue ?? undefined;
  }
  return options.isFocused ? options.draftValue : options.controlledValue ?? undefined;
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, value, onChange, onFocus, onBlur, ...props }, ref) => {
    const isControlled = value !== undefined;
    const [isFocused, setIsFocused] = React.useState(false);
    const [draftValue, setDraftValue] = React.useState(() => stringifyControlledInputValue(value));

    React.useEffect(() => {
      if (!isControlled || isFocused) {
        return;
      }
      setDraftValue(stringifyControlledInputValue(value));
    }, [isControlled, isFocused, value]);

    return (
      <input
        type={type}
        data-ui="input"
        value={resolveDisplayedInputValue({
          isControlled,
          isFocused,
          controlledValue: value,
          draftValue,
        })}
        onFocus={(event) => {
          setIsFocused(true);
          setDraftValue(event.currentTarget.value);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          setDraftValue(stringifyControlledInputValue(value));
          onBlur?.(event);
        }}
        onChange={(event) => {
          if (isControlled) {
            setDraftValue(event.currentTarget.value);
          }
          onChange?.(event);
        }}
        className={cn(
          'editor-bg-surface editor-border-subtle editor-text-strong flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
