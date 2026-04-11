import { useEffect, useState } from "react";
import { validatePageSlug } from "../../../api/pageApi";
import { createLanguageSelectOptions } from "../../../i18n/languages";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { InlineNotice } from "@/components/ui/settings-panel";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
	FormField,
	InspectorFieldGroup,
} from "../../controls/FormLayout";
import { InspectorSectionCard } from "../CommonSections";
import type { DocumentModel } from "../../../model/types";
import type { DocumentPage, PageId } from "../../../model/types/site";
import { isDescendant } from "../../pageTree";

export type PageInspectorSectionProps = {
	page: DocumentPage;
	document: DocumentModel;
	onSetDisplayName: (pageId: PageId, name: string) => void;
	onSetLang: (pageId: PageId, lang?: string) => void;
	onSetSlug: (pageId: PageId, slug: string) => void;
	onSetVisibility: (pageId: PageId, visible: boolean) => void;
	onSetViewTransition: (
		pageId: PageId,
		transition: DocumentPage["viewTransition"],
	) => void;
	onSetPageParent: (pageId: PageId, parentPageId: PageId | null) => void;
	onValidateLinks: () => void;
	onOpenPageSettings: () => void;
	onOpenPagesPanel: () => void;
};

export function PageInspectorSection({
	page,
	document,
	onSetDisplayName,
	onSetSlug,
	onSetVisibility,
	onSetViewTransition,
	onSetPageParent,
	onValidateLinks,
	onOpenPageSettings,
	onOpenPagesPanel,
	onSetLang,
}: PageInspectorSectionProps) {
	const [slugDraft, setSlugDraft] = useState(page.slug);
	const [slugErrors, setSlugErrors] = useState<string[]>([]);
	const viewTransition = page.viewTransition ?? "__inherit__";
	const inheritedTransition = document.siteSettings?.viewTransition ?? "none";
	const pages = document.pages ?? [];
	const eligibleParents = pages.filter(
		(candidate) =>
			candidate.id !== page.id && !isDescendant(candidate.id, page.id, pages),
	);
	const languageOptions = createLanguageSelectOptions({
		includeSiteLanguage: true,
		siteLanguageTag: document.siteSettings?.lang,
	});

	useEffect(() => {
		setSlugDraft(page.slug);
		setSlugErrors([]);
	}, [page.slug]);

	function handleSlugBlur() {
		const errors = validatePageSlug(slugDraft);
		if (errors.length > 0) {
			setSlugErrors(errors);
			setSlugDraft(page.slug);
			return;
		}
		setSlugErrors([]);
		if (slugDraft !== page.slug) {
			onSetSlug(page.id, slugDraft);
		}
	}

	return (
		<InspectorSectionCard
			title="Page"
			contentClassName="space-y-3 px-3 pt-2 pb-3"
		>
			<FormField label="Display name">
				<Input
					value={page.displayName}
					onChange={(e) => onSetDisplayName(page.id, e.target.value)}
					placeholder="Page name"
				/>
			</FormField>

			<InspectorFieldGroup>
				<div className="space-y-1">
					<FormField label="Slug">
						<div className="flex items-center gap-1">
							<span className="editor-text-muted text-[11px]">/</span>
							<Input
								value={slugDraft}
								onChange={(event) => {
									setSlugDraft(event.target.value);
									setSlugErrors(validatePageSlug(event.target.value));
								}}
								onBlur={handleSlugBlur}
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.currentTarget.blur();
									}
									if (event.key === "Escape") {
										setSlugDraft(page.slug);
										setSlugErrors([]);
										event.currentTarget.blur();
									}
								}}
								className="editor-bg-surface editor-border-subtle h-7 text-[11px] font-mono"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-7 px-2 text-[11px]"
								onClick={onValidateLinks}
							>
								Validate links
							</Button>
						</div>
					</FormField>
					{slugErrors.length > 0 ? (
						<InlineNotice>
							{slugErrors[0]}
						</InlineNotice>
					) : null}
				</div>
			</InspectorFieldGroup>

			<InspectorFieldGroup separated>
				<FormField label="Language" layout="inline">
					<SearchableSelect
						value={page.lang ?? "__site__"}
						options={languageOptions}
						placeholder="Site language"
						searchPlaceholder="Search languages"
						triggerClassName="h-7 text-[11px]"
						onValueChange={(value) =>
							onSetLang(page.id, value === "__site__" ? undefined : value)
						}
					/>
				</FormField>

				<FormField label="Visible" layout="inline">
					<Switch
						checked={page.visible}
						onCheckedChange={(value) => onSetVisibility(page.id, value)}
					/>
				</FormField>

				<FormField label="Transition" layout="inline">
					<Select
						value={viewTransition}
						onValueChange={(value) => {
							const nextTransition =
								value === "__inherit__"
									? undefined
									: (value as DocumentPage["viewTransition"]);
							onSetViewTransition(page.id, nextTransition);
						}}
					>
						<SelectTrigger className="h-7 text-[11px]">
							<SelectValue>
								<span className="truncate text-left">
									{VIEW_TRANSITION_LABELS[viewTransition] ?? viewTransition}
								</span>
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__inherit__">
								{`Inherit from site (${VIEW_TRANSITION_LABELS[inheritedTransition] ?? inheritedTransition})`}
							</SelectItem>
							<SelectItem value="none">None</SelectItem>
							<SelectItem value="crossfade">Cross-fade</SelectItem>
							<SelectItem value="slide">Slide</SelectItem>
						</SelectContent>
					</Select>
				</FormField>

				<FormField label="Parent" layout="inline">
					<Select
						value={page.parentPageId ?? "__top__"}
						onValueChange={(value) =>
							onSetPageParent(page.id, value === "__top__" ? null : value)
						}
					>
						<SelectTrigger className="h-7 text-[11px]">
							<SelectValue placeholder="Top level" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__top__">Top level</SelectItem>
							{eligibleParents.map((candidate) => (
								<SelectItem key={candidate.id} value={candidate.id}>
									{candidate.displayName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FormField>
			</InspectorFieldGroup>

			<div className="editor-border-subtle flex items-center gap-2 border-t pt-3">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 flex-1 text-xs"
					onClick={onOpenPageSettings}
				>
					Page settings&hellip;
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 flex-1 text-xs"
					onClick={onOpenPagesPanel}
				>
					All pages&hellip;
				</Button>
			</div>
		</InspectorSectionCard>
	);
}

const VIEW_TRANSITION_LABELS: Record<
	"__inherit__" | NonNullable<DocumentPage["viewTransition"]>,
	string
> = {
	__inherit__: "Inherit from site",
	none: "None",
	crossfade: "Cross-fade",
	slide: "Slide",
};
