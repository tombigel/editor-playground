import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PopoverSurface } from './popover';

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used inside <Dialog>.');
  }
  return context;
}

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

type DialogContentProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> & {
  children: React.ReactNode;
  surfaceClassName?: string;
  backdropVariant?: 'default' | 'transparent';
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, surfaceClassName, backdropVariant = 'default', ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext();

    return (
      <PopoverSurface
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        popoverMode="auto"
        role="dialog"
        aria-modal="true"
        data-backdrop-variant={backdropVariant}
        className={cn(
          'ui-dialog-popover fixed inset-0 grid h-screen w-screen max-h-none max-w-none place-items-center bg-slate-950/30 p-6 backdrop-blur-[1px]',
          surfaceClassName,
        )}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onOpenChange(false);
          }
        }}
        {...props}
      >
        <div
          className={cn(
            'editor-bg-surface editor-border-subtle relative grid w-full max-w-md gap-4 rounded-xl border p-6 shadow-lg',
            className,
          )}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
          <button
            type="button"
            className="editor-icon-button-subtle absolute right-4 top-4 rounded-md border border-transparent p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </PopoverSurface>
    );
  },
);
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex justify-end gap-2', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('editor-text-strong text-lg font-semibold', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('editor-text-muted text-sm', className)} {...props} />;
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
