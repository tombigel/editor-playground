import type { ActionResult, SavePickerWindow } from './types/settingsTransfer';

export type { ActionResult, SaveFilePickerHandle, SavePickerWindow } from './types/settingsTransfer';

export const DEFAULT_EXPORT_FILE_NAME = 'sticky-playground-document.json';
export const DEFAULT_SITE_EXPORT_ZIP_FILE_NAME = 'sticky-playground-site.zip';


export function normalizeFileName(input: string, fallback: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }
  const extensionMatch = fallback.match(/(\.[a-z0-9]+)$/i);
  const extension = extensionMatch?.[1] ?? '';
  if (!extension) {
    return trimmed;
  }
  const trimmedExtensionMatch = trimmed.match(/(\.[a-z0-9]+)$/i);
  if (!trimmedExtensionMatch) {
    return `${trimmed}${extension}`;
  }
  const trimmedExtension = trimmedExtensionMatch[1];
  if (trimmedExtension.toLowerCase() === extension.toLowerCase()) {
    return trimmed;
  }
  return `${trimmed.slice(0, -trimmedExtension.length)}${extension}`;
}

export function downloadBlob(blob: Blob, fileName: string, urlFactory: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL) {
  const url = urlFactory.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => urlFactory.revokeObjectURL(url), 0);
}

export async function copyExportDocument(
  documentJson: string,
  clipboard: Pick<Clipboard, 'writeText'> = navigator.clipboard,
): Promise<ActionResult> {
  return copyTextExport(documentJson, {
    successMessage: 'Document JSON copied.',
    failureMessage: 'Clipboard copy failed.',
    clipboard,
  });
}

export async function pasteClipboardImport(
  clipboard: Pick<Clipboard, 'readText'> = navigator.clipboard,
): Promise<{ status: ActionResult; text?: string }> {
  try {
    const text = await clipboard.readText();
    return {
      text,
      status: { ok: true, message: 'Clipboard JSON pasted into the import box.' },
    };
  } catch {
    return {
      status: { ok: false, message: 'Clipboard read failed.' },
    };
  }
}

export async function saveExportDocument(
  documentJson: string,
  {
    fileName = DEFAULT_EXPORT_FILE_NAME,
    windowLike = window as unknown as SavePickerWindow,
    download = downloadBlob,
  }: {
    fileName?: string;
    windowLike?: SavePickerWindow;
    download?: (blob: Blob, fileName: string) => void;
  } = {},
) {
  return saveTextExport(documentJson, {
    fileName,
    fallbackFileName: DEFAULT_EXPORT_FILE_NAME,
    mimeType: 'application/json',
    description: 'JSON document',
    accept: {
      'application/json': ['.json'],
    },
    windowLike,
    download,
    successMessage: 'Document saved to file.',
    downloadMessage: (normalizedFileName) => `Downloaded ${normalizedFileName}.`,
    failureMessage: 'File export failed.',
  });
}

export async function saveExportSiteZip(
  files: Record<string, string>,
  {
    fileName = DEFAULT_SITE_EXPORT_ZIP_FILE_NAME,
    windowLike = window as unknown as SavePickerWindow,
    download = downloadBlob,
    createZip = createZipArchive,
  }: {
    fileName?: string;
    windowLike?: SavePickerWindow;
    download?: (blob: Blob, fileName: string) => void;
    createZip?: (files: Record<string, string>) => Promise<Blob>;
  } = {},
): Promise<ActionResult | null> {
  const blob = await createZip(files);
  const normalizedFileName = normalizeFileName(fileName, DEFAULT_SITE_EXPORT_ZIP_FILE_NAME);

  try {
    if (windowLike.showSaveFilePicker) {
      const handle = await windowLike.showSaveFilePicker({
        suggestedName: normalizedFileName,
        types: [
          {
            description: 'ZIP archive',
            accept: {
              'application/zip': ['.zip'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, message: 'Site ZIP saved to file.' };
    }

    download(blob, normalizedFileName);
    return { ok: true, message: `Downloaded ${normalizedFileName}.` };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    return { ok: false, message: 'File export failed.' };
  }
}

async function copyTextExport(
  text: string,
  {
    successMessage,
    failureMessage,
    clipboard,
  }: {
    successMessage: string;
    failureMessage: string;
    clipboard: Pick<Clipboard, 'writeText'>;
  },
): Promise<ActionResult> {
  try {
    await clipboard.writeText(text);
    return { ok: true, message: successMessage };
  } catch {
    return { ok: false, message: failureMessage };
  }
}

async function saveTextExport(
  text: string,
  {
    fileName,
    fallbackFileName,
    mimeType,
    description,
    accept,
    windowLike,
    download,
    successMessage,
    downloadMessage,
    failureMessage,
  }: {
    fileName: string;
    fallbackFileName: string;
    mimeType: string;
    description: string;
    accept: Record<string, string[]>;
    windowLike: SavePickerWindow;
    download: (blob: Blob, fileName: string) => void;
    successMessage: string;
    downloadMessage: (normalizedFileName: string) => string;
    failureMessage: string;
  },
): Promise<ActionResult | null> {
  const blob = new Blob([text], { type: mimeType });
  const normalizedFileName = normalizeFileName(fileName, fallbackFileName);

  try {
    if (windowLike.showSaveFilePicker) {
      const handle = await windowLike.showSaveFilePicker({
        suggestedName: normalizedFileName,
        types: [
          {
            description,
            accept,
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, message: successMessage };
    }

    download(blob, normalizedFileName);
    return { ok: true, message: downloadMessage(normalizedFileName) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    return { ok: false, message: failureMessage };
  }
}

async function createZipArchive(files: Record<string, string>) {
  const { zipSync, strToU8 } = await import('fflate');
  const entries = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, strToU8(content)]),
  );
  const data = zipSync(entries, { level: 6 });
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: 'application/zip' });
}
