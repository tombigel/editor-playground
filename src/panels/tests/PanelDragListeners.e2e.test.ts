import { chromium, type Browser, type Page } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
	startViteE2EServer,
	type StartedServer,
} from "../../stage/tests/e2eServer";

type PointerListenerCounts = {
	adds: Record<string, number>;
	removes: Record<string, number>;
};

describe("panel drag listener e2e", () => {
	let server: StartedServer;
	let browser: Browser;
	let page: Page | null = null;

	beforeAll(async () => {
		server = await startViteE2EServer();
		browser = await chromium.launch({ headless: true });
	}, 30_000);

	afterEach(async () => {
		await page?.close();
		page = null;
	});

	afterAll(async () => {
		await browser?.close();
		await server?.close();
	});

	async function newCleanPage() {
		const nextPage = await browser.newPage({
			viewport: { width: 1440, height: 1100 },
		});
		await nextPage.addInitScript(() => {
			window.localStorage.clear();
			window.sessionStorage.clear();
		});
		await nextPage.goto(`${server.url}/#/edit`, { waitUntil: "domcontentloaded" });
		await nextPage
			.getByRole("toolbar", { name: "Editor toolbar" })
			.waitFor({ state: "visible" });
		await nextPage.locator(".stage-shell").waitFor({ state: "visible" });
		page = nextPage;
		return nextPage;
	}

	async function installPointerListenerProbe(targetPage: Page) {
		await targetPage.evaluate(() => {
			const listenerTypes = new Set(["pointermove", "pointerup", "pointercancel"]);
			const originalAdd = window.addEventListener.bind(window);
			const originalRemove = window.removeEventListener.bind(window);
			const counts = {
				adds: { pointermove: 0, pointerup: 0, pointercancel: 0 },
				removes: { pointermove: 0, pointerup: 0, pointercancel: 0 },
			};

			window.addEventListener = ((type, listener, options) => {
				if (listenerTypes.has(String(type))) {
					counts.adds[String(type) as keyof typeof counts.adds] += 1;
				}
				return originalAdd(type, listener, options);
			}) as typeof window.addEventListener;

			window.removeEventListener = ((type, listener, options) => {
				if (listenerTypes.has(String(type))) {
					counts.removes[String(type) as keyof typeof counts.removes] += 1;
				}
				return originalRemove(type, listener, options);
			}) as typeof window.removeEventListener;

			(
				window as typeof window & {
					__panelPointerListenerProbe?: () => PointerListenerCounts;
				}
			).__panelPointerListenerProbe = () => structuredClone(counts);
		});
	}

	async function readPointerListenerCounts(targetPage: Page) {
		return await targetPage.evaluate(() => {
			const probe = (
				window as typeof window & {
					__panelPointerListenerProbe?: () => PointerListenerCounts;
				}
			).__panelPointerListenerProbe;
			if (!probe) {
				throw new Error("Expected panel pointer listener probe to be installed");
			}
			return probe();
		});
	}

	async function dragWithMoveSamples(targetPage: Page, selector: string) {
		const rows = targetPage.locator(selector);
		await expect.poll(() => rows.count()).toBeGreaterThan(1);

		const sourceBox = await rows
			.first()
			.locator(".editor-layers-row-main")
			.boundingBox();
		const targetBox = await rows
			.nth(1)
			.locator(".editor-layers-row-main")
			.boundingBox();
		if (!sourceBox || !targetBox) {
			throw new Error("Expected panel rows to be measurable");
		}

		const startX = sourceBox.x + Math.min(48, sourceBox.width / 2);
		const startY = sourceBox.y + sourceBox.height / 2;
		const endX = targetBox.x + Math.min(48, targetBox.width / 2);
		const endY = targetBox.y + targetBox.height / 2;

		await targetPage.mouse.move(startX, startY);
		await targetPage.mouse.down();
		await targetPage.waitForTimeout(50);
		const afterStart = await readPointerListenerCounts(targetPage);

		for (let index = 1; index <= 12; index += 1) {
			const progress = index / 12;
			await targetPage.mouse.move(
				startX + (endX - startX) * progress,
				startY + (endY - startY) * progress,
			);
			await targetPage.waitForTimeout(16);
		}
		const afterMoves = await readPointerListenerCounts(targetPage);

		await targetPage.mouse.up();
		await targetPage.waitForTimeout(50);
		const afterEnd = await readPointerListenerCounts(targetPage);

		return { afterStart, afterMoves, afterEnd };
	}

	function expectNoPointerListenerChurn({
		afterStart,
		afterMoves,
		afterEnd,
	}: {
		afterStart: PointerListenerCounts;
		afterMoves: PointerListenerCounts;
		afterEnd: PointerListenerCounts;
	}) {
		expect(afterStart.adds.pointermove).toBe(1);
		expect(afterStart.adds.pointercancel).toBe(1);
		expect(afterStart.adds.pointerup).toBeGreaterThanOrEqual(1);
		expect(afterStart.removes).toEqual({
			pointermove: 0,
			pointerup: 0,
			pointercancel: 0,
		});
		expect(afterMoves).toEqual(afterStart);
		expect(afterEnd.adds).toEqual(afterStart.adds);
		expect(afterEnd.removes.pointermove).toBe(1);
		expect(afterEnd.removes.pointercancel).toBe(1);
		expect(afterEnd.removes.pointerup).toBeGreaterThanOrEqual(1);
		expect(afterEnd.removes.pointerup).toBeLessThanOrEqual(
			afterStart.adds.pointerup,
		);
	}

	it("keeps Components tree drag listeners stable across pointer moves", async () => {
		const targetPage = await newCleanPage();
		await targetPage.keyboard.press("Shift+L");
		await targetPage.locator(".editor-layers-panel").waitFor({ state: "visible" });
		await installPointerListenerProbe(targetPage);

		expectNoPointerListenerChurn(
			await dragWithMoveSamples(targetPage, "[data-layers-row-id]"),
		);
	}, 30_000);

	it("keeps Pages tree drag listeners stable across pointer moves", async () => {
		const targetPage = await newCleanPage();
		await targetPage.keyboard.press("Shift+O");
		await targetPage
			.locator(".editor-pages-panel")
			.waitFor({ state: "visible" });
		await targetPage.getByRole("button", { name: "Add page" }).click();
		await expect
			.poll(() => targetPage.locator("[data-page-row-id]").count())
			.toBeGreaterThan(1);
		await installPointerListenerProbe(targetPage);

		expectNoPointerListenerChurn(
			await dragWithMoveSamples(targetPage, "[data-page-row-id]"),
		);
	}, 30_000);
});
