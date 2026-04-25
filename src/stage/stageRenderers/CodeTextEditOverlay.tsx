import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ComponentProps, Ref } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	ToolbarControlGroup,
	ToolbarControlRow,
} from "@/components/ui/toolbar-control-group";
import {
	createTextDocumentFromCode,
	getSingleCodeBlockContent,
	getTextContent,
} from "../../model/richContent";
import { CODE_THEME_SURFACE } from "../../model/textNodeDefaults";
import type {
	CodeTheme,
	NodeId,
	TextDocumentContent,
} from "../../model/types";
import {
	CODE_LANGUAGE_OPTIONS,
	highlightCode,
	normalizeCodeLanguage,
} from "../../render/codeHighlight";
import {
	isTargetWithinSelectLayer,
	isTargetWithinSelector,
} from "./richTextEditOverlay/helpers";
import {
	preserveRichSelectionPointerDown,
} from "./richTextEditOverlay/controls";
import { ToolbarDragHandle } from "./richTextEditOverlay/RichTextToolbarParts";
import {
	RICH_SELECT_IDS,
	type RichEditSelectId,
} from "./richTextEditOverlay/types";
import { useRichToolbarPosition } from "./richTextEditOverlay/useRichToolbarPosition";

type CodeTextEditOverlayProps = {
	nodeId: NodeId;
	content: TextDocumentContent;
	contentStyle?: CSSProperties;
	minHeight?: string;
	tabSize?: number;
	wrap?: boolean;
	onCommit: (id: NodeId, content: TextDocumentContent) => void;
	onDiscard: () => void;
};

type CodeSelectionEdit = {
	text: string;
	selectionStart: number;
	selectionEnd: number;
};

export function indentCodeTextSelection(
	text: string,
	selectionStart: number,
	selectionEnd: number,
): CodeSelectionEdit {
	const { rangeStart, rangeEnd } = getSelectedLineRange(text, selectionStart, selectionEnd);
	const segment = text.slice(rangeStart, rangeEnd);
	const lineCount = segment.split("\n").length;
	const nextSegment = segment.split("\n").map((line) => `\t${line}`).join("\n");
	const nextSelectionStart = selectionStart + 1;
	const nextSelectionEnd =
		selectionStart === selectionEnd ? nextSelectionStart : selectionEnd + lineCount;

	return {
		text: `${text.slice(0, rangeStart)}${nextSegment}${text.slice(rangeEnd)}`,
		selectionStart: nextSelectionStart,
		selectionEnd: nextSelectionEnd,
	};
}

export function unindentCodeTextSelection(
	text: string,
	selectionStart: number,
	selectionEnd: number,
): CodeSelectionEdit {
	const { rangeStart, rangeEnd } = getSelectedLineRange(text, selectionStart, selectionEnd);
	const segment = text.slice(rangeStart, rangeEnd);
	const lines = segment.split("\n");
	let cursor = rangeStart;
	let removedBeforeStart = 0;
	let removedBeforeEnd = 0;
	const nextLines = lines.map((line) => {
		const lineStart = cursor;
		cursor += line.length + 1;
		if (!line.startsWith("\t")) {
			return line;
		}
		if (lineStart < selectionStart) {
			removedBeforeStart += 1;
		}
		if (lineStart < selectionEnd) {
			removedBeforeEnd += 1;
		}
		return line.slice(1);
	});
	const nextSegment = nextLines.join("\n");

	return {
		text: `${text.slice(0, rangeStart)}${nextSegment}${text.slice(rangeEnd)}`,
		selectionStart: Math.max(rangeStart, selectionStart - removedBeforeStart),
		selectionEnd: Math.max(rangeStart, selectionEnd - removedBeforeEnd),
	};
}

function getSelectedLineRange(text: string, selectionStart: number, selectionEnd: number) {
	const rangeStart = text.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
	const effectiveEnd =
		selectionEnd > selectionStart && text[selectionEnd - 1] === "\n"
			? selectionEnd - 1
			: selectionEnd;
	const nextBreak = text.indexOf("\n", effectiveEnd);
	const rangeEnd = nextBreak === -1 ? text.length : nextBreak;
	return { rangeStart, rangeEnd };
}

