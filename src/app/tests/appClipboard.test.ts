import { describe, expect, it, vi } from "vitest";
import {
	createNodeClipboardJson,
	EDITOR_NODE_CLIPBOARD_MIME,
	serializeNodesForClipboardDoc,
} from "../../api/editorApi";
import { createInitialDocument } from "../../model/defaults";
import {
	readNodePayloadFromEventClipboard,
	readNodePayloadFromSystemClipboard,
	writeNodePayloadToEventClipboard,
	writeNodePayloadToSystemClipboard,
} from "../appClipboard";

function createPayload() {
	const document = createInitialDocument();
	const sectionId = document.pages?.[0]?.sectionIds[0];
	if (!sectionId) {
		throw new Error("Expected section");
	}
	const payload = serializeNodesForClipboardDoc(document, [sectionId]);
	if (!payload) {
		throw new Error("Expected clipboard payload");
	}
	return payload;
}

class TestClipboardItem {
	readonly types: string[];
	readonly items: Record<string, Blob>;

	constructor(items: Record<string, Blob>) {
		this.items = items;
		this.types = Object.keys(items);
	}

	async getType(type: string) {
		const item = this.items[type];
		if (!item) {
			throw new Error(`Missing clipboard item type ${type}`);
		}
		return item;
	}
}

function createEventClipboardData(values = new Map<string, string>()) {
	return {
		getData: vi.fn((type: string) => values.get(type) ?? ""),
		setData: vi.fn((type: string, value: string) => {
			values.set(type, value);
		}),
	} as unknown as DataTransfer;
}

function createClipboardHtml(payloadJson: string) {
	return `<span data-editor-playground-clipboard="${encodeURIComponent(payloadJson)}"></span>`;
}

