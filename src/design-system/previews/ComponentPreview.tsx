import type { ReactNode } from "react";
import type { PropDefinition } from "../types";
import { PropsTable } from "./PropsTable";

export function ComponentPreview({
	id,
	name,
	description,
	sourceFile,
	props,
	children,
}: {
	id: string;
	name: string;
	description: string;
	sourceFile: string;
	props: PropDefinition[];
	children: ReactNode;
}) {
	return (
		<section id={id} className="mb-12 scroll-mt-8">
			<div className="mb-1 flex items-baseline gap-3">
				<h3 className="editor-text-strong text-base font-semibold">{name}</h3>
				<span className="editor-text-muted font-mono text-[11px]">
					{sourceFile}
				</span>
			</div>
			<p className="editor-text-muted mb-4 text-sm">{description}</p>

			<div className="mb-4">{children}</div>

			{props.length > 0 ? (
				<details className="mb-4">
					<summary className="editor-text-muted cursor-pointer text-[12px] font-medium">
						Props
					</summary>
					<div className="mt-2">
						<PropsTable props={props} />
					</div>
				</details>
			) : null}
		</section>
	);
}
