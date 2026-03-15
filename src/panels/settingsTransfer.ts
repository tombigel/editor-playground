export type ActionResult = {
  ok: boolean;
  message: string;
};

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
  prompt: (message?: string, defaultValue?: string) => string | null;
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
    windowLike = window as unknown as SavePickerWindow,
    download = downloadBlob,
  }: {
    windowLike?: SavePickerWindow;
    download?: (blob: Blob, fileName: string) => void;
  } = {},
): Promise<ActionResult | null> {
  const blob = new Blob([documentJson], { type: 'application/json' });
  const suggestedName = 'sticky-playground-document.json';

  try {
    if (windowLike.showSaveFilePicker) {
      const handle = await windowLike.showSaveFilePicker({
        suggestedName,
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

    const enteredName = windowLike.prompt('File name', suggestedName);
    if (enteredName === null) {
      return null;
    }
    const fileName = normalizeFileName(enteredName, suggestedName);
    download(blob, fileName);
    return { ok: true, message: `Downloaded ${fileName}.` };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    return { ok: false, message: 'File export failed.' };
  }
}
