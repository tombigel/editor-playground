import {
  Plus,
  RotateCcw,
  Layers2,
  Layers3,
  PanelBottom,
  PanelTop,
  PencilLine,
  Pin,
  RectangleEllipsis,
  Rows3,
  SquareArrowRightEnter,
  SquareStack,
  Repeat,
  Star,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { Input } from "@/components/ui/input";
import { ListCard } from "@/components/ui/list-card";
import { Pager } from "@/components/ui/pager";
import { PanelHeader } from "@/components/ui/panel-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabeledControlRow, LabeledFieldStack, NoticeSurface } from "@/components/ui/settings-panel";
import { Switch } from "@/components/ui/switch";
import {
  TreeRowActionButton,
  TreeRowItem,
  TreeRowLabelContent,
  VisibilityToggle,
} from "@/components/ui/tree-row";
import { SectionTemplatePopover } from "@/app/AppChrome";
import type { NodeDebugInfo } from "@/editor/types";
import { EditorPanelHeader } from "@/panels/EditorPanelHeader";
import { DebugInfoSection } from "@/panels/inspector/DebugInfoSection";
import { StickySection } from "@/panels/inspector/StickySection";
import { INSPECTOR_COLLAPSED_WIDTH_PX } from "@/panels/inspectorLayout";
import { mockStickyContainer, mockStickySection, noopActions } from "../../mocks";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const DEBUG_INFO_PROPS: PropDefinition[] = [
  {
    name: "items",
    type: "NodeDebugInfo[]",
    description: "Array of node debug info to display. Renders nothing when empty. Shows prev/next navigation when more than one item.",
  },
];

const STICKY_SECTION_PROPS: PropDefinition[] = [
  { name: "node", type: "NonSiteInspectorNode", description: "Selected node carrying sticky state and authored offsets/duration." },
  { name: "actions", type: "StickyActionHandlers", description: "Sticky mutation handlers for enablement, offsets, duration, and elevation." },
  { name: "focusedMode", type: "FocusedMode", description: "Current focused-mode surface used for the section-header entry affordance." },
  { name: "globalStickyElevation", type: "boolean", description: "Whether global sticky elevation is already enabled at the site level." },
];

const LAYERS_PANEL_PROPS: PropDefinition[] = [
  { name: "open", type: "boolean", description: "Whether the floating layers panel is visible." },
  { name: "rows", type: "LayersRowModel[]", description: "Tree rows including depth, expansion, badges, and hidden state." },
  { name: "selectedId", type: "string | null", description: "Currently selected node id in the layers tree." },
  { name: "onToggleVisibility", type: "(nodeId: string) => void", description: "Visibility action handler for a tree row." },
];

const FLOATING_PANEL_SHELL_PROPS: PropDefinition[] = [
  { name: "header", type: "ReactNode", description: "Optional shared header slot rendered above the body." },
  { name: "children", type: "ReactNode", description: "Panel body content." },
  { name: "bodyClassName", type: "string", description: "Optional body wrapper classes." },
  { name: "bodyStyle", type: "CSSProperties", description: "Optional inline styles for the body wrapper." },
  { name: "suppressPopover", type: "boolean", default: "false", description: "Renders a static shell for showcase/test contexts instead of native popover markup." },
  { name: "positionMode", type: "'fixed' | 'absolute'", default: "'fixed'", description: "Controls whether the shell uses detached fixed positioning or anchored absolute positioning." },
  { name: "open", type: "boolean", description: "Popover open state when using the live popover path." },
  { name: "onOpenChange", type: "(open: boolean) => void", description: "Popover state change handler." },
];

const SHORTCUTS_PROPS: PropDefinition[] = [
  { name: "title", type: "string", description: "Shortcut section title." },
  { name: "items", type: "Array<{ label: string; description: string }>", description: "Shortcut rows rendered inside the section." },
];

const FOCUSED_PANEL_PROPS: PropDefinition[] = [
  { name: "title", type: "string", description: "Focused-mode panel title." },
  { name: "nodeName", type: "string", description: "Current selected node name shown in the summary row." },
  { name: "roleBadge", type: "ReactNode", description: "Compact shared role/status pill in the header." },
  { name: "onExit", type: "() => void", description: "Exit focused-mode action." },
];

const SECTION_TEMPLATE_PROPS: PropDefinition[] = [
  { name: "open", type: "boolean", description: "Whether the floating template popover is visible." },
  { name: "style", type: "CSSProperties", description: "Optional shell positioning used by the live app and by static showcase rendering." },
  { name: "onInsertTemplate", type: "(templateId) => void", description: "Called when a template card is selected." },
  { name: "suppressPopover", type: "boolean", description: "Renders the panel as static showcase markup instead of native popover markup." },
];

const FONT_MANAGEMENT_PROPS: PropDefinition[] = [
  { name: "document row", type: "ListCard", description: "Site-library row with preview styling, usage meta, favorite, and remove actions." },
  { name: "catalog row", type: "ListCard", description: "Catalog row with preview styling plus add/favorite actions." },
  { name: "filters", type: "Input + Select + Switch", description: "Search, language, category, and toggle filters used by the browse surface." },
  { name: "pager", type: "Pager", description: "Shared pager contract used at the top and bottom of the catalog results." },
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
  dropIntent?: "after";
}> = [
  { id: "header", depth: 0, label: "Header", typeLabel: "Header", icon: PanelTop, expanded: true, selected: false, hidden: false, hasChildren: true },
  { id: "brand", depth: 1, label: "Brand Mark", typeLabel: "Image", icon: ImageIcon, expanded: false, selected: false, hidden: true, hasChildren: false },
  { id: "hero", depth: 0, label: "Hero", typeLabel: "Section", icon: Rows3, expanded: true, selected: true, hidden: false, hasChildren: true },
  { id: "button", depth: 1, label: "Primary CTA", typeLabel: "Button", icon: RectangleEllipsis, expanded: false, selected: false, hidden: false, hasChildren: false, dropIntent: "after" },
  { id: "content", depth: 1, label: "Sticky Card", typeLabel: "Container", icon: SquareStack, expanded: false, selected: false, hidden: false, hasChildren: false, isSticky: true, isElevated: true },
  { id: "reveal", depth: 1, label: "Reveal Image", typeLabel: "Image", icon: ImageIcon, expanded: false, selected: false, hidden: false, hasChildren: false, isSticky: true, hasAnimation: true, isElevated: true },
  { id: "footer", depth: 0, label: "Footer", typeLabel: "Footer", icon: PanelBottom, expanded: false, selected: false, hidden: false, hasChildren: true },
] as const;

function FontManagementPreview() {
  return (
    <div className="editor-bg-surface editor-border-subtle w-[560px] rounded-xl border p-4">
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="editor-text-muted text-xs">3 families in this site library.</div>
            <Button type="button" variant="destructive" size="sm">
              <RotateCcw className="h-4 w-4" />
              Purge unused
            </Button>
          </div>
          <div className="space-y-2">
            <ListCard
              title="Inter"
              description="Hamburgefonstiv 123"
              meta="Sans Serif · Used 18x"
              tone="subtle"
              titleStyle={{ fontFamily: "Inter, sans-serif" }}
              descriptionStyle={{ fontFamily: "Inter, sans-serif" }}
              actions={
                <>
                  <Button type="button" variant="default" size="icon" aria-label="Unfavorite Inter">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label="Remove Inter" disabled>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              }
            />
            <ListCard
              title="Playfair Display"
              description="Hamburgefonstiv 123"
              meta="Serif · Unused"
              tone="subtle"
              titleStyle={{ fontFamily: '"Playfair Display", serif' }}
              descriptionStyle={{ fontFamily: '"Playfair Display", serif' }}
              actions={
                <>
                  <Button type="button" variant="outline" size="icon" aria-label="Favorite Playfair Display">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label="Remove Playfair Display">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="editor-text-strong text-sm font-semibold">Browse Google Fonts</div>
            <div className="editor-text-muted text-[11px]">Catalog updated today</div>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px]">
            <LabeledFieldStack label="Search" className="space-y-1" labelClassName="text-[11px] font-medium">
              <Input value="display" onChange={() => {}} placeholder="Search families, languages, tags" />
            </LabeledFieldStack>
            <LabeledFieldStack label="Language" className="space-y-1" labelClassName="text-[11px] font-medium">
              <Select value="western" onValueChange={() => {}}>
                <SelectTrigger size="small">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="western">Western</SelectItem>
                  <SelectItem value="hebrew">Hebrew</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </LabeledFieldStack>
            <LabeledFieldStack label="Category" className="space-y-1" labelClassName="text-[11px] font-medium">
              <Select value="serif" onValueChange={() => {}}>
                <SelectTrigger size="small">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serif">serif</SelectItem>
                  <SelectItem value="sans-serif">sans-serif</SelectItem>
                  <SelectItem value="display">display</SelectItem>
                </SelectContent>
              </Select>
            </LabeledFieldStack>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <Switch checked onCheckedChange={() => {}} />
              <span>Favorites only</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <Switch checked={false} onCheckedChange={() => {}} />
              <span>Used only</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <Switch checked onCheckedChange={() => {}} />
              <span>Hide variable</span>
            </div>
          </div>
          <NoticeSurface tone="muted" className="px-3 py-2 text-xs">
            Showing 1-2 of 24 matching families.
          </NoticeSurface>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <LabeledControlRow
                label="Show"
                className="gap-2"
                labelClassName="editor-text-muted flex-none text-[11px] font-medium"
                controlClassName="ml-0"
              >
                <Select value="25" onValueChange={() => {}}>
                  <SelectTrigger size="small" className="w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </LabeledControlRow>
              <Pager currentPage={2} totalPages={6} onPrevious={() => {}} onNext={() => {}} />
            </div>
            <ListCard
              title="Space Grotesk"
              description="Hamburgefonstiv 123"
              meta="Display · Latin"
              titleStyle={{ fontFamily: '"Space Grotesk", sans-serif' }}
              descriptionStyle={{ fontFamily: '"Space Grotesk", sans-serif' }}
              actions={
                <>
                  <Button type="button" variant="outline" size="icon" aria-label="Favorite Space Grotesk">
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label="Add Space Grotesk">
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              }
            />
            <ListCard
              title="IBM Plex Sans"
              description="Hamburgefonstiv 123"
              meta="Sans Serif · In library"
              titleStyle={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
              descriptionStyle={{ fontFamily: '"IBM Plex Sans", sans-serif' }}
              actions={
                <Button type="button" variant="default" size="icon" aria-label="Favorite IBM Plex Sans">
                  <Star className="h-4 w-4" />
                </Button>
              }
            />
            <div className="flex justify-end">
              <Pager currentPage={2} totalPages={6} onPrevious={() => {}} onNext={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const fullDebugInfo: NodeDebugInfo = {
  dataId: 'section_abc123def',
  htmlId: 'section_abc123def',
  stageId: 'stage-node-section_abc123def',
  name: 'Hero Section',
  family: 'wrapper' as const,
  subtype: 'section',
  parentId: 'site_root',
  authoredRect: { x: '0px', y: '120px', width: '100%', height: '480px' },
  measuredBounds: { left: 0, top: 120, width: 1280, height: 480 },
  sticky: {
    enabled: true,
    target: 'self' as const,
    edges: 'top' as const,
    durationMode: 'auto' as const,
    elevated: true,
    offsetTop: '0px',
    offsetBottom: null,
    duration: '100vh',
    durationTop: null,
    durationBottom: null,
  },
  animation: {
    enabled: true,
    isTriggerTarget: false,
    triggerId: null,
    trigger: 'scroll',
    effect: 'fadeIn',
    effectKind: 'keyframe',
    requiresSticky: true,
    rawConfig: { trigger: 'scroll', effect: { kind: 'named', type: 'fadeIn' }, requiresSticky: true },
  },
};

const minimalDebugInfo: NodeDebugInfo = {
  dataId: 'text_xyz789',
  htmlId: null,
  stageId: 'stage-node-text_xyz789',
  name: 'Body Text',
  family: 'leaf' as const,
  subtype: 'text',
  parentId: 'section_abc123def',
  authoredRect: { x: '24px', y: '0px', width: 'max-content', height: 'auto' },
  measuredBounds: null,
  sticky: {
    enabled: false,
    target: null,
    edges: 'none' as const,
    durationMode: null,
    elevated: null,
    offsetTop: null,
    offsetBottom: null,
    duration: null,
    durationTop: null,
    durationBottom: null,
  },
  animation: {
    enabled: false,
    isTriggerTarget: false,
    triggerId: null,
    trigger: null,
    effect: null,
    effectKind: null,
    requiresSticky: null,
    rawConfig: null,
  },
};

export function PanelsSection() {
  return (
    <div>
      <ComponentPreview
        id="composite-debug-info"
        name="Debug Info Card"
        description="Debug information panel showing node identity, geometry, sticky state, and animation config. Conditionally renders rows based on data presence."
        sourceFile="src/panels/inspector/DebugInfoSection.tsx"
        props={DEBUG_INFO_PROPS}
      >
        <div className="w-[300px] space-y-4">
          <div>
            <div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Single Node</div>
            <DebugInfoSection items={[fullDebugInfo]} />
          </div>
          <div>
            <div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-node (2 items)</div>
            <DebugInfoSection items={[fullDebugInfo, minimalDebugInfo]} />
          </div>
        </div>
      </ComponentPreview>

      <ComponentPreview
        id="composite-sticky-section"
        name="Sticky Section"
        description="Full sticky inspector section with authored offsets, duration modes, and elevation controls. Includes both the simpler auto-distance wrapper state and a richer custom two-edge container state."
        sourceFile="src/panels/inspector/StickySection.tsx"
        props={STICKY_SECTION_PROPS}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Auto distance</div>
            <div className="w-[300px]">
              <StickySection node={mockStickySection} actions={noopActions} focusedMode={null} globalStickyElevation={false} />
            </div>
          </div>
          <div>
            <div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Custom two-edge</div>
            <div className="w-[300px]">
              <StickySection node={mockStickyContainer} actions={noopActions} focusedMode="sticky" globalStickyElevation={false} />
            </div>
          </div>
        </div>
      </ComponentPreview>

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
                      {row.id === 'hero' || row.id === 'footer' ? <div aria-hidden="true" className="editor-layers-divider" /> : null}
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
                                {row.hasAnimation && <Repeat className="h-3 w-3" />}
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
                            <VisibilityToggle isHidden={row.hidden} onToggle={() => {}} nodeId={row.label} label={row.hidden ? "Show" : "Hide"} />
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

      <ComponentPreview
        id="composite-floating-panel-shell"
        name="Floating Panel Shell"
        description="Shared floating popover shell with DS-owned header slot and scrollable body wrapper."
        sourceFile="src/components/ui/floating-panel-shell.tsx"
        props={FLOATING_PANEL_SHELL_PROPS}
      >
        <div className="relative h-[260px] w-[360px]">
          <FloatingPanelShell
            suppressPopover
            positionMode="absolute"
            open
            onOpenChange={() => {}}
            className="left-0 top-0 w-[320px]"
            style={{ top: 0, left: 0 }}
            header={
              <PanelHeader
                icon={<SquareArrowRightEnter className="h-4 w-4" />}
                title="Section Templates"
                description="Choose a layout to insert."
                closeLabel="Close section templates panel"
                onClose={() => undefined}
              />
            }
            bodyClassName="editor-scrollbar max-h-[180px] overflow-y-auto p-3"
          >
            <div className="grid grid-cols-2 gap-2.5">
              {["Hero", "Feature", "CTA", "Gallery"].map((label) => (
                <div key={label} className="editor-border-subtle rounded-lg border p-2.5">
                  <div className="editor-text-strong text-xs font-semibold">{label}</div>
                  <div className="editor-text-muted mt-1.5 text-[11px] leading-4">Shared shell body content.</div>
                </div>
              ))}
            </div>
          </FloatingPanelShell>
        </div>
      </ComponentPreview>

      <ComponentPreview
        id="composite-shortcuts"
        name="Shortcuts"
        description="Shortcut section container with keyboard shortcut rows."
        sourceFile="src/panels/ShortcutHelpContent.tsx"
        props={SHORTCUTS_PROPS}
      >
        <div className="w-[300px]">
          <div className="editor-bg-subtle editor-border-subtle rounded-lg border p-3.5">
            <div className="editor-text-muted text-[11px] font-semibold uppercase tracking-wider">Edit</div>
            <div className="mt-2.5 space-y-2.5">
              {[
                { label: "Mod+Z", description: "Undo" },
                { label: "Mod+Shift+Z", description: "Redo" },
                { label: "Delete", description: "Delete selected" },
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="editor-text-strong text-xs leading-4">{item.description}</span>
                  <kbd className="editor-kbd max-w-[14rem] whitespace-normal break-words rounded-md border px-1.5 py-0.5 text-right text-[11px] font-medium leading-4 shadow-sm">
                    {item.label}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ComponentPreview>

      <ComponentPreview
        id="composite-focused-panel"
        name="Focused Panel"
        description="Floating focused-mode panel with drag handle, title, role badge, and exit button. Shows empty state when no node is selected."
        sourceFile="src/panels/FocusedModePanel.tsx"
        props={FOCUSED_PANEL_PROPS}
      >
        <div className="w-[300px]">
          <div className="editor-focused-panel editor-settings-panel overflow-hidden rounded-xl border shadow-lg">
            <div className="flex cursor-grab items-center justify-between gap-2 px-3 pb-2 pt-3">
              <div className="min-w-0 flex-1">
                <div className="editor-text-strong text-sm font-medium">Content</div>
                <div className="editor-text-muted mt-1 flex min-w-0 items-center gap-2 text-xs">
                  <div className="truncate">Sticky Edge Lab</div>
                  <span className="editor-pill-subtle shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">section</span>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="editor-icon-button-subtle h-7 w-7 rounded-md border" aria-label="Exit focused mode">
                <SquareArrowRightEnter className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="px-3 py-6">
              <div className="editor-text-strong text-sm font-medium">Nothing to edit yet</div>
              <div className="editor-text-muted mt-1 text-xs">Select a non-site node to edit its content controls from focused mode.</div>
            </div>
          </div>
        </div>
      </ComponentPreview>

      <ComponentPreview
        id="composite-section-templates"
        name="Section Templates"
        description="Section-template panel preview using the real shell/header/template-card surface, rendered statically in the showcase via the same override pattern used by FloatingPanelShell."
        sourceFile="src/app/AppChrome.tsx"
        props={SECTION_TEMPLATE_PROPS}
      >
        <div className="relative h-[360px] w-[480px] overflow-hidden">
          <SectionTemplatePopover
            open
            suppressPopover
            style={{ top: 0, left: 0 }}
            onOpenChange={() => {}}
            onClose={() => {}}
            onInsertTemplate={() => {}}
          />
        </div>
      </ComponentPreview>

      <ComponentPreview
        id="composite-font-management"
        name="Font Management"
        description="Representative font-management panel anatomy: site-library rows, catalog rows, search and filter controls, result meta, and shared top/bottom pagination."
        sourceFile="src/panels/fontManagement/ManageFontsPanel.tsx"
        props={FONT_MANAGEMENT_PROPS}
      >
        <FontManagementPreview />
      </ComponentPreview>
    </div>
  );
}
