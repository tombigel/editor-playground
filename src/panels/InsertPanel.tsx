import { ImageIcon, Layers3, Link2, RectangleEllipsis, Rows3, SquareStack, Type } from 'lucide-react';
import type { LeafRole } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { PopoverTooltip } from '@/components/ui/popover';

type Props = {
  onInsertWrapper: (role: 'container') => void;
  onOpenSectionTemplates: (trigger: HTMLElement) => void;
  onInsertLeaf: (role: LeafRole) => void;
  layersOpen?: boolean;
  onOpenLayers?: (trigger: HTMLElement) => void;
  onCloseLayers?: () => void;
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

export function InsertPanel({
  onInsertWrapper,
  onOpenSectionTemplates,
  onInsertLeaf,
  layersOpen = false,
  onOpenLayers = () => undefined,
  onCloseLayers = () => undefined,
}: Props) {
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
              variant="outline"
              size="icon"
              title={`${item.label} · ${item.hint}`}
              className="editor-insert-button h-8 w-8 rounded-md p-0"
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
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </Button>
          </PopoverTooltip>
        );
      })}
      <div aria-hidden="true" className="editor-border-subtle mt-2 w-full border-b" />
      <PopoverTooltip
        side="right"
        align="center"
        className="min-w-[148px] text-left font-normal"
        content={
          <>
            <span className="editor-text-strong block text-sm font-medium">Layers</span>
            <span className="editor-text-muted mt-0.5 block text-xs">Structure, visibility, and order</span>
          </>
        }
      >
        <button
          type="button"
          data-panel-trigger="layers"
          aria-pressed={layersOpen}
          className="editor-rail-entry-button mt-2"
          onClick={(event) => {
            if (layersOpen) {
              onCloseLayers();
              return;
            }
            onOpenLayers(event.currentTarget);
          }}
        >
          <Layers3 className="h-4 w-4" strokeWidth={1.9} />
        </button>
      </PopoverTooltip>
    </div>
  );
}
