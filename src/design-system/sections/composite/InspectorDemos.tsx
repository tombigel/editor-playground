import { PanelRightClose, Pin, PinOff, Settings2, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SwitchBlock } from "@/panels/InspectorControls";
import { EditableNodeTitle, InspectorSectionCard } from "@/panels/inspector/CommonSections";
import { DebugInfoSection } from "@/panels/inspector/DebugInfoSection";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { NodeDebugInfo } from "@/editor/types";

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function InspectorDemos() {
	return (
		<>
			{/* Inspector Title */}
			<ComponentPreview
				id="composite-inspector-title"
				name="Inspector Title"
				description="Inspector summary header: editable node name, role badge, and collapse button."
				sourceFile="src/panels/inspector/CommonSections.tsx"
				props={[
					{
						name: "node",
						type: "InspectorNode | null",
						description: "The node to display summary for.",
					},
				]}
			>
				<div className="w-[300px]">
					{/* Name row with collapse button */}
					<div className="flex items-start justify-between gap-2 p-2.5">
						<div className="min-w-0 flex-1">
							<EditableNodeTitle name="Sticky Edge Lab" onCommit={() => {}} />
							<div className="mt-1">
								<span className="editor-pill-subtle inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium">
									section
								</span>
							</div>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="editor-icon-button-subtle h-7 w-7 rounded-md border"
							aria-label="Collapse inspector"
						>
							<PanelRightClose className="h-3.5 w-3.5" />
						</Button>
					</div>

					{/* Section card with focused-mode icon */}
					<div className="editor-text-muted mb-2 mt-3 text-[11px] font-medium">
						Section Card
					</div>
					<Card className="editor-border-subtle rounded-lg shadow-none">
						<CardHeader className="flex flex-row items-start justify-between gap-2 px-3 pt-3 pb-1">
							<CardTitle className="text-xs">Layout</CardTitle>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="editor-icon-button-subtle h-7 w-7 rounded-md border"
								aria-label="Go to Layout"
							>
								<SquareArrowOutUpRight className="h-3.5 w-3.5" />
							</Button>
						</CardHeader>
						<CardContent className="px-3 pt-1.5 pb-3">
							<div className="editor-text-muted text-[11px]">
								Card content area
							</div>
						</CardContent>
					</Card>
				</div>
			</ComponentPreview>

			{/* Section Card */}
			<ComponentPreview
				id="composite-section-card"
				name="Section Card"
				description="Titled card wrapper for inspector sections. Supports focused-mode entry, header actions, borderless mode, and custom header content."
				sourceFile="src/panels/inspector/CommonSections.tsx"
				props={[
					{ name: "title", type: "string", description: "Card header title." },
					{ name: "headerContent", type: "ReactNode", description: "Custom header content replacing the title." },
					{ name: "headerAction", type: "{ ariaLabel, icon, onClick }", description: "Header action button." },
					{ name: "focusedModeEntry", type: "FocusedModeEntry", description: "Focused-mode entry button shown in header." },
					{ name: "contentClassName", type: "string", description: "Custom class for CardContent." },
					{ name: "borderless", type: "boolean", default: "false", description: "Transparent card with no border or background." },
					{ name: "hideHeader", type: "boolean", default: "false", description: "Hides the header entirely." },
				]}
			>
				<div className="w-[300px] space-y-4">
					{/* Default */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Default</div>
						<InspectorSectionCard title="Layout">
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>

					{/* With focused-mode button */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Focused-mode entry</div>
						<InspectorSectionCard
							title="Design"
							focusedModeEntry={{
								mode: "design",
								label: "Design focus mode",
								tooltip: "Edit in focused mode",
								onEnter: () => {},
							}}
						>
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>

					{/* With header action */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Header action</div>
						<InspectorSectionCard
							title="Sticky"
							headerAction={{
								ariaLabel: "Configure sticky",
								icon: <Settings2 className="h-3.5 w-3.5" />,
								onClick: () => {},
							}}
						>
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>

					{/* Borderless */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Borderless</div>
						<InspectorSectionCard title="Content" borderless>
							<div className="editor-text-muted text-[11px]">Card content area</div>
						</InspectorSectionCard>
					</div>
				</div>
			</ComponentPreview>
			{/* SwitchBlock */}
			<ComponentPreview
				id="composite-switch-block"
				name="Switch Block"
				description="Bordered toggle card with icon, title, description, and switch. Accepts optional children rendered below a divider in the same block — used for nested controls that are only relevant when the toggle is active."
				sourceFile="src/panels/controls/FormLayout.tsx"
				props={[
					{ name: "icon", type: "ReactNode", description: "Optional icon element shown left of the title." },
					{ name: "title", type: "string", description: "Primary label." },
					{ name: "description", type: "string", description: "Secondary explanation text." },
					{ name: "checked", type: "boolean", description: "Switch value." },
					{ name: "onCheckedChange", type: "(value: boolean) => void", description: "Switch handler." },
					{ name: "children", type: "ReactNode", description: "Optional content shown below a divider when non-null." },
				]}
			>
				<div className="w-[300px] space-y-3">
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Enabled</div>
						<SwitchBlock
							icon={<Pin className="h-3.5 w-3.5 shrink-0 editor-text-accent" />}
							title="Enabled"
							description="Pin this node inside its structural range."
							checked={true}
							onCheckedChange={() => {}}
						/>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Disabled</div>
						<SwitchBlock
							icon={<PinOff className="h-3.5 w-3.5 shrink-0 editor-text-muted" />}
							title="Disabled"
							description="Pin this node inside its structural range."
							checked={false}
							onCheckedChange={() => {}}
						/>
					</div>
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">With nested child</div>
						<SwitchBlock
							title="Global elevation"
							description="Elevate all sticky elements above siblings."
							checked={false}
							onCheckedChange={() => {}}
						>
							<div className="flex items-center justify-between gap-3">
								<div>
									<div className="editor-text-strong text-xs font-medium">Elevate this node</div>
									<div className="editor-text-muted text-[11px]">Pin above siblings for this sticky only.</div>
								</div>
								<Switch checked={false} onCheckedChange={() => {}} />
							</div>
						</SwitchBlock>
					</div>
				</div>
			</ComponentPreview>

			{/* Debug Info Section */}
			<ComponentPreview
				id="composite-debug-info"
				name="Debug Info Card"
				description="Debug information panel showing node identity, geometry, sticky state, and animation config. Conditionally renders rows based on data presence."
				sourceFile="src/panels/inspector/DebugInfoSection.tsx"
				props={[
					{
						name: "items",
						type: "NodeDebugInfo[]",
						description: "Array of node debug info to display. Renders nothing when empty. Shows prev/next navigation when more than one item.",
					},
				]}
			>
				<div className="w-[300px] space-y-4">
					{/* Single node */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Single Node</div>
						<DebugInfoSection items={[fullDebugInfo]} />
					</div>

					{/* Multi-node (prev/next navigation) */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-node (2 items)</div>
						<DebugInfoSection items={[fullDebugInfo, minimalDebugInfo]} />
					</div>
				</div>
			</ComponentPreview>
		</>
	);
}

// ---------------------------------------------------------------------------
// Debug Info Fixtures
// ---------------------------------------------------------------------------

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
	authoredRect: { x: '24px', y: '0px', width: 'fit-content', height: 'auto' },
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
