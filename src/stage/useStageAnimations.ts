import { useEffect, useMemo, useRef, useCallback } from 'react';
import type { DocumentModel } from '../model/types';
import type { AnimationPreviewState } from '../editor/types';
import type { AnimationInvokeAction, AnimationPreviewHandle, AnimationTriggerType } from '../animations/types';
import { createAnimationPreview, buildPreviewConfig } from '../animations/animationRuntime';

const PASSIVE_DISABLED: AnimationTriggerType[] = ['click'];

function buildEffectiveTriggers(
  preview: AnimationPreviewState,
): Record<AnimationTriggerType, boolean> | null {
  if (!preview.enabled) return null;
  const base = { ...preview.triggers };
  if (preview.mode === 'passive') {
    for (const t of PASSIVE_DISABLED) {
      base[t] = false;
    }
  }
  return base;
}

export function useStageAnimations(
  document: DocumentModel,
  animationPreview: AnimationPreviewState,
): { invoke: (nodeId: string, action: AnimationInvokeAction) => void } {
  const effectiveTriggers = useMemo(
    () => buildEffectiveTriggers(animationPreview),
    [animationPreview],
  );

  const handleRef = useRef<AnimationPreviewHandle | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!effectiveTriggers) {
      handleRef.current?.destroy();
      handleRef.current = null;
      return;
    }

    // Debounce rapid document changes (drag, resize, typing), but
    // use a short delay to let React commit DOM updates first.
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const config = buildPreviewConfig(document, effectiveTriggers);

      // Always tear down and recreate: Interact scans for data-interact-key
      // elements at create() time via add(), so a config update alone won't
      // pick up new/removed animated nodes in the DOM.
      handleRef.current?.destroy();
      handleRef.current = createAnimationPreview(config);
    }, 50);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [document, effectiveTriggers]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  const invoke = useCallback((nodeId: string, action: AnimationInvokeAction) => {
    handleRef.current?.invoke(nodeId, action);
  }, []);

  return { invoke };
}
