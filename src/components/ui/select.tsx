import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { PopoverSurface } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type SelectContextValue = {
  open: boolean;
};

const SelectContext = React.createContext<SelectContextValue>({ open: false });
const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  'editor-bg-surface editor-border-subtle editor-text-strong flex w-full items-center justify-between rounded-sm border px-3 shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-8 py-2 text-sm',
        compact: 'h-8 py-2 text-xs',
        small: 'h-7 py-1.5 text-[11px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

function Select({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const open = openProp ?? uncontrolledOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (openProp === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <SelectContext.Provider value={{ open }}>
      <SelectPrimitive.Root
        {...props}
        {...(openProp !== undefined ? { open: openProp } : { defaultOpen })}
        onOpenChange={handleOpenChange}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
    VariantProps<typeof selectTriggerVariants>
>(({ className, children, size, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-ui="select-trigger"
    data-size={size ?? 'default'}
    className={cn(
      selectTriggerVariants({ size }),
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="editor-text-muted size-4" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => {
  const { open } = React.useContext(SelectContext);

  return (
    <PopoverSurface
      open={open}
      popoverMode="manual"
      className="fixed inset-0 m-0 overflow-visible border-0 bg-transparent p-0 shadow-none outline-none pointer-events-none"
    >
      <SelectPrimitive.Content
        ref={ref}
        data-ui="select-content"
        className={cn(
          'editor-bg-surface editor-border-subtle editor-text-strong pointer-events-auto relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-sm border shadow-md',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
          <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
          <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </PopoverSurface>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    data-ui="select-item"
    className={cn(
      'editor-text-strong relative flex w-full cursor-default select-none items-start rounded-sm py-2 pl-8 pr-2 text-sm outline-none focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 top-2.5 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    data-ui="select-separator"
    className={cn('editor-border-subtle -mx-1 my-1 h-px border-t', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
