import type { CSSProperties } from "react";

import type { RichTableBlock } from "../model/types";

export type RichTableRenderLayout = {
	columnWidths: Array<string | null>;
	style: CSSProperties;
};

function parsePercentage(value: string | null) {
	if (!value?.endsWith("%")) {
		return null;
	}
	const numeric = Number.parseFloat(value);
	return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function formatPercentage(value: number) {
	return `${Math.round(value * 10000) / 10000}%`;
}

function sumAuthoredWidths(widths: Array<string | null>) {
	const authoredWidths = widths.filter((width): width is string =>
		Boolean(width),
	);
	return authoredWidths.length === 1
		? authoredWidths[0]
		: `calc(${authoredWidths.join(" + ")})`;
}

/**
 * Native fixed-layout tables stretch columns when the table remains at 100% width.
 * Fully authored columns instead size the table intrinsically; an all-percentage
 * table uses the percentage sum as its outer width and normalized column shares.
 */
export function getRichTableRenderLayout(
	block: RichTableBlock,
): RichTableRenderLayout {
	const columnCount = Math.max(
		1,
		...block.children.map((row) => row.children.length),
	);
	const columnWidths = Array.from(
		{ length: columnCount },
		(_, columnIndex) => block.columnWidths?.[columnIndex] ?? null,
	);
	const hasAuthoredWidth = columnWidths.some(Boolean);
	if (!hasAuthoredWidth) {
		return { columnWidths, style: {} };
	}

	const allColumnsAuthored = columnWidths.every(Boolean);
	if (!allColumnsAuthored) {
		return {
			columnWidths,
			style: { tableLayout: "fixed" },
		};
	}

	const percentages = columnWidths.map(parsePercentage);
	const allPercentages = percentages.every((value) => value != null);
	if (!allPercentages) {
		const hasPercentage = percentages.some((value) => value != null);
		return {
			columnWidths,
			style: {
				tableLayout: "fixed",
				width: hasPercentage ? "auto" : sumAuthoredWidths(columnWidths),
			},
		};
	}

	const total = percentages.reduce<number>(
		(sum, value) => sum + (value ?? 0),
		0,
	);
	const normalizedWidths =
		total > 0
			? percentages.map((value) =>
					formatPercentage(((value ?? 0) / total) * 100),
				)
			: columnWidths;
	return {
		columnWidths: normalizedWidths,
		style: {
			tableLayout: "fixed",
			width: formatPercentage(total),
		},
	};
}
