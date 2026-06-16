import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EXPORT_FILE_NAME,
  DEFAULT_SITE_EXPORT_ZIP_FILE_NAME,
  copyExportDocument,
  normalizeFileName,
  pasteClipboardImport,
  saveExportDocument,
  saveExportSiteZip,
} from '../settingsTransfer';

describe('panels/settingsTransfer', () => {
  it('normalizes fallback file names for prompt-based export', () => {
    expect(normalizeFileName('landing-page', 'editor-playground-document.json')).toBe('landing-page.json');
    expect(normalizeFileName(' report.json ', 'editor-playground-document.json')).toBe('report.json');
    expect(normalizeFileName('   ', 'editor-playground-document.json')).toBe('editor-playground-document.json');
    expect(normalizeFileName('landing-page', 'editor-playground-site.zip')).toBe('landing-page.zip');
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
      },
    });

    expect(result).toEqual({ ok: true, message: 'Document saved to file.' });
    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: DEFAULT_EXPORT_FILE_NAME,
      }),
    );
    expect(write).toHaveBeenCalledTimes(1);
    expect(await write.mock.calls[0]?.[0]?.text()).toBe('{"hello":"world"}');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('falls back to prompt and download when the save picker is unavailable', async () => {
    const download = vi.fn();

    const result = await saveExportDocument('{"hello":"world"}', {
      fileName: 'landing-page',
      windowLike: {
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
      },
    });

    expect(result).toBeNull();
  });

  it('returns an error status when export fails', async () => {
    const result = await saveExportDocument('{"hello":"world"}', {
      fileName: 'landing-page',
      windowLike: {
        showSaveFilePicker: async () => {
          throw new Error('prompt failed');
        },
      },
    });

    expect(result).toEqual({ ok: false, message: 'File export failed.' });
  });

  it('normalizes fallback download names without prompting', async () => {
    const download = vi.fn();

    const result = await saveExportDocument('{"hello":"world"}', {
      fileName: '  custom-name  ',
      windowLike: {},
      download,
    });

    expect(result).toEqual({ ok: true, message: 'Downloaded custom-name.json.' });
    expect(download.mock.calls[0]?.[1]).toBe('custom-name.json');
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

  it('saves site zip with zip defaults', async () => {
    const download = vi.fn();
    const createZip = vi.fn().mockResolvedValue(new Blob(['zip-data'], { type: 'application/zip' }));

    const result = await saveExportSiteZip(
      {
        'index.html': '<!doctype html>',
        'index.css': '.sp-site {}',
      },
      {
        windowLike: {},
        download,
        createZip,
      },
    );

    expect(result).toEqual({ ok: true, message: `Downloaded ${DEFAULT_SITE_EXPORT_ZIP_FILE_NAME}.` });
    expect(createZip).toHaveBeenCalledWith({
      'index.html': '<!doctype html>',
      'index.css': '.sp-site {}',
    });
    expect(download).toHaveBeenCalledTimes(1);
    expect(download.mock.calls[0]?.[1]).toBe(DEFAULT_SITE_EXPORT_ZIP_FILE_NAME);
    expect(await download.mock.calls[0]?.[0]?.text()).toBe('zip-data');
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
