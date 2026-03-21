import type { ReactNode } from "react";

export function VariationsGrid({
	variations,
	columns,
}: {
	variations: Array<{ label: string; render: () => ReactNode }>;
	columns?: number;
}) {
	if (variations.length === 0) {
		return null;
	}

	return (
		<div
			className={columns ? "grid gap-6" : "flex flex-wrap gap-6"}
			style={
				columns
					? {
							gridTemplateColumns: `repeat(${columns}, auto)`,
							justifyContent: "start",
						}
					: undefined
			}
		>
			{variations.map((variation) => (
				<div key={variation.label} className="flex flex-col items-center gap-2">
					<div className="flex items-center justify-center">
						{variation.render()}
					</div>
					<span className="editor-text-muted text-[11px]">
						{variation.label}
					</span>
				</div>
			))}
		</div>
	);
}
