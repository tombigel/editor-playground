import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import type { AnimationTriggerType } from '../../api/animationApi';
import type { InspectorActionHandlers, NonSiteInspectorNode } from './types';
import type { InspectorSectionHeaderAction } from './CommonSections';
import { Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LabeledControlRow, NoticeSurface } from '@/components/ui/settings-panel';
import { FormField, SwitchBlock } from '../InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard } from './CommonSections';
import { hasAnimation, getAnimationSummary, isScrollAnimation, requiresStickyForAnimation } from '../../animations/selectors';
import type { HoverOutAction } from '../../animations/types';

// ── Trigger display labels ────────────────────────────────────────────────────

const TRIGGER_OPTIONS: { value: AnimationTriggerType; label: string }[] = [
  { value: 'entrance', label: 'Entrance' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'click', label: 'Click' },
  { value: 'hover', label: 'Hover' },
  { value: 'mouse', label: 'Mouse' },
];

function defaultPresetForTrigger(trigger: AnimationTriggerType): string {
  switch (trigger) {
    case 'entrance': return 'FadeIn';
    case 'ongoing': return 'Pulse';
    case 'scroll': return 'FadeScroll';
    case 'click': return 'FadeIn';
    case 'hover': return 'FadeIn';
    case 'mouse': return 'TrackMouse';
    default: return 'FadeIn';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  function handleToggle(checked: boolean) {
    if (checked) {
      actions.onAnimationPresetChange('entrance', 'FadeIn');
    } else {
      actions.onAnimationClear();
    }
  }

  function handleTriggerChange(value: string) {
    const trigger = value as AnimationTriggerType;
    actions.onAnimationPresetChange(trigger, defaultPresetForTrigger(trigger));
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
            ? <Sparkles className="h-3.5 w-3.5 shrink-0 editor-text-accent" />
            : <Sparkles className="h-3.5 w-3.5 shrink-0 editor-text-muted" />
        }
        title={enabled ? 'Enabled' : 'Disabled'}
        description="Add motion effects to this element."
        checked={enabled}
        onCheckedChange={handleToggle}
      />

      {enabled ? (
        <>
          <FormField label="Trigger">
            <Select
              value={summary?.trigger ?? 'entrance'}
              onValueChange={handleTriggerChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {summary ? (
            <FormField label="Effect">
              <div className="flex items-center gap-2">
                <span className="editor-text-strong text-xs font-medium">{summary.effectName}</span>
                <span className="editor-bg-subtle editor-border-subtle editor-text-muted rounded border px-1.5 py-0.5 text-[10px]">
                  {summary.effectKind}
                </span>
              </div>
            </FormField>
          ) : null}

          {/* T12: Hover out-action selector */}
          {(summary?.trigger === 'hover' || summary?.trigger === 'interest') ? (
            <FormField label="On leave">
              <Select
                value={('outAction' in node && (node as { outAction?: HoverOutAction }).outAction) ?? 'reverse'}
                onValueChange={(value) => actions.onAnimationOptionsChange({ outAction: value as HoverOutAction })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reverse">Reverse</SelectItem>
                  <SelectItem value="keep">Keep</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          {/* T14: Requires sticky toggle */}
          {isScrollAnimation(node) ? (
            <>
              <LabeledControlRow
                label="Requires sticky"
                className="gap-3"
                labelClassName="text-[11px] font-medium"
                controlClassName="shrink-0"
              >
                <Switch
                  checked={requiresStickyForAnimation(node)}
                  onCheckedChange={(checked) => actions.onAnimationOptionsChange({ requiresSticky: checked })}
                />
              </LabeledControlRow>
              {requiresStickyForAnimation(node) && !node.sticky?.enabled ? (
                <NoticeSurface tone="info" className="px-2.5 py-1.5 text-[11px] leading-4">
                  Enable sticky to use this animation effectively.
                </NoticeSurface>
              ) : null}
            </>
          ) : null}

          {/* T13: Reduced-motion toggle */}
          <LabeledControlRow
            label="Disable under reduced motion"
            className="gap-3"
            labelClassName="text-[11px] font-medium"
            controlClassName="shrink-0"
          >
            <Switch
              checked={node.animation?.reducedMotion === 'disable'}
              onCheckedChange={(checked) =>
                actions.onAnimationOptionsChange({ reducedMotion: checked ? 'disable' : undefined })
              }
            />
          </LabeledControlRow>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={actions.onAnimationClear}
              aria-label="Clear animation"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </>
      ) : null}
    </InspectorSectionCard>
  );
}
