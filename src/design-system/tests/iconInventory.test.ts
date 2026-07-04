import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceRoot = join(repoRoot, "src");
const iconCatalogPath = join(
	sourceRoot,
	"design-system/sections/DesignTokensSection.tsx",
);

function collectSourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			return collectSourceFiles(entryPath);
		}

		return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
	});
}

function isProductSourceFile(filePath: string) {
	const relativePath = relative(sourceRoot, filePath);

	return (
		filePath !== iconCatalogPath &&
		!/(^|\/)tests?\//.test(relativePath) &&
		!/\.(test|e2e)\.(ts|tsx)$/.test(relativePath)
	);
}

function collectImportedLucideIcons() {
	const importedIcons = new Set<string>();

	for (const filePath of collectSourceFiles(sourceRoot).filter(
		isProductSourceFile,
	)) {
		const sourceFile = ts.createSourceFile(
			filePath,
			readFileSync(filePath, "utf8"),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);

		for (const statement of sourceFile.statements) {
			if (
				!ts.isImportDeclaration(statement) ||
				!ts.isStringLiteral(statement.moduleSpecifier) ||
				statement.moduleSpecifier.text !== "lucide-react"
			) {
				continue;
			}

			const namedBindings = statement.importClause?.namedBindings;

			if (!namedBindings || !ts.isNamedImports(namedBindings)) {
				continue;
			}

			for (const element of namedBindings.elements) {
				if (element.isTypeOnly) {
					continue;
				}

				const importedName = element.propertyName?.text ?? element.name.text;

				if (importedName !== "LucideIcon") {
					importedIcons.add(importedName);
				}
			}
		}
	}

	return [...importedIcons].sort();
}

function collectCatalogedLucideIcons() {
	const catalogSource = readFileSync(iconCatalogPath, "utf8");
	const catalogedIcons = new Set<string>();
	const iconEntryPattern = /\{ name: "[^"]+", icon: ([A-Za-z0-9_]+) \}/g;

	for (const match of catalogSource.matchAll(iconEntryPattern)) {
		catalogedIcons.add(match[1] ?? "");
	}

	return [...catalogedIcons].filter(Boolean).sort();
}

describe("design-system/icon inventory", () => {
	it("catalogs every lucide icon imported by product UI source", () => {
		expect(collectCatalogedLucideIcons()).toEqual(collectImportedLucideIcons());
	});
});
