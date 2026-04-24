import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { useClickOutside } from "@/lib/useClickOutside";

const DEFAULT_SEGMENT_WIDTH_PX = 36;

export type ValueWithUnitMode =
	| "number-fixed"
	| "number-select"
	| "keyword-select"
	| "number-or-keyword-select";

export type ValueWithUnitOption =
	| {
			type: "option";
			value: string;
			label: ReactNode;
			disabled?: boolean;
			inputMode?: "numeric" | "keyword";
	  }
	| {
			type: "separator";
			id: string;
	  };

export type ValueWithUnitSuggestion = {
	value: string;
	label?: string;
};

function clampSuggestionIndex(index: number, suggestionCount: number) {
	if (suggestionCount === 0) {
		return -1;
	}
	return Math.max(0, Math.min(suggestionCount - 1, index));
}

export function isValueWithUnitSelectableOption(
	option: ValueWithUnitOption,
): option is Extract<ValueWithUnitOption, { type: "option" }> {
	return option.type === "option";
}

export function composeValueWithUnitValue(options: {
	mode: ValueWithUnitMode;
	inputValue: string;
	selectedOptionValue: string;
	selectedOptionInputMode: "numeric" | "keyword";
}) {
	if (options.mode === "number-fixed" || options.mode === "number-select") {
		return `${options.inputValue}${options.selectedOptionValue}`;
	}
	if (
		options.mode === "number-or-keyword-select" &&
		options.selectedOptionInputMode === "numeric"
	) {
		return `${options.inputValue}${options.selectedOptionValue}`;
	}
	return null;
}

function resolveSuggestionLabel(options: {
	suggestion: ValueWithUnitSuggestion;
	selectedOptionValue: string;
	selectedOptionInputMode: "numeric" | "keyword";
}) {
	if (options.suggestion.label) {
		return options.suggestion.label;
	}

	if (
		options.selectedOptionInputMode === "numeric" &&
		options.selectedOptionValue
	) {
		return `${options.suggestion.value}${options.selectedOptionValue}`;
	}

	return options.suggestion.value;
}

function resolveSegmentWidth(width?: number | string) {
	if (width == null) {
		return `${DEFAULT_SEGMENT_WIDTH_PX}px`;
	}
	return typeof width === "number" ? `${width}px` : width;
}

