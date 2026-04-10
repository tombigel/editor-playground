import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { PopoverTooltip } from '@/components/ui/popover';
import { cn, DARK_TOOLTIP_CLASS } from '@/lib/utils';

export type OptionsSelectorOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  tooltip?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

type OptionsSelectorProps = {
  value: string;
  options: readonly OptionsSelectorOption[];
  onValueChange: (value: string) => void;
  display?: 'label' | 'icon' | 'icon-label';
  size?: 'compact' | 'default';
  ariaLabel?: string;
  className?: string;
};

const TOOLTIP_CLASS_NAME = DARK_TOOLTIP_CLASS;

export function OptionsSelector({
  value,
  options,
  onValueChange,
  display = 'label',
  size = 'default',
  ariaLabel,
  className,
}: OptionsSelectorProps) {
  return (
    <fieldset
      data-ui="options-selector"
      data-display={display}
      className={cn('editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5', className)}
    >
      {ariaLabel ? <legend className="sr-only">{ariaLabel}</legend> : null}
      {options.map((option) => {
        const active = option.value === value;
        const iconOnly = display === 'icon';
        const button = (
          <Button
            key={option.value}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="sm"
            data-ui="options-selector-option"
            data-selected={active ? 'true' : 'false'}
            aria-label={option.ariaLabel ?? option.label}
            aria-pressed={active}
            disabled={option.disabled}
            className={cn(
              'rounded-md text-[11px]',
              active &&
                'border-transparent bg-[color:var(--editor-accent)] text-[color:var(--editor-accent-foreground)] shadow-[var(--editor-accent-shadow)] hover:bg-[color:color-mix(in_srgb,var(--editor-accent)_88%,#0f172a)]',
              size === 'compact'
                ? iconOnly
                  ? 'h-6 w-6 p-0'
                  : display === 'icon-label'
                    ? 'h-6 gap-1.5 px-2'
                    : 'h-6 px-2'
                : iconOnly
                  ? 'h-8 w-8 p-0'
                  : display === 'icon-label'
                    ? 'h-7 gap-1.5 px-2.5'
                    : 'h-7 px-2.5',
            )}
            onClick={() => onValueChange(option.value)}
          >
            {option.icon ? (
              <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
                {option.icon}
              </span>
            ) : null}
            {display !== 'icon' ? <span>{option.label}</span> : null}
          </Button>
        );

        const tooltipContent =
          option.tooltip ?? (display === 'icon' ? <div className="leading-3.5 font-medium">{option.label}</div> : null);

        if (!tooltipContent) {
          return button;
        }

        return (
          <PopoverTooltip
            key={option.value}
            side="top"
            align="center"
            className={TOOLTIP_CLASS_NAME}
            content={tooltipContent}
          >
            {button}
          </PopoverTooltip>
        );
      })}
    </fieldset>
  );
}
