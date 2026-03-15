import { ImageIcon, Link2, RectangleEllipsis, Rows3, SquareStack, Type } from 'lucide-react';
import type { LeafRole } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { PopoverTooltip } from '@/components/ui/popover';

type Props = {
  onInsertWrapper: (role: 'container') => void;
  onOpenSectionTemplates: (trigger: HTMLElement) => void;
  onInsertLeaf: (role: LeafRole) => void;
};

const INSERT_ITEMS = [
  {
    kind: 'wrapper' as const,
    role: 'section' as const,
    icon: Rows3,
    label: 'Section',
    hint: 'Top-level surface',
  },
  {
    kind: 'wrapper' as const,
    role: 'container' as const,
    icon: SquareStack,
    label: 'Container',
    hint: 'Nestable wrapper',
  },
  {
    kind: 'leaf' as const,
    role: 'text' as const,
    icon: Type,
    label: 'Text',
    hint: 'Headline or copy',
  },
  {
    kind: 'leaf' as const,
    role: 'image' as const,
    icon: ImageIcon,
    label: 'Image',
    hint: 'Seeded visual',
  },
  {
    kind: 'leaf' as const,
    role: 'link' as const,
    icon: Link2,
    label: 'Link',
    hint: 'Inline action',
  },
  {
    kind: 'leaf' as const,
    role: 'button' as const,
    icon: RectangleEllipsis,
    label: 'Button',
    hint: 'Primary CTA',
  },
];

export function InsertPanel({ onInsertWrapper, onOpenSectionTemplates, onInsertLeaf }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 overflow-visible">
      <div className="pb-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Add</div>
      </div>
      {INSERT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <PopoverTooltip
            key={item.label}
            side="right"
            align="center"
            className="min-w-[148px] text-left font-normal"
            content={
              <>
                <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
              </>
            }
          >
            <Button
              type="button"
              data-panel-trigger={item.kind === 'wrapper' && item.role === 'section' ? 'section-templates' : undefined}
              variant="ghost"
              title={`${item.label} · ${item.hint}`}
              className="h-12 w-12 rounded-2xl border border-slate-300 bg-white p-0 text-slate-950 shadow-[0_2px_10px_rgba(18,32,51,0.06)] transition-[background-color,border-color,box-shadow] duration-150 hover:border-slate-400 hover:bg-slate-50/75 hover:shadow-[0_4px_14px_rgba(18,32,51,0.08)]"
              onClick={(event) => {
                if (item.kind === 'wrapper') {
                  if (item.role === 'section') {
                    onOpenSectionTemplates(event.currentTarget);
                  } else {
                    onInsertWrapper(item.role);
                  }
                  return;
                }
                onInsertLeaf(item.role);
              }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-[15px] border border-black/8 bg-white text-slate-950">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
            </Button>
          </PopoverTooltip>
        );
      })}
    </div>
  );
}
