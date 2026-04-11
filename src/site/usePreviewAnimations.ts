import { useEffect, useRef } from 'react';
import type { DocumentModel } from '../model/types';
import type { AnimationPreviewHandle } from '../animations/types';
import { createAnimationPreview } from '../animations/animationRuntime';
import { buildDocumentInteractConfig } from '../animations/animationApi';

/**
 * Initializes the @wix/interact animation runtime for preview mode.
 * Unlike `useStageAnimations` (which supports selective trigger toggling),
 * this hook enables all animations unconditionally — matching what the
 * exported site would do.
 */
export function usePreviewAnimations(document: DocumentModel): void {
  const handleRef = useRef<AnimationPreviewHandle | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const generation = ++generationRef.current;

    debounceRef.current = setTimeout(() => {
      const config = buildDocumentInteractConfig(document);

      handleRef.current?.destroy();
      handleRef.current = null;

      void createAnimationPreview(config).then((handle) => {
        if (generationRef.current === generation) {
          handleRef.current = handle;
        } else {
          handle.destroy();
        }
      });
    }, 50);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [document]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);
}
