import { useState } from 'react';
import type { ComputedWrapperStickyState, DocumentNode } from '../model/types';
import { formatValue } from '../model/units';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  errors: string[];
  stickyState: Record<string, ComputedWrapperStickyState>;
  selectedNode: DocumentNode | null;
  onExport: () => Promise<boolean>;
  onReset: () => void;
};

export function DebugPanel({ errors, stickyState, selectedNode, onExport, onReset }: Props) {
  const [exportState, setExportState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleExport() {
    const success = await onExport();
    setExportState(success ? 'copied' : 'error');
    window.setTimeout(() => setExportState('idle'), 2000);
  }

  return (
    <section className="flex max-h-[56vh] flex-col gap-3 overflow-auto p-4">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Debug</div>
          <div className="text-sm text-slate-600">Validation and computed sticky state</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="min-w-[110px]" onClick={handleExport}>
            {exportState === 'copied' ? 'Copied' : exportState === 'error' ? 'Copy failed' : 'Export data'}
          </Button>
          <Button type="button" variant="destructive" size="sm" className="min-w-[110px]" onClick={onReset}>
            Reset stage
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-none">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          {errors.length === 0 ? <p>No errors.</p> : errors.map((error) => <p key={error}>{error}</p>)}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-none">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Sticky math</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-600">
          {Object.values(stickyState).length === 0 ? (
            <p>No sticky registrations.</p>
          ) : (
            Object.values(stickyState).map((state) => (
              <div key={state.wrapperId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="font-medium text-slate-900">{state.wrapperId}</div>
                <div className="mt-1">extra extent: {Math.round(state.totalExtraExtentPx)}px</div>
                <div className="mt-2 space-y-1">
                  {state.registrations.map((registration) => (
                    <div key={registration.ownerId}>
                      {registration.ownerId}: start {Math.round(registration.startPx)}px, end{' '}
                      {Math.round(registration.endPx)}px, overflow {Math.round(registration.extentPx)}px
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selectedNode && selectedNode.type !== 'site' ? (
        <Card className="rounded-2xl border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Selected node parsed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              width: {formatValue(selectedNode.rect.width.base.parsed)}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              height: {formatValue(selectedNode.rect.height.base.parsed)}
            </div>
            {selectedNode.sticky ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                duration: {selectedNode.sticky.durationMode === 'auto' ? 'auto' : formatValue(selectedNode.sticky.duration.parsed)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
