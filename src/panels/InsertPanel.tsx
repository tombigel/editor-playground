import {
	BookOpenText,
	Clapperboard,
	Layers3,
	Link2,
	RectangleEllipsis,
	Rows3,
	Sparkles,
	SquareStack,
	Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopoverTooltip } from "@/components/ui/popover";

type LeafItemKind = 'image' | 'video' | 'svg' | 'link' | 'button';

type Props = {
	onInsertWrapper: (role: "container") => void;
	onOpenSectionTemplates: (trigger: HTMLElement) => void;
	onOpenTextTypes: (trigger: HTMLElement) => void;
	onOpenMediaTypes: (trigger: HTMLElement) => void;
	onInsertLeaf: (role: LeafItemKind) => void;
	layersOpen?: boolean;
	onOpenLayers?: (trigger: HTMLElement) => void;
	onCloseLayers?: () => void;
	pagesOpen?: boolean;
	onOpenPages?: (trigger: HTMLElement) => void;
	onClosePages?: () => void;
	aiOpen?: boolean;
	onToggleAi?: () => void;
};

const INSERT_ITEMS = [
	{
		kind: "wrapper" as const,
		role: "section" as const,
		icon: Rows3,
		label: "Section",
		hint: "Top-level surface",
	},
	{
		kind: "wrapper" as const,
		role: "container" as const,
		icon: SquareStack,
		label: "Container",
		hint: "Nestable wrapper",
	},
	{
		kind: "textType" as const,
		icon: Type,
		label: "Text",
		hint: "Paragraph, heading, rich text…",
	},
	{
		kind: "mediaType" as const,
		icon: Clapperboard,
		label: "Media",
		hint: "Image, video, SVG…",
	},
	{
		kind: "leaf" as const,
		role: "link" as const,
		icon: Link2,
		label: "Link",
		hint: "Inline action",
	},
	{
		kind: "leaf" as const,
		role: "button" as const,
		icon: RectangleEllipsis,
		label: "Button",
		hint: "Primary CTA",
	},
];

export function InsertPanel({
	onInsertWrapper,
	onOpenSectionTemplates,
	onOpenTextTypes,
	onOpenMediaTypes,
	onInsertLeaf,
	layersOpen = false,
	onOpenLayers = () => undefined,
	onCloseLayers = () => undefined,
	pagesOpen = false,
	onOpenPages = () => undefined,
	onClosePages = () => undefined,
	aiOpen = false,
	onToggleAi = () => undefined,
}: Props) {
	const componentsLabel = "Components";
	const pagesLabel = "Pages";
	const aiLabel = "AI Assistant";

	return (
		<div className="flex flex-col items-center gap-2 overflow-visible">
			<div className="pb-1">
				<div className="editor-text-strong text-sm font-semibold">Add</div>
			</div>
			{INSERT_ITEMS.map((item) => {
				const Icon = item.icon;
				return (
					<PopoverTooltip
						key={item.label}
						side="right"
						align="center"
						className="min-w-[148px] text-left font-normal"
						content={
							<>
								<span className="editor-text-strong block text-sm font-medium">
									{item.label}
								</span>
								<span className="editor-text-muted mt-0.5 block text-xs">
									{item.hint}
								</span>
							</>
						}
					>
						<Button
							type="button"
							data-panel-trigger={
								item.kind === "wrapper" && item.role === "section"
									? "section-templates"
									: item.kind === "textType"
										? "text-types"
										: item.kind === "mediaType"
											? "media-types"
										: undefined
							}
							variant="outline"
							size="icon"
							title={`${item.label} · ${item.hint}`}
							className="editor-insert-button h-7 w-7 rounded-md p-0"
							onClick={(event) => {
								if (item.kind === "wrapper") {
									if (item.role === "section") {
										onOpenSectionTemplates(event.currentTarget);
									} else {
										onInsertWrapper(item.role);
									}
									return;
								}
								if (item.kind === "textType") {
									onOpenTextTypes(event.currentTarget);
									return;
								}
								if (item.kind === "mediaType") {
									onOpenMediaTypes(event.currentTarget);
									return;
								}
								onInsertLeaf(item.role);
							}}
						>
							<Icon className="h-4 w-4" strokeWidth={1.9} />
						</Button>
					</PopoverTooltip>
				);
			})}
			<div
				aria-hidden="true"
				className="editor-border-subtle mt-2 w-full border-b"
			/>
			<PopoverTooltip
				side="right"
				align="center"
				className="min-w-[148px] text-left font-normal"
				content={
					<>
						<span className="editor-text-strong block text-sm font-medium">
							{componentsLabel}
						</span>
						<span className="editor-text-muted mt-0.5 block text-xs">
							Structure, visibility, and order
						</span>
					</>
				}
			>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					data-panel-trigger="components"
					aria-label={componentsLabel}
					aria-pressed={layersOpen}
					className="editor-rail-entry-button mt-2"
					onClick={(event) => {
						if (layersOpen) {
							onCloseLayers();
							return;
						}
						onOpenLayers(event.currentTarget);
					}}
				>
					<Layers3 className="h-4 w-4" strokeWidth={1.9} />
				</Button>
			</PopoverTooltip>
			<PopoverTooltip
				side="right"
				align="center"
				className="min-w-[148px] text-left font-normal"
				content={
					<>
						<span className="editor-text-strong block text-sm font-medium">
							{pagesLabel}
						</span>
						<span className="editor-text-muted mt-0.5 block text-xs">
							Manage and switch site pages
						</span>
					</>
				}
			>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					data-panel-trigger="pages"
					aria-label={pagesLabel}
					aria-pressed={pagesOpen}
					className="editor-rail-entry-button"
					onClick={(event) => {
						if (pagesOpen) {
							onClosePages();
							return;
						}
						onOpenPages(event.currentTarget);
					}}
				>
					<BookOpenText className="h-4 w-4" strokeWidth={1.9} />
				</Button>
			</PopoverTooltip>
			<PopoverTooltip
				side="right"
				align="center"
				className="min-w-[148px] text-left font-normal"
				content={
					<>
						<span className="editor-text-strong block text-sm font-medium">
							{aiLabel}
						</span>
						<span className="editor-text-muted mt-0.5 block text-xs">
							Ask about your document
						</span>
					</>
				}
			>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					data-panel-trigger="ai"
					aria-label={aiLabel}
					aria-pressed={aiOpen}
					className="editor-rail-entry-button"
					onClick={onToggleAi}
				>
					<Sparkles className="h-4 w-4" strokeWidth={1.9} />
				</Button>
			</PopoverTooltip>
		</div>
	);
}
