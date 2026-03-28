import type { ChangeEvent, MutableRefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DocumentModel } from '@/api/editorApi';
import {
  type ActionResult,
  copyExportDocument,
  pasteClipboardImport,
  saveExportDocument,
  saveExportSiteZip,
} from '../settingsTransfer';

const DEFAULT_EXPORT_BASENAME = 'sticky-playground';

type UseSettingsTransferStateParams = {
  document: DocumentModel;
  documentJson: string;
  onImport: (raw: string) => Promise<ActionResult> | ActionResult;
};

export type SettingsTransferState = {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  importBuffer: string;
  setImportBuffer: (value: string) => void;
  exportFileName: string;
  setExportFileName: (value: string) => void;
  exportStatus: ActionResult | null;
  importStatus: ActionResult | null;
  handleCopyExport: () => Promise<void>;
  handleSaveExport: () => Promise<void>;
  handleSaveSiteZip: () => Promise<void>;
  handlePasteFromClipboard: () => Promise<void>;
  handleImportBuffer: () => Promise<void>;
  handleFileSelection: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

export function useSettingsTransferState({
  document,
  documentJson,
  onImport,
}: UseSettingsTransferStateParams): SettingsTransferState {
  const [importBuffer, setImportBuffer] = useState('');
  const [exportFileName, setExportFileName] = useState(DEFAULT_EXPORT_BASENAME);
  const [exportStatus, setExportStatus] = useState<ActionResult | null>(null);
  const [importStatus, setImportStatus] = useState<ActionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!exportStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setExportStatus(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [exportStatus]);

  useEffect(() => {
    if (!importStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setImportStatus(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [importStatus]);

  async function handleCopyExport() {
    setExportStatus(await copyExportDocument(documentJson));
  }

  async function handleSaveExport() {
    const result = await saveExportDocument(documentJson, {
      fileName: exportFileName,
    });
    if (result) {
      setExportStatus(result);
    }
  }

  async function handleSaveSiteZip() {
    const bundle = await loadSiteExportBundle(document, exportFileName);
    const zipFileName = bundle.htmlFileName.replace(/\.[a-z0-9]+$/i, '.zip');
    const result = await saveExportSiteZip(
      {
        [bundle.htmlFileName]: bundle.htmlDocument,
        [bundle.cssFileName]: bundle.css,
      },
      {
        fileName: zipFileName,
      },
    );
    if (result) {
      setExportStatus(result);
    }
  }

  async function handlePasteFromClipboard() {
    const result = await pasteClipboardImport();
    if (result.text != null) {
      setImportBuffer(result.text);
    }
    setImportStatus(result.status);
  }

  async function runImport(raw: string) {
    const result = await onImport(raw);
    setImportStatus(result);
  }

  async function handleImportBuffer() {
    await runImport(importBuffer);
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      setImportBuffer(raw);
      await runImport(raw);
    } catch {
      setImportStatus({ ok: false, message: 'File import failed.' });
    }
  }

  return {
    fileInputRef,
    importBuffer,
    setImportBuffer,
    exportFileName,
    setExportFileName,
    exportStatus,
    importStatus,
    handleCopyExport,
    handleSaveExport,
    handleSaveSiteZip,
    handlePasteFromClipboard,
    handleImportBuffer,
    handleFileSelection,
  };
}

async function loadSiteExportBundle(document: DocumentModel, exportFileName: string) {
  const { renderSiteExportBundle } = await import('@/api/siteApi');
  return renderSiteExportBundle(document, {
    title: getSiteTitle(exportFileName),
    htmlFileName: exportFileName,
  });
}

function getSiteTitle(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return 'Sticky Playground Site';
  }
  return trimmed.replace(/\.[a-z0-9]+$/i, '') || 'Sticky Playground Site';
}
