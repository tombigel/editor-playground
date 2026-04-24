import {
	type FocusEvent as ReactFocusEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useState,
} from "react";

import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { NumberInput } from "@/components/ui/number-input";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	ValueWithUnit,
	type ValueWithUnitOption,
	type ValueWithUnitSuggestion,
} from "@/components/ui/value-with-unit";

import { formatDisplayValue } from "../../../model/conversion";
import { parseFontSizeValue, parseSpacingValue } from "../../../model/units";
import {
	BLOCK_SPACING_UNIT_OPTIONS,
	FONT_SIZE_SUGGESTIONS_BY_UNIT,
	FONT_SIZE_UNIT_OPTIONS,
	RICH_VALUE_FIELD_IDS,
	type RichEditSelectId,
	type ToolbarFontUnit,
	type ToolbarSpacingUnit,
} from "./types";

export function ToolbarButton({
	label,
	active,
	onActivate,
	children,
}: {
	label: string;
	active: boolean;
	onActivate: () => void;
	children: React.ReactNode;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<Button
				type="button"
				variant={active ? "default" : "outline"}
				size="sm"
				aria-label={label}
				aria-pressed={active}
				className="pointer-events-auto h-8 w-8 shrink-0 rounded-sm p-0 text-xs"
				style={{ pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
				onClick={onActivate}
			>
				{children}
			</Button>
		</PopoverTooltip>
	);
}

export function preserveRichSelectionPointerDown(event: {
	preventDefault: () => void;
	stopPropagation: () => void;
}) {
	event.preventDefault();
	event.stopPropagation();
}

export function CompactSelect({
	selectId,
	open,
	onOpenChange,
	label,
	value,
	onValueChange,
	options,
	width,
}: {
	selectId: RichEditSelectId;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
	width: number;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<Select
				open={open}
				onOpenChange={onOpenChange}
				value={value}
				onValueChange={onValueChange}
			>
				<SelectTrigger
					data-stage-rich-select-id={selectId}
					aria-label={label}
					size="compact"
					className="pointer-events-auto h-8 shrink-0 rounded-sm text-xs"
					style={{ width, pointerEvents: "auto" }}
					onPointerDown={preserveRichSelectionPointerDown}
				>
					<span className="truncate text-left">
						{options.find((option) => option.value === value)?.label ?? label}
					</span>
				</SelectTrigger>
				<SelectContent data-stage-rich-select-id={selectId}>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</PopoverTooltip>
	);
}

export function CompactFontSizeField({
	label,
	value,
	width,
	onCommit,
	suggestionsOpen,
	onSuggestionsOpenChange,
	resolveUnitValue,
}: {
	label: string;
	value: string;
	width: number;
	onCommit: (value: string) => void;
	suggestionsOpen: boolean;
	onSuggestionsOpenChange: (open: boolean) => void;
	resolveUnitValue: (
		nextUnit: ToolbarFontUnit,
		currentValue: string,
	) => string | null;
}) {
	const [draft, setDraft] = useState(readFontSizeDraftState(value));
	const [invalid, setInvalid] = useState(false);
	const options: ValueWithUnitOption[] = FONT_SIZE_UNIT_OPTIONS.map((option) => ({
		type: "option",
		value: option,
		label: option,
		inputMode: "numeric",
	}));
	const suggestions: ValueWithUnitSuggestion[] =
		FONT_SIZE_SUGGESTIONS_BY_UNIT[draft.unit].map((option) => ({
			value: formatDisplayValue(option),
			label: `${formatDisplayValue(option)}${draft.unit}`,
		}));

	useEffect(() => {
		setDraft(readFontSizeDraftState(value));
		setInvalid(false);
	}, [value]);

	const commitDraft = useCallback(() => {
		if (!draft.draft.trim()) {
			onCommit("");
			setInvalid(false);
			return;
		}
		try {
			const parsed = parseFontSizeValue(`${draft.draft}${draft.unit}`);
			onCommit(`${formatDisplayValue(parsed.parsed.value)}${draft.unit}`);
			setInvalid(false);
		} catch {
			setDraft(readFontSizeDraftState(value));
			setInvalid(false);
		}
	}, [draft, onCommit, value]);

	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: toolbar field shell coordinates blur/Enter commit across shared input and unit trigger */}
			<div
				data-stage-rich-value-field-id={RICH_VALUE_FIELD_IDS.fontSize}
				className="pointer-events-auto shrink-0"
				style={{ width, pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
						return;
					}
					commitDraft();
				}}
				onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
					if (event.defaultPrevented || event.key !== "Enter") {
						return;
					}
					if (!(event.target instanceof HTMLInputElement)) {
						return;
					}
					event.preventDefault();
					commitDraft();
					event.target.blur();
				}}
			>
				<ValueWithUnit
					mode="number-select"
					value={value || `${draft.draft || 0}${draft.unit}`}
					onChange={(nextValue) => {
						try {
							const parsed = parseFontSizeValue(nextValue);
							setDraft({
								draft: formatDisplayValue(parsed.parsed.value),
								unit: parsed.parsed.unit as ToolbarFontUnit,
								valid: true,
							});
							setInvalid(false);
							onCommit(
								`${formatDisplayValue(parsed.parsed.value)}${parsed.parsed.unit}`,
							);
						} catch {
							if (FONT_SIZE_UNIT_OPTIONS.includes(nextValue as ToolbarFontUnit)) {
								setDraft((current) => ({
									...current,
									unit: nextValue as ToolbarFontUnit,
								}));
							}
						}
					}}
					options={options}
					inputValue={draft.draft}
					selectedOption={draft.unit}
					placeholder={value ? undefined : "18"}
					min={0}
					step="any"
					ariaLabel={label}
					invalid={invalid}
					segmentWidth={36}
					suggestions={suggestions}
					suggestionsOpen={suggestionsOpen}
					onSuggestionsOpenChange={onSuggestionsOpenChange}
					includeDisabledStyles={false}
					onInputBlur={commitDraft}
					onInputValueChange={(nextDraft) => {
						setDraft((current) => ({ ...current, draft: nextDraft }));
						if (!nextDraft.trim()) {
							setInvalid(false);
							return;
						}
						try {
							parseFontSizeValue(`${nextDraft}${draft.unit}`);
							setInvalid(false);
						} catch {
							setInvalid(true);
						}
					}}
					onResolveOptionValue={(nextUnit, currentValue) =>
						resolveUnitValue(nextUnit as ToolbarFontUnit, currentValue)
					}
				/>
			</div>
		</PopoverTooltip>
	);
}

