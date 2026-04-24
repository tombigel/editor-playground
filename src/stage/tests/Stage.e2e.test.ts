import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import {
	STORAGE_KEY,
	DEFAULT_DOCUMENT_STORAGE_KEY,
} from "../../editor/editorStore";
import {
	createDefaultRect,
	createContainerNode,
	createLinkTextNode,
	createMediaNode,
	createTextNode,
} from "../../model/defaultFactories";
import {
	createTextDocumentContent,
	createTextDocumentFromCode,
} from "../../model/richContent";
import type { DocumentModel, RichContent, TextNode } from "../../model/types";
import { DEFAULT_SNAP_SETTINGS } from "../../editor/types";
import { startViteE2EServer, type StartedServer } from "./e2eServer";

type TestDocumentIds = {
	sectionId: string;
	sourceContainerId: string;
	nestedContainerId: string;
	targetContainerId: string;
	reparentLeafId: string;
	siblingLeafId: string;
	otherContainerLeafId: string;
	axisLeafId: string;
	snapLeafId: string;
};

describe("stage/Stage e2e", () => {
	let server: StartedServer;
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		server = await startViteE2EServer();
		browser = await chromium.launch({ headless: true });
	}, 30_000);

	afterAll(async () => {
		await browser?.close();
		await server?.close();
	});

	async function openEditor(options?: {
		document?: DocumentModel;
		snapEnabled?: boolean;
		selectedId?: string | null;
		selectedIds?: string[];
	}) {
		page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
		page.setDefaultTimeout(5_000);
		page.setDefaultNavigationTimeout(10_000);
		const snapSettings =
			options?.snapEnabled === false
				? {
						...DEFAULT_SNAP_SETTINGS,
						guideSnap: { ...DEFAULT_SNAP_SETTINGS.guideSnap, enabled: false },
					}
				: DEFAULT_SNAP_SETTINGS;
		const state = options?.document
			? {
					document: options.document,
					selectedId: options.selectedId ?? null,
					selectedIds:
						options.selectedIds ??
						(options.selectedId ? [options.selectedId] : []),
					pendingRoleSwap: null,
					ui: {
						showHidden: true,
						previewSticky: true,
						spacerVisibility: "selected",
						showGridLanes: false,
						snapSettings,
						themeMode: "auto",
					},
				}
			: null;

		if (state) {
			await page.addInitScript(
				({ storageKey, defaultKey, seededState, seededDocument }) => {
					window.localStorage.clear();
					window.localStorage.setItem(storageKey, JSON.stringify(seededState));
					window.localStorage.setItem(
						defaultKey,
						JSON.stringify(seededDocument),
					);
				},
				{
					storageKey: STORAGE_KEY,
					defaultKey: DEFAULT_DOCUMENT_STORAGE_KEY,
					seededState: state,
					seededDocument: state.document,
				},
			);
		}

		await page.goto(server.url);
		try {
			await page.waitForSelector(".stage-shell", { timeout: 5_000 });
		} catch {
			await page.reload();
			await page.waitForSelector(".stage-shell", { timeout: 10_000 });
		}
	}

	async function closeEditor() {
		await page.close();
	}

	async function expectSingleSelectionOverlayToMatchNode(nodeId: string) {
		const nodeBox = await page.locator(`#stage-node-${nodeId}`).boundingBox();
		const overlayBox = await page
			.locator(".stage-single-selection-overlay")
			.first()
			.boundingBox();
		expect(nodeBox).not.toBeNull();
		expect(overlayBox).not.toBeNull();

		expect(Math.abs((overlayBox?.x ?? 0) - ((nodeBox?.x ?? 0) - 2))).toBeLessThan(
			1,
		);
		expect(Math.abs((overlayBox?.y ?? 0) - ((nodeBox?.y ?? 0) - 2))).toBeLessThan(
			1,
		);
		expect(
			Math.abs((overlayBox?.width ?? 0) - ((nodeBox?.width ?? 0) + 4)),
		).toBeLessThan(1);
		expect(
			Math.abs((overlayBox?.height ?? 0) - ((nodeBox?.height ?? 0) + 4)),
		).toBeLessThan(1);
	}

	async function dragLocatorToPoint(
		locatorSelector: string,
		targetX: number,
		targetY: number,
		options?: { shiftKey?: boolean; altKey?: boolean },
	) {
		const locator = page.locator(locatorSelector).first();
		const box = await locator.boundingBox();
		expect(box).not.toBeNull();

		const modifiers: Array<"Shift" | "Alt"> = [];
		if (options?.shiftKey) {
			modifiers.push("Shift");
		}
		if (options?.altKey) {
			modifiers.push("Alt");
		}

		for (const modifier of modifiers) {
			await page.keyboard.down(modifier);
		}

		try {
			await page.mouse.move(box?.x + box?.width / 2, box?.y + box?.height / 2);
			await page.mouse.down();
			await page.mouse.move(targetX, targetY, { steps: 14 });
			await page.mouse.up();
		} finally {
			for (const modifier of modifiers.reverse()) {
				await page.keyboard.up(modifier);
			}
		}
	}

	async function readPersistedState() {
		return page.evaluate(
			(storageKey) =>
				JSON.parse(window.localStorage.getItem(storageKey) ?? "null"),
			STORAGE_KEY,
		);
	}

	async function readPersistedTextNode(nodeId: string): Promise<TextNode> {
		const persistedState = await readPersistedState();
		return persistedState.document.nodes[nodeId] as TextNode;
	}

	function expectStandaloneBlockNode(node: TextNode) {
		expect(node.contentType).toBe("text");
		expect(node.subtype).toBe("block");
		expect(node.content.blocks).toHaveLength(1);
	}

	function expectStandaloneListNode(node: TextNode) {
		expect(node.contentType).toBe("text");
		expect(node.subtype).toBe("list");
		expect(node.content.blocks).toHaveLength(1);
		expect(node.content.blocks[0].type === "ul" || node.content.blocks[0].type === "ol").toBe(true);
	}

	async function enterRichEditMode(nodeId: string) {
		const richLeaf = page.locator(`#stage-node-${nodeId}`).first();
		await richLeaf.waitFor({ state: "attached", timeout: 10_000 });
		await richLeaf.scrollIntoViewIfNeeded();
		await richLeaf.click();
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			timeout: 2_000,
		});
		return {
			richLeaf,
			editable: page
				.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
				.first(),
		};
	}

	async function selectRichTextRange(
		startNodeIndex: number,
		startOffset: number,
		endNodeIndex: number,
		endOffset: number,
	) {
		await page
			.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
			.first()
			.click();
		await page.evaluate(
			({ startNodeIndex, startOffset, endNodeIndex, endOffset }) => {
				const editable = window.document.querySelector<HTMLElement>(
					'[data-stage-rich-edit-box="true"] [contenteditable="true"]',
				);
				if (!editable) {
					throw new Error("Expected editable rich text element");
				}

				const textNodes: Text[] = [];
				const walker = window.document.createTreeWalker(
					editable,
					NodeFilter.SHOW_TEXT,
					{
						acceptNode(node) {
							return node.textContent && node.textContent.length > 0
								? NodeFilter.FILTER_ACCEPT
								: NodeFilter.FILTER_REJECT;
						},
					},
				);

				let currentNode = walker.nextNode();
				while (currentNode) {
					textNodes.push(currentNode as Text);
					currentNode = walker.nextNode();
				}

				const startNode = textNodes[startNodeIndex];
				const endNode = textNodes[endNodeIndex];
				if (!startNode || !endNode) {
					throw new Error(
						`Expected text nodes ${startNodeIndex} and ${endNodeIndex}`,
					);
				}

				editable.focus();
				const selection = window.getSelection();
				if (!selection) {
					throw new Error("Expected browser selection");
				}

				const range = window.document.createRange();
				range.setStart(
					startNode,
					Math.min(startOffset, startNode.textContent?.length ?? 0),
				);
				range.setEnd(
					endNode,
					Math.min(endOffset, endNode.textContent?.length ?? 0),
				);
				selection.removeAllRanges();
				selection.addRange(range);
			},
			{ startNodeIndex, startOffset, endNodeIndex, endOffset },
		);
		await page.waitForTimeout(100);
	}

	async function placeRichCaretAtEnd() {
		await page
			.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
			.first()
			.click();
		await page.evaluate(() => {
			const editable = window.document.querySelector<HTMLElement>(
				'[data-stage-rich-edit-box="true"] [contenteditable="true"]',
			);
			if (!editable) {
				throw new Error("Expected editable rich text element");
			}

			const textNodes: Text[] = [];
			const walker = window.document.createTreeWalker(
				editable,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode(node) {
						return node.textContent && node.textContent.length > 0
							? NodeFilter.FILTER_ACCEPT
							: NodeFilter.FILTER_REJECT;
					},
				},
			);

			let currentNode = walker.nextNode();
			while (currentNode) {
				textNodes.push(currentNode as Text);
				currentNode = walker.nextNode();
			}

			const endNode = textNodes.at(-1);
			if (!endNode) {
				throw new Error("Expected rich text content");
			}

			editable.focus();
			const selection = window.getSelection();
			if (!selection) {
				throw new Error("Expected browser selection");
			}

			const range = window.document.createRange();
			range.setStart(endNode, endNode.textContent?.length ?? 0);
			range.collapse(true);
			selection.removeAllRanges();
			selection.addRange(range);
		});
		await page.waitForTimeout(100);
	}

	async function saveRichEdit() {
		await page
			.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
			.first()
			.click();
		await page.keyboard.press("ControlOrMeta+Enter");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});
	}

	async function enterBlockEditMode(nodeId: string) {
		const blockLeaf = page.locator(`#stage-node-${nodeId}`).first();
		await blockLeaf.waitFor({ state: "attached", timeout: 10_000 });
		await blockLeaf.scrollIntoViewIfNeeded();
		await blockLeaf.click();
		await blockLeaf.click();
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			timeout: 2_000,
		});
		return {
			blockLeaf,
			editable: page
				.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
				.first(),
		};
	}

	async function enterListEditMode(nodeId: string) {
		const listLeaf = page.locator(`#stage-node-${nodeId}`).first();
		await listLeaf.waitFor({ state: "attached", timeout: 10_000 });
		await listLeaf.scrollIntoViewIfNeeded();
		await listLeaf.click();
		await listLeaf.click();
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			timeout: 2_000,
		});
		return {
			listLeaf,
			editable: page
				.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
				.first(),
		};
	}

	async function enterCodeEditMode(nodeId: string) {
		const codeLeaf = page.locator(`#stage-node-${nodeId}`).first();
		await codeLeaf.waitFor({ state: "attached", timeout: 10_000 });
		await codeLeaf.scrollIntoViewIfNeeded();
		await codeLeaf.click();
		await codeLeaf.click();
		await page.waitForSelector('[data-stage-code-toolbar="true"]', {
			timeout: 2_000,
		});
		return {
			codeLeaf,
			textarea: page.locator('[data-stage-code-edit-textarea="true"]').first(),
		};
	}

	async function replaceBlockEditText(text: string) {
		const editable = page
			.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
			.first();
		await editable.click();
		await page.keyboard.press("ControlOrMeta+A");
		await page.keyboard.type(text);
	}

	async function saveBlockEdit() {
		await page
			.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
			.first()
			.click();
		await page.keyboard.press("ControlOrMeta+Enter");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});
	}

	async function saveListEdit() {
		await page
			.locator('[data-stage-rich-edit-box="true"] [contenteditable="true"]')
			.first()
			.click();
		await page.keyboard.press("ControlOrMeta+Enter");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});
	}

	async function saveCodeEdit() {
		await page.locator('[data-stage-code-edit-textarea="true"]').first().click();
		await page.keyboard.press("ControlOrMeta+Enter");
		await page.waitForSelector('[data-stage-code-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});
	}

	async function chooseOpenSelectItem(label: string) {
		await page.evaluate((itemLabel) => {
			const items = Array.from(
				window.document.querySelectorAll<HTMLElement>(
					'[data-ui="select-item"]',
				),
			);
			const target = items.find(
				(item) => item.textContent?.trim() === itemLabel,
			);
			if (!target) {
				throw new Error(`Expected select item ${itemLabel}`);
			}
			target.click();
		}, label);
		await page.waitForTimeout(100);
	}

	it("selects and drags a stage text node", async () => {
		await openEditor();
		const title = page
			.locator(".stage-leaf", {
				hasText:
					"Plan sticky behavior before building scroll-driven animations",
			})
			.first();

		const before = await title.boundingBox();
		expect(before).not.toBeNull();

		await title.click();
		expect(await title.getAttribute("class")).toMatch(/\bselected\b/);

		await page.mouse.move(
			before?.x + before?.width / 2,
			before?.y + before?.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(
			before?.x + before?.width / 2 + 120,
			before?.y + before?.height / 2 + 80,
			{ steps: 10 },
		);
		await page.mouse.up();

		const after = await title.boundingBox();
		expect(after).not.toBeNull();
		expect(Math.abs((after?.x ?? 0) - before?.x)).toBeGreaterThan(20);
		expect(Math.abs((after?.y ?? 0) - before?.y)).toBeGreaterThan(20);

		await closeEditor();
	}, 30_000);

	it("collapses a multi-selection back to a single node on a plain second click and shows the group outline only while grouped", async () => {
		await openEditor();
		const title = page
			.locator(".stage-leaf", {
				hasText:
					"Plan sticky behavior before building scroll-driven animations",
			})
			.first();
		const image = page.locator(".stage-leaf.subtype-image").first();

		await title.click();
		await image.click({ modifiers: ["Shift"] });

		expect(await title.getAttribute("class")).toMatch(/\bselected\b/);
		expect(await image.getAttribute("class")).toMatch(/\bselected\b/);
		expect(await title.getAttribute("class")).not.toMatch(
			/\bselected-primary\b/,
		);
		expect(await image.getAttribute("class")).not.toMatch(
			/\bselected-primary\b/,
		);

		const groupOutline = page.locator(".stage-multi-selection-outline");
		expect(await groupOutline.count()).toBe(1);
		const groupBox = await groupOutline.boundingBox();
		expect(groupBox).not.toBeNull();
		expect(groupBox?.width ?? 0).toBeGreaterThan(0);
		expect(groupBox?.height ?? 0).toBeGreaterThan(0);

		await title.click();

		expect(await title.getAttribute("class")).toMatch(/\bselected\b/);
		expect(await title.getAttribute("class")).toMatch(/\bselected-primary\b/);
		expect(await image.getAttribute("class")).not.toMatch(/\bselected\b/);
		expect(await groupOutline.count()).toBe(0);

		await closeEditor();
	}, 30_000);

	it("keeps the single-selection overlay aligned when selected layout shifts without a new selection event", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await page.waitForSelector(".stage-single-selection-overlay", {
			timeout: 2_000,
		});
		await expectSingleSelectionOverlayToMatchNode(richTextId);

		await page.evaluate((nodeId) => {
			const node = window.document.getElementById(`stage-node-${nodeId}`);
			if (!node) {
				throw new Error(`Expected stage node ${nodeId}`);
			}
			node.style.transform = "translateY(18px)";
		}, richTextId);
		await page.waitForTimeout(150);

		await expectSingleSelectionOverlayToMatchNode(richTextId);

		await closeEditor();
	}, 30_000);

	it("resizes a selected image node from the south-east handle", async () => {
		await openEditor();
		const image = page.locator(".stage-leaf.subtype-image").first();

		await image.click();
		expect(await image.getAttribute("class")).toMatch(/\bselected\b/);

		const before = await image.boundingBox();
		expect(before).not.toBeNull();

		const handle = page.locator(".resize-handle.handle-se").first();
		const handleBox = await handle.boundingBox();
		expect(handleBox).not.toBeNull();

		await page.mouse.move(
			handleBox?.x + handleBox?.width / 2,
			handleBox?.y + handleBox?.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(
			handleBox?.x + handleBox?.width / 2 + 80,
			handleBox?.y + handleBox?.height / 2 + 60,
			{
				steps: 10,
			},
		);
		await page.mouse.up();

		const after = await image.boundingBox();
		expect(after).not.toBeNull();
		expect((after?.width ?? 0) - before?.width).toBeGreaterThan(40);
		expect((after?.height ?? 0) - before?.height).toBeGreaterThan(20);

		await closeEditor();
	}, 30_000);

	it("preserves image aspect ratio when resizing from a corner with Shift", async () => {
		await openEditor();
		const image = page.locator(".stage-leaf.subtype-image").first();

		await image.click();
		const before = await image.boundingBox();
		expect(before).not.toBeNull();

		const handle = page.locator(".resize-handle.handle-se").first();
		const handleBox = await handle.boundingBox();
		expect(handleBox).not.toBeNull();

		await page.keyboard.down("Shift");
		try {
			await page.mouse.move(
				handleBox?.x + handleBox?.width / 2,
				handleBox?.y + handleBox?.height / 2,
			);
			await page.mouse.down();
			await page.mouse.move(
				handleBox?.x + handleBox?.width / 2 + 90,
				handleBox?.y + handleBox?.height / 2 + 30,
				{
					steps: 12,
				},
			);
			await page.mouse.up();
		} finally {
			await page.keyboard.up("Shift");
		}

		const after = await image.boundingBox();
		expect(after).not.toBeNull();
		const beforeRatio = before?.width / before?.height;
		const afterRatio = (after?.width ?? 1) / Math.max(after?.height ?? 1, 1);
		expect(Math.abs(afterRatio - beforeRatio)).toBeLessThan(0.05);

		await closeEditor();
	}, 30_000);

	it("keeps rich edit mode active when the floating toolbar is clicked", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		await editable.click();
		await page.keyboard.press("ControlOrMeta+A");

		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		await toolbar.getByRole("button", { name: "Bold" }).click();

		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);
		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{ type: "paragraph", children: [{ text: "Edit me on stage" }] },
		]);

		await closeEditor();
	}, 30_000);

	it("allows mouse text selection inside the rich text edit box", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		const editableBox = await editable.boundingBox();
		expect(editableBox).not.toBeNull();

		await page.mouse.move(
			(editableBox?.x ?? 0) + 24,
			(editableBox?.y ?? 0) + 20,
		);
		await page.mouse.down();
		await page.mouse.move(
			(editableBox?.x ?? 0) + 160,
			(editableBox?.y ?? 0) + 20,
			{ steps: 10 },
		);
		await page.mouse.up();

		const selectedText = await page.evaluate(
			() => window.getSelection()?.toString() ?? "",
		);
		expect(selectedText.length).toBeGreaterThan(0);

		await closeEditor();
	}, 30_000);

	it("drags the rich toolbar and remembers its position for the current browser session", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		const before = await toolbar.boundingBox();
		const handleBox = await page.evaluate(() => {
			const handle = window.document.querySelector(
				'[data-stage-rich-toolbar-drag-handle="true"]',
			);
			if (!(handle instanceof HTMLElement)) {
				return null;
			}
			const rect = handle.getBoundingClientRect();
			return {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: rect.height,
			};
		});
		expect(before).not.toBeNull();
		expect(handleBox).not.toBeNull();

		const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
		const startY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
		await page.mouse.move(startX, startY);
		await page.mouse.down();
		await page.mouse.move(startX + 140, startY + 72, { steps: 14 });
		await page.mouse.up();

		await page.waitForFunction(
			({ beforeX, beforeY }) => {
				const toolbarEl = window.document.querySelector(
					'[data-stage-rich-toolbar="true"]',
				);
				if (!(toolbarEl instanceof HTMLElement)) {
					return false;
				}
				const rect = toolbarEl.getBoundingClientRect();
				return (
					Math.abs(rect.left - beforeX) > 80 &&
					Math.abs(rect.top - beforeY) > 40
				);
			},
			{ beforeX: before?.x ?? 0, beforeY: before?.y ?? 0 },
		);

		const after = await toolbar.boundingBox();
		expect(after).not.toBeNull();

		await page.keyboard.press("Escape");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		await enterRichEditMode(richTextId);
		const remembered = await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.boundingBox();
		expect(remembered).not.toBeNull();
		expect(Math.abs((remembered?.x ?? 0) - (after?.x ?? 0))).toBeLessThan(4);
		expect(Math.abs((remembered?.y ?? 0) - (after?.y ?? 0))).toBeLessThan(4);

		await closeEditor();
	}, 30_000);

	it("commits rich text changes on outside click", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await placeRichCaretAtEnd();
		await page.keyboard.type(" updated");
		await page.mouse.click(16, 16);
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{ type: "paragraph", children: [{ text: "Edit me on stage updated" }] },
		]);

		await closeEditor();
	}, 30_000);

	it("discards rich text changes on Escape", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await placeRichCaretAtEnd();
		await page.keyboard.type(" updated");
		await page.keyboard.press("Escape");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{ type: "paragraph", children: [{ text: "Edit me on stage" }] },
		]);

		await closeEditor();
	}, 30_000);

	it("applies anchor links through the shared link picker and preserves edit mode while the popover is open", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		await editable.click();
		await page.keyboard.press("ControlOrMeta+A");

		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		await toolbar.getByRole("button", { name: "Link" }).click();
		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);
		await page
			.locator('[data-stage-rich-link-popover="true"]')
			.getByText("Type", { exact: true })
			.waitFor();

		await page.getByRole("button", { name: "Internal" }).click();
		await page.keyboard.press("Escape");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		const paragraph =
			persistedState.document.nodes[richTextId].content.blocks[0];
		expect(paragraph.type).toBe("paragraph");
		const anchorLink = paragraph.children.find(
			(child: { type?: string; linkType?: string }) =>
				child.type === "link" && child.linkType === "anchor",
		);
		expect(anchorLink).toMatchObject({
			type: "link",
			linkType: "anchor",
		});
		expect(anchorLink.anchorTargetId).toBeTruthy();
		expect(anchorLink.href).toMatch(/^#/);
		expect(anchorLink.children).toEqual([{ text: "Edit me on stage" }]);

		await closeEditor();
	}, 30_000);

	it("preserves a partial inline selection when link-popover dropdowns are used", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[{ type: "paragraph", children: [{ text: "text one two three" }] }],
			{ name: "Partial Link Selection" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 9, 0, 12);

		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		await toolbar.getByRole("button", { name: "Link" }).click();
		await page.getByRole("button", { name: "Internal" }).click();
		await page.keyboard.press("Escape");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		const paragraph =
			persistedState.document.nodes[richTextId].content.blocks[0];
		expect(paragraph.type).toBe("paragraph");
		expect(paragraph.children[0]).toEqual({ text: "text one " });
		expect(paragraph.children[2]).toEqual({ text: " three" });
		expect(paragraph.children[1]).toMatchObject({
			type: "link",
			linkType: "anchor",
			children: [{ text: "two" }],
		});
		expect(paragraph.children[1].anchorTargetId).toBeTruthy();
		expect(paragraph.children[1].href).toMatch(/^#/);

		await closeEditor();
	}, 30_000);

	it("keeps a visible retained highlight when focus moves into the toolbar", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[{ type: "paragraph", children: [{ text: "text one two three" }] }],
			{ name: "Retained Toolbar Highlight" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 9, 0, 12);

		await page.locator('[aria-label="Line height"]').click();
		await page.waitForSelector('[data-retained-selection="true"]', {
			timeout: 2_000,
		});

		const retainedHighlight = await page.evaluate(() => {
			const node = window.document.querySelector<HTMLElement>(
				'[data-retained-selection="true"]',
			);
			if (!node) {
				return null;
			}
			const style = window.getComputedStyle(node);
			return {
				text: node.textContent ?? "",
				backgroundColor: style.backgroundColor,
			};
		});
		expect(retainedHighlight).not.toBeNull();
		expect(retainedHighlight?.text).toContain("two");
		expect(retainedHighlight?.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		await closeEditor();
	}, 30_000);

	it("shows structure-specific toolbar dropdowns only for the active mode", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		await editable.click();
		await page.keyboard.press("ControlOrMeta+A");

		expect(await page.locator('[aria-label="Block type"]').count()).toBe(1);
		expect(await page.locator('[aria-label="Ordered list marker"]').count()).toBe(
			0,
		);
		expect(
			await page.locator('[aria-label="Unordered list marker"]').count(),
		).toBe(0);
		expect(await page.locator('[aria-label="Code language"]').count()).toBe(0);

		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		await toolbar.getByRole("button", { name: "Use ordered list" }).click();
		expect(await page.locator('[aria-label="Block type"]').count()).toBe(0);
		expect(await page.locator('[aria-label="Ordered list marker"]').count()).toBe(
			1,
		);

		await toolbar.getByRole("button", { name: "Use unordered list" }).click();
		expect(await page.locator('[aria-label="Ordered list marker"]').count()).toBe(
			0,
		);
		expect(
			await page.locator('[aria-label="Unordered list marker"]').count(),
		).toBe(1);

		await toolbar.getByRole("button", { name: "Use code block" }).click();
		expect(
			await page.locator('[aria-label="Unordered list marker"]').count(),
		).toBe(0);
		expect(await page.locator('[aria-label="Code language"]').count()).toBe(1);
		expect(
			await toolbar.evaluate((element) => {
				const row = element.querySelectorAll(".flex.items-center.gap-1\\.5")[1];
				if (!row) {
					return [];
				}
				return Array.from(row.children)
					.map((child) =>
						(child as HTMLElement).querySelector<HTMLElement>("[aria-label]")
							?.getAttribute("aria-label"),
					)
					.filter((value): value is string => Boolean(value));
			}),
		).toSatisfy((labels: string[]) => {
			const codeIndex = labels.indexOf("Use code block");
			return codeIndex >= 0 && labels[codeIndex + 1] === "Code language";
		});

		await toolbar.getByRole("button", { name: "Use text block" }).click();
		expect(await page.locator('[aria-label="Code language"]').count()).toBe(0);
		expect(await page.locator('[aria-label="Block type"]').count()).toBe(1);

		await closeEditor();
	}, 30_000);

	it("unwinds nested rich edit layers one step at a time on outside click", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		await editable.click();
		await page.keyboard.press("ControlOrMeta+A");

		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		await toolbar.getByRole("button", { name: "Link" }).click();
		await page.waitForSelector('[data-stage-rich-link-popover="true"]', {
			timeout: 2_000,
		});
		await page.getByRole("button", { name: "Internal" }).click();
		await page.locator('[aria-label="Section target"]').click();
		await page.waitForSelector(
			'[data-ui="select-content"][data-stage-rich-select-id="section-target"]',
			{ timeout: 2_000 },
		);

		await page.mouse.click(16, 16);
		await page.waitForSelector(
			'[data-ui="select-content"][data-stage-rich-select-id="section-target"]',
			{
				state: "detached",
				timeout: 2_000,
			},
		);
		expect(
			await page.locator('[data-stage-rich-link-popover="true"]').count(),
		).toBe(1);
		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);

		await page.mouse.click(16, 16);
		await page.waitForSelector('[data-stage-rich-link-popover="true"]', {
			state: "detached",
			timeout: 2_000,
		});
		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);

		await page.mouse.click(16, 16);
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		await closeEditor();
	}, 30_000);

	it("unwinds nested rich edit layers one step at a time on Escape", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		await editable.click();
		await page.keyboard.press("ControlOrMeta+A");

		const toolbar = page.locator('[data-stage-rich-toolbar="true"]').first();
		await toolbar.getByRole("button", { name: "Link" }).click();
		await page.waitForSelector('[data-stage-rich-link-popover="true"]', {
			timeout: 2_000,
		});
		await page.getByRole("button", { name: "Internal" }).click();
		await page.locator('[aria-label="Section target"]').click();
		await page.waitForSelector(
			'[data-ui="select-content"][data-stage-rich-select-id="section-target"]',
			{ timeout: 2_000 },
		);

		await page.keyboard.press("Escape");
		await page.waitForSelector(
			'[data-ui="select-content"][data-stage-rich-select-id="section-target"]',
			{
				state: "detached",
				timeout: 2_000,
			},
		);
		expect(
			await page.locator('[data-stage-rich-link-popover="true"]').count(),
		).toBe(1);
		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);

		await page.keyboard.press("Escape");
		await page.waitForSelector('[data-stage-rich-link-popover="true"]', {
			state: "detached",
			timeout: 2_000,
		});
		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);

		await page.keyboard.press("Escape");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		await closeEditor();
	}, 30_000);

	it("converts the containing block when a partial inline selection changes block type", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[{ type: "paragraph", children: [{ text: "text one two three" }] }],
			{ name: "Partial Selection Conversion" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 9, 0, 12);
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.locator('[aria-label="Block type"]')
			.click();
		await chooseOpenSelectItem("H2");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{ type: "h2", children: [{ text: "text one two three" }] },
		]);

		await closeEditor();
	}, 30_000);

	it("preserves touched block boundaries when block type changes across a multi-block selection", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[
				{ type: "paragraph", children: [{ text: "one two" }] },
				{ type: "h2", children: [{ text: "three four" }] },
			],
			{ name: "Multi Block Conversion" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 4, 1, 5);
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.locator('[aria-label="Block type"]')
			.click();
		await chooseOpenSelectItem("H3");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{ type: "h3", children: [{ text: "one two" }] },
			{ type: "h3", children: [{ text: "three four" }] },
		]);

		await closeEditor();
	}, 30_000);

	it("treats block boundaries as hard line breaks when converting a multi-block selection to a list", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[
				{ type: "paragraph", children: [{ text: "one two" }] },
				{ type: "h2", children: [{ text: "three four" }] },
			],
			{ name: "List Conversion" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 4, 1, 5);
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.getByRole("button", { name: "Use ordered list" })
			.click();
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{
				type: "ol",
				children: [
					{ type: "list-item", children: [{ text: "one two" }] },
					{ type: "list-item", children: [{ text: "three four" }] },
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("applies ordered-list marker changes from the dropdown without losing the authored selection", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[{ type: "paragraph", children: [{ text: "one\ntwo\nthree" }] }],
			{ name: "Ordered Marker Dropdown" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 0, 0, "one\ntwo\nthree".length);
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.getByRole("button", { name: "Use ordered list" })
			.click();
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.locator('[aria-label="Ordered list marker"]')
			.click();
		await chooseOpenSelectItem("I.");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{
				type: "ol",
				markerStyle: "upper-roman",
				children: [
					{ type: "list-item", children: [{ text: "one" }] },
					{ type: "list-item", children: [{ text: "two" }] },
					{ type: "list-item", children: [{ text: "three" }] },
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("persists line height and block spacing changes from the floating toolbar", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 0, 0, "Edit me on stage".length);
		await page.getByLabel("Line height", { exact: true }).fill("1.8");
		await page.getByLabel("Block spacing", { exact: true }).fill("24");
		await page.keyboard.press("Tab");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{
				type: "paragraph",
				lineHeight: 1.8,
				children: [{ text: "Edit me on stage" }],
			},
		]);
		expect(persistedState.document.nodes[richTextId].content.blockGap).toBe(24);

		await closeEditor();
	}, 30_000);

	it("applies font size changes immediately while the toolbar input keeps focus", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 0, 0, "Edit me on stage".length);
		await page
			.locator('[data-stage-rich-value-field-id="font-size"] input')
			.fill("32");
		await expect
			.poll(async () =>
				page
					.locator('[data-stage-rich-edit-box="true"] [style*="font-size: 32px"]')
					.count(),
			)
			.toBeGreaterThan(0);
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{
				type: "paragraph",
				children: [{ text: "Edit me on stage", fontSize: "32px" }],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("unwinds font-size suggestions before closing the rich toolbar on outside click", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 0, 0, "Edit me on stage".length);
		await page.getByLabel("Font size", { exact: true }).click();
		await page.waitForSelector(".value-with-unit-suggestions", {
			timeout: 2_000,
		});

		await page.mouse.click(16, 16);
		await page.waitForSelector(".value-with-unit-suggestions", {
			state: "detached",
			timeout: 2_000,
		});
		expect(await page.locator('[data-stage-rich-toolbar="true"]').count()).toBe(
			1,
		);

		await page.mouse.click(16, 16);
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		await closeEditor();
	}, 30_000);

	it("keeps text and highlight color swatches the same size in the rich toolbar", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		const swatchRects = await page.evaluate(() => {
			function readPickerRect(label: string) {
				const host = window.document.querySelector<HTMLElement>(
					`color-input[aria-label="${label}"]`,
				);
				if (!host?.shadowRoot) {
					throw new Error(`Missing color picker host for ${label}`);
				}
				const trigger = host.shadowRoot.querySelector<HTMLElement>(".trigger");
				const chip = host.shadowRoot.querySelector<HTMLElement>(".chip");
				const hostRect = host.getBoundingClientRect();
				const triggerRect = trigger?.getBoundingClientRect();
				const chipRect = chip?.getBoundingClientRect();
				return {
					host: hostRect
						? { width: hostRect.width, height: hostRect.height }
						: null,
					trigger: triggerRect
						? { width: triggerRect.width, height: triggerRect.height }
						: null,
					chip: chipRect
						? { width: chipRect.width, height: chipRect.height }
						: null,
				};
			}
			return {
				text: readPickerRect("Text color"),
				highlight: readPickerRect("Highlight color"),
			};
		});

		expect(swatchRects.text.host).toEqual(swatchRects.highlight.host);
		expect(swatchRects.text.trigger).toEqual(swatchRects.highlight.trigger);
		expect(swatchRects.text.chip).toEqual(swatchRects.highlight.chip);

		await closeEditor();
	}, 30_000);

	it("converts touched blocks into rich code blocks and applies the selected code language", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(
			[
				{ type: "paragraph", children: [{ text: "const one = 1;" }] },
				{ type: "h2", children: [{ text: "console.log(one);" }] },
			],
			{ name: "Code Block Conversion" },
		);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, 0, 1, "console.log(one);".length);
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.getByRole("button", { name: "Use code block" })
			.click();
		await page
			.locator('[data-stage-rich-toolbar="true"]')
			.first()
			.locator('[aria-label="Code language"]')
			.click();
		await chooseOpenSelectItem("Markdown");
		await saveRichEdit();

		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{
				type: "code-block",
				language: "markdown",
				highlightedHtml: expect.any(String),
				children: [
					{ type: "code-line", children: [{ text: "const one = 1;" }] },
				],
			},
			{
				type: "code-block",
				language: "markdown",
				highlightedHtml: expect.any(String),
				children: [
					{ type: "code-line", children: [{ text: "console.log(one);" }] },
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("keeps the standalone code toolbar draggable and its language menu selectable", async () => {
		const { document, codeTextId } = createCodeTextEditE2EDocument();
		await openEditor({
			document,
			selectedId: codeTextId,
			selectedIds: [codeTextId],
		});

		const { textarea } = await enterCodeEditMode(codeTextId);
		const toolbar = page.locator('[data-stage-code-toolbar="true"]').first();
		const before = await toolbar.boundingBox();
		expect(before).not.toBeNull();

		await toolbar.locator('[aria-label="Code language"]').click();
		const languageMenu = page.locator(
			'[data-ui="select-content"][data-stage-rich-select-id="code-language"]',
		);
		await languageMenu.waitFor({ state: "visible", timeout: 2_000 });
		await languageMenu.locator('[data-ui="select-item"]', { hasText: "Markdown" }).click();
		await page.waitForFunction(() => {
			const trigger = window.document.querySelector(
				'[data-stage-code-toolbar="true"] [aria-label="Code language"]',
			);
			return trigger?.textContent?.includes("Markdown") ?? false;
		});
		expect(await toolbar.count()).toBe(1);

		await toolbar.getByRole("button", { name: "Code theme dark" }).click();
		expect(await textarea.getAttribute("data-code-theme")).toBe("dark");

		const handle = toolbar.locator('[data-stage-rich-toolbar-drag-handle="true"]');
		const handleBox = await handle.boundingBox();
		expect(handleBox).not.toBeNull();
		const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
		const startY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
		await page.mouse.move(startX, startY);
		await page.mouse.down();
		await page.waitForFunction(() => {
			const handleEl = window.document.querySelector(
				'[data-stage-code-toolbar="true"] [data-stage-rich-toolbar-drag-handle="true"]',
			);
			return handleEl?.getAttribute("data-dragging") === "true";
		});
		await page.mouse.move(startX + 128, startY + 64, { steps: 12 });
		await page.mouse.up();

		await page.waitForFunction(
			({ beforeX, beforeY }) => {
				const toolbarEl = window.document.querySelector(
					'[data-stage-code-toolbar="true"]',
				);
				if (!(toolbarEl instanceof HTMLElement)) {
					return false;
				}
				const rect = toolbarEl.getBoundingClientRect();
				return (
					Math.abs(rect.left - beforeX) > 64 &&
					Math.abs(rect.top - beforeY) > 32
				);
			},
			{ beforeX: before?.x ?? 0, beforeY: before?.y ?? 0 },
		);

		await saveCodeEdit();
		const node = await readPersistedTextNode(codeTextId);
		expect(node.subtype).toBe("code");
		expect(node.content.blocks).toHaveLength(1);
		expect(node.content.blocks[0]).toMatchObject({
			type: "code-block",
			language: "markdown",
			theme: "dark",
		});

		await closeEditor();
	}, 30_000);

	it("grows the on-stage rich editor as new blocks are added", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument(undefined, {
			height: "48px",
			name: "Auto Height Growth",
		});
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		const { editable } = await enterRichEditMode(richTextId);
		const editBox = page.locator('[data-stage-rich-edit-box="true"]').first();
		const before = await editBox.boundingBox();
		expect(before).not.toBeNull();

		await editable.click();
		await placeRichCaretAtEnd();
		await page.keyboard.press("Enter");
		await page.keyboard.type("Second line");
		await page.keyboard.press("Enter");
		await page.keyboard.type("Third line");
		await page.waitForTimeout(150);

		const after = await editBox.boundingBox();
		expect(after).not.toBeNull();
		expect((after?.height ?? 0) - (before?.height ?? 0)).toBeGreaterThan(30);

		await saveRichEdit();
		const persistedState = await readPersistedState();
		expect(persistedState.document.nodes[richTextId].content.blocks).toEqual([
			{ type: "paragraph", children: [{ text: "Edit me on stage" }] },
			{ type: "paragraph", children: [{ text: "Second line" }] },
			{ type: "paragraph", children: [{ text: "Third line" }] },
		]);

		await closeEditor();
	}, 30_000);

	it("enters standalone block edit mode on second click and commits typed changes on outside click", async () => {
		const { document, blockTextId } = createBlockTextEditE2EDocument(
			"Block edit",
		);
		await openEditor({ document });

		await enterBlockEditMode(blockTextId);
		await replaceBlockEditText("Block edit updated");
		await page.mouse.click(16, 16);
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		const node = await readPersistedTextNode(blockTextId);
		expectStandaloneBlockNode(node);
		expect(node.content.blocks[0]).toMatchObject({
			type: "paragraph",
			children: [{ text: "Block edit updated" }],
		});

		await closeEditor();
	}, 30_000);

	it("commits standalone block edits with Cmd/Ctrl+Enter and discards them with Escape", async () => {
		const first = createBlockTextEditE2EDocument("Shortcut commit");
		await openEditor({ document: first.document });

		await enterBlockEditMode(first.blockTextId);
		await replaceBlockEditText("Shortcut commit saved");
		await saveBlockEdit();

		const committedNode = await readPersistedTextNode(first.blockTextId);
		expectStandaloneBlockNode(committedNode);
		expect(committedNode.content.blocks[0]).toMatchObject({
			children: [{ text: "Shortcut commit saved" }],
		});

		await closeEditor();

		const second = createBlockTextEditE2EDocument("Escape discard");
		await openEditor({ document: second.document });

		await enterBlockEditMode(second.blockTextId);
		await replaceBlockEditText("Escape discard discarded");
		await page.keyboard.press("Escape");
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		const discardedNode = await readPersistedTextNode(second.blockTextId);
		expectStandaloneBlockNode(discardedNode);
		expect(discardedNode.content.blocks[0]).toMatchObject({
			children: [{ text: "Escape discard" }],
		});

		await closeEditor();
	}, 30_000);

	it("keeps Enter and Shift+Enter as soft breaks inside one standalone text block", async () => {
		const { document, blockTextId } = createBlockTextEditE2EDocument("First");
		await openEditor({ document });

		await enterBlockEditMode(blockTextId);
		await replaceBlockEditText("First");
		await page.keyboard.press("Enter");
		await page.keyboard.type("Second");
		await page.keyboard.press("Shift+Enter");
		await page.keyboard.type("Third");
		await saveBlockEdit();

		const node = await readPersistedTextNode(blockTextId);
		expectStandaloneBlockNode(node);
		expect(node.content.blocks[0]).toMatchObject({
			type: "paragraph",
			children: [{ text: "First\nSecond\nThird" }],
		});

		await closeEditor();
	}, 30_000);

	it("preserves standalone block inline marks, font size, text color, and highlight through commit", async () => {
		const { document, blockTextId } =
			createBlockTextEditE2EDocument("Styled block");
		(document.nodes[blockTextId] as TextNode).content = createTextDocumentContent([
			{
				type: "paragraph",
				direction: "ltr",
				children: [
					{
						text: "Styled block",
						fontWeight: 700,
						italic: true,
						underline: true,
						fontSize: "30px",
						color: "#d62246",
						backgroundColor: "#ffe680",
					},
				],
			},
		]);
		await openEditor({ document });

		await enterBlockEditMode(blockTextId);
		await saveBlockEdit();

		const node = await readPersistedTextNode(blockTextId);
		expectStandaloneBlockNode(node);
		expect(node.content.blocks[0]).toMatchObject({
			children: [
				{
					text: "Styled block",
					fontWeight: 700,
					italic: true,
					underline: true,
					fontSize: "30px",
					color: "#d62246",
					backgroundColor: "#ffe680",
				},
			],
		});

		await closeEditor();
	}, 30_000);

	it("persists two inline links in one standalone text block", async () => {
		const { document, blockTextId } =
			createBlockTextEditE2EDocument("one two three");
		(document.nodes[blockTextId] as TextNode).content = createTextDocumentContent([
			{
				type: "paragraph",
				direction: "ltr",
				children: [
					{
						type: "link",
						linkType: "external",
						href: "https://example.com/one",
						children: [{ text: "one" }],
					},
					{ text: " " },
					{
						type: "link",
						linkType: "external",
						href: "https://example.com/two",
						children: [{ text: "two" }],
					},
					{ text: " three" },
				],
			},
		]);
		await openEditor({ document });

		await enterBlockEditMode(blockTextId);
		await saveBlockEdit();

		const node = await readPersistedTextNode(blockTextId);
		expectStandaloneBlockNode(node);
		expect(node.content.blocks[0]).toMatchObject({
			children: [
				{
					type: "link",
					linkType: "external",
					href: "https://example.com/one",
					children: [{ text: "one" }],
				},
				{ text: " " },
				{
					type: "link",
					linkType: "external",
					href: "https://example.com/two",
					children: [{ text: "two" }],
				},
				{ text: " three" },
			],
		});

		await closeEditor();
	}, 30_000);

	it("promotes whole-node block links to inline links and clears node.link on commit", async () => {
		const { document, blockTextId } = createBlockTextEditE2EDocument(
			"Promoted link",
			{ wholeNodeLink: "https://example.com/promoted" },
		);
		await openEditor({ document });

		await enterBlockEditMode(blockTextId);
		await saveBlockEdit();

		const node = await readPersistedTextNode(blockTextId);
		expectStandaloneBlockNode(node);
		expect(node.link).toBeUndefined();
		expect(node.content.blocks[0]).toMatchObject({
			children: [
				{
					type: "link",
					linkType: "external",
					href: "https://example.com/promoted",
					children: [{ text: "Promoted link" }],
				},
			],
		});

		await closeEditor();
	}, 30_000);

	it("pushes following root sections when a top-level section is resized from the bottom knob", async () => {
		await openEditor({ document: createStructuralResizeE2EDocument() });

		const sections = page.locator(".stage-wrapper.subtype-section");
		const firstSection = sections.nth(0);
		const secondSection = sections.nth(1);

		await firstSection.click();

		const before = await secondSection.boundingBox();
		expect(before).not.toBeNull();

		const handle = page.locator(".resize-handle.handle-s").first();
		const handleBox = await handle.boundingBox();
		expect(handleBox).not.toBeNull();

		await page.mouse.move(
			handleBox?.x + handleBox?.width / 2,
			handleBox?.y + handleBox?.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(
			handleBox?.x + handleBox?.width / 2,
			handleBox?.y + handleBox?.height / 2 + 90,
			{
				steps: 12,
			},
		);
		await page.mouse.up();

		const after = await secondSection.boundingBox();
		expect(after).not.toBeNull();
		expect((after?.y ?? 0) - before?.y).toBeGreaterThan(60);

		await closeEditor();
	}, 30_000);

	it("reparents a leaf into another container", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document });

		const source = page
			.locator(`[data-node-id="${ids.reparentLeafId}"]`)
			.first();
		const sourceBox = await source.boundingBox();
		expect(sourceBox).not.toBeNull();

		const target = page
			.locator(`[data-drop-wrapper-id="${ids.targetContainerId}"]`)
			.first();
		const targetBox = await target.boundingBox();
		expect(targetBox).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.reparentLeafId}"]`,
			targetBox?.x + targetBox?.width / 2,
			targetBox?.y + targetBox?.height / 2,
		);

		await page.waitForFunction(
			({ storageKey, nodeId, parentId }) => {
				const state = JSON.parse(
					window.localStorage.getItem(storageKey) ?? "null",
				);
				return state?.document?.nodes?.[nodeId]?.parentId === parentId;
			},
			{
				storageKey: STORAGE_KEY,
				nodeId: ids.reparentLeafId,
				parentId: ids.targetContainerId,
			},
		);

		const state = await readPersistedState();
		expect(state.document.nodes[ids.reparentLeafId].parentId).toBe(
			ids.targetContainerId,
		);
		const expectedLocalX =
			(targetBox?.width ?? 0) / 2 - 16 - (sourceBox?.width ?? 0) / 2;
		expect(
			parseFloat(state.document.nodes[ids.reparentLeafId].rect.x.base.raw),
		).toBeCloseTo(expectedLocalX, 0);
		expect(
			parseFloat(state.document.nodes[ids.reparentLeafId].rect.y.base.raw),
		).toBeGreaterThan(10);

		await closeEditor();
	}, 30_000);

	it("falls back to moving within the current parent when the hovered drop wrapper is invalid", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document });
		const draggedLeaf = page
			.locator(`[data-node-id="${ids.axisLeafId}"]`)
			.first();
		const before = await draggedLeaf.boundingBox();
		expect(before).not.toBeNull();

		await page.evaluate(() => {
			const stageShell = window.document.querySelector(".stage-shell");
			if (!stageShell) {
				throw new Error("Expected stage shell");
			}
			const overlay = window.document.createElement("div");
			overlay.id = "invalid-drop-overlay";
			overlay.dataset.dropWrapperId = "missing_wrapper";
			overlay.style!.position = "absolute";
			overlay.style!.left = "980px";
			overlay.style!.top = "320px";
			overlay.style!.width = "120px";
			overlay.style!.height = "120px";
			overlay.style!.zIndex = "9999";
			overlay.style!.pointerEvents = "auto";
			overlay.style!.background = "transparent";
			stageShell.appendChild(overlay);
		});

		const invalidOverlay = page.locator("#invalid-drop-overlay");
		const invalidOverlayBox = await invalidOverlay.boundingBox();
		expect(invalidOverlayBox).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.axisLeafId}"]`,
			invalidOverlayBox?.x + invalidOverlayBox?.width / 2,
			invalidOverlayBox?.y + invalidOverlayBox?.height / 2,
		);
		await page.waitForTimeout(150);

		const after = await draggedLeaf.boundingBox();
		expect(after).not.toBeNull();

		const state = await readPersistedState();
		expect(state.document.nodes[ids.axisLeafId].parentId).toBe(ids.sectionId);
		expect(
			Math.abs((after?.x ?? 0) - before?.x) +
				Math.abs((after?.y ?? 0) - before?.y),
		).toBeGreaterThan(5);

		await closeEditor();
	}, 30_000);

	it("locks drag movement to one axis while Shift is held", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: false });

		const leaf = page.locator(`[data-node-id="${ids.axisLeafId}"]`).first();
		const before = await leaf.boundingBox();
		expect(before).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.axisLeafId}"]`,
			before?.x + before?.width / 2 + 140,
			before?.y + before?.height / 2 + 90,
			{ shiftKey: true },
		);

		const after = await leaf.boundingBox();
		expect(after).not.toBeNull();
		expect(Math.abs((after?.x ?? 0) - before?.x)).toBeGreaterThan(80);
		expect(Math.abs((after?.y ?? 0) - before?.y)).toBeLessThan(3);

		await closeEditor();
	}, 30_000);

	it("nudges the selected element by 1px and 10px with arrow keys", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: false });

		const leaf = page.locator(`[data-node-id="${ids.axisLeafId}"]`).first();
		await leaf.click();
		await page.locator(".stage-shell").focus();

		await page.keyboard.press("ArrowRight");
		await page.keyboard.press("Shift+ArrowRight");

		await page.waitForFunction(
			({ storageKey, nodeId }) => {
				const state = JSON.parse(
					window.localStorage.getItem(storageKey) ?? "null",
				);
				return state?.document?.nodes?.[nodeId]?.rect?.x?.base?.raw === "131px";
			},
			{
				storageKey: STORAGE_KEY,
				nodeId: ids.axisLeafId,
			},
		);

		const state = await readPersistedState();
		expect(state.document.nodes[ids.axisLeafId].rect.x.base.raw).toBe("131px");

		await closeEditor();
	}, 30_000);

	it("disables snapping while Alt is held", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: true });

		const frame = page.locator(".stage-frame").first();
		const frameBox = await frame.boundingBox();
		expect(frameBox).not.toBeNull();

		const snapTarget = page
			.locator(`[data-node-id="${ids.snapLeafId}"]`)
			.first();
		const before = await snapTarget.boundingBox();
		expect(before).not.toBeNull();

		const nearCenterX = frameBox?.x + frameBox?.width / 2 + 6;

		await dragLocatorToPoint(
			`[data-node-id="${ids.snapLeafId}"]`,
			nearCenterX,
			before?.y + before?.height / 2,
		);

		const snapped = await snapTarget.boundingBox();
		expect(snapped).not.toBeNull();
		const snappedCenter = snapped?.x + snapped?.width / 2;
		const frameCenter = frameBox?.x + frameBox?.width / 2;
		expect(Math.abs(snappedCenter - frameCenter)).toBeLessThanOrEqual(6);

		await closeEditor();

		const second = createE2EDocument();
		await openEditor({ document: second.document, snapEnabled: true });

		const secondFrame = page.locator(".stage-frame").first();
		const secondFrameBox = await secondFrame.boundingBox();
		expect(secondFrameBox).not.toBeNull();

		const secondTarget = page
			.locator(`[data-node-id="${second.ids.snapLeafId}"]`)
			.first();
		const secondBefore = await secondTarget.boundingBox();
		expect(secondBefore).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${second.ids.snapLeafId}"]`,
			secondFrameBox?.x + secondFrameBox?.width / 2 + 6,
			secondBefore?.y + secondBefore?.height / 2,
			{ altKey: true },
		);

		const unsnapped = await secondTarget.boundingBox();
		expect(unsnapped).not.toBeNull();
		const unsnappedCenter = unsnapped?.x + unsnapped?.width / 2;
		const secondFrameCenter = secondFrameBox?.x + secondFrameBox?.width / 2;
		expect(
			Math.abs(unsnappedCenter - secondFrameCenter),
		).toBeGreaterThanOrEqual(4);

		await closeEditor();
	}, 30_000);

	it("respects the snap toggle shortcut state during drag", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: true });

		await page.keyboard.press("Shift+G");

		const frame = page.locator(".stage-frame").first();
		const frameBox = await frame.boundingBox();
		expect(frameBox).not.toBeNull();

		const snapTarget = page
			.locator(`[data-node-id="${ids.snapLeafId}"]`)
			.first();
		const before = await snapTarget.boundingBox();
		expect(before).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.snapLeafId}"]`,
			frameBox?.x + frameBox?.width / 2 + 6,
			before?.y + before?.height / 2,
		);

		const after = await snapTarget.boundingBox();
		expect(after).not.toBeNull();
		const frameCenter = frameBox?.x + frameBox?.width / 2;
		const afterCenter = after?.x + after?.width / 2;
		expect(Math.abs(afterCenter - frameCenter)).toBeGreaterThanOrEqual(4);

		const state = await readPersistedState();
		expect(state.ui.snapSettings.guideSnap.enabled).toBe(false);

		await closeEditor();
	}, 30_000);

	it("suppresses native browser drag behavior inside the stage", async () => {
		await openEditor({ document: createDragSuppressionE2EDocument() });

		const result = await page.evaluate(() => {
			const stage = window.document.querySelector<HTMLElement>(".stage-shell");
			const image = window.document.querySelector<HTMLElement>(
				".stage-leaf.subtype-image img, .stage-leaf.subtype-image",
			);
			const text = window.document.querySelector<HTMLElement>(
				".stage-leaf.subtype-block",
			);

			if (!stage || !image || !text) {
				throw new Error("Expected stage, image, and text nodes");
			}

			const imageDragEvent = new DragEvent("dragstart", {
				bubbles: true,
				cancelable: true,
			});
			const textDragEvent = new DragEvent("dragstart", {
				bubbles: true,
				cancelable: true,
			});

			image.dispatchEvent(imageDragEvent);
			text.dispatchEvent(textDragEvent);

			const stageStyle = window.getComputedStyle(stage);
			return {
				imageDragPrevented: imageDragEvent.defaultPrevented,
				textDragPrevented: textDragEvent.defaultPrevented,
				userSelect: stageStyle.userSelect,
				webkitUserSelect: stageStyle.webkitUserSelect,
				webkitUserDrag: stageStyle.getPropertyValue("-webkit-user-drag"),
			};
		});

		expect(result.imageDragPrevented).toBe(true);
		expect(result.textDragPrevented).toBe(true);
		expect(result.userSelect).toBe("none");
		expect(result.webkitUserSelect).toBe("none");
		expect(result.webkitUserDrag).toBe("none");

		await closeEditor();
	}, 30_000);

	it("drags same-parent multi-selection as a group", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: false });

		const first = page
			.locator(`[data-node-id="${ids.reparentLeafId}"]`)
			.first();
		const second = page
			.locator(`[data-node-id="${ids.siblingLeafId}"]`)
			.first();
		const sourceContainer = page
			.locator(`[data-drop-wrapper-id="${ids.sourceContainerId}"]`)
			.first();

		await first.click();
		await second.click({ modifiers: ["Shift"] });

		const before = await readPersistedState();
		const beforeFirstX =
			before.document.nodes[ids.reparentLeafId].rect.x.base.raw;
		const beforeFirstY =
			before.document.nodes[ids.reparentLeafId].rect.y.base.raw;
		const beforeSecondX =
			before.document.nodes[ids.siblingLeafId].rect.x.base.raw;
		const beforeSecondY =
			before.document.nodes[ids.siblingLeafId].rect.y.base.raw;

		const firstBox = await first.boundingBox();
		const sourceContainerBox = await sourceContainer.boundingBox();
		expect(firstBox).not.toBeNull();
		expect(sourceContainerBox).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.reparentLeafId}"]`,
			(sourceContainerBox?.x ?? 0) + 96,
			(sourceContainerBox?.y ?? 0) + 96,
		);

		await page.waitForFunction(
			({ storageKey, firstId, secondId, beforeA, beforeB }) => {
				const state = JSON.parse(
					window.localStorage.getItem(storageKey) ?? "null",
				);
				return (
					state?.document?.nodes?.[firstId]?.rect?.x?.base?.raw !== beforeA ||
					state?.document?.nodes?.[secondId]?.rect?.x?.base?.raw !== beforeB
				);
			},
			{
				storageKey: STORAGE_KEY,
				firstId: ids.reparentLeafId,
				secondId: ids.siblingLeafId,
				beforeA: beforeFirstX,
				beforeB: beforeSecondX,
			},
		);

		const after = await readPersistedState();
		expect(after.document.nodes[ids.reparentLeafId].parentId).toBe(
			ids.sourceContainerId,
		);
		expect(after.document.nodes[ids.siblingLeafId].parentId).toBe(
			ids.sourceContainerId,
		);
		expect(after.document.nodes[ids.reparentLeafId].rect.x.base.raw).not.toBe(
			beforeFirstX,
		);
		expect(after.document.nodes[ids.reparentLeafId].rect.y.base.raw).not.toBe(
			beforeFirstY,
		);
		expect(after.document.nodes[ids.siblingLeafId].rect.x.base.raw).not.toBe(
			beforeSecondX,
		);
		expect(after.document.nodes[ids.siblingLeafId].rect.y.base.raw).not.toBe(
			beforeSecondY,
		);

		await closeEditor();
	}, 30_000);

	it("edits standalone lists on stage with Enter and Shift+Enter list behavior", async () => {
		const { document, listTextId } = createListTextEditE2EDocument();
		(document.nodes[listTextId] as TextNode).content = createTextDocumentContent([
			{
				type: "ul",
				markerStyle: "square",
				children: [
					{ type: "list-item", depth: 1, children: [{ text: "" }] },
				],
			},
		]);
		await openEditor({ document });

		await enterListEditMode(listTextId);
		await page.keyboard.type("First");
		await page.keyboard.press("Enter");
		await page.keyboard.type("Second");
		await page.keyboard.press("Shift+Enter");
		await page.keyboard.type("Soft");
		await page.mouse.click(16, 16);
		await page.waitForSelector('[data-stage-rich-toolbar="true"]', {
			state: "detached",
			timeout: 2_000,
		});

		const node = await readPersistedTextNode(listTextId);
		expectStandaloneListNode(node);
		expect(node.content.blocks).toMatchObject([
			{
				type: "ul",
				markerStyle: "square",
				children: [
					{ type: "list-item", depth: 1, children: [{ text: "First" }] },
					{ type: "list-item", depth: 1, children: [{ text: "Second\nSoft" }] },
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("handles standalone list Tab, Shift+Tab, and Backspace at item start", async () => {
		const { document, listTextId } = createListTextEditE2EDocument();
		(document.nodes[listTextId] as TextNode).content = createTextDocumentContent([
			{
				type: "ul",
				children: [
					{ type: "list-item", children: [{ text: "Root" }] },
					{ type: "list-item", children: [{ text: "Child" }] },
					{ type: "list-item", children: [{ text: "Third" }] },
				],
			},
		]);
		await openEditor({ document });

		await enterListEditMode(listTextId);
		await selectRichTextRange(1, 0, 1, 0);
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await selectRichTextRange(2, 0, 2, 0);
		await page.keyboard.press("Backspace");
		await saveListEdit();

		const node = await readPersistedTextNode(listTextId);
		expectStandaloneListNode(node);
		expect(node.content.blocks).toMatchObject([
			{
				type: "ul",
				children: [
					{ type: "list-item", children: [{ text: "Root" }] },
					{
						type: "list-item",
						children: [{ text: "Child\nThird" }],
					},
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("keeps inline standalone list content intact through stage edit commit", async () => {
		const { document, listTextId } = createListTextEditE2EDocument();
		(document.nodes[listTextId] as TextNode).content = createTextDocumentContent([
			{
				type: "ol",
				start: 4,
				markerStyle: "upper-roman",
				children: [
					{
						type: "list-item",
						depth: 1,
						children: [
							{
								text: "Styled ",
								fontWeight: 700,
								fontSize: "30px",
								color: "#d62246",
								backgroundColor: "#ffe680",
							},
							{
								type: "link",
								linkType: "external",
								href: "https://example.com/one",
								children: [{ text: "one", underline: true }],
							},
							{ text: " " },
							{
								type: "link",
								linkType: "external",
								href: "https://example.com/two",
								children: [{ text: "two", italic: true }],
							},
						],
					},
				],
			},
		]);
		await openEditor({ document });

		await enterListEditMode(listTextId);
		await saveListEdit();

		const node = await readPersistedTextNode(listTextId);
		expectStandaloneListNode(node);
		expect(node.content.blocks).toMatchObject([
			{
				type: "ol",
				start: 4,
				markerStyle: "upper-roman",
				children: [
					{
						type: "list-item",
						depth: 1,
						children: [
							{
								text: "Styled ",
								fontWeight: 700,
								fontSize: "30px",
								color: "#d62246",
								backgroundColor: "#ffe680",
							},
							{
								type: "link",
								linkType: "external",
								href: "https://example.com/one",
								children: [{ text: "one", underline: true }],
							},
							{ text: " " },
							{
								type: "link",
								linkType: "external",
								href: "https://example.com/two",
								children: [{ text: "two", italic: true }],
							},
						],
					},
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("uses the same Enter and Tab behavior inside rich text list blocks", async () => {
		const { document, richTextId } = createRichTextEditE2EDocument([
			{
				type: "ul",
				children: [
					{ type: "list-item", children: [{ text: "Alpha" }] },
					{ type: "list-item", children: [{ text: "Beta" }] },
				],
			},
		]);
		await openEditor({
			document,
			selectedId: richTextId,
			selectedIds: [richTextId],
		});

		await enterRichEditMode(richTextId);
		await selectRichTextRange(0, "Alpha".length, 0, "Alpha".length);
		await page.keyboard.press("Enter");
		await page.keyboard.type("Inserted");
		await selectRichTextRange(2, 0, 2, 0);
		await page.keyboard.press("Tab");
		await saveRichEdit();

		const node = await readPersistedTextNode(richTextId);
		expect(node.content.blocks).toMatchObject([
			{
				type: "ul",
				children: [
					{ type: "list-item", children: [{ text: "Alpha" }] },
					{ type: "list-item", children: [{ text: "Inserted" }] },
					{ type: "list-item", depth: 1, children: [{ text: "Beta" }] },
				],
			},
		]);

		await closeEditor();
	}, 30_000);

	it("drags only the parent when a parent and child are both selected", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: false });

		const container = page
			.locator(`[data-node-id="${ids.sourceContainerId}"]`)
			.first();
		const child = page
			.locator(`[data-node-id="${ids.reparentLeafId}"]`)
			.first();

		const containerBox = await container.boundingBox();
		expect(containerBox).not.toBeNull();

		await page.mouse.click(
			(containerBox?.x ?? 0) + 18,
			(containerBox?.y ?? 0) + 18,
		);
		await child.click({ modifiers: ["Shift"] });

		const before = await readPersistedState();
		const beforeContainerX =
			before.document.nodes[ids.sourceContainerId].rect.x.base.raw;
		const beforeContainerY =
			before.document.nodes[ids.sourceContainerId].rect.y.base.raw;
		const beforeChildX =
			before.document.nodes[ids.reparentLeafId].rect.x.base.raw;
		const beforeChildY =
			before.document.nodes[ids.reparentLeafId].rect.y.base.raw;

		const childBox = await child.boundingBox();
		expect(childBox).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.reparentLeafId}"]`,
			(childBox?.x ?? 0) + (childBox?.width ?? 0) / 2 + 110,
			(childBox?.y ?? 0) + (childBox?.height ?? 0) / 2 + 60,
		);

		await page.waitForFunction(
			({ storageKey, nodeId, beforeX }) => {
				const state = JSON.parse(
					window.localStorage.getItem(storageKey) ?? "null",
				);
				return state?.document?.nodes?.[nodeId]?.rect?.x?.base?.raw !== beforeX;
			},
			{
				storageKey: STORAGE_KEY,
				nodeId: ids.sourceContainerId,
				beforeX: beforeContainerX,
			},
		);

		const after = await readPersistedState();
		expect(
			after.document.nodes[ids.sourceContainerId].rect.x.base.raw,
		).not.toBe(beforeContainerX);
		expect(
			after.document.nodes[ids.sourceContainerId].rect.y.base.raw,
		).not.toBe(beforeContainerY);
		expect(after.document.nodes[ids.reparentLeafId].rect.x.base.raw).toBe(
			beforeChildX,
		);
		expect(after.document.nodes[ids.reparentLeafId].rect.y.base.raw).toBe(
			beforeChildY,
		);

		await closeEditor();
	}, 30_000);

	it("falls back to dragging only the anchor for mixed-parent multi-selection", async () => {
		const { document, ids } = createE2EDocument();
		await openEditor({ document, snapEnabled: false });

		const first = page
			.locator(`[data-node-id="${ids.reparentLeafId}"]`)
			.first();
		const other = page
			.locator(`[data-node-id="${ids.otherContainerLeafId}"]`)
			.first();

		await first.click();
		await other.click({ modifiers: ["Shift"] });

		const before = await readPersistedState();
		const beforeFirstX =
			before.document.nodes[ids.reparentLeafId].rect.x.base.raw;
		const beforeOtherX =
			before.document.nodes[ids.otherContainerLeafId].rect.x.base.raw;

		const firstBox = await first.boundingBox();
		expect(firstBox).not.toBeNull();

		await dragLocatorToPoint(
			`[data-node-id="${ids.reparentLeafId}"]`,
			(firstBox?.x ?? 0) + (firstBox?.width ?? 0) / 2 + 90,
			(firstBox?.y ?? 0) + (firstBox?.height ?? 0) / 2 + 50,
		);

		await page.waitForFunction(
			({ storageKey, nodeId, beforeX }) => {
				const state = JSON.parse(
					window.localStorage.getItem(storageKey) ?? "null",
				);
				return state?.document?.nodes?.[nodeId]?.rect?.x?.base?.raw !== beforeX;
			},
			{
				storageKey: STORAGE_KEY,
				nodeId: ids.reparentLeafId,
				beforeX: beforeFirstX,
			},
		);

		const after = await readPersistedState();
		expect(after.document.nodes[ids.reparentLeafId].rect.x.base.raw).not.toBe(
			beforeFirstX,
		);
		expect(after.document.nodes[ids.otherContainerLeafId].rect.x.base.raw).toBe(
			beforeOtherX,
		);

		await closeEditor();
	}, 30_000);
});

function createE2EDocument(): {
	document: DocumentModel;
	ids: TestDocumentIds;
} {
	const siteId = "site_e2e";
	const section = createContainerNode("section", siteId);
	section.name = "E2E Section";
	section.rect = createDefaultRect("0px", "0px", "100%", "900px");

	const sourceContainer = createContainerNode("container", section.id);
	sourceContainer.name = "Source Container";
	sourceContainer.rect = createDefaultRect("80px", "110px", "300px", "260px");

	const nestedContainer = createContainerNode("container", sourceContainer.id);
	nestedContainer.name = "Nested Invalid Target";
	nestedContainer.rect = createDefaultRect("36px", "108px", "150px", "96px");

	const targetContainer = createContainerNode("container", section.id);
	targetContainer.name = "Target Container";
	targetContainer.rect = createDefaultRect("560px", "110px", "300px", "260px");

	const reparentLeaf = createTextNode("block", sourceContainer.id) as TextNode;
	reparentLeaf.name = "Reparent Leaf";
	reparentLeaf.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Reparent me" }] },
	]);
	reparentLeaf.rect = createDefaultRect("188px", "36px", "160px", "auto");

	const siblingLeaf = createTextNode("block", sourceContainer.id) as TextNode;
	siblingLeaf.name = "Sibling Group Leaf";
	siblingLeaf.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Group drag me too" }] },
	]);
	siblingLeaf.rect = createDefaultRect("52px", "160px", "160px", "auto");

	const otherContainerLeaf = createTextNode(
		"block",
		targetContainer.id,
	) as TextNode;
	otherContainerLeaf.name = "Other Container Leaf";
	otherContainerLeaf.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Different parent" }] },
	]);
	otherContainerLeaf.rect = createDefaultRect("36px", "44px", "160px", "auto");

	const axisLeaf = createTextNode("block", section.id) as TextNode;
	axisLeaf.name = "Axis Lock Leaf";
	axisLeaf.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Shift drag me" }] },
	]);
	axisLeaf.rect = createDefaultRect("120px", "470px", "180px", "auto");

	const snapLeaf = createTextNode("block", section.id) as TextNode;
	snapLeaf.name = "Snap Leaf";
	snapLeaf.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Snap me" }] },
	]);
	snapLeaf.rect = createDefaultRect("160px", "620px", "180px", "auto");

	sourceContainer.children = [
		nestedContainer.id,
		reparentLeaf.id,
		siblingLeaf.id,
	];
	targetContainer.children = [otherContainerLeaf.id];
	nestedContainer.children = [];
	section.children = [
		sourceContainer.id,
		targetContainer.id,
		axisLeaf.id,
		snapLeaf.id,
	];

	const document: DocumentModel = {
		rootId: siteId,
		nodes: {
			[siteId]: {
				id: siteId,
				contentType: "site",
				type: "site",
				parentId: null,
				children: [section.id],
				name: "Site",
				visible: true,
				locked: false,
			},
			[section.id]: section,
			[sourceContainer.id]: sourceContainer,
			[nestedContainer.id]: nestedContainer,
			[targetContainer.id]: targetContainer,
			[reparentLeaf.id]: reparentLeaf,
			[siblingLeaf.id]: siblingLeaf,
			[otherContainerLeaf.id]: otherContainerLeaf,
			[axisLeaf.id]: axisLeaf,
			[snapLeaf.id]: snapLeaf,
		},
	};

	return {
		document,
		ids: {
			sectionId: section.id,
			sourceContainerId: sourceContainer.id,
			nestedContainerId: nestedContainer.id,
			targetContainerId: targetContainer.id,
			reparentLeafId: reparentLeaf.id,
			siblingLeafId: siblingLeaf.id,
			otherContainerLeafId: otherContainerLeaf.id,
			axisLeafId: axisLeaf.id,
			snapLeafId: snapLeaf.id,
		},
	};
}

function createStructuralResizeE2EDocument(): DocumentModel {
	const siteId = "site_resize_e2e";
	const header = createContainerNode("header", siteId);
	header.name = "Resize Header";
	header.rect = createDefaultRect("0px", "0px", "100%", "120px");

	const sectionA = createContainerNode("section", siteId);
	sectionA.name = "Resize Section A";
	sectionA.rect = createDefaultRect("0px", "0px", "100%", "280px");

	const sectionB = createContainerNode("section", siteId);
	sectionB.name = "Resize Section B";
	sectionB.rect = createDefaultRect("0px", "0px", "100%", "240px");

	const footer = createContainerNode("footer", siteId);
	footer.name = "Resize Footer";
	footer.rect = createDefaultRect("0px", "0px", "100%", "96px");

	const sectionAText = createTextNode("block", sectionA.id) as TextNode;
	sectionAText.name = "Resize Section A Text";
	sectionAText.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Section A" }] },
	]);
	sectionAText.rect = createDefaultRect("32px", "32px", "240px", "auto");

	const sectionBText = createTextNode("block", sectionB.id) as TextNode;
	sectionBText.name = "Resize Section B Text";
	sectionBText.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Section B" }] },
	]);
	sectionBText.rect = createDefaultRect("32px", "32px", "240px", "auto");

	header.children = [];
	sectionA.children = [sectionAText.id];
	sectionB.children = [sectionBText.id];
	footer.children = [];

	return {
		rootId: siteId,
		nodes: {
			[siteId]: {
				id: siteId,
				contentType: "site",
				type: "site",
				parentId: null,
				children: [header.id, sectionA.id, sectionB.id, footer.id],
				name: "Site",
				visible: true,
				locked: false,
			},
			[header.id]: header,
			[sectionA.id]: sectionA,
			[sectionB.id]: sectionB,
			[footer.id]: footer,
			[sectionAText.id]: sectionAText,
			[sectionBText.id]: sectionBText,
		},
	};
}

