import * as React from 'react';
import { Check, ChevronRight, ChevronsRight, MoreHorizontal } from 'lucide-react';
import { PopoverSurface } from './popover';
import { cn } from '@/lib/utils';

export type MenubarSessionState = {
  activeMenuId: string | null;
  hoverNavigationEnabled: boolean;
};

export function createClosedMenubarSession(): MenubarSessionState {
  return {
    activeMenuId: null,
    hoverNavigationEnabled: false,
  };
}

export function openMenubarSession(
  state: MenubarSessionState,
  menuId: string,
  options?: { viaHover?: boolean },
): MenubarSessionState {
  if (options?.viaHover && !state.hoverNavigationEnabled) {
    return state;
  }
  return {
    activeMenuId: menuId,
    hoverNavigationEnabled: true,
  };
}

export function closeMenubarSession(): MenubarSessionState {
  return createClosedMenubarSession();
}

type MenubarRootContextValue = {
  menubarOwnerId: string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null, options?: { viaHover?: boolean }) => void;
  closeAll: () => void;
  moveMenuFocus: (currentTrigger: HTMLButtonElement, direction: 1 | -1) => void;
  hoverNavigationEnabled: boolean;
};

const MenubarRootContext = React.createContext<MenubarRootContextValue | null>(null);

function useMenubarRootContext() {
  const context = React.useContext(MenubarRootContext);
  if (!context) {
    throw new Error('Menubar primitives must be used within <Menubar>.');
  }
  return context;
}

type MenubarMenuContextValue = {
  id: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  closeAll: () => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
};

const MenubarMenuContext = React.createContext<MenubarMenuContextValue | null>(null);

function useMenubarMenuContext() {
  const context = React.useContext(MenubarMenuContext);
  if (!context) {
    throw new Error('Menu primitive must be used within <MenubarMenu> or <MenubarSubmenu>.');
  }
  return context;
}

export function Menubar({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [session, setSession] = React.useState<MenubarSessionState>(() => createClosedMenubarSession());
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const menubarOwnerId = React.useId();
  const openMenuId = session.activeMenuId;
  const hoverNavigationEnabled = session.hoverNavigationEnabled;

  React.useEffect(() => {
    if (!openMenuId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const ownerNode = (event.target as HTMLElement | null)?.closest?.(`[data-menubar-owner="${menubarOwnerId}"]`);
      if (!ownerNode) {
        setSession(closeMenubarSession());
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSession(closeMenubarSession());
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menubarOwnerId, openMenuId]);

  const moveMenuFocus = React.useCallback((currentTrigger: HTMLButtonElement, direction: 1 | -1) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ui="menubar-trigger"]'));
    const currentIndex = triggers.indexOf(currentTrigger);
    if (currentIndex === -1 || triggers.length === 0) {
      return;
    }
    const nextIndex = (currentIndex + direction + triggers.length) % triggers.length;
    const nextTrigger = triggers[nextIndex];
    nextTrigger?.focus();
    const nextMenuId = nextTrigger?.dataset.menuId;
    if (nextMenuId) {
      setSession((current) => openMenubarSession(current, nextMenuId));
    }
  }, []);
  const value = React.useMemo(
    () => ({
      menubarOwnerId,
      openMenuId,
      setOpenMenuId: (id: string | null, options?: { viaHover?: boolean }) => {
        if (id == null) {
          setSession(closeMenubarSession());
          return;
        }
        setSession((current) => openMenubarSession(current, id, options));
      },
      closeAll: () => setSession(closeMenubarSession()),
      moveMenuFocus,
      hoverNavigationEnabled,
    }),
    [hoverNavigationEnabled, menubarOwnerId, moveMenuFocus, openMenuId],
  );

  return (
    <MenubarRootContext.Provider value={value}>
      <div
        ref={rootRef}
        role="menubar"
        data-ui="menubar"
        className={cn('editor-menubar flex items-center gap-1', className)}
        {...props}
      >
        {children}
      </div>
    </MenubarRootContext.Provider>
  );
}

export function MenubarMenu({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openMenuId, setOpenMenuId, closeAll } = useMenubarRootContext();
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const open = openMenuId === id;

  return (
    <MenubarMenuContext.Provider
      value={{
        id,
        open,
        setOpen: (nextOpen) => setOpenMenuId(nextOpen ? id : null),
        closeAll,
        triggerRef,
      }}
    >
      <div className={cn('relative', className)}>
        {children}
      </div>
    </MenubarMenuContext.Provider>
  );
}

export const MenubarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: React.ComponentType<{ className?: string }>;
  }
