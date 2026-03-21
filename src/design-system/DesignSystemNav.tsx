import { useCallback, useEffect, useRef, useState } from "react";
import type { DSSection } from "./types";

export function DesignSystemNav({
	sections,
	scrollContainer,
}: {
	sections: DSSection[];
	scrollContainer: HTMLElement | null;
}) {
	const [activeId, setActiveId] = useState<string>(
		() => sections[0]?.subsections[0]?.id ?? "",
	);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const isScrollingRef = useRef(false);

	useEffect(() => {
		if (!scrollContainer) {
			return;
		}

		const allIds = sections.flatMap((s) => s.subsections.map((sub) => sub.id));
		const visibleIds = new Set<string>();

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (isScrollingRef.current) {
					return;
				}
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visibleIds.add(entry.target.id);
					} else {
						visibleIds.delete(entry.target.id);
					}
				}
				for (const id of allIds) {
					if (visibleIds.has(id)) {
						setActiveId(id);
						break;
					}
				}
			},
			{ root: scrollContainer, rootMargin: "-10% 0px -80% 0px", threshold: 0 },
		);

		for (const id of allIds) {
			const el = scrollContainer.querySelector(`#${CSS.escape(id)}`);
			if (el) {
				observerRef.current.observe(el);
			}
		}

		return () => {
			observerRef.current?.disconnect();
		};
	}, [scrollContainer, sections]);

	const handleClick = useCallback(
		(id: string) => {
			if (!scrollContainer) {
				return;
			}
			const el = scrollContainer.querySelector(`#${CSS.escape(id)}`);
			if (!el) {
				return;
			}
			isScrollingRef.current = true;
			setActiveId(id);
			el.scrollIntoView({ behavior: "smooth", block: "start" });
			setTimeout(() => {
				isScrollingRef.current = false;
			}, 600);
		},
		[scrollContainer],
	);

	return (
		<nav
			aria-label="Design system navigation"
			className="editor-scrollbar flex h-full w-[220px] shrink-0 flex-col overflow-y-auto border-r px-3 py-4"
			style={{ borderColor: "var(--editor-surface-border)" }}
		>
			{sections.map((section) => {
				const SectionIcon = section.icon;
				return (
					<div key={section.id} className="mb-4">
						<div className="editor-text-muted mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider">
							<SectionIcon className="h-3.5 w-3.5" />
							{section.label}
						</div>
						<ul className="space-y-0.5">
							{section.subsections.map((sub) => {
								const isActive = sub.id === activeId;
								return (
									<li key={sub.id}>
										<button
											type="button"
											onClick={() => handleClick(sub.id)}
											className={`w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium transition-colors ${
												isActive
													? "editor-text-strong"
													: "editor-text-muted hover:editor-text-strong"
											}`}
											style={
												isActive
													? {
															background:
																"var(--editor-settings-nav-active-background)",
															color: "var(--editor-settings-nav-active-text)",
															boxShadow:
																"var(--editor-settings-nav-active-shadow)",
														}
													: undefined
											}
											aria-current={isActive ? "true" : undefined}
										>
											{sub.label}
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				);
			})}
		</nav>
	);
}
