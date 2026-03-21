import type { ReactNode, RefCallback } from "react";

export function DesignSystemStage({
	children,
	scrollRef,
}: {
	children: ReactNode;
	scrollRef: RefCallback<HTMLElement>;
}) {
	return (
		<main
			ref={scrollRef}
			className="editor-scrollbar flex-1 overflow-y-auto"
			style={{ background: "var(--editor-workspace-background)" }}
		>
			<div className="mx-auto max-w-[960px] px-8 py-8">{children}</div>
		</main>
	);
}
