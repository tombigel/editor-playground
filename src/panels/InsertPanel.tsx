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
        <div className="editor-text-strong text-sm font-semibold">Add</div>
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
                <span className="editor-text-strong block text-sm font-medium">{item.label}</span>
                <span className="editor-text-muted mt-0.5 block text-xs">{item.hint}</span>
              </>
            }
          >
            <Button
              type="button"
              data-panel-trigger={item.kind === 'wrapper' && item.role === 'section' ? 'section-templates' : undefined}
              variant="ghost"
              title={`${item.label} · ${item.hint}`}
              className="editor-insert-button group h-10 w-10 rounded-lg border p-0 shadow-[0_2px_10px_rgba(18,32,51,0.06)] hover:shadow-[0_8px_18px_rgba(18,32,51,0.12)] focus-visible:border-[color:var(--editor-accent)]"
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
              <span className="editor-insert-button-inner flex h-full w-full items-center justify-center rounded-lg border border-black/8">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
            </Button>
          </PopoverTooltip>
        );
      })}
      <div aria-hidden="true" className="editor-border-subtle mt-2 w-full border-b" />
    </div>
  );
}
