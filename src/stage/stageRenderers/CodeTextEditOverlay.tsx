import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
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

type CodeTextEditOverlayProps = {
	nodeId: NodeId;
	content: TextDocumentContent;
	contentStyle?: CSSProperties;
	minHeight?: string;
	tabSize?: number;
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
	const [theme, setTheme] = useState<CodeTheme>(codeBlock?.theme ?? "auto");
	const preservedStyle = codeBlock?.style;
	const rootRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
			if (
				root.contains(target) ||
				(target instanceof Element &&
					target.closest('[data-stage-code-toolbar="true"]'))
			) {
				return;
			}
			commitCurrentContent();
		}

		globalThis.document?.addEventListener("pointerdown", handlePointerDown, true);
		return () => {
			globalThis.document?.removeEventListener("pointerdown", handlePointerDown, true);
		};
	}, [commitCurrentContent]);

	useEffect(() => {
		function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
			if (event.key !== "Escape") {
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
	}, [onDiscard]);

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
				language={language}
				theme={theme}
				onLanguageChange={setLanguage}
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
				onChange={(event) => setCodeText(event.target.value)}
				onKeyDown={handleKeyDown}
				style={{
					...contentStyle,
					display: "block",
					width: "100%",
					minHeight,
					margin: 0,
					padding: 0,
					border: 0,
					borderRadius: 0,
					background: "transparent",
					boxShadow: "none",
					outline: "none",
					resize: "none",
					overflow: "hidden",
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
					tabSize,
					pointerEvents: "auto",
					cursor: "text",
					userSelect: "text",
					WebkitUserSelect: "text",
				}}
				aria-label="Code editor"
			/>
		</div>
	);
}

function CodeEditToolbar({
	language,
	theme,
	onLanguageChange,
	onThemeChange,
}: {
	language: string;
	theme: CodeTheme;
	onLanguageChange: (language: string) => void;
	onThemeChange: (theme: CodeTheme) => void;
}) {
	return (
		<FloatingPanelShell
			suppressPopover
			open
			positionMode="absolute"
			data-stage-code-toolbar="true"
			style={{
				bottom: "calc(100% + 8px)",
				left: 0,
				zIndex: 220,
				width: "min(360px, 100%, calc(100vw - 32px))",
				maxWidth: "calc(100vw - 32px)",
				pointerEvents: "auto",
			}}
			bodyClassName="px-1.5 py-1"
			bodyStyle={{
				pointerEvents: "auto",
				overflow: "visible",
			}}
			onPointerDown={(event) => {
				event.stopPropagation();
			}}
		>
			<ToolbarControlRow className="min-w-0 flex-wrap gap-1">
				<ToolbarControlGroup className="min-w-0 flex-1">
					<Select value={language} onValueChange={onLanguageChange}>
						<SelectTrigger
							className="h-7 w-full min-w-0 rounded-sm text-[11px]"
							aria-label="Code language"
							data-stage-code-toolbar="true"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent data-stage-code-toolbar="true">
							{CODE_LANGUAGE_OPTIONS.map(({ value, label }) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</ToolbarControlGroup>
				<ToolbarControlGroup
					className="min-w-0 flex-1 flex-wrap justify-end"
					withDividerBefore
				>
					{(["auto", "light", "dark"] as const).map((option) => (
						<Button
							key={option}
							type="button"
							variant={theme === option ? "default" : "ghost"}
							size="sm"
							className="h-7 flex-1 rounded-sm px-1.5 text-[11px] capitalize"
							aria-label={`Code theme ${option}`}
							onClick={() => onThemeChange(option)}
						>
							{option}
						</Button>
					))}
				</ToolbarControlGroup>
			</ToolbarControlRow>
		</FloatingPanelShell>
	);
}
