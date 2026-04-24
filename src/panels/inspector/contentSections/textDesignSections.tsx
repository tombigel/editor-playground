import type { EditorTextField } from "../../../api/documentApi";
import {
	DEFAULT_LINK_COLOR,
	DEFAULT_SHADOW_BLUR_PX,
	DEFAULT_SHADOW_COLOR,
	DEFAULT_SHADOW_OFFSET_X_PX,
	DEFAULT_SHADOW_OFFSET_Y_PX,
	DEFAULT_SHADOW_SPREAD_PX,
	DEFAULT_TEXT_COLOR,
} from "../../../api/documentViewApi";
import type { DocumentModel } from "../../../api/editorApi";
import { readShadowFieldValues } from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { TextInspectorNode } from "../types";
import {
	createShadowFallback,
	type FocusModeCardProps,
	TypographyDesignFields,
	TypographyTextStyleFields,
} from "./shared";

export function TextTextStyleSection({
	document,
	node,
	onTextChange,
	onOpenManageFonts,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-2.5 px-3 pt-1.5 pb-3",
}: {
	document: DocumentModel;
	node: TextInspectorNode;
	onTextChange: (field: EditorTextField, value: string) => void;
	onOpenManageFonts: () => void;
} & FocusModeCardProps) {
	return (
		<InspectorSectionCard
			title="Text style"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"design",
				onEnterFocusedMode,
			)}
		>
			<TypographyTextStyleFields
				document={document}
				node={node}
				onTextChange={onTextChange}
				supportsWrap={node.link !== undefined}
				onOpenManageFonts={onOpenManageFonts}
			/>
		</InspectorSectionCard>
	);
}

export function TextDesignSection({
	node,
	onTextChange,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-2.5 px-3 pt-1.5 pb-3",
}: {
	node: TextInspectorNode;
	onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
	const shadow = readShadowFieldValues(
		node.style,
		createShadowFallback(
			DEFAULT_SHADOW_COLOR,
			DEFAULT_SHADOW_BLUR_PX,
			DEFAULT_SHADOW_SPREAD_PX,
			DEFAULT_SHADOW_OFFSET_X_PX,
			DEFAULT_SHADOW_OFFSET_Y_PX,
		),
	);

	return (
		<InspectorSectionCard
			title="Design"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"design",
				onEnterFocusedMode,
			)}
		>
			<TypographyDesignFields
				node={node}
				onTextChange={onTextChange}
				colorFallback={node.link ? DEFAULT_LINK_COLOR : DEFAULT_TEXT_COLOR}
				shadow={shadow}
				shadowFallback={createShadowFallback(
					DEFAULT_SHADOW_COLOR,
					DEFAULT_SHADOW_BLUR_PX,
					DEFAULT_SHADOW_SPREAD_PX,
					DEFAULT_SHADOW_OFFSET_X_PX,
					DEFAULT_SHADOW_OFFSET_Y_PX,
				)}
			/>
		</InspectorSectionCard>
	);
}

export function TextAppearanceSection({
	document,
	node,
	onTextChange,
	onOpenManageFonts,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "space-y-2.5 px-3 pt-1.5 pb-3",
}: {
	document: DocumentModel;
	node: TextInspectorNode;
	onTextChange: (field: EditorTextField, value: string) => void;
	onOpenManageFonts: () => void;
} & FocusModeCardProps) {
	const shadowFallback = createShadowFallback(
		DEFAULT_SHADOW_COLOR,
		DEFAULT_SHADOW_BLUR_PX,
		DEFAULT_SHADOW_SPREAD_PX,
		DEFAULT_SHADOW_OFFSET_X_PX,
		DEFAULT_SHADOW_OFFSET_Y_PX,
	);
	const shadow = readShadowFieldValues(node.style, shadowFallback);

	return (
		<InspectorSectionCard
			title="Design"
			headerContent={headerContent}
			headerAction={headerAction}
			contentClassName={contentClassName}
			focusedModeEntry={createFocusedModeEntry(
				focusedMode ?? null,
				"design",
				onEnterFocusedMode,
			)}
		>
			<TypographyTextStyleFields
				document={document}
				node={node}
				onTextChange={onTextChange}
				supportsWrap={node.link !== undefined}
				onOpenManageFonts={onOpenManageFonts}
			/>
			<div className="editor-border-subtle space-y-2.5 border-t pt-2.5">
				<TypographyDesignFields
					node={node}
					onTextChange={onTextChange}
					colorFallback={node.link ? DEFAULT_LINK_COLOR : DEFAULT_TEXT_COLOR}
					shadow={shadow}
					shadowFallback={shadowFallback}
				/>
			</div>
		</InspectorSectionCard>
	);
}
