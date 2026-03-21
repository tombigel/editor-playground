import { useEffect, useRef, useState } from "react";

export function TokenSwatch({
	token,
	themeKey,
}: {
	token: string;
	themeKey?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [computed, setComputed] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: themeKey triggers re-read of computed styles when theme changes
	useEffect(() => {
		if (!ref.current) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			if (ref.current) {
				const value = getComputedStyle(ref.current)
					.getPropertyValue(token)
					.trim();
				setComputed(value);
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [token, themeKey]);

	const isColor =
		!token.includes("shadow") && !token.includes("background-gradient");
	const isGradient =
		computed.includes("gradient") ||
		computed.includes("linear") ||
		computed.includes("radial");
	const shortName = token.replace("--editor-", "");

	return (
		<div
			ref={ref}
			className="flex items-center gap-2 rounded-md px-2 py-1.5"
			title={`${token}\n${computed}`}
		>
			{isColor ? (
				<div
					className="h-4 w-4 shrink-0 rounded-sm border border-black/10"
					style={{
						background: isGradient ? computed : `var(${token})`,
					}}
				/>
			) : null}
			<span className="editor-text-strong truncate font-mono text-[10px] leading-tight">
				{shortName}
			</span>
		</div>
	);
}
