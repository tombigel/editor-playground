import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { highlightCode, normalizeCodeLanguage } from "../../render/codeHighlight";

type CodeTextEditOverlayProps = {
	nodeId: NodeId;
	content: TextDocumentContent;
	contentStyle?: CSSProperties;
	minHeight?: string;
	tabSize?: number;
	onCommit: (id: NodeId, content: TextDocumentContent) => void;
	onDiscard: () => void;
};

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
	const language = normalizeCodeLanguage(codeBlock?.language ?? "plaintext");
	const theme: CodeTheme = codeBlock?.theme ?? "auto";
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
			if (!root || !(target instanceof Node) || root.contains(target)) {
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
