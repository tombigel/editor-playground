import { useState } from "react";
import { parseUnitValue } from "@/api/documentApi";
import { NumberInput } from "@/components/ui/number-input";
import {
	ValueWithUnit,
	type ValueWithUnitOption,
	type ValueWithUnitSuggestion,
} from "@/components/ui/value-with-unit";
import { ComponentPreview } from "../../previews/ComponentPreview";
import type { PropDefinition } from "../../types";

const NUMBER_INPUT_PROPS: PropDefinition[] = [
	{
		name: "id",
		type: "string",
		description: "Optional input id for label association.",
	},
	{
		name: "value",
		type: "number",
		description: "Current numeric value.",
	},
	{
		name: "min",
		type: "number",
		description: "Minimum allowed value.",
	},
	{
		name: "max",
		type: "number",
		description: "Maximum allowed value.",
	},
	{
		name: "step",
		type: "number",
		description: "Step increment used by the native number input.",
	},
	{
		name: "mixed",
		type: "boolean",
		default: "false",
		description: "Shows the shared mixed-selection placeholder for multi-select states.",
	},
	{
		name: "unitLabel",
		type: "string",
		description:
			"Backward-compatible fixed suffix for existing editor adapters. New number + unit work should prefer ValueWithUnit.",
	},
	{
		name: "onChange",
		type: "(value: number) => void",
		description: "Called when the numeric value changes.",
	},
];

const VALUE_WITH_UNIT_PROPS: PropDefinition[] = [
	{
		name: "id",
		type: "string",
		description: "Optional input id for label association.",
	},
	{
		name: "mode",
		type: "'number-fixed' | 'number-select' | 'keyword-select' | 'number-or-keyword-select'",
		description: "Chooses the input + suffix composition model.",
	},
	{
		name: "value",
		type: "string",
		description: "Current serialized field value.",
	},
	{
		name: "onChange",
		type: "(nextValue: string) => void",
		description: "Called when the composed value changes.",
	},
	{
		name: "options",
		type: "ValueWithUnitOption[]",
		description: "Ordered dropdown options, including explicit separators.",
	},
	{
		name: "inputValue",
		type: "string",
		description: "Current numeric draft for input-capable modes.",
	},
	{
		name: "selectedOption",
		type: "string",
		description: "Currently selected suffix or keyword option.",
	},
	{
		name: "placeholder",
		type: "string",
		description: "Placeholder text shown when the value segment is empty.",
	},
	{
		name: "min",
		type: "number",
		description: "Minimum numeric value for input-capable modes.",
	},
	{
		name: "max",
		type: "number",
		description: "Maximum numeric value for input-capable modes.",
	},
	{
		name: "step",
		type: "number | 'any'",
		description: "Step increment passed to the native number input.",
	},
	{
		name: "mixed",
		type: "boolean",
		default: "false",
		description: "Applies the shared mixed-selection shell treatment.",
	},
	{
		name: "mixedSegment",
		type: "boolean",
		default: "mixed",
		description: "Marks just the suffix or mode segment as mixed when its selection differs across nodes.",
	},
	{
		name: "disabled",
		type: "boolean",
		default: "false",
		description: "Disables the input and/or dropdown trigger.",
	},
	{
		name: "ariaLabel",
		type: "string",
		description: "Accessible label for the input-capable segment.",
	},
	{
		name: "className",
		type: "string",
		description: "Optional wrapper classes for layout sizing and placement.",
	},
	{
		name: "onResolveOptionValue",
		type: "(nextOption: string, currentValue: string) => string | null",
		description: "Optional hook for caller-owned unit or keyword conversion when the option changes.",
	},
	{
		name: "onInputValueChange",
		type: "(nextInput: string) => void",
		description: "Optional controlled draft handler for numeric input modes.",
	},
	{
		name: "onInputBlur",
		type: "() => void",
		description: "Optional blur handler used to reset or validate external drafts.",
	},
	{
		name: "suggestions",
		type: "ValueWithUnitSuggestion[]",
		description: "Optional suggestion items rendered by the styled combobox popup.",
	},
	{
		name: "suggestionListId",
		type: "string",
		description: "Optional explicit id for the suggestion listbox used by combobox accessibility wiring.",
	},
	{
		name: "onSuggestionSelect",
		type: "(nextSuggestion: string) => void",
		description: "Called when a styled suggestion is selected.",
	},
	{
		name: "invalid",
		type: "boolean",
		default: "false",
		description: "Applies the shared invalid-state shell styling.",
	},
	{
		name: "segmentWidth",
		type: "number | string",
		description: "Overrides the suffix or mode segment width.",
	},
	{
		name: "defaultSuggestionsOpen",
		type: "boolean",
		default: "false",
		description: "Demo and test helper for opening the suggestion popup initially.",
	},
	{
		name: "defaultMenuOpen",
		type: "boolean",
		default: "false",
		description: "Demo and test helper for opening the unit or mode menu initially.",
	},
	{
		name: "expandToFill",
		type: "boolean",
		default: "false",
		description: "Makes the wrapper fill its parent width instead of shrinking to keyword/content width.",
	},
];

