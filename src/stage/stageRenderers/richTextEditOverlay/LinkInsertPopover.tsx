import { Link2Off } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionsSelector } from "@/components/ui/options-selector";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";

import type { getSectionAnchorOptions } from "../../../model/links";
import type { DocumentModel } from "../../../model/types";
import { preserveRichSelectionPointerDown } from "./controls";
import {
	RICH_SELECT_IDS,
	type LinkPopoverDraft,
	type RichEditSelectId,
} from "./types";

export function LinkInsertPopover({
	draft,
	placement,
	toolbarLeft,
	toolbarTop,
	toolbarWidth,
	pages,
	sectionOptions,
	targetPageSectionOptions,
	onChange,
	onRemove,
	openSelectId,
	onSelectOpenChange,
}: {
	draft: LinkPopoverDraft;
	placement: "above" | "below";
	toolbarLeft: number;
	toolbarTop: number;
	toolbarWidth: number;
	pages: NonNullable<DocumentModel["pages"]>;
	sectionOptions: ReturnType<typeof getSectionAnchorOptions>;
	targetPageSectionOptions: Array<{ id: string; name: string }>;
	onChange: (draft: LinkPopoverDraft) => void;
	onRemove: () => void;
	openSelectId: RichEditSelectId | null;
	onSelectOpenChange: (selectId: RichEditSelectId, open: boolean) => void;
}) {
	return (
		<FloatingPanelShell
			suppressPopover
			open
			data-stage-rich-link-popover="true"
			positionMode="fixed"
			style={{
				top: `${toolbarTop}px`,
				left: `${toolbarLeft + toolbarWidth}px`,
				zIndex: 230,
				transform:
					placement === "above"
						? "translate(-100%, calc(-100% - 18px))"
						: "translate(-100%, calc(100% + 18px))",
				width: 300,
				pointerEvents: "auto",
			}}
			bodyClassName="space-y-3 px-3 py-3"
			bodyStyle={{ pointerEvents: "auto" }}
			onPointerDown={(event) => event.stopPropagation()}
		>
			<div className="flex items-center justify-between gap-2">
				<Label className="text-[11px] font-medium">Type</Label>
				<OptionsSelector
					ariaLabel="Link type"
					value={draft.linkType}
					onValueChange={(value) =>
						onChange({
							...draft,
							linkType: value as LinkPopoverDraft["linkType"],
						})
					}
					options={[
						{ value: "external", label: "External" },
						{ value: "anchor", label: "Internal" },
						...(pages.length > 0 ? [{ value: "page", label: "Page" }] : []),
					]}
					size="compact"
				/>
			</div>
			{draft.linkType === "external" ? (
				<div className="space-y-0.5">
					<Label className="text-[11px] font-medium">Link</Label>
					<Input
						autoFocus
						type="url"
						placeholder="https://example.com"
						className="pointer-events-auto"
						style={{ pointerEvents: "auto" }}
						value={draft.href}
						onChange={(event) =>
							onChange({ ...draft, href: event.target.value })
						}
					/>
				</div>
			) : draft.linkType === "anchor" ? (
				<div className="space-y-0.5">
					<Label className="text-[11px] font-medium">Section</Label>
					<Select
						open={openSelectId === RICH_SELECT_IDS.sectionTarget}
						onOpenChange={(open) =>
							onSelectOpenChange(RICH_SELECT_IDS.sectionTarget, open)
						}
						value={draft.anchorTargetId}
						onValueChange={(value) =>
							onChange({ ...draft, anchorTargetId: value })
						}
					>
						<SelectTrigger
							data-stage-rich-select-id={RICH_SELECT_IDS.sectionTarget}
							aria-label="Section target"
							className="pointer-events-auto"
							style={{ pointerEvents: "auto" }}
							onPointerDown={preserveRichSelectionPointerDown}
						>
							<span className="truncate text-left">
								{sectionOptions.find(
									(option) => option.id === draft.anchorTargetId,
								)?.name ?? "Select section"}
							</span>
						</SelectTrigger>
						<SelectContent
							data-stage-rich-select-id={RICH_SELECT_IDS.sectionTarget}
						>
							{sectionOptions.map((option) => (
								<SelectItem key={option.id} value={option.id}>
									{option.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : (
				<div className="space-y-2">
					<div className="space-y-0.5">
						<Label className="text-[11px] font-medium">Page</Label>
						<Select
							open={openSelectId === RICH_SELECT_IDS.targetPage}
							onOpenChange={(open) =>
								onSelectOpenChange(RICH_SELECT_IDS.targetPage, open)
							}
							value={draft.targetPageId}
							onValueChange={(value) =>
								onChange({ ...draft, targetPageId: value })
							}
						>
							<SelectTrigger
								data-stage-rich-select-id={RICH_SELECT_IDS.targetPage}
								aria-label="Target page"
								className="pointer-events-auto"
								style={{ pointerEvents: "auto" }}
								onPointerDown={preserveRichSelectionPointerDown}
							>
								<span className="truncate text-left">
									{pages.find((page) => page.id === draft.targetPageId)
										?.displayName ?? "Select page"}
								</span>
							</SelectTrigger>
							<SelectContent
								data-stage-rich-select-id={RICH_SELECT_IDS.targetPage}
							>
								{pages.map((page) => (
									<SelectItem key={page.id} value={page.id}>
										{page.displayName || page.slug || page.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{targetPageSectionOptions.length > 0 ? (
						<div className="space-y-0.5">
							<Label className="text-[11px] font-medium">
								Jump to section (optional)
							</Label>
							<Select
								open={openSelectId === RICH_SELECT_IDS.targetPageSection}
								onOpenChange={(open) =>
									onSelectOpenChange(RICH_SELECT_IDS.targetPageSection, open)
								}
								value={draft.pageAnchorId || "__none__"}
								onValueChange={(value) =>
									onChange({
										...draft,
										pageAnchorId: value === "__none__" ? "" : value,
									})
								}
							>
								<SelectTrigger
									data-stage-rich-select-id={RICH_SELECT_IDS.targetPageSection}
									aria-label="Target page section"
									className="pointer-events-auto"
									style={{ pointerEvents: "auto" }}
									onPointerDown={preserveRichSelectionPointerDown}
								>
									<span className="truncate text-left">
										{draft.pageAnchorId
											? (targetPageSectionOptions.find(
													(option) => option.id === draft.pageAnchorId,
												)?.name ?? draft.pageAnchorId)
											: "None"}
									</span>
								</SelectTrigger>
								<SelectContent
									data-stage-rich-select-id={RICH_SELECT_IDS.targetPageSection}
								>
									<SelectItem value="__none__">None</SelectItem>
									{targetPageSectionOptions.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}
				</div>
			)}
			<div className="flex items-center justify-between gap-2">
				<Label className="text-[11px] font-medium">Remove link</Label>
				<Button
					type="button"
					variant="destructive"
					size="icon"
					className="pointer-events-auto"
					style={{ pointerEvents: "auto" }}
					onClick={onRemove}
				>
					<Link2Off size={14} />
				</Button>
			</div>
		</FloatingPanelShell>
	);
}
