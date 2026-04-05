import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: React.PropsWithChildren<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '');
  const resolvedValue = value ?? uncontrolledValue;

  const contextValue = React.useMemo<TabsContextValue>(
    () => ({
      value: resolvedValue,
      onValueChange: (nextValue) => {
        if (value === undefined) {
          setUncontrolledValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
    }),
    [onValueChange, resolvedValue, value],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      role="tablist"
      className={cn('editor-bg-subtle inline-flex rounded-md border p-0.5', className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: React.PropsWithChildren<{ value: string; className?: string }>) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs.');
  }

  const selected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-state={selected ? 'active' : 'inactive'}
      className={cn(
        'editor-text-muted rounded-[6px] px-2.5 py-1 text-xs font-medium',
        selected && 'editor-bg-surface editor-text-strong shadow-sm',
        className,
      )}
      onClick={() => context.onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: React.PropsWithChildren<{ value: string; className?: string }>) {
  const context = React.useContext(TabsContext);
  if (!context || context.value !== value) {
    return null;
  }

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
