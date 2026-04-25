import type { PropDefinition } from "../../types";

export const INPUT_PROPS: PropDefinition[] = [
	{
		name: "type",
		type: "string",
		default: "'text'",
		description: "HTML input type.",
	},
	{ name: "value", type: "string", description: "Controlled value." },
	{ name: "placeholder", type: "string", description: "Placeholder text." },
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

export const SWITCH_PROPS: PropDefinition[] = [
	{ name: "checked", type: "boolean", description: "Checked state." },
	{
		name: "onCheckedChange",
		type: "(checked: boolean) => void",
		description: "Change handler.",
	},
	{
		name: "mixed",
		type: "boolean",
		default: "false",
		description:
			"Shows the shared mixed multi-select switch state with a dashed thumb border.",
	},
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

export const OPTIONS_SELECTOR_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string",
		description: "Currently selected option value.",
	},
	{
		name: "options",
		type: "OptionsSelectorOption[]",
		description:
			"Mutually exclusive choices with labels, optional icons, and optional per-option tooltips.",
	},
	{
		name: "onValueChange",
		type: "(value: string) => void",
		description: "Selection change handler.",
	},
	{
		name: "display",
		type: "'label' | 'icon' | 'icon-label'",
		default: "'label'",
		description: "Whether options show labels only, icons only, or both.",
	},
	{
		name: "mixed",
		type: "boolean",
		default: "false",
		description:
			"Shows the dashed mixed-state presentation for multi-select inspector values.",
	},
];

export const TEXTAREA_PROPS: PropDefinition[] = [
	{ name: "value", type: "string", description: "Controlled value." },
	{ name: "placeholder", type: "string", description: "Placeholder text." },
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disabled state.",
	},
];

export const LIST_CARD_PROPS: PropDefinition[] = [
	{ name: "title", type: "ReactNode", description: "Primary list-card title." },
	{
		name: "description",
		type: "ReactNode",
		description: "Secondary supporting copy.",
	},
	{
		name: "meta",
		type: "ReactNode",
		description: "Compact right-aligned metadata slot.",
	},
	{
		name: "actions",
		type: "ReactNode",
		description: "Trailing action cluster.",
	},
	{
		name: "tone",
		type: "'default' | 'subtle'",
		default: "'default'",
		description: "Surface emphasis variant.",
	},
];

export const SEARCHABLE_MULTI_SELECT_PROPS: PropDefinition[] = [
	{
		name: "values",
		type: "string[]",
		description: "Currently selected option values.",
	},
	{
		name: "options",
		type: "SearchableMultiSelectOption[]",
		description:
			"Fixed option set with optional descriptions and search keywords.",
	},
	{
		name: "placeholder",
		type: "string",
		description: "Trigger text when nothing is selected.",
	},
	{
		name: "searchPlaceholder",
		type: "string",
		description: "Filter input placeholder text.",
	},
	{
		name: "onValuesChange",
		type: "(values: string[]) => void",
		description: "Selection change handler.",
	},
];

export const SELECTION_CHROME_PROPS: PropDefinition[] = [
	{
		name: "className",
		type: "string",
		description: "Additional CSS classes for the selection outline wrapper.",
	},
];

export const WARNING_INFO_PROPS: PropDefinition[] = [
	{
		name: "tone",
		type: "'muted' | 'info' | 'success' | 'danger' | 'warning'",
		description: "Visual state for a shared notice surface.",
	},
	{
		name: "children",
		type: "ReactNode",
		description: "Notice content.",
	},
];

export const TOOLTIP_PROPS: PropDefinition[] = [
	{ name: "content", type: "ReactNode", description: "Tooltip content." },
	{
		name: "side",
		type: "'top' | 'bottom' | 'right'",
		default: "'top'",
		description: "Preferred side.",
	},
	{
		name: "align",
		type: "'start' | 'center' | 'end'",
		default: "'center'",
		description: "Alignment.",
	},
	{
		name: "offset",
		type: "number",
		default: "12",
		description: "Offset in px.",
	},
];

export const PAGER_PROPS: PropDefinition[] = [
	{
		name: "page",
		type: "number",
		description: "Current page number.",
	},
	{
		name: "totalPages",
		type: "number",
		description: "Total number of pages.",
	},
];

export const MENUBAR_PROPS: PropDefinition[] = [
	{
		name: "id",
		type: "string",
		description: "Stable menu id used for active/open state management.",
	},
	{
		name: "children",
		type: "ReactNode",
		description: "Menu triggers, panels, and row primitives.",
	},
];

export const PAGE_SWITCHER_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string | null",
		description: "Currently selected page id.",
	},
	{
		name: "options",
		type: "PageSwitcherOption[]",
		description: "Ordered page options with optional nesting depth.",
	},
	{
		name: "placeholder",
		type: "string",
		default: "'Untitled'",
		description: "Fallback label when no active page is selected.",
	},
	{
		name: "onValueChange",
		type: "(value: string) => void",
		description: "Called when a page option is selected.",
	},
	{
		name: "onCreatePage",
		type: "() => void",
		description: "Called when the create-page row is chosen.",
	},
	{
		name: "triggerClassName",
		type: "string",
		description: "Optional trigger class overrides.",
	},
	{
		name: "contentClassName",
		type: "string",
		description: "Optional menu content class overrides.",
	},
	{
		name: "defaultOpen",
		type: "boolean",
		default: "false",
		description: "Demo/test helper for opening the menu initially.",
	},
];

export const TABS_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string",
		description: "Controlled selected tab value.",
	},
	{
		name: "variant",
		type: "'default' | 'segmented'",
		description: "List and trigger visual variant.",
	},
	{
		name: "size",
		type: "'default' | 'compact'",
		description: "Trigger density variant.",
	},
];

export const SEARCHABLE_SELECT_PROPS: PropDefinition[] = [
	{
		name: "value",
		type: "string | undefined",
		description: "Currently selected option value.",
	},
	{
		name: "options",
		type: "SearchableSelectOption[]",
		description: "Fixed option set with optional descriptions and keywords.",
	},
	{
		name: "placeholder",
		type: "string",
		description: "Trigger placeholder text.",
	},
	{
		name: "searchPlaceholder",
		type: "string",
		description: "Search input placeholder text.",
	},
	{
		name: "onValueChange",
		type: "(value: string | undefined) => void",
		description: "Selection change handler.",
	},
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disables the trigger and menu.",
	},
];
