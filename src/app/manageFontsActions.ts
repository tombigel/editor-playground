import { MANAGE_FONTS_INITIAL_CATEGORY_STORAGE_KEY } from "../panels/fontManagement/ManageFontsPanel";

export type OpenManageFontsOptions = {
	category?: string;
};

export function openManageFontsWithOptions(
	onOpenChange: (open: boolean) => void,
	options?: OpenManageFontsOptions,
) {
	if (options?.category && typeof window !== "undefined") {
		window.sessionStorage.setItem(
			MANAGE_FONTS_INITIAL_CATEGORY_STORAGE_KEY,
			options.category,
		);
	}
	onOpenChange(true);
}
