import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FormField } from "../../InspectorControls";
import type { TextInspectorNode } from "../types";
import { TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX } from "./shared";

const HTML_TAG_OPTIONS = [
	{ value: "h1", label: "H1" },
	{ value: "h2", label: "H2" },
	{ value: "h3", label: "H3" },
	{ value: "h4", label: "H4" },
	{ value: "h5", label: "H5" },
	{ value: "h6", label: "H6" },
	{ value: "p", label: "P" },
	{ value: "blockquote", label: "Blockquote" },
	{ value: "div", label: "Div" },
] as const;

export function HtmlTagInlineField({
	value,
	onValueChange,
}: {
	value: TextInspectorNode["htmlTag"];
	onValueChange: (value: string) => void;
}) {
	return (
		<FormField
			label="HTML tag"
			layout="inline"
			controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
		>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className="h-7 w-24 rounded-sm text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{HTML_TAG_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FormField>
	);
}
