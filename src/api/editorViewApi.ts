/**
 * @module editorViewApi
 *
 * Pass-through re-exports from the stage subsystem.
 * Provides the interactive editor canvas (Stage) component.
 */

import { Stage as StageComponent, type StageProps } from '../stage/Stage';

/** React component that renders the interactive editor stage (canvas). */
export const Stage = StageComponent;

export type { StageProps };
