import type { StageSceneProps } from '../types';

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
