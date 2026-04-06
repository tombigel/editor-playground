import {
	AlignCenterHorizontal,
	AlignCenterVertical,
	AlignEndHorizontal,
	AlignEndVertical,
	AlignHorizontalDistributeCenter,
	AlignHorizontalDistributeEnd,
	AlignHorizontalDistributeStart,
	AlignStartHorizontal,
	AlignStartVertical,
	AlignVerticalDistributeCenter,
	AlignVerticalDistributeEnd,
	AlignVerticalDistributeStart,
	ArrowBigDown,
	ArrowBigDownDash,
	ArrowBigUp,
	ArrowBigUpDash,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
	OrderIconButton,
	SizeInlineField,
	TextStyleIconButton,
	WrapperActions,
} from "@/panels/InspectorControls";
import { convertRenderedPxToUnitValue, formatFieldNumber } from "@/panels/inspector/stageConversions";
import type { WrapperInspectorNode } from "@/panels/inspector/types";
import { mockSection } from "../../mocks";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

function resolveDemoSizeMeasurement(
	px: number,
	axis: "x" | "y" | "width" | "height",
	mode: "px" | "%" | "vw" | "vh" | "vmin" | "vmax",
) {
	const converted = convertRenderedPxToUnitValue(
		px,
		axis,
		mode,
		axis === "width" ? 960 : axis === "height" ? 640 : undefined,
		mode === "vw" || mode === "vh" || mode === "vmin" || mode === "vmax"
			? mode === "vw"
				? 1440
				: mode === "vh"
					? 900
					: mode === "vmin"
						? Math.min(1440, 900)
						: Math.max(1440, 900)
			: undefined,
	);
	return converted == null ? null : formatFieldNumber(converted);
}

const LAYOUT_CONTROLS_PROPS: PropDefinition[] = [
	{ name: "node", type: "InspectorNode", description: "Current node supplying XYWH values and layout capabilities." },
	{ name: "orderState", type: "InspectorOrderState", description: "Availability and handlers for reorder actions." },
	{ name: "actions", type: "InspectorActionHandlers", description: "Layout mutation handlers for rect and wrapper changes." },
];