function createRichTextEditE2EDocument(
	content: RichContent = [
		{ type: "paragraph", children: [{ text: "Edit me on stage" }] },
	],
	options?: {
		height?: string;
		name?: string;
		blockGap?: number;
	},
): { document: DocumentModel; richTextId: string; sectionId: string } {
	const siteId = "site_rich_text_regression_e2e";
	const section = createContainerNode("section", siteId);
	section.name = "Rich Edit Regression Section";
	section.slug = "rich-edit-regression-section";
	section.rect = createDefaultRect("0px", "0px", "100%", "320px");

	const richText = createTextNode("rich", section.id) as TextNode;
	richText.name = options?.name ?? "Rich Edit Regression Copy";
	richText.content = createTextDocumentContent(content);
	richText.rect = createDefaultRect(
		"72px",
		"88px",
		"280px",
		options?.height ?? "72px",
	);
	if (typeof options?.blockGap === "number") {
		richText.style.blockGap = options.blockGap;
	}

	section.children = [richText.id];

	return {
		document: {
			rootId: siteId,
			nodes: {
				[siteId]: {
					id: siteId,
					contentType: "site",
					type: "site",
					parentId: null,
					children: [section.id],
					name: "Site",
					visible: true,
					locked: false,
				},
				[section.id]: section,
				[richText.id]: richText,
			},
		},
		richTextId: richText.id,
		sectionId: section.id,
	};
}

