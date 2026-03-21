import { useState } from "react";
import {
	RangeField,
	SizeInlineField,
	StickyOffsetBandField,
} from "@/panels/InspectorControls";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const STICKY_INDICATOR_PROPS: PropDefinition[] = [
	{
		name: "color",
		type: "CSS custom property",
		description:
			"Guide color, label background, and label text variables from the editor theme.",
	},
];

// ---------------------------------------------------------------------------
// Interactive preview wrappers
// ---------------------------------------------------------------------------

function SliderDemo() {
	const [rangeValue, setRangeValue] = useState(75);
	const [topOffset, setTopOffset] = useState(20);
	const [bottomOffset, setBottomOffset] = useState(60);
	return (
		<div className="space-y-6">
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					RangeField (labeled slider with value badge)
				</div>
				<div className="w-full max-w-[300px]">
					<RangeField
						label="Opacity"
						value={rangeValue}
						min={0}
						max={100}
						step={1}
						unit="%"
						onValueChange={setRangeValue}
					/>
				</div>
			</div>
			<div>
				<div className="editor-text-muted mb-2 text-[11px] font-medium">
					StickyOffsetBandField (dual-handle range)
				</div>
				<div className="w-full max-w-[300px]">
					<StickyOffsetBandField
						topOffset={topOffset}
						bottomOffset={bottomOffset}
						min={0}
						max={100}
						step={1}
						unit="vh"
						onValueChange={(top, bottom) => {
							setTopOffset(top);
							setBottomOffset(bottom);
						}}
					/>
				</div>
			</div>
			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-select</div>
				<div className="w-full max-w-[300px]">
					<RangeField
						label="Opacity"
						value={75}
						min={0}
						max={100}
						step={1}
						unit="%"
						onValueChange={() => {}}
						mixed
					/>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function SizeFieldDemos() {
	return (
		<>
			{/* Sticky Indicators */}
			<ComponentPreview
				id="base-sticky-indicator"
				name="Sticky Indicators"
				description="Colored indicator bars used in the stage to visualize sticky guide types."
				sourceFile="src/styles.css (sticky guide variables)"
				props={STICKY_INDICATOR_PROPS}
			>
				<div className="flex flex-wrap gap-6">
					{/* Distance indicator */}
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-[100px] w-[40px]">
							<div
								className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
								style={{
									borderLeft:
										"2.5px dashed var(--editor-sticky-distance-guide-color)",
								}}
							/>
							<div
								className="absolute top-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-distance-guide-color)",
								}}
							/>
							<div
								className="absolute bottom-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-distance-guide-color)",
								}}
							/>
							<div
								className="sticky-spacer-label"
								style={{
									background: "var(--editor-sticky-distance-label-background)",
									color: "var(--editor-sticky-distance-label-text)",
								}}
							>
								200vh
							</div>
						</div>
						<span className="editor-text-muted text-[10px] font-medium">
							Distance
						</span>
					</div>
					{/* Offset indicator */}
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-[100px] w-[40px]">
							<div
								className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
								style={{
									background:
										"repeating-linear-gradient(to bottom, var(--editor-sticky-offset-guide-color) 0 6px, transparent 6px 11px)",
									width: 2.5,
								}}
							/>
							<div
								className="absolute top-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-offset-guide-color)",
								}}
							/>
							<div
								className="absolute bottom-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-offset-guide-color)",
								}}
							/>
							<div
								className="sticky-spacer-label"
								style={{
									background: "var(--editor-sticky-offset-label-background)",
									color: "var(--editor-sticky-offset-label-text)",
								}}
							>
								10vh
							</div>
						</div>
						<span className="editor-text-muted text-[10px] font-medium">
							Offset
						</span>
					</div>
					{/* Auto indicator */}
					<div className="flex flex-col items-center gap-2">
						<div className="relative h-[100px] w-[40px]">
							<div
								className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
								style={{
									borderLeft:
										"2.5px dashed var(--editor-sticky-auto-guide-color)",
								}}
							/>
							<div
								className="absolute top-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-auto-guide-color)",
								}}
							/>
							<div
								className="absolute bottom-0 left-1/2 -translate-x-1/2"
								style={{
									width: 20,
									borderTop:
										"2.5px solid var(--editor-sticky-auto-guide-color)",
								}}
							/>
							<div
								className="sticky-spacer-label sticky-spacer-label-auto"
								style={{
									background: "var(--editor-sticky-auto-label-background)",
									color: "var(--editor-sticky-auto-label-text)",
								}}
							>
								auto
							</div>
						</div>
						<span className="editor-text-muted text-[10px] font-medium">
							Auto
						</span>
					</div>
				</div>
			</ComponentPreview>

			{/* Slider / RangeField / StickyOffsetBandField */}
			<ComponentPreview
				id="base-slider"
				name="Slider"
				description="Range slider based on Radix UI, labeled RangeField with value badge, and StickyOffsetBandField with dual handles."
				sourceFile="src/components/ui/slider.tsx"
				props={[
					{ name: "value", type: "number[]", description: "Current value(s)." },
					{
						name: "min",
						type: "number",
						default: "0",
						description: "Minimum value.",
					},
					{
						name: "max",
						type: "number",
						default: "100",
						description: "Maximum value.",
					},
					{
						name: "step",
						type: "number",
						default: "1",
						description: "Step increment.",
					},
					{
						name: "onValueChange",
						type: "(value: number[]) => void",
						description: "Change handler.",
					},
				]}
			>
				<SliderDemo />
			</ComponentPreview>
		</>
	);
}
