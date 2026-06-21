import type { CSSProperties, ReactNode } from "react";

export function PreviewShell({ children }: { children: ReactNode }) {
	return (
		<div
			className="editor-shell editor-settings-panel min-h-screen"
			data-editor-theme="light"
			data-theme-mode="light"
			data-editor-light-theme="default"
			data-editor-dark-theme="default"
			style={{ "--editor-accent": "#1668ff" } as CSSProperties}
		>
			<div
				className="mx-auto max-w-[960px] px-8 py-8"
				style={{ background: "var(--editor-workspace-background)" }}
			>
				{children}
			</div>
		</div>
	);
}