function createBlockTextEditE2EDocument(
	text: string,
	options?: { wholeNodeLink?: string },
): { document: DocumentModel; blockTextId: string; sectionId: string } {
	const siteId = "site_block_text_regression_e2e";
	const section = createContainerNode("section", siteId);
	section.name = "Block Edit Regression Section";
	section.slug = "block-edit-regression-section";
	section.rect = createDefaultRect("0px", "0px", "100%", "320px");

	const blockText = options?.wholeNodeLink
		? (createLinkTextNode(section.id) as TextNode)
		: (createTextNode("block", section.id) as TextNode);
	blockText.name = "Block Edit Regression Copy";
	blockText.content = createTextDocumentContent([
		{ type: "paragraph", direction: "ltr", children: [{ text }] },
	]);
	blockText.rect = createDefaultRect("72px", "88px", "320px", "auto");
	if (options?.wholeNodeLink) {
		blockText.link = {
			linkType: "external",
			href: options.wholeNodeLink,
		};
	}

	section.children = [blockText.id];

	return {
		document: {
			rootId: siteId,
			nodes: {
				[siteId]: {
					id: siteId,
					contentType: "site",
					type: "site",
					parentId: null,
					children: [section.id],
					name: "Site",
					visible: true,
					locked: false,
				},
				[section.id]: section,
				[blockText.id]: blockText,
			},
		},
		blockTextId: blockText.id,
		sectionId: section.id,
	};
}

