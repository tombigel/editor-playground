import type { ReactNode } from 'react';
import { FilePlus2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectOptionRow, SelectSeparator, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PageSwitcherOption = {
  id: string;
  label: string;
  depth?: number;
};

const CREATE_PAGE_VALUE = '__create-page__';

export function PageSwitcherSelect({
  value,
  options,
  placeholder = 'Untitled',
  onValueChange,
  onCreatePage,
  triggerClassName,
  contentClassName,
  defaultOpen = false,
}: {
  value: string | null;
  options: PageSwitcherOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
  onCreatePage: () => void;
  triggerClassName?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
}) {
  const activeOption = options.find((option) => option.id === value) ?? options[0] ?? null;

  return (
    <Select
      value={activeOption?.id ?? undefined}
      defaultOpen={defaultOpen}
      onValueChange={(nextValue) => {
        if (nextValue === CREATE_PAGE_VALUE) {
          onCreatePage();
          return;
        }
        onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        aria-label="Switch page"
        size="small"
        className={cn('editor-topbar-page-switcher', triggerClassName)}
      >
        <PageSwitcherRowContent label={activeOption?.label || placeholder} centeredLabel />
      </SelectTrigger>
      <SelectContent className={cn('editor-topbar-page-switcher-menu', contentClassName)}>
        {options.map((option) => {
          const depth = option.depth ?? 0;
          return (
            <SelectItem
              key={option.id}
              value={option.id}
              className="editor-topbar-page-switcher-row"
              style={{ paddingLeft: `${28 + depth * 14}px` }}
            >
              <PageSwitcherRowContent label={option.label} />
            </SelectItem>
          );
        })}
        <SelectSeparator />
        <SelectItem value={CREATE_PAGE_VALUE} className="editor-topbar-page-switcher-create">
          <PageSwitcherRowContent icon={<FilePlus2 className="h-3.5 w-3.5 shrink-0" />} label="New page" />
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function PageSwitcherRowContent({
  label,
  icon,
  centeredLabel = false,
}: {
  label: string;
  icon?: ReactNode;
  centeredLabel?: boolean;
}) {
  return (
    <SelectOptionRow
      icon={icon}
      label={label}
      className="editor-topbar-page-switcher-row-content"
      labelClassName={centeredLabel ? 'editor-topbar-page-switcher-label' : undefined}
    />
  );
}
