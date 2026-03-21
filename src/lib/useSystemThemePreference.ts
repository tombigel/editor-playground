import { useEffect, useState } from "react";

export function useSystemThemePreference() {
	const [systemPrefersDark, setSystemPrefersDark] = useState(false);

	useEffect(() => {
		if (
			typeof window === "undefined" ||
			typeof window.matchMedia !== "function"
		) {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const updatePreference = () => setSystemPrefersDark(mediaQuery.matches);

		updatePreference();

		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", updatePreference);
			return () => mediaQuery.removeEventListener("change", updatePreference);
		}

		mediaQuery.addListener(updatePreference);
		return () => mediaQuery.removeListener(updatePreference);
	}, []);

	return systemPrefersDark;
}
