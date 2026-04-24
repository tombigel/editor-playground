import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
	ListContent,
	TextDocumentContent,
} from "../../../api/documentViewApi";
import {
	createTextDocumentContent,
	getSingleListBlockContent,
	listContentToLines,
	listContentToRichListBlock,
	normalizeListContent,
	richListBlockToListContent,
} from "../../../api/documentViewApi";
import {
	FormField,
	InspectorFieldGroup,
	NumberInput,
} from "../../InspectorControls";
import {
	createFocusedModeEntry,
	InspectorSectionCard,
} from "../CommonSections";
import type { TextInspectorNode } from "../types";
import {
	type FocusModeCardProps,
	TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX,
} from "./shared";

type StructuredListContent = Extract<ListContent, { type: "ul" | "ol" }>;

const LIST_TYPE_OPTIONS = [
	{ value: "ul", label: "Bulleted" },
	{ value: "ol", label: "Numbered" },
] as const;

const UNORDERED_MARKER_OPTIONS = [
	{ value: "disc", label: "Disc" },
	{ value: "circle", label: "Circle" },
	{ value: "square", label: "Square" },
] as const;

const ORDERED_MARKER_OPTIONS = [
	{ value: "decimal", label: "Decimal" },
	{ value: "lower-alpha", label: "a, b, c" },
	{ value: "upper-alpha", label: "A, B, C" },
	{ value: "lower-roman", label: "i, ii, iii" },
	{ value: "upper-roman", label: "I, II, III" },
] as const;

function formatListLine(item: ListContent["items"][number]): string {
	if ("text" in item) {
		return item.text;
	}

	if (item.term && item.description) {
		return `${item.term}: ${item.description}`;
	}

	return item.term || item.description;
}

function parseDescriptionItem(line: string) {
	const separatorIndex = line.indexOf(":");
	if (separatorIndex === -1) {
		return { term: line.trim(), description: "" };
	}

	return {
		term: line.slice(0, separatorIndex).trim(),
		description: line.slice(separatorIndex + 1).trim(),
	};
}

function buildListContentFromLines(
	linesValue: string,
	currentContent: ListContent,
	nextType: ListContent["type"] = currentContent.type,
): ListContent {
	const lines = linesValue.split(/\r?\n/);
	const normalizedLines = lines.length > 0 ? lines : [""];

	if (nextType === "dl") {
		return normalizeListContent({
			type: "dl",
			items: normalizedLines.map((line, index) => {
				const currentItem = currentContent.items[index];
				const { term, description } = parseDescriptionItem(line);
				return {
					term,
					description,
					direction: currentItem?.direction,
					link: currentItem?.link,
				};
			}),
		});
	}

	return normalizeListContent({
		type: nextType,
		...(nextType === "ol"
			? {
					start: currentContent.type === "ol" ? currentContent.start : 1,
					markerStyle:
						currentContent.type === "ol"
							? currentContent.markerStyle
							: "decimal",
				}
			: {
					markerStyle:
						currentContent.type === "ul" ? currentContent.markerStyle : "disc",
				}),
		items: normalizedLines.map((line, index) => {
			const currentItem = currentContent.items[index];
			return {
				text: line,
				direction: currentItem?.direction,
				link: currentItem?.link,
			};
		}),
	});
}

function isStructuredListContent(
	content: ListContent,
): content is StructuredListContent {
	return content.type === "ul" || content.type === "ol";
}

function updateStructuredListItems(
	content: StructuredListContent,
	updater: (
		items: StructuredListContent["items"],
	) => StructuredListContent["items"],
): StructuredListContent {
	const items = updater(content.items);
	const normalizedItems = items.length > 0 ? items : [{ text: "" }];
	return normalizeListContent({
		...content,
		items: normalizedItems,
	}) as StructuredListContent;
}

function setStructuredListItemText(
	content: StructuredListContent,
	index: number,
	text: string,
): StructuredListContent {
	return updateStructuredListItems(content, (items) =>
		items.map((item, itemIndex) =>
			itemIndex === index ? { ...item, text } : item,
		),
	);
}