const FIXED_UNIT_OPTIONS: ValueWithUnitOption[] = [
	{ type: "option", value: "px", label: "px", inputMode: "numeric" },
];

const SELECTABLE_UNIT_OPTIONS: ValueWithUnitOption[] = [
	{ type: "option", value: "px", label: "px", inputMode: "numeric" },
	{ type: "option", value: "%", label: "%", inputMode: "numeric" },
];

const KEYWORD_OPTIONS: ValueWithUnitOption[] = [
	{ type: "option", value: "auto", label: "Auto", inputMode: "keyword" },
	{
		type: "option",
		value: "fit-content",
		label: "Fit content",
		inputMode: "keyword",
	},
	{ type: "option", value: "stretch", label: "Stretch", inputMode: "keyword" },
];

const MIXED_MODE_OPTIONS: ValueWithUnitOption[] = [
	{ type: "option", value: "px", label: "px", inputMode: "numeric" },
	{ type: "option", value: "%", label: "%", inputMode: "numeric" },
	{ type: "separator", id: "size-keywords" },
	{ type: "option", value: "auto", label: "Auto", inputMode: "keyword" },
	{
		type: "option",
		value: "fit-content",
		label: "Fit content",
		inputMode: "keyword",
	},
];

const FONT_SIZE_SUGGESTIONS: ValueWithUnitSuggestion[] = [
	{ value: "12", label: "12px" },
	{ value: "14", label: "14px" },
	{ value: "16", label: "16px" },
	{ value: "24", label: "24px" },
	{ value: "32", label: "32px" },
];

function DemoLabel({ children }: { children: string }) {
	return (
		<div className="editor-text-muted mb-2 text-[11px] font-medium">{children}</div>
	);
}

function tryParseUnitValue(value: string) {
	try {
		return parseUnitValue(value);
	} catch {
		return null;
	}
}

function resolveNumericValueState(value: string, fallbackUnit: string) {
	const parsed = tryParseUnitValue(value);
	if (!parsed) {
		return { inputValue: "", selectedOption: fallbackUnit };
	}
	return {
		inputValue: String(parsed.parsed.value),
		selectedOption: parsed.parsed.unit,
	};
}

function resolveMixedValueState(value: string) {
	const parsed = tryParseUnitValue(value);
	if (parsed) {
		return {
			inputValue: String(parsed.parsed.value),
			selectedOption: parsed.parsed.unit,
		};
	}
	return {
		inputValue: "",
		selectedOption: value,
	};
}

function NumberInputDemo() {
	const [defaultValue, setDefaultValue] = useState(16);
	const [decimalValue, setDecimalValue] = useState(2.5);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start gap-5">
				<div className="w-[116px]">
					<DemoLabel>Default</DemoLabel>
					<NumberInput
						value={defaultValue}
						min={0}
						max={400}
						step={1}
						onChange={setDefaultValue}
					/>
				</div>
				<div className="w-[116px]">
					<DemoLabel>Decimal</DemoLabel>
					<NumberInput
						value={decimalValue}
						min={0}
						max={10}
						step={0.1}
						onChange={setDecimalValue}
					/>
				</div>
			</div>
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
					Multi-select
				</div>
				<div className="w-[116px]">
					<NumberInput
						value={16}
						min={0}
						max={400}
						step={1}
						onChange={() => {}}
						mixed
					/>
				</div>
			</div>
		</div>
	);
}