>(({ className, children, icon: Icon, onClick, onKeyDown, ...props }, ref) => {
  const { id, open, setOpen, triggerRef } = useMenubarMenuContext();
  const { hoverNavigationEnabled, menubarOwnerId, moveMenuFocus } = useMenubarRootContext();

  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref, triggerRef],
  );

  return (
    <button
      ref={setRefs}
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      data-ui="menubar-trigger"
      data-menubar-owner={menubarOwnerId}
      data-menu-id={id}
      data-state={open ? 'open' : 'closed'}
      className={cn('editor-menubar-trigger', className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(!open);
        }
      }}
      onMouseEnter={() => {
        if (hoverNavigationEnabled && !open) {
          setOpen(true);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveMenuFocus(event.currentTarget, 1);
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveMenuFocus(event.currentTarget, -1);
          return;
        }
        if (event.key === 'Home') {
          event.preventDefault();
          const menubar = event.currentTarget.closest('[data-ui="menubar"]');
          const first = menubar?.querySelector<HTMLButtonElement>('[data-ui="menubar-trigger"]');
          first?.focus();
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          const triggers = Array.from(
            event.currentTarget.closest('[data-ui="menubar"]')?.querySelectorAll<HTMLButtonElement>('[data-ui="menubar-trigger"]') ?? [],
          );
          triggers.at(-1)?.focus();
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(true);
        }
      }}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{children}</span>
    </button>
  );
});
MenubarTrigger.displayName = 'MenubarTrigger';

export function MenubarContent({
  className,
  menuWidth,
  children,
}: React.ComponentPropsWithoutRef<'div'> & {
  menuWidth?: number;
}) {
  const { open, triggerRef } = useMenubarMenuContext();
  const { closeAll, menubarOwnerId, moveMenuFocus } = useMenubarRootContext();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({
    top: 0,
    left: 0,
    visibility: 'hidden',
  });

  React.useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const width = menuWidth ?? 220;
      const margin = 12;
      setStyle({
        top: Math.max(margin, rect.bottom + 8),
        left: Math.max(margin, Math.min(window.innerWidth - width - margin, rect.left)),
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [menuWidth, open, triggerRef]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const firstItem = contentRef.current?.querySelector<HTMLButtonElement>(
        '[data-ui="menubar-item"]:not(:disabled), .editor-menubar-item-main:not(:disabled)',
      );
      firstItem?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <PopoverSurface
      open={open}
      data-menubar-owner={menubarOwnerId}
      className={cn(
        'editor-menubar-content fixed z-[420] min-w-[240px]',
        className,
      )}
      style={style}
    >
      <div
        ref={contentRef}
        role="menu"
        aria-orientation="vertical"
        className="flex flex-col gap-0.5"
        onKeyDown={(event) => {
          const items = Array.from(
            contentRef.current?.querySelectorAll<HTMLButtonElement>(
              '[data-ui="menubar-item"]:not(:disabled), .editor-menubar-item-main:not(:disabled), .editor-menubar-item-more:not(:disabled)',
            ) ?? [],
          );
          const currentIndex = items.indexOf(event.target as HTMLButtonElement);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            items[(currentIndex + 1 + items.length) % items.length]?.focus();
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            items[(currentIndex - 1 + items.length) % items.length]?.focus();
            return;
          }
          if (event.key === 'ArrowRight' && triggerRef.current) {
            if ((event.target as HTMLElement)?.closest('[data-submenu-root="true"]')) {
              return;
            }
            event.preventDefault();
            moveMenuFocus(triggerRef.current, 1);
            return;
          }
          if (event.key === 'ArrowLeft' && triggerRef.current) {
            if ((event.target as HTMLElement)?.closest('[data-submenu-root="true"]')) {
              return;
            }
            event.preventDefault();
            moveMenuFocus(triggerRef.current, -1);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            closeAll();
            triggerRef.current?.focus();
            return;
          }
          if (event.key === 'Tab') {
            closeAll();
          }
        }}
      >
        {children}
      </div>
    </PopoverSurface>
  );
}

type MenubarItemBaseProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  selected?: boolean;
  closeOnSelect?: boolean;
  endSlot?: React.ReactNode;
};

const MenubarItemRow = React.forwardRef<HTMLButtonElement, MenubarItemBaseProps>(function MenubarItemRow(
  {
    className,
    children,
    icon: Icon,
    shortcut,
    selected = false,
    disabled = false,
    endSlot,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      data-ui="menubar-item"
      data-selected={selected ? 'true' : 'false'}
      disabled={disabled}
      className={cn('editor-menubar-item', className)}
      {...props}
    >
      <span className="editor-menubar-item-leading">
        <span className="editor-menubar-item-marker" aria-hidden="true">
          {selected ? <Check className="h-3.5 w-3.5" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        </span>
        <span className="truncate">{children}</span>
      </span>
      <span className="editor-menubar-item-trailing">
        {shortcut ? <MenubarShortcut>{shortcut}</MenubarShortcut> : null}
        {endSlot}
      </span>
    </button>
  );
});

export const MenubarItem = React.forwardRef<HTMLButtonElement, MenubarItemBaseProps>(function MenubarItem(
  {
    closeOnSelect = true,
    onClick,
    ...props
  },
  ref,
) {
  const { closeAll } = useMenubarMenuContext();

  return (
    <MenubarItemRow
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && closeOnSelect) {
          closeAll();
        }
      }}
      {...props}
    />
  );
});

