import { formatValue } from '@/api/documentApi';
import type {
  DocumentNode,
  StickyLayoutState,
} from '@/api/editorApi';
import {
  PlainGroup,
  SectionHeading,
} from '@/components/ui/settings-panel';

type DiagnosticsSettingsSectionProps = {
  errors: string[];
  stickyLayout: StickyLayoutState;
  selectedNode: DocumentNode | null;
};

export function DiagnosticsSettingsSection({
  errors,
  stickyLayout,
  selectedNode,
}: DiagnosticsSettingsSectionProps) {
  const hasStickyRegistrations = Object.values(stickyLayout).length > 0;

  return (
    <>
      <SectionHeading
        eyebrow="Debug Info"
        title="Validation and sticky math"
        description="Validation and computed sticky ranges."
      />
      <PlainGroup title="Validation">
        <div className="editor-text-muted space-y-2 text-sm">
          {errors.length === 0 ? (
            <p>No errors.</p>
          ) : (
            errors.map((error) => <p key={error}>{error}</p>)
          )}
        </div>
      </PlainGroup>

      <div className="mt-6">
        <div className="editor-text-strong mb-3 text-sm font-medium">
          Sticky math
        </div>
        {hasStickyRegistrations ? (
          <div className="editor-text-muted space-y-3 text-xs">
            {Object.values(stickyLayout).map((entry) => (
              <div
                key={entry.wrapperId}
                className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-3"
              >
                <div className="editor-text-strong font-medium">
                  {entry.wrapperId}
                </div>
                <div className="mt-1">
                  extra extent: {Math.round(entry.totalExtraExtentPx)}px
                </div>
                <div className="mt-2 space-y-1">
                  {entry.registrations.map((registration) => (
                    <div key={registration.ownerId}>
                      {registration.ownerId}: start{' '}
                      {Math.round(registration.startPx)}px, end{' '}
                      {Math.round(registration.endPx)}px, overflow{' '}
                      {Math.round(registration.extentPx)}px
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="editor-text-muted text-sm">
            No sticky registrations.
          </div>
        )}
      </div>

      {selectedNode && selectedNode.type !== 'site' ? (
        <div className="mt-6">
          <div className="editor-text-strong mb-3 text-sm font-medium">
            Selected node
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCell
              label="Width"
              value={formatValue(selectedNode.rect.width.base.parsed)}
            />
            <MetricCell
              label="Height"
              value={formatValue(selectedNode.rect.height.base.parsed)}
            />
            <MetricCell
              label="Duration"
              value={
                selectedNode.sticky
                  ? selectedNode.sticky.durationMode === 'auto'
                    ? 'auto'
                    : `${formatValue(selectedNode.sticky.duration.parsed)} · top ${formatValue(
                        (
                          selectedNode.sticky.durationTop ??
                          selectedNode.sticky.duration
                        ).parsed,
                      )} · bottom ${formatValue(
                        (
                          selectedNode.sticky.durationBottom ??
                          selectedNode.sticky.duration
                        ).parsed,
                      )}`
                  : 'not sticky'
              }
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-2">
      <div className="editor-text-muted text-[11px] font-medium">{label}</div>
      <div className="editor-text-strong mt-1 text-sm">{value}</div>
    </div>
  );
}
