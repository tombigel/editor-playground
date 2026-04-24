import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import type { EditorTextField } from "../../../api/documentApi";
import type { TextDocumentContent } from "../../../api/documentViewApi";
import {
	createTextDocumentFromText,
	getSingleTextBlockContent,
	getTextContent,
	htmlTagToTextBlockType,
	replaceTextDocumentBlocks,
} from "../../../api/documentViewApi";
import type { DocumentModel } from "../../../api/editorApi";
import { createLanguageSelectOptions } from "../../../i18n/languages";
import { FormField, InspectorFieldGroup } from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { TextInspectorNode } from "../types";
import {
	type FocusModeCardProps,
	LinkEnabledRow,
	NavigationFields,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
} from "./shared";
import { HtmlTagInlineField } from "./textSectionHelpers";

export function TextContentSection({
	document,
	node,
	onTextChange,
	onSetTextDocumentContent,
	showHtmlTag = node.subtype === "block",
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "px-3 pt-1.5 pb-3",
}: {
	document: DocumentModel;
	node: TextInspectorNode;
	onTextChange: (field: EditorTextField, value: string) => void;
	onSetTextDocumentContent: (content: TextDocumentContent) => void;
	showHtmlTag?: boolean;
} & FocusModeCardProps) {
	const textValue = getTextContent(node.content.blocks, {
		blockSeparator: "\n",
	});
	const languageOptions = createLanguageSelectOptions({
		includeSiteLanguage: true,
		siteLanguageTag: document.siteSettings?.lang,
	});
	const textBlock = getSingleTextBlockContent(node.content);

	function setPlainTextContent(nextText: string) {
		onSetTextDocumentContent(
			createTextDocumentFromText(nextText, {
				type: textBlock?.type ?? "paragraph",
				direction: node.style?.direction ?? textBlock?.direction ?? "ltr",
				lineHeight:
					typeof textBlock?.lineHeight === "number"
						? textBlock.lineHeight
						: undefined,
				style: textBlock?.style,
			}),
		);
	}

	function setHtmlTag(value: string) {
		if (!textBlock) {
			return;
		}
		onSetTextDocumentContent(
			replaceTextDocumentBlocks(node.content, [
				{
					...textBlock,
					type: htmlTagToTextBlockType(
						value === "h1" ||
							value === "h2" ||
							value === "h3" ||
							value === "h4" ||
							value === "h5" ||
							value === "h6" ||
							value === "blockquote" ||
							value === "div"
							? value
							: "p",
					),
				},
			]),
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
				<FormField label="Text">
					<Textarea
						value={textValue}
						onChange={(e) => setPlainTextContent(e.target.value)}
						onPaste={(e) => {
							const text = e.clipboardData.getData("text/plain");
							if (text) {
								e.preventDefault();
								setPlainTextContent(text);
							}
						}}
					/>
				</FormField>
			</InspectorFieldGroup>
			<InspectorFieldGroup separated>
				{showHtmlTag ? (
					<HtmlTagInlineField value={node.htmlTag} onValueChange={setHtmlTag} />
				) : null}
				<FormField
					label="Language"
					layout="inline"
					controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
				>
					<SearchableSelect
						value={node.lang ?? "__site__"}
						options={languageOptions}
						placeholder="Site language"
						searchPlaceholder="Search languages"
						triggerClassName="h-8 text-[11px]"
						onValueChange={(value) =>
							onTextChange("lang", value === "__site__" ? "" : value)
						}
					/>
				</FormField>
			</InspectorFieldGroup>
			<InspectorFieldGroup gap>
				<LinkEnabledRow
					checked={Boolean(node.link)}
					onCheckedChange={(checked) =>
						onTextChange("linkEnabled", checked ? "true" : "")
					}
				/>
				{node.link ? (
					<NavigationFields
						document={document}
						node={node}
						onTextChange={onTextChange}
					/>
				) : null}
			</InspectorFieldGroup>
		</InspectorSectionCard>
	);
}
