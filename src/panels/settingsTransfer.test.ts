import { describe, expect, it, vi } from 'vitest';
import {
  copyExportDocument,
  normalizeFileName,
  pasteClipboardImport,
  saveExportDocument,
} from './settingsTransfer';

describe('panels/settingsTransfer', () => {
  it('normalizes fallback file names for prompt-based export', () => {
    expect(normalizeFileName('landing-page', 'sticky-playground-document.json')).toBe('landing-page.json');
    expect(normalizeFileName(' report.json ', 'sticky-playground-document.json')).toBe('report.json');
    expect(normalizeFileName('   ', 'sticky-playground-document.json')).toBe('sticky-playground-document.json');
  });

  it('uses the save picker when it is available', async () => {
    const write = vi.fn<(_: Blob) => Promise<void>>().mockResolvedValue(undefined);
    const close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: async () => ({ write, close }),
    });

    const result = await saveExportDocument('{"hello":"world"}', {
      windowLike: {
        showSaveFilePicker,
        prompt: () => null,
      },
    });

    expect(result).toEqual({ ok: true, message: 'Document saved to file.' });
    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: 'sticky-playground-document.json',
      }),
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(await write.mock.calls[0]?.[0]?.text()).toBe('{"hello":"world"}');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('falls back to prompt and download when the save picker is unavailable', async () => {
    const download = vi.fn();

    const result = await saveExportDocument('{"hello":"world"}', {
      windowLike: {
        prompt: () => 'landing-page',
      },
      download,
    });

    expect(result).toEqual({ ok: true, message: 'Downloaded landing-page.json.' });
    expect(download).toHaveBeenCalledTimes(1);
    expect(download.mock.calls[0]?.[1]).toBe('landing-page.json');
    expect(await download.mock.calls[0]?.[0]?.text()).toBe('{"hello":"world"}');
  });

  it('treats save picker aborts as a no-op', async () => {
    const result = await saveExportDocument('{"hello":"world"}', {
      windowLike: {
        showSaveFilePicker: async () => {
          const error = new Error('cancelled');
          error.name = 'AbortError';
          throw error;
        },
        prompt: () => null,
      },
    });

    expect(result).toBeNull();
  });

  it('returns an error status when export fails', async () => {
    const result = await saveExportDocument('{"hello":"world"}', {
      windowLike: {
        prompt: () => {
          throw new Error('prompt failed');
        },
      },
    });

    expect(result).toEqual({ ok: false, message: 'File export failed.' });
  });

  it('copies document JSON to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(copyExportDocument('{"hello":"world"}', { writeText })).resolves.toEqual({
      ok: true,
      message: 'Document JSON copied.',
    });
    expect(writeText).toHaveBeenCalledWith('{"hello":"world"}');
  });

  it('returns a clipboard failure status when copy fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('no clipboard'));

    await expect(copyExportDocument('{"hello":"world"}', { writeText })).resolves.toEqual({
      ok: false,
      message: 'Clipboard copy failed.',
    });
  });

  it('returns imported clipboard text and status on success', async () => {
    const readText = vi.fn().mockResolvedValue('{"from":"clipboard"}');

    await expect(pasteClipboardImport({ readText })).resolves.toEqual({
      text: '{"from":"clipboard"}',
      status: { ok: true, message: 'Clipboard JSON pasted into the import box.' },
    });
  });

  it('returns a failure status when clipboard import fails', async () => {
    const readText = vi.fn().mockRejectedValue(new Error('no clipboard'));

    await expect(pasteClipboardImport({ readText })).resolves.toEqual({
      status: { ok: false, message: 'Clipboard read failed.' },
    });
  });
});