const SECTION_LAYOUT_PROPS: PropDefinition[] = [
	{ name: "node", type: "WrapperInspectorNode", description: "Section/header/footer wrapper node being edited." },
	{ name: "orderState", type: "InspectorOrderState", description: "Section reorder availability and handlers." },
	{ name: "actions", type: "InspectorActionHandlers", description: "Padding and wrapper role mutation handlers." },
];

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function LayoutDemos() {
	return (
		<>
			{/* Layout Controls */}
			<ComponentPreview
				id="composite-layout-controls"
				name="Layout Controls"
				description="Position/size fields, alignment, distribution, and reorder controls used in single- and multi-select inspectors."
				sourceFile="src/panels/inspector/CommonSections.tsx, src/panels/MultiSelectInspector.tsx"
				props={LAYOUT_CONTROLS_PROPS}
			>
				<div className="w-[300px] space-y-4">
					{/* XYWH */}
					<div className="space-y-1">
						<Label className="text-[11px] font-medium">Position / Size</Label>
						<div className="grid grid-cols-2 gap-1.5">
							<SizeInlineField
								label="X"
								nodeId="demo"
								value="120px"
								onChange={() => {}}
								axis="x"
							/>
							<SizeInlineField
								label="Y"
								nodeId="demo"
								value="80px"
								onChange={() => {}}
								axis="y"
							/>
							<SizeInlineField
								label="W"
								nodeId="demo"
								value="320px"
								onChange={() => {}}
								axis="width"
								resolveMeasurementInput={(mode) =>
									resolveDemoSizeMeasurement(320, "width", mode)
								}
							/>
							<SizeInlineField
								label="H"
								nodeId="demo"
								value="auto"
								onChange={() => {}}
								axis="height"
								resolveMeasurementInput={(mode) =>
									resolveDemoSizeMeasurement(240, "height", mode)
								}
							/>
						</div>
					</div>

					{/* Align */}
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Align</Label>
						<div className="flex flex-wrap gap-1">
							<TextStyleIconButton
								label="Align left"
								active={false}
								onClick={() => {}}
							>
								<AlignStartVertical className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align center"
								active={false}
								onClick={() => {}}
							>
								<AlignCenterVertical className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align right"
								active={false}
								onClick={() => {}}
							>
								<AlignEndVertical className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align top"
								active={false}
								onClick={() => {}}
							>
								<AlignStartHorizontal className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align middle"
								active={false}
								onClick={() => {}}
							>
								<AlignCenterHorizontal className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Align bottom"
								active={false}
								onClick={() => {}}
							>
								<AlignEndHorizontal className="h-4 w-4" />
							</TextStyleIconButton>
						</div>
					</div>

					{/* Distribute */}
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Distribute</Label>
						<div className="flex flex-wrap gap-1">
							<TextStyleIconButton
								label="Distribute horizontal"
								active={false}
								onClick={() => {}}
							>
								<AlignHorizontalDistributeCenter className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute vertical"
								active={false}
								onClick={() => {}}
							>
								<AlignVerticalDistributeCenter className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute left"
								active={false}
								onClick={() => {}}
							>
								<AlignHorizontalDistributeStart className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute right"
								active={false}
								onClick={() => {}}
							>
								<AlignHorizontalDistributeEnd className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute top"
								active={false}
								onClick={() => {}}
							>
								<AlignVerticalDistributeStart className="h-4 w-4" />
							</TextStyleIconButton>
							<TextStyleIconButton
								label="Distribute bottom"
								active={false}
								onClick={() => {}}
							>
								<AlignVerticalDistributeEnd className="h-4 w-4" />
							</TextStyleIconButton>
						</div>
					</div>

					{/* Reorder */}
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Reorder</Label>
						<div className="flex gap-1.5">
							<OrderIconButton
								label="Position Forward"
								shortcut="Mod+]"
								onClick={() => {}}
								disabled={false}
							>
								<ArrowBigUp className="h-4 w-4" />
							</OrderIconButton>
							<OrderIconButton
								label="Bring to Front"
								shortcut="Mod+Shift+]"
								onClick={() => {}}
								disabled={false}
							>
								<ArrowBigUpDash className="h-4 w-4" />
							</OrderIconButton>
							<OrderIconButton
								label="Position Backward"
								shortcut="Mod+["
								onClick={() => {}}
								disabled={false}
							>
								<ArrowBigDown className="h-4 w-4" />
							</OrderIconButton>
							<OrderIconButton
								label="Send to Back"
								shortcut="Mod+Shift+["
								onClick={() => {}}
								disabled={false}
							>
								<ArrowBigDownDash className="h-4 w-4" />
							</OrderIconButton>
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Section Layout */}
			<ComponentPreview
				id="composite-section-layout"
				name="Section Layout"
				description="Section-specific layout controls: padding (4-directional), section reorder, and section type selector (section/header/footer)."
				sourceFile="src/panels/inspector/CommonSections.tsx, src/panels/InspectorControls.tsx"
				props={SECTION_LAYOUT_PROPS}
			>
				<div className="w-[300px] space-y-4">
					{/* Padding */}
					<div className="space-y-1.5">
						<Label className="text-[11px] font-medium">Padding</Label>
						<div className="grid grid-cols-2 gap-1.5">
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowUp className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="24px"
									onChange={() => {}}
									axis="y"
								/>
							</div>
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowRight className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="32px"
									onChange={() => {}}
									axis="x"
								/>
							</div>
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowDown className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="24px"
									onChange={() => {}}
									axis="y"
								/>
							</div>
							<div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
								<ArrowLeft className="h-3.5 w-3.5" role="presentation" />
								<SizeInlineField
									label=""
									nodeId="demo"
									value="32px"
									onChange={() => {}}
									axis="x"
								/>
							</div>
						</div>
					</div>

					{/* Section type + order */}
					<WrapperActions
						node={mockSection as WrapperInspectorNode}
						canSectionBack={false}
						canSectionForward={true}
						onSectionBack={() => {}}
						onSectionForward={() => {}}
						onPromote={() => {}}
						onDemote={() => {}}
					/>
				</div>
			</ComponentPreview>
		</>
	);
}