describe("app/appClipboard", () => {
	it("writes editor node payloads to event clipboard without plain-text JSON", () => {
		const payload = createPayload();
		const clipboardData = createEventClipboardData();

		writeNodePayloadToEventClipboard(clipboardData, payload);

		expect(clipboardData.setData).toHaveBeenCalledWith(
			EDITOR_NODE_CLIPBOARD_MIME,
			createNodeClipboardJson(payload),
		);
		expect(clipboardData.setData).toHaveBeenCalledWith(
			"text/html",
			expect.stringContaining("data-editor-playground-clipboard"),
		);
		expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "");
	});

	it("reads editor node payloads from event clipboard html fallback data", () => {
		const payload = createPayload();
		const values = new Map<string, string>();
		const clipboardData = createEventClipboardData(values);

		writeNodePayloadToEventClipboard(clipboardData, payload);
		values.delete(EDITOR_NODE_CLIPBOARD_MIME);

		expect(readNodePayloadFromEventClipboard(clipboardData)).toEqual(payload);
		expect(clipboardData.getData).toHaveBeenCalledWith("text/html");
	});

	it.each([
		["custom MIME", (json: string) => new Map([[EDITOR_NODE_CLIPBOARD_MIME, json]])],
		["hidden html", (json: string) => new Map([["text/html", createClipboardHtml(json)]])],
		["legacy plain JSON", (json: string) => new Map([["text/plain", json]])],
		[
			"invalid custom MIME with hidden html fallback",
			(json: string) =>
				new Map([
					[EDITOR_NODE_CLIPBOARD_MIME, "not json"],
					["text/html", createClipboardHtml(json)],
				]),
		],
	])("reads event clipboard editor payloads from %s", (_label, createValues) => {
		const payload = createPayload();
		const clipboardData = createEventClipboardData(
			createValues(createNodeClipboardJson(payload)),
		);

		expect(readNodePayloadFromEventClipboard(clipboardData)).toEqual(payload);
	});

	it.each([
		["external plain text", new Map([["text/plain", "hello world"]])],
		["external html", new Map([["text/html", "<strong>Hello</strong>"]])],
		["empty clipboard", new Map()],
	])("does not treat %s event data as an editor payload", (_label, values) => {
		const clipboardData = createEventClipboardData(values);

		expect(readNodePayloadFromEventClipboard(clipboardData)).toBeNull();
	});

	it("writes system clipboard custom MIME and html fallback data while keeping plain text empty", async () => {
		const payload = createPayload();
		const write = vi.fn().mockResolvedValue(undefined);

		await expect(
			writeNodePayloadToSystemClipboard(payload, {
				clipboard: { write },
				ClipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
			}),
		).resolves.toBe(true);

		const item = write.mock.calls[0][0][0] as TestClipboardItem;
		await expect(item.getType(EDITOR_NODE_CLIPBOARD_MIME).then((blob) => blob.text())).resolves.toBe(
			createNodeClipboardJson(payload),
		);
		await expect(item.getType("text/html").then((blob) => blob.text())).resolves.toContain(
			"data-editor-playground-clipboard",
		);
		await expect(item.getType("text/plain").then((blob) => blob.text())).resolves.toBe("");
	});

	it("falls back to system clipboard html without writing plain-text JSON when custom MIME writes fail", async () => {
		const payload = createPayload();
		const write = vi
			.fn()
			.mockRejectedValueOnce(new Error("custom MIME blocked"))
			.mockResolvedValueOnce(undefined);

		await expect(
			writeNodePayloadToSystemClipboard(payload, {
				clipboard: { write },
				ClipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
			}),
		).resolves.toBe(true);

		const fallbackItem = write.mock.calls[1][0][0] as TestClipboardItem;
		expect(fallbackItem.types).not.toContain(EDITOR_NODE_CLIPBOARD_MIME);
		await expect(fallbackItem.getType("text/html").then((blob) => blob.text())).resolves.toContain(
			"data-editor-playground-clipboard",
		);
		await expect(fallbackItem.getType("text/plain").then((blob) => blob.text())).resolves.toBe("");
	});

	it.each([
		[
			"missing clipboard write API",
			{
				clipboard: {},
				ClipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
			},
		],
		[
			"missing ClipboardItem constructor",
			{
				clipboard: { write: vi.fn().mockResolvedValue(undefined) },
			},
		],
		[
			"blocked custom and html writes",
			{
				clipboard: { write: vi.fn().mockRejectedValue(new Error("blocked")) },
				ClipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
			},
		],
	])("returns false for system clipboard writes with %s", async (_label, options) => {
		await expect(
			writeNodePayloadToSystemClipboard(createPayload(), options),
		).resolves.toBe(false);
	});

	it("does not use writeText as a system clipboard fallback", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);

		await expect(
			writeNodePayloadToSystemClipboard(createPayload(), {
				clipboard: { writeText },
			}),
		).resolves.toBe(false);

		expect(writeText).not.toHaveBeenCalled();
	});

	it("reads editor payloads from custom MIME, html fallback, legacy text JSON, and read fallback", async () => {
		const payload = createPayload();
		const json = createNodeClipboardJson(payload);
		const customItem = new TestClipboardItem({
			[EDITOR_NODE_CLIPBOARD_MIME]: new Blob([json], {
				type: EDITOR_NODE_CLIPBOARD_MIME,
			}),
		});

		await expect(
			readNodePayloadFromSystemClipboard({
				clipboard: { read: vi.fn().mockResolvedValue([customItem]) },
			}),
		).resolves.toEqual(payload);
		const htmlItem = new TestClipboardItem({
			"text/html": new Blob(
				[`<span data-editor-playground-clipboard="${encodeURIComponent(json)}"></span>`],
				{ type: "text/html" },
			),
		});
		await expect(
			readNodePayloadFromSystemClipboard({
				clipboard: { read: vi.fn().mockResolvedValue([htmlItem]) },
			}),
		).resolves.toEqual(payload);
		await expect(
			readNodePayloadFromSystemClipboard({
				clipboard: {
					read: vi.fn().mockResolvedValue([]),
					readText: vi.fn().mockResolvedValue(json),
				},
			}),
		).resolves.toEqual(payload);
		await expect(
			readNodePayloadFromSystemClipboard({
				clipboard: {
					read: vi.fn().mockRejectedValue(new Error("read blocked")),
					readText: vi.fn().mockResolvedValue(json),
				},
			}),
		).resolves.toEqual(payload);
	});

	it.each([
		["external plain text", { readText: vi.fn().mockResolvedValue("hello") }],
		[
			"external html",
			{
				read: vi
					.fn()
					.mockResolvedValue([
						new TestClipboardItem({
							"text/html": new Blob(["<strong>Hello</strong>"], {
								type: "text/html",
							}),
						}),
					]),
			},
		],
		["readText denial", { readText: vi.fn().mockRejectedValue(new Error("denied")) }],
	])("does not treat %s system clipboard data as an editor payload", async (_label, clipboard) => {
		await expect(readNodePayloadFromSystemClipboard({ clipboard })).resolves.toBeNull();
	});
});
