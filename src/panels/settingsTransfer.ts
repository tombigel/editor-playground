export type ActionResult = {
  ok: boolean;
  message: string;
};

export const DEFAULT_EXPORT_FILE_NAME = 'sticky-playground-document.json';

export type SaveFilePickerHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export type SavePickerWindow = {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFilePickerHandle>;
};

export function normalizeFileName(input: string, fallback: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.endsWith('.json') ? trimmed : `${trimmed}.json`;
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
  try {
    await clipboard.writeText(documentJson);
    return { ok: true, message: 'Document JSON copied.' };
  } catch {
    return { ok: false, message: 'Clipboard copy failed.' };
  }
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
): Promise<ActionResult | null> {
  const blob = new Blob([documentJson], { type: 'application/json' });
  const normalizedFileName = normalizeFileName(fileName, DEFAULT_EXPORT_FILE_NAME);

  try {
    if (windowLike.showSaveFilePicker) {
      const handle = await windowLike.showSaveFilePicker({
        suggestedName: normalizedFileName,
        types: [
          {
            description: 'JSON document',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, message: 'Document saved to file.' };
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
