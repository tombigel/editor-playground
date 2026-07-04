import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../button";

describe("components/ui/button", () => {
	it("uses the shared 28px compact control contract", () => {
		const defaultMarkup = renderToStaticMarkup(<Button>Save</Button>);
		const smallMarkup = renderToStaticMarkup(<Button size="sm">Save</Button>);
		const iconMarkup = renderToStaticMarkup(
			<Button size="icon" aria-label="Save">
				S
			</Button>,
		);

		expect(defaultMarkup).toContain('data-size="default"');
		expect(smallMarkup).toContain('data-size="sm"');
		expect(iconMarkup).toContain('data-size="icon"');
	});

	it("renders a token-backed keyboard focus outline", () => {
		const markup = renderToStaticMarkup(<Button>Save</Button>);

		expect(markup).toContain("var(--editor-focus-ring-strong)");
	});
});
