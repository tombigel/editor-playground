import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

const tabsListVariants = cva('inline-flex border', {
  variants: {
    variant: {
      default: 'editor-bg-subtle rounded-md p-0.5',
      segmented: 'editor-pill-subtle editor-border-subtle rounded-lg p-0.5',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const tabsTriggerVariants = cva('font-medium transition-colors', {
  variants: {
    variant: {
      default: 'editor-text-muted',
      segmented: 'editor-text-muted',
    },
    size: {
      default: 'h-7 rounded-[6px] px-2.5 text-xs',
      compact: 'h-6 rounded-sm px-2.5 text-[11px]',
      small: 'h-7 rounded-sm px-2 text-[11px]',
    },
    selected: {
      true: 'editor-bg-surface editor-text-strong shadow-sm',
      false:
        'hover:bg-[color:color-mix(in_srgb,var(--editor-accent)_12%,var(--editor-surface-background))] hover:text-[color:var(--editor-accent)] focus-visible:bg-[color:color-mix(in_srgb,var(--editor-accent)_12%,var(--editor-surface-background))] focus-visible:text-[color:var(--editor-accent)]',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

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
  variant,
  className,
  children,
}: React.PropsWithChildren<{ className?: string } & VariantProps<typeof tabsListVariants>>) {
  return (
    <div
      role="tablist"
      data-ui="tabs-list"
      data-variant={variant ?? 'default'}
      className={cn(tabsListVariants({ variant }), className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  variant,
  size,
  className,
  children,
}: React.PropsWithChildren<{
  value: string;
  className?: string;
} & VariantProps<typeof tabsTriggerVariants>>) {
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
      data-ui="tabs-trigger"
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      data-state={selected ? 'active' : 'inactive'}
      className={cn(
        tabsTriggerVariants({ variant, size, selected }),
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
