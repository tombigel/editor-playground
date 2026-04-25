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
  syncWhileFocused?: boolean;
}) {
  if (!options.isControlled) {
    return options.controlledValue ?? undefined;
  }
  if (options.isFocused && !options.syncWhileFocused) {
    return options.draftValue;
  }
  return options.controlledValue ?? undefined;
}

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<'input'> & {
    syncValueWhileFocused?: boolean;
    includeDisabledStyles?: boolean;
  }
>(
  ({
    className,
    type,
    value,
    onChange,
    onFocus,
    onBlur,
    syncValueWhileFocused = false,
    includeDisabledStyles = true,
    ...props
  }, ref) => {
    const isControlled = value !== undefined;
    const [isFocused, setIsFocused] = React.useState(false);
    const [draftValue, setDraftValue] = React.useState(() => stringifyControlledInputValue(value));

    React.useEffect(() => {
      if (!isControlled || (isFocused && !syncValueWhileFocused)) {
        return;
      }
      setDraftValue(stringifyControlledInputValue(value));
    }, [isControlled, isFocused, syncValueWhileFocused, value]);

    return (
      <input
        type={type}
        data-ui="input"
        value={resolveDisplayedInputValue({
          isControlled,
          isFocused,
          controlledValue: value,
          draftValue,
          syncWhileFocused: syncValueWhileFocused,
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
          'editor-bg-surface editor-border-subtle editor-text-strong flex h-7 w-full min-w-0 rounded-sm border px-2.5 py-1 text-sm shadow-sm transition-[color,box-shadow,border-color,outline-color] outline-none placeholder:text-[color:var(--editor-input-placeholder)] focus-visible:border-[color:var(--editor-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--editor-focus-ring-strong)]',
          includeDisabledStyles ? 'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50' : null,
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
