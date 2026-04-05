import { CheckCircle, ClipboardCopy, LayoutGrid, XCircle } from "lucide-react";
import {
	useEffect,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
	type Ref,
} from "react";
import type { DocumentModel } from "../model/types";
import type { DocumentPage, PageId, SiteSettings } from "../model/types/site";
import type { LinkValidationError } from "../model/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PopoverSurface } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EditorPanelHeader } from "./EditorPanelHeader";
import { PageSettingsPopup } from "./PageSettingsPopup";
import { PageTreeContent } from "./PageTreeContent";

export type PagesPanelProps = {
	position: { top: number; left: number };
	onPositionChange: (position: { top: number; left: number }) => void;
	panelRef?: Ref<HTMLDivElement>;
	document: DocumentModel;
	activePageId: PageId | null;
	openSettingsPageId?: PageId | null;
	onClose: () => void;
	onSetSiteSettings: (patch: Partial<SiteSettings>) => void;
	onSetActivePage: (pageId: PageId) => void;
	onAddPage: () => void;
	onDeletePage: (pageId: PageId) => void;
	onSetPageDisplayName: (pageId: PageId, name: string) => void;
	onSetPageSlug: (pageId: PageId, slug: string) => void;
	onAddPageAlias: (pageId: PageId, alias: string) => void;
	onRemovePageAlias: (pageId: PageId, alias: string) => void;
	onSetPageVisibility: (pageId: PageId, visible: boolean) => void;
	onSetPageViewTransition: (
		pageId: PageId,
		transition: DocumentPage["viewTransition"],
	) => void;
	onSetPageParent: (pageId: PageId, parentPageId: PageId | null) => void;
	onReorderPage: (pageId: PageId, direction: "back" | "forward") => void;
	onSyncPageLinks: (oldUrl: string, newUrl: string) => void;
	onValidateLinks: () => LinkValidationError[];
	onExport: () => void;
};

type PanelDragState = {
	pointerId: number;
	originX: number;
	originY: number;
	originTop: number;
	originLeft: number;
};

const PANEL_VIEWPORT_MARGIN_PX = 16;

