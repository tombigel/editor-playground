import { useState } from "react";
import { HoverColorField } from "@/panels/InspectorControls";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const COLOR_PICKER_PROPS: PropDefinition[] = [
	{ name: "value", type: "string", description: "Color value." },
	{ name: "fallback", type: "string", description: "Fallback color." },
	{
		name: "allowAlpha",
		type: "boolean",
		default: "false",
		description: "Allow alpha channel.",
	},
	{ name: "ariaLabel", type: "string", description: "Accessible label." },
	{
		name: "onChange",
		type: "(value: string) => void",
		description: "Change handler.",
	},
];

// ---------------------------------------------------------------------------
// Interactive preview wrappers
// ---------------------------------------------------------------------------

function ColorDemo() {
	const [color, setColor] = useState("#1668ff");
	const [colorAlpha, setColorAlpha] = useState("rgba(22, 104, 255, 0.6)");
	return (
		<div className="space-y-6">
			<div className="flex gap-4">
				<div>
					<div className="editor-text-muted mb-1 text-[10px]">Opaque</div>
					<HoverColorField
						value={color}
						onChange={setColor}
						ariaLabel="Color field opaque"
						showOpacity={false}
					/>
				</div>
				<div>
					<div className="editor-text-muted mb-1 text-[10px]">With alpha</div>
					<HoverColorField
						value={colorAlpha}
						onChange={setColorAlpha}
						ariaLabel="Color field with alpha"
					/>
				</div>
			</div>
			{/* Multi-select (mixed) */}
			<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">Multi-select</div>
			<div className="flex w-fit gap-4">
				<div>
					<div className="editor-text-muted mb-1 text-[10px]">Opaque (mixed)</div>
					<HoverColorField
						value="#1668ff"
						onChange={() => {}}
						ariaLabel="Color field opaque mixed"
						showOpacity={false}
						mixed
					/>
				</div>
				<div>
					<div className="editor-text-muted mb-1 text-[10px]">With alpha (mixed)</div>
					<HoverColorField
						value="rgba(22, 104, 255, 0.6)"
						onChange={() => {}}
						ariaLabel="Color field with alpha mixed"
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

export function ColorAndEffectDemos() {
	return (
		<>
			{/* Color */}
			<ComponentPreview
				id="base-color"
				name="Color"
				description="Color picker (opaque and alpha modes) and inline swatch field."
				sourceFile="src/components/ui/color-picker.tsx"
				props={COLOR_PICKER_PROPS}
			>
				<ColorDemo />
			</ComponentPreview>
		</>
	);
}
