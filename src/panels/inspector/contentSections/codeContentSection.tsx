import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TextDocumentContent } from "../../../api/documentViewApi";
import {
	createTextDocumentFromCode,
	getTextContent,
} from "../../../api/documentViewApi";
import {
	CODE_LANGUAGE_OPTIONS,
	highlightCode,
	normalizeCodeLanguage,
} from "../../../render/codeHighlight";
import { FormField, InspectorFieldGroup } from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { TextInspectorNode } from "../types";
import {
	type FocusModeCardProps,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
} from "./shared";

export function CodeContentSection({
	node,
	onSetTextDocumentContent,
	onSetCodeLanguage,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "px-3 pt-1.5 pb-3",
}: {
	node: TextInspectorNode;
	onSetTextDocumentContent: (content: TextDocumentContent) => void;
	onSetCodeLanguage: (language: string) => void;
} & FocusModeCardProps) {
	const codeBlock =
		node.content.blocks[0]?.type === "code-block"
			? node.content.blocks[0]
			: undefined;
	const language = normalizeCodeLanguage(
		codeBlock?.language ?? node.code?.language ?? "plaintext",
	);
	const codeValue = getTextContent(node.content.blocks, {
		blockSeparator: "\n",
	});

	function setCodeContent(nextText: string) {
		onSetTextDocumentContent(
			createTextDocumentFromCode(nextText, {
				direction: "ltr",
				language,
				theme: codeBlock?.theme ?? node.code?.theme,
				highlightedHtml: highlightCode(nextText, language),
				style: codeBlock?.style,
			}),
		);
	}

	return (
		<InspectorSectionCard
			title="Content"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"content",
				onEnterFocusedMode,
			)}
		>
			<InspectorFieldGroup>
				<FormField label="Code">
					<Textarea
						value={codeValue}
						rows={5}
						style={{ fontFamily: "monospace" }}
						onChange={(e) => setCodeContent(e.target.value)}
						onPaste={(e) => {
							const text = e.clipboardData.getData("text/plain");
							if (text) {
								e.preventDefault();
								setCodeContent(text);
							}
						}}
					/>
				</FormField>
			</InspectorFieldGroup>
			<InspectorFieldGroup gap>
				<FormField
					label="Language"
					layout="inline"
					controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				>
					<Select value={language} onValueChange={onSetCodeLanguage}>
						<SelectTrigger className="h-7 text-[11px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CODE_LANGUAGE_OPTIONS.map(({ value, label }) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
			</InspectorFieldGroup>
		</InspectorSectionCard>
	);
}
