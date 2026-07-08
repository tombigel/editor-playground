import type { MouseEvent } from 'react';
import { Repeat, Layers2, Pin } from 'lucide-react';
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
  const Icon = overlay.icon;
  return (
    <div
      className="stage-single-selection-overlay"
      data-hidden={overlay.isHidden ? 'true' : 'false'}
      data-node-id={overlay.nodeId}
      style={{
        left: `${overlay.bounds.left - 2}px`,
        top: `${overlay.bounds.top - 2}px`,
        width: `${overlay.bounds.width + 4}px`,
        height: `${overlay.bounds.height + 4}px`,
      }}
    >
      <div className="stage-single-selection-label">
        {Icon ? <Icon className="stage-single-selection-label-icon h-3.5 w-3.5" /> : null}
        {overlay.label}
        {(overlay.isSticky || overlay.hasAnimation || overlay.isElevated) && (
          <span className="stage-single-selection-label-badges">
            {overlay.isSticky && <Pin className="h-3 w-3" />}
            {overlay.hasAnimation && <Repeat className="h-3 w-3" />}
            {overlay.isElevated && <Layers2 className="h-3 w-3" />}
          </span>
        )}
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