export function PagesPanel({
	position,
	onPositionChange,
	panelRef,
	document,
	activePageId,
	openSettingsPageId = null,
	onClose,
	onSetSiteSettings,
	onSetActivePage,
	onAddPage,
	onDeletePage,
	onSetPageDisplayName,
	onSetPageSlug,
	onAddPageAlias,
	onRemovePageAlias,
	onSetPageVisibility,
	onSetPageViewTransition,
	onSetPageParent,
	onReorderPage,
	onSyncPageLinks,
	onValidateLinks,
	onExport,
}: PagesPanelProps) {
	const surfaceRef = useRef<HTMLDivElement | null>(null);
	const [panelDragState, setPanelDragState] = useState<PanelDragState | null>(
		null,
	);
	const [settingsPageId, setSettingsPageId] = useState<PageId | null>(null);
	const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(
		null,
	);
	const [linkErrors, setLinkErrors] = useState<LinkValidationError[] | null>(
		null,
	);
	const [copied, setCopied] = useState(false);

	const siteSettings = document.siteSettings;
	const pages = document.pages ?? [];

	useEffect(() => {
		if (!panelDragState) {
			return;
		}

		const { cursor, userSelect } = window.document.body.style;
		window.document.body.style.cursor = "grabbing";
		window.document.body.style.userSelect = "none";

		return () => {
			window.document.body.style.cursor = cursor;
			window.document.body.style.userSelect = userSelect;
		};
	}, [panelDragState]);

	useEffect(() => {
		if (!panelDragState) {
			return;
		}

		const currentPanelDrag = panelDragState;

		function handlePointerMove(event: PointerEvent) {
			if (event.pointerId !== currentPanelDrag.pointerId) {
				return;
			}

			event.preventDefault();
			const rect = surfaceRef.current?.getBoundingClientRect();
			const panelWidth = rect?.width ?? 480;
			const panelHeight = rect?.height ?? 560;
			const nextLeft = clampToViewport(
				currentPanelDrag.originLeft +
					(event.clientX - currentPanelDrag.originX),
				panelWidth,
				window.innerWidth,
			);
			const nextTop = clampToViewport(
				currentPanelDrag.originTop + (event.clientY - currentPanelDrag.originY),
				panelHeight,
				window.innerHeight,
			);
			onPositionChange({ top: nextTop, left: nextLeft });
		}

		function handlePointerEnd(event: PointerEvent) {
			if (event.pointerId !== currentPanelDrag.pointerId) {
				return;
			}
			setPanelDragState(null);
		}

		window.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	}, [onPositionChange, panelDragState]);

	useEffect(() => {
		if (!openSettingsPageId) return;
		setSettingsAnchorEl(null);
		setSettingsPageId(openSettingsPageId);
	}, [openSettingsPageId]);

	function setCombinedRef(node: HTMLDivElement | null) {
		surfaceRef.current = node;
		if (typeof panelRef === "function") {
			panelRef(node);
		} else if (panelRef) {
			panelRef.current = node;
		}
	}

	function handleHeaderPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement | null;
		if (
			event.button !== 0 ||
			!target ||
			target.closest(
				'button, input, textarea, select, [data-prevent-panel-drag="true"]',
			)
		) {
			return;
		}

		event.preventDefault();
		setPanelDragState({
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			originTop: position.top,
			originLeft: position.left,
		});
	}

	function handleOpenSettings(pageId: PageId, anchorEl?: HTMLElement | null) {
		setSettingsAnchorEl(anchorEl ?? null);
		setSettingsPageId(pageId);
	}

	function handleCloseSettings() {
		setSettingsPageId(null);
		setSettingsAnchorEl(null);
	}

	const settingsPage =
		settingsPageId != null
			? (pages.find((p) => p.id === settingsPageId) ?? null)
			: null;

	function handleSetPageViewTransition(
		pageId: PageId,
		transition: DocumentPage["viewTransition"],
	) {
		onSetPageViewTransition(pageId, transition);
	}

	function handleValidateLinks() {
		const errors = onValidateLinks();
		setLinkErrors(errors);
		setCopied(false);
	}

	function handleCopyResults() {
		if (!linkErrors) return;
		const text =
			linkErrors.length === 0
				? "No broken links found."
				: linkErrors
						.map(
							(e) =>
								`[${e.nodeRole}] "${e.nodeName}" (${e.nodeId}): ${e.description}`,
						)
						.join("\n");
		void navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<>
			<PopoverSurface
				ref={setCombinedRef}
				open
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
				className="editor-floating-panel editor-bg-surface editor-border-subtle fixed z-[380] w-[480px] max-w-[calc(100vw-32px)] rounded-xl border shadow-[0_22px_64px_rgba(15,23,42,0.18)]"
				style={{ top: `${position.top}px`, left: `${position.left}px` }}
			>
				<div
					className="editor-panel-drag-zone"
					onPointerDown={handleHeaderPointerDown}
				>
					<EditorPanelHeader
						icon={LayoutGrid}
						title="Pages"
						description="Manage pages, site settings, and export."
						closeLabel="Close pages panel"
						onClose={onClose}
						className="cursor-grab px-3 py-2.5 active:cursor-grabbing"
					/>
				</div>

				<div className="editor-scrollbar max-h-[calc(80vh-56px)] overflow-y-auto">
					{/* Section 1 — Site */}
					<section className="editor-border-subtle border-b px-4 py-4">
						<h3 className="editor-text-strong mb-3 text-xs font-semibold uppercase tracking-wider">
							Site
						</h3>
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<Label className="editor-text-muted text-xs">Title</Label>
								<Input
									defaultValue={siteSettings?.title ?? ""}
									key={siteSettings?.title}
									className="editor-bg-surface editor-border-subtle editor-text-strong"
									placeholder="My Site"
									onBlur={(e) => {
										const val = e.currentTarget.value.trim();
										onSetSiteSettings({ title: val || undefined });
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") e.currentTarget.blur();
									}}
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label className="editor-text-muted text-xs">Status</Label>
								<Select
									value={siteSettings?.status ?? "draft"}
									onValueChange={(value) =>
										onSetSiteSettings({
											status: value as SiteSettings["status"],
										})
									}
								>
									<SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="draft">Draft</SelectItem>
										<SelectItem value="published">Published</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label className="editor-text-muted text-xs">
									Default Transition
								</Label>
								<Select
									value={siteSettings?.viewTransition ?? "none"}
									onValueChange={(value) =>
										onSetSiteSettings({
											viewTransition: value as SiteSettings["viewTransition"],
										})
									}
								>
									<SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">None</SelectItem>
										<SelectItem value="crossfade">Cross-fade</SelectItem>
										<SelectItem value="slide">Slide</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label className="editor-text-muted text-xs">Language</Label>
								<Input
									defaultValue={siteSettings?.lang ?? "en"}
									key={siteSettings?.lang}
									className="editor-bg-surface editor-border-subtle editor-text-strong"
									placeholder="en"
									maxLength={10}
									onBlur={(e) => {
										const val = e.currentTarget.value.trim() || "en";
										onSetSiteSettings({ lang: val });
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") e.currentTarget.blur();
									}}
								/>
							</div>

							<div className="flex items-center justify-between gap-3">
								<Label className="editor-text-strong text-sm">
									Auto-sync slugs with page names
								</Label>
								<Switch
									checked={siteSettings?.autoSyncSlugs ?? true}
									onCheckedChange={(checked) =>
										onSetSiteSettings({ autoSyncSlugs: checked })
									}
								/>
							</div>
						</div>
					</section>

					{/* Section 2 — Pages */}
					<section className="editor-border-subtle border-b">
						<div className="px-4 pt-4 pb-2">
							<h3 className="editor-text-strong text-xs font-semibold uppercase tracking-wider">
								Pages
							</h3>
						</div>
						<PageTreeContent
							document={document}
							activePageId={activePageId}
							onSetActivePage={onSetActivePage}
							onAddPage={onAddPage}
							onDeletePage={onDeletePage}
							onOpenSettings={handleOpenSettings}
							onSetPageParent={onSetPageParent}
							onReorderPage={onReorderPage}
							onSetPageVisibility={onSetPageVisibility}
						/>
					</section>

					{/* Section 3 — Export */}
					<section className="px-4 py-4">
						<h3 className="editor-text-strong mb-3 text-xs font-semibold uppercase tracking-wider">
							Export
						</h3>
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<Label className="editor-text-muted text-xs">
									Output Structure
								</Label>
								<Select
									value={siteSettings?.outputStructure ?? "directory"}
									onValueChange={(value) =>
										onSetSiteSettings({
											outputStructure: value as SiteSettings["outputStructure"],
										})
									}
								>
									<SelectTrigger className="editor-bg-surface editor-border-subtle editor-text-strong h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="directory">Directory</SelectItem>
										<SelectItem value="flat">Flat</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="flex-1 text-sm"
									onClick={handleValidateLinks}
									aria-label="Validate links"
								>
									Validate links
								</Button>
								<Button
									type="button"
									size="sm"
									className="flex-1 text-sm"
									onClick={onExport}
									aria-label="Export site"
								>
									Export site
								</Button>
							</div>

							{linkErrors !== null && (
								<div className="editor-border-subtle rounded-lg border">
									<div className="flex items-center justify-between px-3 py-2">
										<div className="flex items-center gap-1.5">
											{linkErrors.length === 0 ? (
												<CheckCircle className="h-3.5 w-3.5 text-green-500" />
											) : (
												<XCircle className="h-3.5 w-3.5 text-red-500" />
											)}
											<span className="editor-text-strong text-xs font-medium">
												{linkErrors.length === 0
													? "No broken links found"
													: `${linkErrors.length} broken link${linkErrors.length === 1 ? "" : "s"}`}
											</span>
										</div>
										<button
											type="button"
											onClick={handleCopyResults}
											className="editor-text-muted hover:editor-text-strong flex items-center gap-1 text-xs"
											aria-label="Copy results to clipboard"
										>
											<ClipboardCopy className="h-3 w-3" />
											{copied ? "Copied" : "Copy"}
										</button>
									</div>
									{linkErrors.length > 0 && (
										<ul className="editor-border-subtle border-t">
											{linkErrors.map((err) => (
												<li
													key={err.nodeId + err.errorType}
													className="editor-border-subtle border-b px-3 py-2 last:border-b-0"
												>
													<div className="editor-text-strong text-xs font-medium">
														{err.nodeName}
														<span className="editor-text-muted ml-1 font-normal">
															({err.nodeRole})
														</span>
													</div>
													<div className="editor-text-muted mt-0.5 text-xs">
														{err.description}
													</div>
												</li>
											))}
										</ul>
									)}
								</div>
							)}
						</div>
					</section>
				</div>
			</PopoverSurface>

			{settingsPage && (
				<PageSettingsPopup
					page={settingsPage}
					document={document}
					anchorEl={settingsAnchorEl}
					onClose={handleCloseSettings}
					onSetDisplayName={onSetPageDisplayName}
					onSetSlug={onSetPageSlug}
					onAddAlias={onAddPageAlias}
					onRemoveAlias={onRemovePageAlias}
					onSetVisibility={onSetPageVisibility}
					onSetViewTransition={handleSetPageViewTransition}
					onSetParent={onSetPageParent}
					onSyncPageLinks={onSyncPageLinks}
				/>
			)}
		</>
	);
}

function clampToViewport(
	position: number,
	panelSize: number,
	viewportSize: number,
) {
	const maxPosition = Math.max(
		PANEL_VIEWPORT_MARGIN_PX,
		viewportSize - panelSize - PANEL_VIEWPORT_MARGIN_PX,
	);
	return Math.min(Math.max(PANEL_VIEWPORT_MARGIN_PX, position), maxPosition);
}
