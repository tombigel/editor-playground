import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
	BorderControlGroup,
	FormField,
	ShadowControlGroup,
} from "@/panels/InspectorControls";
import { ComponentPreview } from "../../previews/ComponentPreview";

// ---------------------------------------------------------------------------
// Interactive demo wrappers
// ---------------------------------------------------------------------------

function ShadowControlDemo() {
	const [color, setColor] = useState("rgba(18, 32, 51, 0.14)");
	const [blur, setBlur] = useState(16);
	const [spread, setSpread] = useState(0);
	const [distance, setDistance] = useState(8);
	const [angle, setAngle] = useState(180);
	return (
		<ShadowControlGroup
			color={color}
			blur={blur}
			spread={spread}
			distance={distance}
			angle={angle}
			onColorChange={setColor}
			onBlurChange={setBlur}
			onSpreadChange={setSpread}
			onDistanceChange={setDistance}
			onAngleChange={setAngle}
			colorFallback="rgba(18, 32, 51, 0.14)"
			supportsSpread
		/>
	);
}

function BorderControlDemo() {
	const [color, setColor] = useState("#d8e0ea");
	const [width, setWidth] = useState("1px");
	const [radius, setRadius] = useState("16px");
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
				<Label className="mt-2 text-[11px] font-medium">Border</Label>
				<BorderControlGroup
					nodeId="demo"
					colorValue={color}
					widthValue={width}
					radiusValue={radius}
					onColorChange={setColor}
					onWidthChange={setWidth}
					onRadiusChange={setRadius}
				/>
			</div>
			<FormField label="Inline" layout="inline" controlWidth="132px">
				<BorderControlGroup
					layout="inline"
					showRadius={false}
					colorValue={color}
					widthValue={width}
					widthUnits={["px", "em"]}
					onColorChange={setColor}
					onWidthChange={setWidth}
				/>
			</FormField>
			<div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
				<Label className="mt-2 text-[11px] font-medium">No radius</Label>
				<BorderControlGroup
					colorValue={color}
					widthValue={width}
					widthUnits={["px", "em"]}
					showRadius={false}
					onColorChange={setColor}
					onWidthChange={setWidth}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function ControlGroupDemos() {
	return (
		<>
			{/* Shadow Control */}
			<ComponentPreview
				id="composite-shadow-control"
				name="Shadow Control"
				description="Color + blur + spread + distance + angle composite for box-shadow editing."
				sourceFile="src/panels/controls/ColorAndEffects.tsx"
				props={[
					{ name: "color", type: "string", description: "Shadow color." },
					{
						name: "blur",
						type: "number",
						description: "Blur radius in px.",
					},
					{
						name: "spread",
						type: "number",
						description: "Spread radius (optional).",
					},
					{
						name: "distance",
						type: "number",
						description: "Shadow distance in px.",
					},
					{
						name: "angle",
						type: "number",
						description: "Shadow angle 0-360.",
					},
					{
						name: "supportsSpread",
						type: "boolean",
						default: "false",
						description: "Show spread field.",
					},
				]}
			>
				<div className="w-[300px] space-y-6">
					<ShadowControlDemo />
					{/* Multi-select (mixed) */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Multi-select
						</div>
						<ShadowControlGroup
							color="rgba(18, 32, 51, 0.14)"
							blur={16}
							spread={0}
							distance={8}
							angle={180}
							onColorChange={() => {}}
							onBlurChange={() => {}}
							onSpreadChange={() => {}}
							onDistanceChange={() => {}}
							onAngleChange={() => {}}
							colorFallback="rgba(18, 32, 51, 0.14)"
							supportsSpread
							mixed
						/>
					</div>
				</div>
			</ComponentPreview>

			{/* Border Control */}
			<ComponentPreview
				id="composite-border-control"
				name="Border Control"
				description="Color + width + radius composite for border editing. Label and color aligned inline like shadow control."
				sourceFile="src/panels/InspectorControls.tsx"
				props={[
					{
						name: "colorValue",
						type: "string",
						description: "Border color.",
					},
					{
						name: "widthValue",
						type: "string",
						description: "Border width with unit.",
					},
					{
						name: "radiusValue",
						type: "string",
						description: "Border radius with unit.",
					},
					{
						name: "widthUnits",
						type: "InspectorLengthUnit[]",
						description: "Allowed units for the border width field.",
					},
					{
						name: "colorAriaLabel",
						type: "string",
						description: "Accessible name for the color swatch.",
					},
					{
						name: "widthAriaLabel",
						type: "string",
						description: "Accessible name for the width input.",
					},
					{
						name: "layout",
						type: '"stacked" | "inline"',
						default: '"stacked"',
						description: "Stacked detail fields or a compact inline width-and-color row.",
					},
				]}
			>
				<div className="w-[300px] space-y-6">
					<BorderControlDemo />
					{/* Multi-select (mixed) */}
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Multi-select
						</div>
						<div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
							<Label className="mt-2 text-[11px] font-medium">Border</Label>
							<BorderControlGroup
								nodeId="demo-mixed"
								colorValue="#d8e0ea"
								widthValue="1px"
								radiusValue=""
								onColorChange={() => {}}
								onWidthChange={() => {}}
								onRadiusChange={() => {}}
								radiusPlaceholder="-"
							/>
						</div>
						<p className="editor-text-muted mt-2 text-[10px] leading-relaxed">
							In multi-select the radius NumericUnitInlineField shows a "-"
							placeholder when values differ across selected nodes.
						</p>
					</div>
				</div>
			</ComponentPreview>
		</>
	);
}