export function CodeTextEditOverlay({
	nodeId,
	content,
	contentStyle,
	minHeight,
	tabSize = 2,
	wrap = true,
	onCommit,
	onDiscard,
}: CodeTextEditOverlayProps) {
	const codeBlock = useMemo(() => getSingleCodeBlockContent(content), [content]);
	const initialText = useMemo(
		() => getTextContent(content.blocks, { blockSeparator: "\n" }),
		[content],
	);
	const [codeText, setCodeText] = useState(initialText);
	const [language, setLanguage] = useState(() =>
		normalizeCodeLanguage(codeBlock?.language ?? "plaintext"),
	);
	const [openSelectId, setOpenSelectId] = useState<RichEditSelectId | null>(
		null,
	);
	const [theme, setTheme] = useState<CodeTheme>(codeBlock?.theme ?? "auto");
	const preservedStyle = codeBlock?.style;
	const editContentStyle = useMemo(
		() =>
			getCodeEditContentStyle({
				contentStyle,
				theme,
			}),
		[contentStyle, theme],
	);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const {
		toolbarRef,
		toolbarDragging,
		toolbarPosition,
		handleToolbarDragPointerDown,
	} = useRichToolbarPosition({ rootRef, selectionRevision: 0 });

	const commitCurrentContent = useCallback(() => {
		onCommit(
			nodeId,
			createTextDocumentFromCode(codeText, {
				direction: "ltr",
				language,
				theme,
				highlightedHtml: highlightCode(codeText, language),
				style: preservedStyle,
			}),
		);
	}, [codeText, language, nodeId, onCommit, preservedStyle, theme]);

	const closeOpenSelect = useCallback(() => setOpenSelectId(null), []);
	const handleSelectOpenChange = useCallback(
		(selectId: RichEditSelectId, open: boolean) => {
			setOpenSelectId((current) => {
				if (open) {
					return selectId;
				}
				return current === selectId ? null : current;
			});
		},
		[],
	);

	useEffect(() => {
		const id = requestAnimationFrame(() => {
			textareaRef.current?.focus();
			const length = textareaRef.current?.value.length ?? 0;
			textareaRef.current?.setSelectionRange(length, length);
		});
		return () => cancelAnimationFrame(id);
	}, []);

	useEffect(() => {
		function handlePointerDown(event: PointerEvent) {
			const root = rootRef.current;
			const target = event.target;
			if (!root || !(target instanceof Node)) {
				return;
			}
			if (openSelectId) {
				if (isTargetWithinSelectLayer(target, openSelectId)) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				closeOpenSelect();
				return;
			}
			if (isTargetWithinCodeToolbar(target)) {
				return;
			}
			if (root.contains(target)) {
				return;
			}
			commitCurrentContent();
		}

		globalThis.document?.addEventListener("pointerdown", handlePointerDown, true);
		return () => {
			globalThis.document?.removeEventListener("pointerdown", handlePointerDown, true);
		};
	}, [closeOpenSelect, commitCurrentContent, openSelectId]);

	useEffect(() => {
		function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
			if (event.key !== "Escape") {
				return;
			}
			if (openSelectId) {
				event.preventDefault();
				event.stopPropagation();
				closeOpenSelect();
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			onDiscard();
		}

		globalThis.document?.addEventListener("keydown", handleGlobalKeyDown, true);
		return () => {
			globalThis.document?.removeEventListener("keydown", handleGlobalKeyDown, true);
		};
	}, [closeOpenSelect, onDiscard, openSelectId]);

	function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
		if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
			event.preventDefault();
			commitCurrentContent();
			return;
		}
		if (event.key === "Tab") {
			event.preventDefault();
			const target = event.currentTarget;
			const edit = event.shiftKey
				? unindentCodeTextSelection(codeText, target.selectionStart, target.selectionEnd)
				: indentCodeTextSelection(codeText, target.selectionStart, target.selectionEnd);
			setCodeText(edit.text);
			requestAnimationFrame(() => {
				textareaRef.current?.setSelectionRange(edit.selectionStart, edit.selectionEnd);
			});
		}
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: stage edit root only stops propagation into the drag layer
		// biome-ignore lint/a11y/useKeyWithClickEvents: stage edit root only stops propagation into the drag layer
		<div
			ref={rootRef}
			data-stage-code-edit-root="true"
			style={{
				position: "relative",
				pointerEvents: "auto",
				userSelect: "text",
				WebkitUserSelect: "text",
			}}
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event) => event.stopPropagation()}
			onDoubleClick={(event) => event.stopPropagation()}
		>
			<CodeEditToolbar
				toolbarRef={toolbarRef}
				toolbarPosition={toolbarPosition}
				toolbarDragging={toolbarDragging}
				onToolbarDragPointerDown={handleToolbarDragPointerDown}
				language={language}
				openSelectId={openSelectId}
				theme={theme}
				onLanguageChange={setLanguage}
				onSelectOpenChange={handleSelectOpenChange}
				onThemeChange={setTheme}
			/>
			<textarea
				ref={textareaRef}
				data-stage-code-edit-textarea="true"
				value={codeText}
				spellCheck={false}
				autoCapitalize="off"
				autoComplete="off"
				autoCorrect="off"
				wrap={wrap ? "soft" : "off"}
				onChange={(event) => setCodeText(event.target.value)}
				onKeyDown={handleKeyDown}
				style={{
					...editContentStyle,
					display: "block",
					width: "100%",
					minHeight,
					margin: 0,
					padding: 0,
					border: 0,
					borderRadius: 0,
					boxShadow: "none",
					outline: "none",
					resize: "none",
					overflowX: wrap ? "hidden" : "auto",
					overflowY: "hidden",
					whiteSpace: wrap ? "pre-wrap" : "pre",
					wordBreak: wrap ? "break-word" : "normal",
					overflowWrap: wrap ? "anywhere" : "normal",
					wordWrap: wrap ? "break-word" : "normal",
					tabSize,
					pointerEvents: "auto",
					cursor: "text",
					userSelect: "text",
					WebkitUserSelect: "text",
				}}
				data-code-theme={theme}
				aria-label="Code editor"
			/>
		</div>
	);
}

