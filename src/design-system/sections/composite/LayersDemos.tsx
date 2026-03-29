import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ImageIcon,
  Layers3,
  PanelBottom,
  PanelTop,
  PencilLine,
  RectangleEllipsis,
  Rows3,
  SquareStack,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PopoverTooltip } from '@/components/ui/popover';
import { EditorPanelHeader } from '@/panels/EditorPanelHeader';
import { INSPECTOR_COLLAPSED_WIDTH_PX } from '@/panels/inspectorLayout';
import { ComponentPreview } from '../../previews/ComponentPreview';

const INSPECTOR_TOOLTIP_CLASS_NAME =
	"editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5";

const DEMO_ROWS: Array<{
  id: string;
  depth: number;
  label: string;
  typeLabel: string;
  icon: typeof Rows3;
  expanded: boolean;
  selected: boolean;
  hidden: boolean;
  hasChildren: boolean;
  dropIntent?: 'after';
}> = [
  {
    id: 'header',
    depth: 0,
    label: 'Header',
    typeLabel: 'Header',
    icon: PanelTop,
    expanded: true,
    selected: false,
    hidden: false,
    hasChildren: true,
  },
  {
    id: 'brand',
    depth: 1,
    label: 'Brand Mark',
    typeLabel: 'Image',
    icon: ImageIcon,
    expanded: false,
    selected: false,
    hidden: true,
    hasChildren: false,
  },
  {
    id: 'hero',
    depth: 0,
    label: 'Hero',
    typeLabel: 'Section',
    icon: Rows3,
    expanded: true,
    selected: true,
    hidden: false,
    hasChildren: true,
  },
  {
    id: 'button',
    depth: 1,
    label: 'Primary CTA',
    typeLabel: 'Button',
    icon: RectangleEllipsis,
    expanded: false,
    selected: false,
    hidden: false,
    hasChildren: false,
    dropIntent: 'after' as const,
  },
  {
    id: 'content',
    depth: 1,
    label: 'Feature Stack',
    typeLabel: 'Container',
    icon: SquareStack,
    expanded: false,
    selected: false,
    hidden: false,
    hasChildren: false,
  },
  {
    id: 'footer',
    depth: 0,
    label: 'Footer',
    typeLabel: 'Footer',
    icon: PanelBottom,
    expanded: false,
    selected: false,
    hidden: false,
    hasChildren: true,
  },
] as const;

export function LayersDemos() {
  return (
    <ComponentPreview
      id="composite-layers-panel"
      name="Layers Panel"
      description="Left-rail entry and floating layers tree for structure, visibility, delete, and drag/drop ordering."
      sourceFile="src/panels/LayersPanel.tsx"
      props={[]}
    >
      <div className="flex items-start gap-4">
        <div
          className="editor-bg-subtle editor-border-subtle flex h-[316px] items-start justify-center rounded-2xl border p-3"
          style={{ width: `${INSPECTOR_COLLAPSED_WIDTH_PX}px` }}
        >
          <button type="button" className="editor-rail-entry-button" aria-pressed="true">
            <Layers3 className="h-4 w-4" />
          </button>
        </div>

        <div className="editor-layers-panel editor-bg-surface editor-border-subtle w-[320px] overflow-hidden rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]">
          <EditorPanelHeader
            icon={Layers3}
            title="Layers"
            description="Structure, visibility, and order."
            closeLabel="Close layers panel"
            onClose={() => undefined}
          />
          <div className="editor-scrollbar p-1.5">
            <div className="flex flex-col gap-1">
              {DEMO_ROWS.map((row) => {
                const Icon = row.icon;
                const DisclosureIcon = row.expanded ? ChevronDown : ChevronRight;

                return (
                  <div key={row.id}>
                    {row.id === 'hero' || row.id === 'footer' ? (
                      <div aria-hidden="true" className="editor-layers-divider" />
                    ) : null}
                    <div
                      className="editor-layers-row"
                      data-selected={row.selected ? 'true' : 'false'}
                      data-hidden={row.hidden ? 'true' : 'false'}
                      data-drop-intent={row.dropIntent}
                      style={{ paddingLeft: `${8 + row.depth * 8}px` }}
                    >
                      {row.hasChildren ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="editor-layers-disclosure h-5 w-5 rounded-md"
                        >
                          <DisclosureIcon className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span aria-hidden="true" className="block h-5 w-5 shrink-0" />
                      )}

                      <div className="editor-layers-row-main min-w-0 flex-1">
                        <span className="editor-layers-row-icon">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="editor-layers-row-title block truncate text-sm font-medium">
                            {row.label}
                          </span>
                          <span className="editor-layers-row-type block truncate text-[11px]">
                            {row.typeLabel}
                          </span>
                        </span>
                      </div>

                      <div className="editor-layers-row-actions flex shrink-0 items-center gap-1">
                        <PopoverTooltip
                          side="top"
                          align="end"
                          className={INSPECTOR_TOOLTIP_CLASS_NAME}
                          content="Edit title"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="editor-layers-action editor-layers-action-edit h-7 w-7 rounded-md border"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTooltip>
                        <PopoverTooltip
                          side="top"
                          align="end"
                          className={INSPECTOR_TOOLTIP_CLASS_NAME}
                          content={row.hidden ? "Show" : "Hide"}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="editor-layers-action editor-layers-action-visibility h-7 w-7 rounded-md border"
                          >
                            {row.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </PopoverTooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ComponentPreview>
  );
}
