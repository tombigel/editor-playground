import { resolvePublicAssetUrl } from "@/lib/publicAssets";
import { ComponentPreview } from "../previews/ComponentPreview";

const LOGO_ASSET_VARIANTS = [
	{
		label: "Favicon",
		fileName: "editor-playground-logo-favicon.svg",
		kind: "color",
		display: "favicon",
	},
	{
		label: "Favicon monochrome",
		fileName: "editor-playground-logo-favicon-monochrome.svg",
		kind: "monochrome",
		display: "favicon",
	},
	{
		label: "One-line logo",
		fileName: "editor-playground-logo-one-line.svg",
		kind: "color",
		display: "wide",
	},
	{
		label: "One-line logo monochrome",
		fileName: "editor-playground-logo-one-line-monochrome.svg",
		kind: "monochrome",
		display: "wide",
	},
	{
		label: "Two-line logo",
		fileName: "editor-playground-logo-two-lines.svg",
		kind: "color",
		display: "stacked",
	},
	{
		label: "Two-line logo monochrome",
		fileName: "editor-playground-logo-two-lines-monochrome.svg",
		kind: "monochrome",
		display: "stacked",
	},
] as const;

export function LogoAssetsSection() {
	return (
		<ComponentPreview
			id="logo-assets"
			name="Logo Assets"
			description="Static Editor Playground logo assets for favicon, topbar, and About surfaces."
			sourceFile="src/assets/static/*.svg"
			props={[]}
		>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{LOGO_ASSET_VARIANTS.map((asset) => (
					<div
						key={asset.fileName}
						className="editor-bg-subtle editor-border-subtle flex min-h-36 flex-col gap-3 rounded-lg border p-4"
					>
						<div className="flex min-h-16 flex-1 items-center justify-center">
							{asset.kind === "monochrome" ? (
								<span
									aria-label={asset.label}
									role="img"
									className={
										asset.display === "favicon"
											? "block h-12 w-16 text-[color:var(--editor-utility-text-strong)]"
											: asset.display === "wide"
												? "block h-9 w-full max-w-64 text-[color:var(--editor-utility-text-strong)]"
												: "block h-16 w-full max-w-36 text-[color:var(--editor-utility-text-strong)]"
									}
									style={{
										background: "currentColor",
										WebkitMaskImage: `url("${resolvePublicAssetUrl(asset.fileName)}")`,
										WebkitMaskPosition: "center",
										WebkitMaskRepeat: "no-repeat",
										WebkitMaskSize: "contain",
										maskImage: `url("${resolvePublicAssetUrl(asset.fileName)}")`,
										maskPosition: "center",
										maskRepeat: "no-repeat",
										maskSize: "contain",
									}}
								/>
							) : (
								<img
									src={resolvePublicAssetUrl(asset.fileName)}
									alt={asset.label}
									className={
										asset.display === "favicon"
											? "h-12 w-16 object-contain"
											: asset.display === "wide"
												? "h-9 w-full max-w-64 object-contain"
												: "h-16 w-full max-w-36 object-contain"
									}
								/>
							)}
						</div>
						<div>
							<div className="editor-text-strong text-sm font-medium">
								{asset.label}
							</div>
							<div className="editor-text-muted mt-1 break-all font-mono text-[11px]">
								{asset.fileName}
							</div>
						</div>
					</div>
				))}
			</div>
		</ComponentPreview>
	);
}