function CodeEditToolbar({
	toolbarRef,
	toolbarPosition,
	toolbarDragging,
	onToolbarDragPointerDown,
	language,
	openSelectId,
	theme,
	onLanguageChange,
	onSelectOpenChange,
	onThemeChange,
}: {
	toolbarRef: Ref<HTMLDivElement>;
	toolbarPosition: { top: number; left: number };
	toolbarDragging: boolean;
	onToolbarDragPointerDown: ComponentProps<
		typeof ToolbarDragHandle
	>["onPointerDown"];
	language: string;
	openSelectId: RichEditSelectId | null;
	theme: CodeTheme;
	onLanguageChange: (language: string) => void;
	onSelectOpenChange: (selectId: RichEditSelectId, open: boolean) => void;
	onThemeChange: (theme: CodeTheme) => void;
}) {
	return (
		<FloatingPanelShell
			ref={toolbarRef}
			suppressPopover
			open
			positionMode="fixed"
			data-stage-code-toolbar="true"
			style={{
				top: `${toolbarPosition.top}px`,
				left: `${toolbarPosition.left}px`,
				zIndex: 220,
				width: "max-content",
				maxWidth: "calc(100vw - 32px)",
				pointerEvents: "auto",
			}}
			bodyClassName="px-2 py-1"
			bodyStyle={{
				pointerEvents: "auto",
				overflow: "visible",
			}}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
		>
			<div className="flex items-center gap-2">
				<ToolbarDragHandle
					ariaLabel="Drag code toolbar"
					dragging={toolbarDragging}
					onPointerDown={onToolbarDragPointerDown}
				/>
				<ToolbarControlRow>
					<ToolbarControlGroup>
						<CodeToolbarLanguageSelect
							open={openSelectId === RICH_SELECT_IDS.codeLanguage}
							onOpenChange={(open) =>
								onSelectOpenChange(RICH_SELECT_IDS.codeLanguage, open)
							}
							language={language}
							onLanguageChange={onLanguageChange}
						/>
					</ToolbarControlGroup>
					<ToolbarControlGroup withDividerBefore>
						<div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
							{(["auto", "light", "dark"] as const).map((option) => (
								<Button
									key={option}
									type="button"
									variant={theme === option ? "default" : "ghost"}
									size="sm"
									className="pointer-events-auto h-6 shrink-0 rounded-md px-2 text-[11px] capitalize"
									style={{ pointerEvents: "auto" }}
									aria-label={`Code theme ${option}`}
									aria-pressed={theme === option}
									onPointerDown={preserveRichSelectionPointerDown}
									onClick={() => onThemeChange(option)}
								>
									{option}
								</Button>
							))}
						</div>
					</ToolbarControlGroup>
				</ToolbarControlRow>
			</div>
		</FloatingPanelShell>
	);
}

