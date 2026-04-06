import {
  Rocket,
  ImageIcon,
  Layers2,
  Layers3,
  PanelBottom,
  PanelTop,
  PencilLine,
  Pin,
  RectangleEllipsis,
  Rows3,
  SquareStack,
} from 'lucide-react';
import {
  TreeRowActionButton,
  TreeRowItem,
  TreeRowLabelContent,
  VisibilityToggle,
} from '@/components/ui/tree-row';
import { EditorPanelHeader } from '@/panels/EditorPanelHeader';
import { INSPECTOR_COLLAPSED_WIDTH_PX } from '@/panels/inspectorLayout';
import { ComponentPreview } from '../../previews/ComponentPreview';
import type { PropDefinition } from '../../types';

const LAYERS_PANEL_PROPS: PropDefinition[] = [
  { name: 'open', type: 'boolean', description: 'Whether the floating layers panel is visible.' },
  { name: 'rows', type: 'LayersRowModel[]', description: 'Tree rows including depth, expansion, badges, and hidden state.' },
  { name: 'selectedId', type: 'string | null', description: 'Currently selected node id in the layers tree.' },
  { name: 'onToggleVisibility', type: '(nodeId: string) => void', description: 'Visibility action handler for a tree row.' },
];

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
  isSticky?: boolean;
  hasAnimation?: boolean;
  isElevated?: boolean;
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
    label: 'Sticky Card',
    typeLabel: 'Container',
    icon: SquareStack,
    expanded: false,
    selected: false,
    hidden: false,
    hasChildren: false,
    isSticky: true,
    isElevated: true,
  },
  {
    id: 'reveal',
    depth: 1,
    label: 'Reveal Image',
    typeLabel: 'Image',
    icon: ImageIcon,
    expanded: false,
    selected: false,
    hidden: false,
    hasChildren: false,
    isSticky: true,
    hasAnimation: true,
    isElevated: true,
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
      props={LAYERS_PANEL_PROPS}
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

                return (
                  <div key={row.id}>
                    {row.id === 'hero' || row.id === 'footer' ? (
                      <div aria-hidden="true" className="editor-layers-divider" />
                    ) : null}
                    <TreeRowItem
                      data-drop-intent={row.dropIntent}
                      depth={row.depth}
                      hasChildren={row.hasChildren}
                      isExpanded={row.expanded}
                      isSelected={row.selected}
                      isHidden={row.hidden}
                      icon={<Icon className="h-3.5 w-3.5" />}
                      label={
                        <TreeRowLabelContent
                          title={row.label}
                          subtitle={row.typeLabel}
                          badges={
                            <>
                              {row.isSticky && <Pin className="h-3 w-3" />}
                              {row.hasAnimation && <Rocket className="h-3 w-3" />}
                              {row.isElevated && <Layers2 className="h-3 w-3" />}
                            </>
                          }
                        />
                      }
                      actions={
                        <>
                          <TreeRowActionButton
                            ariaLabel={`Edit ${row.label}`}
                            tooltip="Edit title"
                            className="editor-layers-action-edit"
                            onClick={() => {}}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                          </TreeRowActionButton>
                          <VisibilityToggle
                            isHidden={row.hidden}
                            onToggle={() => {}}
                            nodeId={row.label}
                            label={row.hidden ? "Show" : "Hide"}
                          />
                        </>
                      }
                    />
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