function createListTextEditE2EDocument(): { document: DocumentModel; listTextId: string; sectionId: string } {
	const siteId = "site_list_text_regression_e2e";
	const section = createContainerNode("section", siteId);
	section.name = "List Edit Regression Section";
	section.slug = "list-edit-regression-section";
	section.rect = createDefaultRect("0px", "0px", "100%", "320px");

	const listText = createTextNode("list", section.id) as TextNode;
	listText.name = "List Edit Regression Copy";
	listText.content = createTextDocumentContent([
		{
			type: "ul",
			markerStyle: "disc",
			children: [{ type: "list-item", children: [{ text: "List item" }] }],
		},
	]);
	listText.rect = createDefaultRect("72px", "88px", "320px", "auto");

	section.children = [listText.id];

	return {
		document: {
			rootId: siteId,
			nodes: {
				[siteId]: {
					id: siteId,
					contentType: "site",
					type: "site",
					parentId: null,
					children: [section.id],
					name: "Site",
					visible: true,
					locked: false,
				},
				[section.id]: section,
				[listText.id]: listText,
			},
		},
		listTextId: listText.id,
		sectionId: section.id,
	};
}

function createCodeTextEditE2EDocument(): { document: DocumentModel; codeTextId: string; sectionId: string } {
	const siteId = "site_code_text_regression_e2e";
	const section = createContainerNode("section", siteId);
	section.name = "Code Edit Regression Section";
	section.slug = "code-edit-regression-section";
	section.rect = createDefaultRect("0px", "0px", "100%", "320px");

	const codeText = createTextNode("code", section.id) as TextNode;
	codeText.name = "Code Edit Regression Copy";
	codeText.content = createTextDocumentFromCode("const value = 1;", {
		language: "typescript",
		theme: "auto",
	});
	codeText.rect = createDefaultRect("72px", "88px", "420px", "auto");

	section.children = [codeText.id];

	return {
		document: {
			rootId: siteId,
			nodes: {
				[siteId]: {
					id: siteId,
					contentType: "site",
					type: "site",
					parentId: null,
					children: [section.id],
					name: "Site",
					visible: true,
					locked: false,
				},
				[section.id]: section,
				[codeText.id]: codeText,
			},
		},
		codeTextId: codeText.id,
		sectionId: section.id,
	};
}

function createDragSuppressionE2EDocument(): DocumentModel {
	const siteId = "site_drag_suppression_e2e";
	const section = createContainerNode("section", siteId);
	section.name = "Drag Suppression Section";
	section.rect = createDefaultRect("0px", "0px", "100%", "320px");

	const text = createTextNode("block", section.id) as TextNode;
	text.name = "Drag Suppression Text";
	text.content = createTextDocumentContent([
		{ type: "paragraph", children: [{ text: "Drag suppression text" }] },
	]);
	text.rect = createDefaultRect("72px", "88px", "220px", "auto");

	const image = createMediaNode("image", section.id);
	image.name = "Drag Suppression Image";
	image.rect = createDefaultRect("72px", "152px", "180px", "120px");

	section.children = [text.id, image.id];

	return {
		rootId: siteId,
		nodes: {
			[siteId]: {
				id: siteId,
				contentType: "site",
				type: "site",
				parentId: null,
				children: [section.id],
				name: "Site",
				visible: true,
				locked: false,
			},
			[section.id]: section,
			[text.id]: text,
			[image.id]: image,
		},
	};
}