function CodeToolbarLanguageSelect({
	language,
	open,
	onLanguageChange,
	onOpenChange,
}: {
	language: string;
	open: boolean;
	onLanguageChange: (language: string) => void;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className={DARK_TOOLTIP_CLASS}
			content={<div className="leading-3.5 font-medium">Code language</div>}
		>
			<Select
				open={open}
				onOpenChange={onOpenChange}
				value={language}
				onValueChange={onLanguageChange}
			>
				<SelectTrigger
					data-stage-rich-select-id={RICH_SELECT_IDS.codeLanguage}
					aria-label="Code language"
					size="compact"
					className="pointer-events-auto h-7 shrink-0 rounded-sm text-xs"
					style={{ width: 136, pointerEvents: "auto" }}
					onPointerDown={preserveRichSelectionPointerDown}
				>
					<span className="truncate text-left">
						{CODE_LANGUAGE_OPTIONS.find((option) => option.value === language)
							?.label ?? "Code language"}
					</span>
				</SelectTrigger>
				<SelectContent
					data-stage-rich-select-id={RICH_SELECT_IDS.codeLanguage}
					data-stage-code-toolbar-select="true"
				>
					{CODE_LANGUAGE_OPTIONS.map(({ value, label }) => (
						<SelectItem
							key={value}
							value={value}
							style={{ pointerEvents: "auto" }}
						>
							{label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</PopoverTooltip>
	);
}

function getCodeEditContentStyle({
	contentStyle,
	theme,
}: {
	contentStyle: CSSProperties | undefined;
	theme: CodeTheme;
}): CSSProperties {
	const {
		background: currentBackground,
		backgroundColor: currentBackgroundColor,
		color: currentColor,
		...rest
	} = contentStyle ?? {};
	const nextStyle: CSSProperties = { ...rest };
	const background = currentBackground ?? currentBackgroundColor;

	if (isAuthoredCodeSurfaceValue(background)) {
		nextStyle.background = background;
	} else if (theme !== "auto") {
		nextStyle.background = CODE_THEME_SURFACE[theme].background;
	}

	if (isAuthoredCodeSurfaceValue(currentColor)) {
		nextStyle.color = currentColor;
	} else if (theme !== "auto") {
		nextStyle.color = CODE_THEME_SURFACE[theme].color;
	}

	return nextStyle;
}

function isTargetWithinCodeToolbar(target: EventTarget | null): boolean {
	return isTargetWithinSelector(target, '[data-stage-code-toolbar="true"]');
}

function isAuthoredCodeSurfaceValue(value: unknown): value is string {
	return typeof value === "string" && !isCodeThemeSurfaceValue(value);
}

function isCodeThemeSurfaceValue(value: string) {
	return Object.values(CODE_THEME_SURFACE).some(
		(surface) => surface.background === value || surface.color === value,
	);
}