export function MenubarCheckboxItem({
  checked,
  onCheckedChange,
  closeOnSelect = true,
  onClick,
  ...props
}: Omit<MenubarItemBaseProps, 'selected'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { closeAll } = useMenubarMenuContext();

  return (
    <MenubarItemRow
      role="menuitemcheckbox"
      aria-checked={checked}
      selected={checked}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        onCheckedChange(!checked);
        if (closeOnSelect) {
          closeAll();
        }
      }}
      {...props}
    />
  );
}

export function MenubarPanelLinkItem(props: MenubarItemBaseProps) {
  return <MenubarItem endSlot={<ChevronsRight className="h-3.5 w-3.5 opacity-60" />} {...props} />;
}

export function MenubarToggleWithMoreItem({
  checked,
  onCheckedChange,
  onMore,
  shortcut,
  children,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onMore: () => void;
  shortcut?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { closeAll } = useMenubarMenuContext();

  return (
    <div className="editor-menubar-toggle-more-row">
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        disabled={disabled}
        data-checked={checked ? 'true' : 'false'}
        className="editor-menubar-item editor-menubar-item-main"
        onClick={() => {
          onCheckedChange(!checked);
          closeAll();
        }}
      >
        <span className="editor-menubar-item-leading">
          <span className="editor-menubar-item-marker" aria-hidden="true">
            {checked ? <Check className="h-3.5 w-3.5" /> : null}
          </span>
          <span className="truncate">{children}</span>
        </span>
        <span className="editor-menubar-item-trailing">
          {shortcut ? <MenubarShortcut>{shortcut}</MenubarShortcut> : null}
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        aria-label={`More options for ${typeof children === 'string' ? children : 'menu item'}`}
        className="editor-menubar-item-more"
        onClick={() => {
          onMore();
          closeAll();
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MenubarSeparator({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
  return <hr className={cn('editor-menubar-separator', className)} {...props} />;
}

export function MenubarShortcut({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span data-ui="menubar-shortcut" className={cn('editor-menubar-shortcut', className)} {...props}>
      {children}
    </span>
  );
}

export function MenubarGroupLabel({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('editor-menubar-group-label', className)} {...props}>
      {children}
    </div>
  );
}

export function MenubarSubmenu({
  label,
  icon: Icon,
  shortcut,
  selected = false,
  children,
}: {
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  selected?: boolean;
  children: React.ReactNode;
}) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const { closeAll } = useMenubarMenuContext();
  const { menubarOwnerId } = useMenubarRootContext();
  const closeTimerRef = React.useRef<number | null>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({
    top: 0,
    left: 0,
    visibility: 'hidden',
  });

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const width = 220;
      const margin = 12;
      setStyle({
        top: Math.max(margin, Math.min(window.innerHeight - 16, rect.top - 4)),
        left: Math.max(margin, Math.min(window.innerWidth - width - margin, rect.right - 4)),
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  function cancelPendingClose() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelPendingClose();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 120);
  }

  return (
    <MenubarMenuContext.Provider value={{ id: `submenu:${String(label)}`, open, setOpen, closeAll, triggerRef }}>
      <div ref={wrapperRef} className="relative" data-submenu-root="true">
        <MenubarItem
          ref={triggerRef}
          icon={Icon}
          shortcut={shortcut}
          selected={selected}
          closeOnSelect={false}
          endSlot={<ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          onClick={() => setOpen(!open)}
          onMouseEnter={() => {
            cancelPendingClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              setOpen(true);
              return;
            }
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {label}
        </MenubarItem>
        <PopoverSurface
          open={open}
          onOpenChange={setOpen}
          data-menubar-owner={menubarOwnerId}
          className="editor-menubar-content fixed z-[430] min-w-[220px]"
          style={style}
          onMouseEnter={cancelPendingClose}
          onMouseLeave={scheduleClose}
        >
          <div
            role="menu"
            aria-orientation="vertical"
            className="flex flex-col gap-0.5"
            onKeyDown={(event) => {
              const items = Array.from(
                wrapperRef.current?.querySelectorAll<HTMLButtonElement>(
                  '[data-ui="menubar-item"]:not(:disabled), .editor-menubar-item-main:not(:disabled), .editor-menubar-item-more:not(:disabled)',
                ) ?? [],
              ).filter((item) => item !== triggerRef.current);
              const currentIndex = items.indexOf(event.target as HTMLButtonElement);
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                items[(currentIndex + 1 + items.length) % items.length]?.focus();
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                items[(currentIndex - 1 + items.length) % items.length]?.focus();
                return;
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                closeAll();
              }
            }}
          >
            {children}
          </div>
        </PopoverSurface>
      </div>
    </MenubarMenuContext.Provider>
  );
}
