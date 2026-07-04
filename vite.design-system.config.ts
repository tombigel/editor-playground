import path from "node:path";
import { defineConfig } from "vitest/config";
import type { OutputAsset, Plugin } from "rollup";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const DS_CARDS: Record<string, string> = {
	"logo-assets": "Logo Assets",
	tokens: "Design Tokens",
	base: "Base Components",
	composite: "Composites",
	panels: "Panels",
};

function dsCardHeaderPlugin(): Plugin {
	return {
		name: "ds-card-headers",
		apply: "build" as const,
		generateBundle(_opts, bundle) {
			for (const [fileName, chunk] of Object.entries(bundle)) {
				if (chunk.type === "asset" && fileName.endsWith(".html")) {
					const key = path.basename(fileName, ".html");
					const group = DS_CARDS[key];
					if (group) {
						(chunk as OutputAsset).source = `<!-- @dsCard group="${group}" -->\n${chunk.source as string}`;
					}
				}
			}
		},
	};
}

export default defineConfig({
	root: "src/design-system/preview-entries",
	plugins: [react(), tailwindcss(), dsCardHeaderPlugin()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	base: "./",
	build: {
		outDir: path.resolve(__dirname, "dist-ds"),
		emptyOutDir: true,
		target: "es2022",
		sourcemap: false,
		rollupOptions: {
			input: {
				"logo-assets": "./logo-assets.html",
				tokens: "./tokens.html",
				base: "./base.html",
				composite: "./composite.html",
				panels: "./panels.html",
			},
			output: {
				chunkFileNames: "assets/[name]-[hash].js",
				assetFileNames: "assets/[name]-[hash][extname]",
				entryFileNames: "assets/[name]-[hash].js",
			},
		},
	},
});
