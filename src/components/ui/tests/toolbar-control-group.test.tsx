import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	ToolbarControlGroup,
	ToolbarControlRow,
} from "../toolbar-control-group";

describe("ToolbarControlGroup", () => {
	it("groups toolbar controls with optional token-backed dividers", () => {
		const markup = renderToStaticMarkup(
			<ToolbarControlRow>
				<ToolbarControlGroup>
					<button type="button">A</button>
				</ToolbarControlGroup>
				<ToolbarControlGroup withDividerBefore>
					<button type="button">B</button>
				</ToolbarControlGroup>
			</ToolbarControlRow>,
		);

		expect(markup).toContain('data-ui="toolbar-control-row"');
		expect(markup).toContain('data-ui="toolbar-control-group"');
		expect(markup).toContain('data-divider-before="true"');
		expect(markup).toContain('data-ui="toolbar-control-divider"');
		expect(markup).toContain('aria-hidden="true"');
		expect(markup).toContain("editor-border-subtle");
	});
});
