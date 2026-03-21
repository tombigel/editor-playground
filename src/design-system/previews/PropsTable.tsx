import type { PropDefinition } from "../types";

export function PropsTable({ props }: { props: PropDefinition[] }) {
	if (props.length === 0) {
		return null;
	}

	return (
		<div className="editor-border-subtle editor-bg-surface overflow-hidden rounded-lg border">
			<table className="w-full text-[12px]">
				<thead>
					<tr className="editor-border-subtle border-b">
						<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
							Prop
						</th>
						<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
							Type
						</th>
						<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
							Default
						</th>
						<th className="editor-text-muted px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider">
							Description
						</th>
					</tr>
				</thead>
				<tbody>
					{props.map((prop) => (
						<tr
							key={prop.name}
							className="editor-border-subtle border-b last:border-b-0"
						>
							<td className="editor-text-strong px-3 py-2 font-mono font-medium">
								{prop.name}
							</td>
							<td className="editor-text-muted px-3 py-2 font-mono">
								{prop.type}
							</td>
							<td className="editor-text-muted px-3 py-2 font-mono">
								{prop.default ?? "—"}
							</td>
							<td className="editor-text-muted px-3 py-2">
								{prop.description}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
