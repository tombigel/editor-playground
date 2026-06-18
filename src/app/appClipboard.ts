import {
	createNodeClipboardJson,
	EDITOR_NODE_CLIPBOARD_MIME,
	parseNodeClipboardPayloadDoc,
	type EditorNodeClipboardPayload,
} from "../api/editorApi";

const EMPTY_PLAIN_TEXT_CLIPBOARD_VALUE = "";
const EDITOR_NODE_CLIPBOARD_HTML_ATTRIBUTE = "data-editor-playground-clipboard";

type ClipboardItemConstructor = new (
	items: Record<string, Blob>,
) => ClipboardItem;

type EditorClipboard = Partial<
	Pick<Clipboard, "read" | "readText" | "write" | "writeText">
>;

type ClipboardOptions = {
	clipboard?: EditorClipboard | null;
	ClipboardItemCtor?: ClipboardItemConstructor;
};

function getNavigatorClipboard() {
	if (typeof navigator === "undefined") {
		return null;
	}
	return navigator.clipboard as EditorClipboard | undefined;
}

function getClipboardItemCtor() {
	return (
		globalThis as typeof globalThis & {
			ClipboardItem?: ClipboardItemConstructor;
		}
	).ClipboardItem;
}

export function writeNodePayloadToEventClipboard(
	clipboardData: DataTransfer,
	payload: EditorNodeClipboardPayload,
) {
	const json = createNodeClipboardJson(payload);
	clipboardData.setData(EDITOR_NODE_CLIPBOARD_MIME, json);
	clipboardData.setData("text/html", createNodeClipboardHtml(json));
	clipboardData.setData("text/plain", EMPTY_PLAIN_TEXT_CLIPBOARD_VALUE);
}

export function readNodePayloadFromEventClipboard(clipboardData: DataTransfer) {
	return (
		parseNodeClipboardPayloadDoc(
			clipboardData.getData(EDITOR_NODE_CLIPBOARD_MIME),
		) ??
		parseNodeClipboardHtml(clipboardData.getData("text/html")) ??
		parseNodeClipboardPayloadDoc(clipboardData.getData("text/plain"))
	);
}

export async function writeNodePayloadToSystemClipboard(
	payload: EditorNodeClipboardPayload,
	options: ClipboardOptions = {},
) {
	const json = createNodeClipboardJson(payload);
	const clipboard = options.clipboard ?? getNavigatorClipboard();
	const ClipboardItemCtor = options.ClipboardItemCtor ?? getClipboardItemCtor();
	if (!clipboard?.write || !ClipboardItemCtor) {
		return false;
	}
	try {
		await clipboard.write([
			new ClipboardItemCtor({
				[EDITOR_NODE_CLIPBOARD_MIME]: new Blob([json], {
					type: EDITOR_NODE_CLIPBOARD_MIME,
				}),
				"text/html": new Blob([createNodeClipboardHtml(json)], {
					type: "text/html",
				}),
				"text/plain": new Blob([EMPTY_PLAIN_TEXT_CLIPBOARD_VALUE], {
					type: "text/plain",
				}),
			}),
		]);
		return true;
	} catch {
		try {
			await clipboard.write([
				new ClipboardItemCtor({
					"text/html": new Blob([createNodeClipboardHtml(json)], {
						type: "text/html",
					}),
					"text/plain": new Blob([EMPTY_PLAIN_TEXT_CLIPBOARD_VALUE], {
						type: "text/plain",
					}),
				}),
			]);
			return true;
		} catch {
			return false;
		}
	}
}

export async function readNodePayloadFromSystemClipboard(
	options: ClipboardOptions = {},
) {
	const clipboard = options.clipboard ?? getNavigatorClipboard();
	if (clipboard?.read) {
		try {
			const items = await clipboard.read();
			for (const item of items) {
				if (item.types.includes(EDITOR_NODE_CLIPBOARD_MIME)) {
					const blob = await item.getType(EDITOR_NODE_CLIPBOARD_MIME);
					const payload = parseNodeClipboardPayloadDoc(await blob.text());
					if (payload) {
						return payload;
					}
				}
				if (item.types.includes("text/html")) {
					const blob = await item.getType("text/html");
					const payload = parseNodeClipboardHtml(await blob.text());
					if (payload) {
						return payload;
					}
				}
			}
		} catch {
			// readText fallback below handles older clipboard payloads.
		}
	}
	try {
		const text = await clipboard?.readText?.();
		return text ? parseNodeClipboardPayloadDoc(text) : null;
	} catch {
		return null;
	}
}

function createNodeClipboardHtml(json: string) {
	return `<span ${EDITOR_NODE_CLIPBOARD_HTML_ATTRIBUTE}="${encodeURIComponent(json)}"></span>`;
}

function parseNodeClipboardHtml(html: string) {
	const match = html.match(
		new RegExp(`${EDITOR_NODE_CLIPBOARD_HTML_ATTRIBUTE}="([^"]*)"`),
	);
	if (!match) {
		return null;
	}
	try {
		return parseNodeClipboardPayloadDoc(decodeURIComponent(match[1]));
	} catch {
		return null;
	}
}
