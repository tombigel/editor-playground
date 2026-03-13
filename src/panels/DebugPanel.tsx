import type { ComputedWrapperStickyState } from '../model/types';

type Props = {
  errors: string[];
  stickyState: Record<string, ComputedWrapperStickyState>;
  previewSticky: boolean;
  showSpacers: boolean;
  onPreviewStickyChange: (value: boolean) => void;
  onShowSpacersChange: (value: boolean) => void;
  onReset: () => void;
};

export function DebugPanel({
  errors,
  stickyState,
  previewSticky,
  showSpacers,
  onPreviewStickyChange,
  onShowSpacersChange,
  onReset,
}: Props) {
  return (
    <section className="panel debug-panel">
      <h2>Debug</h2>
      <div className="panel-group">
        <label className="row">
          <span>Preview sticky</span>
          <input
            type="checkbox"
            checked={previewSticky}
            onChange={(e) => onPreviewStickyChange(e.target.checked)}
          />
        </label>
        <label className="row">
          <span>Show spacers</span>
          <input
            type="checkbox"
            checked={showSpacers}
            onChange={(e) => onShowSpacersChange(e.target.checked)}
          />
        </label>
      </div>
      <div className="panel-group">
        <button type="button" className="danger" onClick={onReset}>
          Reset stage
        </button>
      </div>
      <div className="panel-group">
        <h3>Validation</h3>
        {errors.length === 0 ? <p>No errors.</p> : errors.map((error) => <p key={error}>{error}</p>)}
      </div>
      <div className="panel-group">
        <h3>Sticky</h3>
        {Object.values(stickyState).map((state) => (
          <div key={state.wrapperId} className="debug-card">
            <strong>{state.wrapperId}</strong>
            <div>extra extent: {Math.round(state.totalExtraExtentPx)}px</div>
            {state.registrations.map((registration) => (
              <div key={registration.ownerId}>
                {registration.ownerId}: start {Math.round(registration.startPx)}px, end{' '}
                {Math.round(registration.endPx)}px, overflow {Math.round(registration.extentPx)}px
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
