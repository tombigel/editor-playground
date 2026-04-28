import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import type { InspectorActionHandlers, NonSiteInspectorNode } from './types';
import type { InspectorSectionHeaderAction } from './CommonSections';
import { Rocket } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { NoticeSurface } from '@/components/ui/settings-panel';
import { FormField, SwitchBlock } from '../InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard } from './CommonSections';
import { hasAnimation, getAnimationSummary, isScrollAnimation, requiresStickyForAnimation } from '../../animations/selectors';
import type { AnimationTimingOptions, AnimationTriggerType, OngoingTimingOptions } from '../../api/animationApi';
import { AdvancedAnimationControls } from './animation/AdvancedAnimationControls';
import { PresetParamControls } from './animation/PresetParamControls';
import { TimingControls } from './animation/TimingControls';
import { TriggerEffectControls } from './animation/TriggerEffectControls';
import { ANIMATION_DIVIDER_CLASS, defaultPresetForTrigger, hasTiming } from './animation/utils';

export function AnimationSection({
  node,
  actions,
  focusedMode,
  headerContent,
  headerAction,
  contentClassName,
}: {
  node: NonSiteInspectorNode;
  actions: Pick<
    InspectorActionHandlers,
    | 'onAnimationPresetChange'
    | 'onAnimationOptionsChange'
    | 'onAnimationClear'
    | 'onEnterFocusedMode'
  >;
  focusedMode: FocusedMode;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
}) {
  const enabled = hasAnimation(node);
  const summary = getAnimationSummary(node);
  const trigger = (summary?.trigger ?? 'entrance') as AnimationTriggerType;
  const effectKind = summary?.effectKind ?? 'named';
  const effectName = summary?.effectName ?? '';
  const currentEffectParams = node.animation?.effect.kind === 'named' ? node.animation.effect : {};
  const timing = (node.animation && 'timing' in node.animation ? node.animation.timing : undefined) as
    | (AnimationTimingOptions & { iterations?: number; alternate?: boolean })
    | undefined;

  function handleToggle(checked: boolean) {
    if (checked) {
      actions.onAnimationPresetChange('entrance', defaultPresetForTrigger('entrance'));
    } else {
      actions.onAnimationClear();
    }
  }

  return (
    <InspectorSectionCard
      title="Animation"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode, 'animation', actions.onEnterFocusedMode)}
    >
      <SwitchBlock
        icon={
          enabled
            ? <Rocket className="h-3.5 w-3.5 shrink-0 editor-text-accent" />
            : <Rocket className="h-3.5 w-3.5 shrink-0 editor-text-muted" />
        }
        title={enabled ? 'Enabled' : 'Disabled'}
        description="Add motion effects to this element."
        checked={enabled}
        onCheckedChange={handleToggle}
      />

      {enabled ? (
        <>
          <TriggerEffectControls
            trigger={trigger}
            currentPreset={summary?.effectKind === 'named' ? summary.effectName : ''}
            effectKind={effectKind}
            effectName={effectName}
            currentEffectParams={currentEffectParams}
            onPresetChange={actions.onAnimationPresetChange}
          />

          <div aria-hidden="true" className={ANIMATION_DIVIDER_CLASS} />

          {hasTiming(trigger) ? (
            <TimingControls
              trigger={trigger}
              effectKind={effectKind}
              preset={summary?.effectKind === 'named' ? summary.effectName : null}
              timing={timing}
              currentEffectParams={currentEffectParams}
              onTimingChange={(updates: AnimationTimingOptions | OngoingTimingOptions) =>
                actions.onAnimationOptionsChange({ timing: updates })
              }
              onEffectParamsChange={(params) =>
                actions.onAnimationOptionsChange({ effectOptions: params })
              }
            />
          ) : null}

          {summary?.effectKind === 'named' ? (
            <PresetParamControls
              trigger={trigger}
              preset={summary.effectName}
              currentParams={currentEffectParams}
              onParamChange={(params) =>
                actions.onAnimationOptionsChange({ effectOptions: params })
              }
            />
          ) : null}

          <AdvancedAnimationControls
            node={node}
            trigger={trigger}
            effectKind={effectKind}
            effectName={summary?.effectName ?? null}
            onOptionsChange={actions.onAnimationOptionsChange}
          />

          {isScrollAnimation(node) ? (
            <>
              <FormField label="Requires sticky" layout="inline">
                <Switch
                  checked={requiresStickyForAnimation(node)}
                  onCheckedChange={(checked) => actions.onAnimationOptionsChange({ requiresSticky: checked })}
                />
              </FormField>
              {requiresStickyForAnimation(node) && !node.sticky?.enabled ? (
                <NoticeSurface tone="info" className="px-2.5 py-1.5 text-[11px] leading-4">
                  Enable sticky to use this animation effectively.
                </NoticeSurface>
              ) : null}
            </>
          ) : null}

          <FormField label="Disable under reduced motion" layout="inline">
            <Switch
              checked={node.animation?.reducedMotion === 'disable'}
              onCheckedChange={(checked) =>
                actions.onAnimationOptionsChange({ reducedMotion: checked ? 'disable' : undefined })
              }
            />
          </FormField>
        </>
      ) : null}
    </InspectorSectionCard>
  );
}