function addStructuredListItem(
	content: StructuredListContent,
): StructuredListContent {
	return updateStructuredListItems(content, (items) => [
		...items,
		{ text: "" },
	]);
}

function removeStructuredListItem(
	content: StructuredListContent,
	index: number,
): StructuredListContent {
	return updateStructuredListItems(content, (items) =>
		items.filter((_, itemIndex) => itemIndex !== index),
	);
}

function moveStructuredListItem(
	content: StructuredListContent,
	index: number,
	direction: -1 | 1,
): StructuredListContent {
	const nextIndex = index + direction;
	if (nextIndex < 0 || nextIndex >= content.items.length) {
		return content;
	}

	return updateStructuredListItems(content, (items) => {
		const nextItems = [...items];
		const [movedItem] = nextItems.splice(index, 1);
		nextItems.splice(nextIndex, 0, movedItem);
		return nextItems;
	});
}

function createStructuredListItemKeys(
	nodeId: string,
	content: StructuredListContent,
): string[] {
	return content.items.map((_, index) => `${nodeId}-list-item-${index}`);
}

export function ListContentSection({
	node,
	onSetTextDocumentContent,
	focusedMode,
	onEnterFocusedMode,
	headerContent,
	headerAction,
	contentClassName = "px-3 pt-1.5 pb-3",
}: {
	node: TextInspectorNode;
	onSetTextDocumentContent: (content: TextDocumentContent) => void;
} & FocusModeCardProps) {
	const listBlock = getSingleListBlockContent(node.content);
	const listContent = listBlock
		? richListBlockToListContent(listBlock)
		: normalizeListContent(undefined);
	const [showAdvancedEdit, setShowAdvancedEdit] = useState(
		() => listContent.type === "dl",
	);
	const itemsValue = listContent.items
		.map((item) => formatListLine(item))
		.join("\n");
	const structuredListContent = isStructuredListContent(listContent)
		? listContent
		: null;
	const structuredItemKeys = structuredListContent
		? createStructuredListItemKeys(node.id, structuredListContent)
		: [];

	useEffect(() => {
		if (listContent.type === "dl") {
			setShowAdvancedEdit(true);
		}
	}, [listContent.type]);

	function commitListContent(nextContent: ListContent) {
		onSetTextDocumentContent(
			createTextDocumentContent([
				listContentToRichListBlock(normalizeListContent(nextContent), {
					direction: node.style?.direction ?? "ltr",
				}),
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
			<InspectorFieldGroup gap>
				{structuredListContent ? (
					<FormField
						label="Type"
						layout="inline"
						controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
					>
						<Select
							value={structuredListContent.type}
							onValueChange={(value: StructuredListContent["type"]) =>
								commitListContent(
									buildListContentFromLines(itemsValue, listContent, value),
								)
							}
						>
							<SelectTrigger className="h-8 text-[11px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{LIST_TYPE_OPTIONS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>
				) : (
					<div className="editor-border-subtle editor-bg-subtle editor-text-muted rounded-sm border px-3 py-2 text-[11px] leading-4">
						Description list inspector editing is deferred to phase 2. Convert
						this node to bulleted or numbered to use structured controls.
					</div>
				)}
				{structuredListContent?.type === "ul" ? (
					<FormField
						label="Bullet"
						layout="inline"
						controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
					>
						<Select
							value={structuredListContent.markerStyle ?? "disc"}
							onValueChange={(value) =>
								commitListContent({
									...structuredListContent,
									markerStyle:
										value as typeof structuredListContent.markerStyle,
								})
							}
						>
							<SelectTrigger className="h-8 text-[11px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{UNORDERED_MARKER_OPTIONS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormField>
				) : null}
				{structuredListContent?.type === "ol" ? (
					<>
						<FormField label="Start" layout="inline" controlWidth="88px">
							<NumberInput
								value={structuredListContent.start ?? 1}
								min={1}
								max={999}
								step={1}
								onChange={(value) =>
									commitListContent({
										...structuredListContent,
										start: Math.max(1, Math.trunc(value)),
									})
								}
							/>
						</FormField>
						<FormField
							label="Marker"
							layout="inline"
							controlWidth={`${TYPOGRAPHY_CONTROL_RAIL_WIDTH_PX}px`}
						>
							<Select
								value={structuredListContent.markerStyle ?? "decimal"}
								onValueChange={(value) =>
									commitListContent({
										...structuredListContent,
										markerStyle:
											value as typeof structuredListContent.markerStyle,
									})
								}
							>
								<SelectTrigger className="h-8 text-[11px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ORDERED_MARKER_OPTIONS.map(({ value, label }) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FormField>
					</>
				) : null}
			</InspectorFieldGroup>
			{structuredListContent ? (
				<div className="space-y-2.5 pt-2.5">
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-2">
							<span className="editor-text-strong text-[11px] font-medium">
								Items
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-7 gap-1.5 px-2 text-[11px]"
								onClick={() =>
									commitListContent(
										addStructuredListItem(structuredListContent),
									)
								}
							>
								<Plus className="h-3.5 w-3.5" />
								Add item
							</Button>
						</div>
						<div className="space-y-2">
							{structuredListContent.items.map((item, index) => (
								<div
									key={structuredItemKeys[index]}
									className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
								>
									<Input
										aria-label={`List item ${index + 1}`}
										value={item.text}
										placeholder={`Item ${index + 1}`}
										className="h-8 rounded-sm text-[12px]"
										onChange={(event) =>
											commitListContent(
												setStructuredListItemText(
													structuredListContent,
													index,
													event.target.value,
												),
											)
										}
									/>
									<div className="flex items-center gap-1">
										<Button
											type="button"
											variant="outline"
											size="sm"
											aria-label={`Move list item ${index + 1} up`}
											className="h-8 w-8 rounded-sm p-0"
											onClick={() =>
												commitListContent(
													moveStructuredListItem(
														structuredListContent,
														index,
														-1,
													),
												)
											}
											disabled={index === 0}
										>
											<ArrowUp className="h-3.5 w-3.5" />
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											aria-label={`Move list item ${index + 1} down`}
											className="h-8 w-8 rounded-sm p-0"
											onClick={() =>
												commitListContent(
													moveStructuredListItem(
														structuredListContent,
														index,
														1,
													),
												)
											}
											disabled={
												index === structuredListContent.items.length - 1
											}
										>
											<ArrowDown className="h-3.5 w-3.5" />
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											aria-label={`Remove list item ${index + 1}`}
											className="h-8 w-8 rounded-sm p-0"
											onClick={() =>
												commitListContent(
													removeStructuredListItem(
														structuredListContent,
														index,
													),
												)
											}
											disabled={structuredListContent.items.length === 1}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			) : null}
			<InspectorFieldGroup gap>
				<div className="flex items-center justify-between gap-2">
					<span className="editor-text-strong text-[11px] font-medium">
						Advanced edit
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 px-2 text-[11px]"
						onClick={() => setShowAdvancedEdit((value) => !value)}
					>
						{showAdvancedEdit ? "Hide" : "Show"}
					</Button>
				</div>
				{showAdvancedEdit ? (
					<FormField
						label={
							listContent.type === "dl"
								? "Bulk edit (term: description)"
								: "Bulk edit (new line separated)"
						}
					>
						<Textarea
							value={itemsValue}
							rows={Math.max(4, listContentToLines(listContent).length)}
							onChange={(event) =>
								commitListContent(
									buildListContentFromLines(event.target.value, listContent),
								)
							}
							onPaste={(event) => {
								const text = event.clipboardData.getData("text/plain");
								if (text) {
									event.preventDefault();
									commitListContent(
										buildListContentFromLines(text, listContent),
									);
								}
							}}
						/>
					</FormField>
				) : null}
			</InspectorFieldGroup>
		</InspectorSectionCard>
	);
}