export function ValueWithUnit({
	id,
	mode,
	value,
	onChange,
	options,
	inputValue = "",
	selectedOption,
	placeholder,
	min,
	max,
	step,
	mixed = false,
	mixedSegment = mixed,
	disabled = false,
	ariaLabel,
	className,
	controlClassName,
	inputClassName,
	includeDisabledStyles = true,
	onResolveOptionValue,
	onInputValueChange,
	onInputBlur,
	suggestions,
	suggestionListId,
	onSuggestionSelect,
	suggestionsOpen: controlledSuggestionsOpen,
	onSuggestionsOpenChange,
	invalid = false,
	segmentWidth,
	defaultSuggestionsOpen = false,
	defaultMenuOpen = false,
	expandToFill = false,
}: {
	id?: string;
	mode: ValueWithUnitMode;
	value: string;
	onChange: (nextValue: string) => void;
	options: ValueWithUnitOption[];
	inputValue?: string;
	selectedOption?: string;
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number | "any";
	mixed?: boolean;
	mixedSegment?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
	className?: string;
	controlClassName?: string;
	inputClassName?: string;
	includeDisabledStyles?: boolean;
	onResolveOptionValue?: (
		nextOption: string,
		currentValue: string,
	) => string | null;
	onInputValueChange?: (nextInput: string) => void;
	onInputBlur?: () => void;
	suggestions?: ValueWithUnitSuggestion[];
	suggestionListId?: string;
	onSuggestionSelect?: (nextSuggestion: string) => void;
	suggestionsOpen?: boolean;
	onSuggestionsOpenChange?: (open: boolean) => void;
	invalid?: boolean;
	segmentWidth?: number | string;
	defaultSuggestionsOpen?: boolean;
	defaultMenuOpen?: boolean;
	expandToFill?: boolean;
}) {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const generatedListId = useId().replace(/:/g, "");
	const resolvedSegmentWidth = resolveSegmentWidth(segmentWidth);
	const [uncontrolledSuggestionsOpen, setUncontrolledSuggestionsOpen] =
		useState(defaultSuggestionsOpen);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
	const suggestionsOpen =
		controlledSuggestionsOpen ?? uncontrolledSuggestionsOpen;
	const suggestionsControlled = controlledSuggestionsOpen !== undefined;

	const selectableOptions = useMemo(
		() => options.filter(isValueWithUnitSelectableOption),
		[options],
	);
	const resolvedOption =
		selectableOptions.find((option) => option.value === selectedOption) ??
		selectableOptions[0] ??
		null;
	const resolvedOptionValue = resolvedOption?.value ?? "";
	const resolvedOptionInputMode =
		resolvedOption?.inputMode ??
		(mode === "keyword-select" ? "keyword" : "numeric");
	const suggestionList = suggestions ?? [];
	const resolvedSuggestions = useMemo(
		() =>
			suggestionList.map((suggestion) => ({
				...suggestion,
				resolvedLabel: resolveSuggestionLabel({
					suggestion,
					selectedOptionValue: resolvedOptionValue,
					selectedOptionInputMode: resolvedOptionInputMode,
				}),
			})),
		[resolvedOptionInputMode, resolvedOptionValue, suggestionList],
	);
	const resolvedSuggestionListId =
		suggestionListId ?? `value-with-unit-${generatedListId}`;
	const activeSuggestionId =
		activeSuggestionIndex >= 0
			? `${resolvedSuggestionListId}-option-${activeSuggestionIndex}`
			: undefined;

	const showsInput =
		mode === "number-fixed" ||
		mode === "number-select" ||
		(mode === "number-or-keyword-select" &&
			resolvedOptionInputMode === "numeric");
	const showsFullTrigger =
		mode === "keyword-select" ||
		(mode === "number-or-keyword-select" &&
			resolvedOptionInputMode === "keyword");
	const hasSelectableSuffix =
		mode === "number-select" ||
		mode === "number-or-keyword-select" ||
		mode === "keyword-select";
	const hasSuggestions = showsInput && suggestionList.length > 0;

	useEffect(() => {
		if (!hasSuggestions) {
			if (!suggestionsControlled) {
				setUncontrolledSuggestionsOpen(false);
			}
			onSuggestionsOpenChange?.(false);
			setActiveSuggestionIndex(-1);
			return;
		}
	}, [hasSuggestions, onSuggestionsOpenChange, suggestionsControlled]);

	const setSuggestionsOpen = useCallback(
		(nextOpen: boolean) => {
			if (!suggestionsControlled) {
				setUncontrolledSuggestionsOpen(nextOpen);
			}
			onSuggestionsOpenChange?.(nextOpen);
		},
		[onSuggestionsOpenChange, suggestionsControlled],
	);

	const dismissSuggestions = useCallback(
		() => setSuggestionsOpen(false),
		[setSuggestionsOpen],
	);
	useEscapeKey(dismissSuggestions, suggestionsOpen && !suggestionsControlled);
	useClickOutside(
		rootRef,
		dismissSuggestions,
		suggestionsOpen && !suggestionsControlled,
	);

	function commitInputValue(nextInput: string) {
		if (onInputValueChange) {
			onInputValueChange(nextInput);
			return;
		}

		const nextValue = composeValueWithUnitValue({
			mode,
			inputValue: nextInput,
			selectedOptionValue: resolvedOptionValue,
			selectedOptionInputMode: resolvedOptionInputMode,
		});
		if (nextValue != null) {
			onChange(nextValue);
		}
	}

	function handleSuggestionSelection(nextSuggestion: string) {
		commitInputValue(nextSuggestion);
		onSuggestionSelect?.(nextSuggestion);
		setSuggestionsOpen(false);
		setActiveSuggestionIndex(-1);
	}

	function handleOptionChange(nextOption: string) {
		const nextResolvedValue = onResolveOptionValue?.(nextOption, value);
		if (nextResolvedValue != null) {
			onChange(nextResolvedValue);
			return;
		}

		if (mode === "keyword-select") {
			onChange(nextOption);
			return;
		}

		const nextOptionMeta = selectableOptions.find(
			(option) => option.value === nextOption,
		);
		if (
			mode === "number-or-keyword-select" &&
			nextOptionMeta?.inputMode === "keyword"
		) {
			onChange(nextOption);
			return;
		}

		onChange(`${inputValue}${nextOption}`);
	}

	function handleSuggestionKeyDown(key: string) {
		if (!hasSuggestions) {
			return false;
		}

		if (key === "ArrowDown") {
			setSuggestionsOpen(true);
			setActiveSuggestionIndex((current) =>
				current < 0
					? 0
					: clampSuggestionIndex(current + 1, suggestionList.length),
			);
			return true;
		}

		if (key === "ArrowUp") {
			setSuggestionsOpen(true);
			setActiveSuggestionIndex((current) =>
				current < 0
					? suggestionList.length - 1
					: clampSuggestionIndex(current - 1, suggestionList.length),
			);
			return true;
		}

		if (key === "Enter" && suggestionsOpen && activeSuggestionIndex >= 0) {
			handleSuggestionSelection(
				resolvedSuggestions[activeSuggestionIndex]?.value ?? "",
			);
			return true;
		}

		if (key === "Escape" && suggestionsOpen) {
			setSuggestionsOpen(false);
			setActiveSuggestionIndex(-1);
			return true;
		}

		return false;
	}

	return (
		<div
			ref={rootRef}
			className={cn("relative", expandToFill ? "w-full" : null, className)}
		>
			<div
				className={cn(
					"value-with-unit group/valuewithunit relative flex h-8 min-w-0 rounded-sm border shadow-sm outline-none transition-[border-color,box-shadow,outline-color]",
					invalid
						? "value-with-unit-invalid focus-within:border-red-400"
						: "focus-within:border-[color:var(--editor-accent)]",
					"focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--editor-focus-ring-strong)]",
					mixed ? "value-with-unit-mixed" : null,
					controlClassName,
				)}
				data-mode={mode}
				data-ui="value-with-unit"
			>
				{showsInput ? (
					<Input
						id={id}
						type={hasSuggestions ? "text" : "number"}
						inputMode={hasSuggestions ? "decimal" : undefined}
						min={hasSuggestions ? undefined : min}
						max={hasSuggestions ? undefined : max}
						step={hasSuggestions ? undefined : step}
						value={inputValue}
						placeholder={mixed ? "-" : placeholder}
						aria-label={ariaLabel}
						role={hasSuggestions ? "combobox" : undefined}
						aria-autocomplete={hasSuggestions ? "list" : undefined}
						aria-expanded={hasSuggestions ? suggestionsOpen : undefined}
						aria-controls={
							hasSuggestions ? resolvedSuggestionListId : undefined
						}
						aria-activedescendant={
							hasSuggestions ? activeSuggestionId : undefined
						}
						disabled={disabled}
						autoComplete={hasSuggestions ? "off" : undefined}
						spellCheck={hasSuggestions ? false : undefined}
						syncValueWhileFocused={hasSuggestions}
						includeDisabledStyles={includeDisabledStyles}
						onBlur={() => {
							if (hasSuggestions) {
								setSuggestionsOpen(false);
								setActiveSuggestionIndex(-1);
							}
							onInputBlur?.();
						}}
						onClick={() => {
							if (hasSuggestions) {
								setSuggestionsOpen(!suggestionsOpen);
								setActiveSuggestionIndex(-1);
							}
						}}
						onKeyDown={(event) => {
							if (handleSuggestionKeyDown(event.key)) {
								event.preventDefault();
							}
						}}
						onChange={(event) => {
							if (hasSuggestions) {
								setSuggestionsOpen(true);
								setActiveSuggestionIndex(-1);
							}
							commitInputValue(event.target.value);
						}}
						className={cn(
							"value-with-unit-value h-full min-w-0 flex-1 overflow-visible rounded-l-sm border-0 bg-transparent px-2.5 text-center text-[12px] [appearance:textfield] shadow-none [padding-inline-end:0] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
							hasSuggestions ? "pr-5" : null,
							inputClassName,
						)}
					/>
				) : null}

				{hasSuggestions ? (
					<div
						className="pointer-events-none absolute inset-y-0 flex items-center text-zinc-500"
						style={{ right: `calc(${resolvedSegmentWidth} + 4px)` }}
					>
						<ChevronDown className="h-3 w-3" />
					</div>
				) : null}

				{showsFullTrigger ? (
					<>
						<Select
							value={resolvedOptionValue}
							onValueChange={handleOptionChange}
							disabled={disabled}
							defaultOpen={defaultMenuOpen}
						>
							<SelectTrigger
								aria-label={ariaLabel}
								includeDisabledStyles={includeDisabledStyles}
								className={cn(
									"value-with-unit-trigger value-with-unit-trigger-full peer/valuewithunittrigger h-full w-full justify-start rounded-sm border-0 bg-transparent px-2.5 pr-8 text-left !text-[11px] tracking-[-0.01em] whitespace-nowrap shadow-none [&>span]:w-full [&>span]:justify-start [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:outline-none focus:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--editor-accent)] data-[state=open]:shadow-[inset_0_0_0_1px_var(--editor-accent)]",
									mixedSegment ? "value-with-unit-segment-mixed" : null,
								)}
							>
								<SelectValue placeholder={placeholder} />
							</SelectTrigger>
							<SelectContent>
								{options.map((option) =>
									option.type === "separator" ? (
										<SelectSeparator key={option.id} />
									) : (
										<SelectItem
											key={option.value}
											value={option.value}
											disabled={option.disabled}
										>
											{option.label}
										</SelectItem>
									),
								)}
							</SelectContent>
						</Select>
						<div
							className="value-with-unit-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/valuewithunit:opacity-100"
							style={{ width: resolvedSegmentWidth }}
						>
							<ChevronDown className="editor-text-strong h-3 w-3" />
						</div>
					</>
				) : mode === "number-fixed" ? (
					<div
						className={cn(
							"value-with-unit-segment value-with-unit-segment-static pointer-events-none relative z-10 flex h-full shrink-0 items-center justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center text-[11px] font-medium tracking-[-0.01em] shadow-none",
							mixedSegment ? "value-with-unit-segment-mixed" : null,
						)}
						style={{ width: resolvedSegmentWidth }}
					>
						{resolvedOption?.label}
					</div>
				) : hasSelectableSuffix ? (
					<>
						<Select
							value={resolvedOptionValue}
							onValueChange={handleOptionChange}
							disabled={disabled}
							defaultOpen={defaultMenuOpen}
						>
							<SelectTrigger
								aria-label={ariaLabel ? `${ariaLabel} unit` : undefined}
								includeDisabledStyles={includeDisabledStyles}
								className={cn(
									"value-with-unit-segment peer/valuewithunittrigger relative z-10 h-full shrink-0 justify-center rounded-r-sm rounded-l-none border-0 bg-transparent px-1.5 text-center !text-[11px] font-medium tracking-[-0.01em] shadow-none [&>span]:w-full [&>span]:justify-center [&>span]:text-inherit [&>svg]:hidden focus:border-0 focus:outline-none focus:ring-0 focus-visible:shadow-[inset_0_0_0_1px_var(--editor-accent)] data-[state=open]:shadow-[inset_0_0_0_1px_var(--editor-accent)]",
									mixedSegment ? "value-with-unit-segment-mixed" : null,
								)}
								style={{ width: resolvedSegmentWidth }}
							>
								<SelectValue placeholder={placeholder} />
							</SelectTrigger>
							<SelectContent>
								{options.map((option) =>
									option.type === "separator" ? (
										<SelectSeparator key={option.id} />
									) : (
										<SelectItem
											key={option.value}
											value={option.value}
											disabled={option.disabled}
										>
											{option.label}
										</SelectItem>
									),
								)}
							</SelectContent>
						</Select>
						<div
							className="value-with-unit-caret pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm opacity-0 transition-opacity group-hover/valuewithunit:opacity-100"
							style={{ width: resolvedSegmentWidth }}
						>
							<ChevronDown className="editor-text-strong h-3 w-3" />
						</div>
					</>
				) : null}
			</div>

			{hasSuggestions && suggestionsOpen ? (
				<div
					id={resolvedSuggestionListId}
					role="listbox"
					className="value-with-unit-suggestions editor-scrollbar absolute left-0 top-[calc(100%+4px)] z-30 max-h-[220px] min-w-full overflow-y-auto rounded-sm border p-1 shadow-md"
				>
					{resolvedSuggestions.map((suggestion, index) => {
						const isActive = index === activeSuggestionIndex;
						return (
							<button
								id={`${resolvedSuggestionListId}-option-${suggestion.value}`}
								key={suggestion.value}
								type="button"
								role="option"
								aria-selected={isActive}
								className={cn(
									"value-with-unit-suggestion editor-text-strong flex w-full items-center justify-between rounded-sm bg-transparent px-2 py-2 text-[11px] leading-5 hover:[background:var(--editor-select-highlight-background)] focus-visible:[background:var(--editor-select-highlight-background)]",
									isActive
										? "[background:var(--editor-select-highlight-background)]"
										: null,
								)}
								onMouseDown={(event) => {
									event.preventDefault();
								}}
								onMouseEnter={() => {
									setActiveSuggestionIndex(index);
								}}
								onClick={() => handleSuggestionSelection(suggestion.value)}
							>
								<span>{suggestion.resolvedLabel}</span>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
