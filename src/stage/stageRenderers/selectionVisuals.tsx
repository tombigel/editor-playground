import type { MouseEvent } from 'react';
import { ResizeHandleView } from './resizeHandles';
import type { ResizeHandle, StageSceneProps } from '../types';

export function MultiSelectionOutline({ bounds }: { bounds: NonNullable<StageSceneProps['multiSelectionBounds']> }) {
  return (
    <div
      className="stage-multi-selection-outline"
      style={{
        left: `${bounds.left - 1}px`,
        top: `${bounds.top - 1}px`,
        width: `${bounds.width + 2}px`,
        height: `${bounds.height + 2}px`,
      }}
    />
  );
}

export function SingleSelectionOverlay({
  overlay,
  onHandleMouseDown,
}: {
  overlay: NonNullable<StageSceneProps['singleSelectionOverlay']>;
  onHandleMouseDown: (handle: ResizeHandle, event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="stage-single-selection-overlay"
      style={{
        left: `${overlay.bounds.left - 2}px`,
        top: `${overlay.bounds.top - 2}px`,
        width: `${overlay.bounds.width + 4}px`,
        height: `${overlay.bounds.height + 4}px`,
      }}
    >
      <div className="stage-single-selection-label">
        {overlay.label}
      </div>
      <div className="stage-single-selection-outline" />
      <ResizeHandleView
        handles={overlay.handles}
        wideSouthHandle={overlay.wideSouthHandle}
        onHandleMouseDown={onHandleMouseDown}
      />
    </div>
  );
}
