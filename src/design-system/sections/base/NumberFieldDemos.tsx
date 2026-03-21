import { useState } from "react";
import {
	LabeledNumberField,
	NumericUnitInlineField,
	SizeInlineField,
} from "@/panels/InspectorControls";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const NUMBER_INPUT_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "number",
		description: "Current numeric value.",
	},
	{ name: "min", type: "number", description: "Minimum allowed value." },
	{ name: "max", type: "number", description: "Maximum allowed value." },
	{ name: "step", type: "number", description: "Step increment." },
	{
		name: "onChange",
		type: "(value: number) => void",
		description: "Change handler.",
	},
	{
		name: "unitLabel",
		type: "string",
		description:
			"Unit suffix shown in a compact pill (e.g. 'px', '%', '\u00B0').",
	},
];

const NUMERIC_UNIT_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string",
		description: "Value with unit suffix (e.g. '16px').",
	},
	{
		name: "units",
		type: "('px' | '%' | 'vw' | 'vh' | ...)[\\]",
		description: "Available unit options.",
	},
	{
		name: "onChange",
		type: "(value: string) => void",
		description: "Change handler (value includes unit).",
	},
	{
		name: "min",
		type: "number",
		description: "Minimum allowed numeric value.",
	},
	{
		name: "max",
		type: "number",
		description: "Maximum allowed numeric value.",
	},
];

// ---------------------------------------------------------------------------
// Interactive preview wrappers
// ---------------------------------------------------------------------------

function NumberFieldDemo() {
	const [plain, setPlain] = useState(42);
	const [withUnit, setWithUnit] = useState(16);
	const [angle, setAngle] = useState(180);
	return (
		<div className="space-y-6">
			<div className="grid max-w-[400px] grid-cols-3 gap-3">
				<LabeledNumberField
					label="Plain"
					value={plain}
					onChange={setPlain}
					min={0}
					max={200}
					step={1}
				/>
				<LabeledNumberField
					label="With unit"
					value={withUnit}
					onChange={setWithUnit}
					min={0}
					max={200}
					step={1}
					unitLabel="px"
				/>
				<LabeledNumberField
					label="Angle"
					value={angle}
					onChange={setAngle}
					min={0}
					max={360}
					step={1}
					unitLabel="°"
				/>
			</div>
			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-select</div>
				<div className="grid max-w-[400px] grid-cols-3 gap-3">
					<LabeledNumberField
						label="Plain"
						value={42}
						onChange={() => {}}
						min={0}
						max={200}
						step={1}
						mixed
					/>
					<LabeledNumberField
						label="With unit"
						value={16}
						onChange={() => {}}
						min={0}
						max={200}
						step={1}
						unitLabel="px"
						mixed
					/>
					<LabeledNumberField
						label="Angle"
						value={180}
						onChange={() => {}}
						min={0}
						max={360}
						step={1}
						unitLabel="°"
						mixed
					/>
				</div>
			</div>
		</div>
	);
}

function NumericUnitDemo() {
	const [singleUnit, setSingleUnit] = useState("16px");
	const [multiUnit, setMultiUnit] = useState("100%");
	return (
		<div className="space-y-6">
			<div className="grid w-[480px] grid-cols-3 gap-4">
				<div>
					<div className="editor-text-muted mb-1 text-[11px] font-medium">
						Single unit
					</div>
					<NumericUnitInlineField
						value={singleUnit}
						units={["px"]}
						onChange={setSingleUnit}
						aria-label="Single unit"
					/>
				</div>
				<div>
					<div className="editor-text-muted mb-1 text-[11px] font-medium">
						Multiple units
					</div>
					<NumericUnitInlineField
						value={multiUnit}
						units={["px", "%", "vh"]}
						onChange={setMultiUnit}
						aria-label="Multi unit"
					/>
				</div>
				<div>
					<div className="editor-text-muted mb-1 text-[11px] font-medium">
						Keywords
					</div>
					<SizeInlineField
						label="W"
						nodeId="demo"
						axis="width"
						value="fit-content"
						onChange={() => {}}
					/>
				</div>
			</div>
			{/* Multi-select (mixed) */}
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-select</div>
				<div className="grid w-[480px] grid-cols-3 gap-4">
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							Single unit (mixed)
						</div>
						<NumericUnitInlineField
							value="16px"
							units={["px"]}
							onChange={() => {}}
							aria-label="Single unit mixed"
							mixed
						/>
					</div>
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							Multiple units (mixed)
						</div>
						<NumericUnitInlineField
							value="100%"
							units={["px", "%", "vh"]}
							onChange={() => {}}
							aria-label="Multi unit mixed"
							mixed
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function NumberFieldDemos() {
	return (
		<>
			{/* Number Field */}
			<ComponentPreview
				id="base-number-field"
				name="Number Field"
				description="Compact numeric input with optional unit suffix label, validation, and draft management."
				sourceFile="src/panels/InspectorControls.tsx"
				props={NUMBER_INPUT_PROPS}
			>
				<NumberFieldDemo />
			</ComponentPreview>

			{/* Number with Unit */}
			<ComponentPreview
				id="base-number-unit"
				name="Number with Unit"
				description="Inline numeric field with a selectable unit suffix. Supports single or multiple unit modes."
				sourceFile="src/panels/InspectorControls.tsx"
				props={NUMERIC_UNIT_PROPS}
			>
				<NumericUnitDemo />
			</ComponentPreview>
		</>
	);
}