export function CompactLineHeightField({
	label,
	icon,
	value,
	width,
	onChange,
}: {
	label: string;
	icon: React.ReactNode;
	value: number;
	width: number;
	onChange: (value: number) => void;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<div
				className="pointer-events-auto flex h-8 shrink-0 items-center gap-1"
				style={{ width, pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
			>
				<span className="editor-text-muted flex shrink-0 items-center">
					{icon}
				</span>
				<div className="min-w-0 flex-1">
					<NumberInput
						value={value}
						ariaLabel={label}
						min={0.1}
						max={4}
						step="any"
						onChange={onChange}
						placeholder="1.2"
						includeDisabledStyles={false}
						inputClassName="min-w-0"
					/>
				</div>
			</div>
		</PopoverTooltip>
	);
}

export function CompactSpacingField({
	label,
	icon,
	value,
	width,
	onCommit,
	resolveUnitValue,
}: {
	label: string;
	icon: React.ReactNode;
	value: string;
	width: number;
	onCommit: (value: string) => void;
	resolveUnitValue: (
		nextUnit: ToolbarSpacingUnit,
		currentValue: string,
	) => string | null;
}) {
	const [draft, setDraft] = useState(readSpacingDraftState(value));
	const [invalid, setInvalid] = useState(false);
	const options: ValueWithUnitOption[] = BLOCK_SPACING_UNIT_OPTIONS.map(
		(option) => ({
			type: "option",
			value: option,
			label: option,
			inputMode: "numeric",
		}),
	);

	useEffect(() => {
		setDraft(readSpacingDraftState(value));
		setInvalid(false);
	}, [value]);

	const commitDraft = useCallback(() => {
		if (!draft.draft.trim()) {
			setDraft(readSpacingDraftState(value));
			setInvalid(false);
			return;
		}
		try {
			const parsed = parseSpacingValue(`${draft.draft}${draft.unit}`);
			onCommit(`${formatDisplayValue(parsed.parsed.value)}${draft.unit}`);
			setInvalid(false);
		} catch {
			setDraft(readSpacingDraftState(value));
			setInvalid(false);
		}
	}, [draft, onCommit, value]);

	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: toolbar field shell coordinates blur/Enter commit across shared input and unit trigger */}
			<div
				className="pointer-events-auto flex shrink-0 items-center gap-1"
				style={{ width, pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
						return;
					}
					commitDraft();
				}}
				onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
					if (event.defaultPrevented || event.key !== "Enter") {
						return;
					}
					if (!(event.target instanceof HTMLInputElement)) {
						return;
					}
					event.preventDefault();
					commitDraft();
					event.target.blur();
				}}
			>
				<span className="editor-text-muted flex h-8 shrink-0 items-center">
					{icon}
				</span>
				<ValueWithUnit
					mode="number-select"
					value={value || `${draft.draft || 0}${draft.unit}`}
					onChange={(nextValue) => {
						try {
							const parsed = parseSpacingValue(nextValue);
							setDraft({
								draft: formatDisplayValue(parsed.parsed.value),
								unit: parsed.parsed.unit as ToolbarSpacingUnit,
								valid: true,
							});
							setInvalid(false);
							onCommit(
								`${formatDisplayValue(parsed.parsed.value)}${parsed.parsed.unit}`,
							);
						} catch {
							if (
								BLOCK_SPACING_UNIT_OPTIONS.includes(
									nextValue as ToolbarSpacingUnit,
								)
							) {
								setDraft((current) => ({
									...current,
									unit: nextValue as ToolbarSpacingUnit,
								}));
							}
						}
					}}
					options={options}
					inputValue={draft.draft}
					selectedOption={draft.unit}
					placeholder="0"
					min={0}
					step="any"
					ariaLabel={label}
					invalid={invalid}
					segmentWidth={36}
					className="min-w-0 flex-1"
					includeDisabledStyles={false}
					onInputBlur={commitDraft}
					onInputValueChange={(nextDraft) => {
						setDraft((current) => ({ ...current, draft: nextDraft }));
						if (!nextDraft.trim()) {
							setInvalid(false);
							return;
						}
						try {
							parseSpacingValue(`${nextDraft}${draft.unit}`);
							setInvalid(false);
						} catch {
							setInvalid(true);
						}
					}}
					onResolveOptionValue={(nextUnit, currentValue) =>
						resolveUnitValue(nextUnit as ToolbarSpacingUnit, currentValue)
					}
					expandToFill
				/>
			</div>
		</PopoverTooltip>
	);
}

export function CompactColorField({
	label,
	value,
	icon,
	onChange,
}: {
	label: string;
	value: string;
	icon?: ReactNode;
	onChange: (value: string) => void;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<div
				style={{ pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
			>
				<ColorPicker
					value={value}
					ariaLabel={label}
					variant="swatch"
					icon={icon}
					onChange={onChange}
				/>
			</div>
		</PopoverTooltip>
	);
}

function readFontSizeDraftState(value: string) {
	try {
		const parsed = parseFontSizeValue(value);
		return {
			draft: formatDisplayValue(parsed.parsed.value),
			unit: parsed.parsed.unit as ToolbarFontUnit,
			valid: true,
		};
	} catch {
		return {
			draft: "",
			unit: "px" as ToolbarFontUnit,
			valid: false,
		};
	}
}

function readSpacingDraftState(value: string) {
	try {
		const parsed = parseSpacingValue(value);
		return {
			draft: formatDisplayValue(parsed.parsed.value),
			unit: parsed.parsed.unit as ToolbarSpacingUnit,
			valid: true,
		};
	} catch {
		return {
			draft: "",
			unit: "px" as ToolbarSpacingUnit,
			valid: false,
		};
	}
}
