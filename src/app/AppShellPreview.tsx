import type { DocumentModel } from "../api/documentViewApi";
import { BackToEditorButton } from "../panels/BackToEditorButton";
import { SiteRenderer } from "../site/SiteRenderer";
import { usePreviewAnimations } from "../site/usePreviewAnimations";

type PreviewSiteAssetsProps = {
	css: string;
	fontHref: string | null;
};

function PreviewSiteAssets({ css, fontHref }: PreviewSiteAssetsProps) {
	return (
		<>
			{fontHref ? (
				<>
					<link rel="preconnect" href="https://fonts.googleapis.com" />
					<link
						rel="preconnect"
						href="https://fonts.gstatic.com"
						crossOrigin=""
					/>
					<link rel="stylesheet" href={fontHref} />
				</>
			) : null}
			<style data-preview-site-css="true">{css}</style>
		</>
	);
}

type PreviewModeProps = {
	css: string;
	fontHref: string | null;
	document: DocumentModel;
	previewSticky: boolean;
	pageId: string | undefined;
};

export function PreviewMode({
	css,
	fontHref,
	document,
	previewSticky,
	pageId,
}: PreviewModeProps) {
	usePreviewAnimations(document);
	return (
		<>
			<PreviewSiteAssets css={css} fontHref={fontHref} />
			<div style={{ position: "fixed", inset: 0, overflow: "auto" }}>
				<SiteRenderer
					document={document}
					includeAnimations
					previewSticky={previewSticky}
					pageId={pageId}
				/>
			</div>
			<BackToEditorButton />
		</>
	);
}