function ValueWithUnitDemo() {
	const [fixedValue, setFixedValue] = useState("16px");
	const [selectValue, setSelectValue] = useState("100%");
	const [keywordValue, setKeywordValue] = useState("auto");
	const [mixedModeValue, setMixedModeValue] = useState("fit-content");
	const [suggestionValue, setSuggestionValue] = useState("24px");

	const fixedState = resolveNumericValueState(fixedValue, "px");
	const selectState = resolveNumericValueState(selectValue, "px");
	const keywordState = resolveMixedValueState(keywordValue);
	const mixedState = resolveMixedValueState(mixedModeValue);
	const suggestionState = resolveNumericValueState(suggestionValue, "px");

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start gap-5">
				<div className="w-[148px]">
					<DemoLabel>Single unit</DemoLabel>
					<ValueWithUnit
						mode="number-fixed"
						value={fixedValue}
						onChange={setFixedValue}
						options={FIXED_UNIT_OPTIONS}
						inputValue={fixedState.inputValue}
						selectedOption={fixedState.selectedOption}
						min={0}
						max={400}
						step={1}
						ariaLabel="Single unit"
					/>
				</div>
				<div className="w-[148px]">
					<DemoLabel>Multiple units</DemoLabel>
					<ValueWithUnit
						mode="number-select"
						value={selectValue}
						onChange={setSelectValue}
						options={SELECTABLE_UNIT_OPTIONS}
						inputValue={selectState.inputValue}
						selectedOption={selectState.selectedOption}
						min={0}
						max={400}
						step={1}
						ariaLabel="Multiple units"
					/>
				</div>
				<div className="w-[148px]">
					<DemoLabel>Keyword</DemoLabel>
					<ValueWithUnit
						mode="keyword-select"
						value={keywordValue}
						onChange={setKeywordValue}
						options={KEYWORD_OPTIONS}
						selectedOption={keywordState.selectedOption}
						placeholder="Choose keyword"
					/>
				</div>
				<div className="w-[148px]">
					<DemoLabel>Number or keyword</DemoLabel>
					<ValueWithUnit
						mode="number-or-keyword-select"
						value={mixedModeValue}
						onChange={setMixedModeValue}
						options={MIXED_MODE_OPTIONS}
						inputValue={mixedState.inputValue}
						selectedOption={mixedState.selectedOption}
						min={0}
						max={400}
						step={1}
						placeholder="Choose mode"
						ariaLabel="Number or keyword"
						onResolveOptionValue={(nextOption, currentValue) => {
							const nextOptionConfig = MIXED_MODE_OPTIONS.find(
								(option) => option.type === "option" && option.value === nextOption,
							);
							if (!nextOptionConfig || nextOptionConfig.type !== "option") {
								return null;
							}
							if (nextOptionConfig.inputMode === "keyword") {
								return nextOption;
							}
							const parsed = tryParseUnitValue(currentValue);
							return `${parsed ? parsed.parsed.value : 100}${nextOption}`;
						}}
					/>
				</div>
				<div className="w-[148px]">
					<DemoLabel>Suggestions</DemoLabel>
					<ValueWithUnit
						mode="number-select"
						value={suggestionValue}
						onChange={setSuggestionValue}
						options={FIXED_UNIT_OPTIONS}
						inputValue={suggestionState.inputValue}
						selectedOption={suggestionState.selectedOption}
						min={8}
						max={128}
						step={1}
						ariaLabel="Font size"
						suggestions={FONT_SIZE_SUGGESTIONS}
						suggestionListId="design-system-font-size-suggestions"
					/>
				</div>
			</div>
			<div>
				<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
					Multi-select
				</div>
				<div className="flex flex-wrap items-start gap-5">
					<div className="w-[148px]">
						<DemoLabel>Single unit (mixed)</DemoLabel>
						<ValueWithUnit
							mode="number-fixed"
							value="16px"
							onChange={() => {}}
							options={FIXED_UNIT_OPTIONS}
							inputValue=""
							selectedOption="px"
							mixed
							ariaLabel="Single unit mixed"
						/>
					</div>
					<div className="w-[148px]">
						<DemoLabel>Multiple units (mixed)</DemoLabel>
						<ValueWithUnit
							mode="number-select"
							value="100%"
							onChange={() => {}}
							options={SELECTABLE_UNIT_OPTIONS}
							inputValue=""
							selectedOption="%"
							mixed
							ariaLabel="Multiple units mixed"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export function NumberFieldDemos() {
	return (
		<>
			<ComponentPreview
				id="base-number-field"
				name="Number Input"
				description="Plain numeric entry with editor validation and mixed-state support. Value + suffix and unit-menu patterns live in the shared ValueWithUnit component below."
				sourceFile="src/components/ui/number-input.tsx"
				props={NUMBER_INPUT_PROPS}
			>
				<NumberInputDemo />
			</ComponentPreview>

			<ComponentPreview
				id="base-number-unit"
				name="ValueWithUnit"
				description="Reusable editor composite for fixed units, selectable units, keyword menus, mixed numeric-or-keyword modes, and suggestion-enabled inputs with a styled combobox popup."
				sourceFile="src/components/ui/value-with-unit.tsx"
				props={VALUE_WITH_UNIT_PROPS}
			>
				<ValueWithUnitDemo />
			</ComponentPreview>
		</>
	);
}
