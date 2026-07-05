import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal } from 'lucide-react';
import {
  BorderControlGroup,
  FormField,
  InspectorFieldGroup,
  ShadowControlGroup,
  readShadowFieldValues,
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
} from '../../InspectorControls';
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_MEDIA_OBJECT_FIT_VIDEO,
} from '../../../api/documentViewApi';
import type { VideoInspectorNode } from '../types';
import type { EditorTextField } from '../../../api/documentApi';
import {
  applyLeafShadowPatch,
  applyUnifiedLeafBorderColor,
  applyUnifiedLeafBorderRadius,
  applyUnifiedLeafBorderWidth,
} from '../styleFields';
import {
  createFocusedModeEntry,
  InspectorSectionCard,
} from '../CommonSections';
import {
  type FocusModeCardProps,
  createShadowFallback,
} from './shared';
import { MediaFitFields } from './mediaFitFields';

const VIDEO_PLAYBACK_FLAGS: { field: EditorTextField; label: string; defaultValue: boolean }[] = [
  { field: 'videoControls', label: 'Controls', defaultValue: true },
  { field: 'videoMuted', label: 'Muted', defaultValue: true },
  { field: 'videoAutoplay', label: 'Autoplay', defaultValue: false },
  { field: 'videoLoop', label: 'Loop', defaultValue: false },
];

export function VideoContentSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: VideoInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const video = node.video;
  const readFlag = (field: EditorTextField, defaultValue: boolean) => {
    if (field === 'videoControls') return video?.controls ?? defaultValue;
    if (field === 'videoMuted') return video?.muted ?? defaultValue;
    if (field === 'videoAutoplay') return video?.autoplay ?? defaultValue;
    return video?.loop ?? defaultValue;
  };

  return (
    <InspectorSectionCard
      title="Content"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'content', onEnterFocusedMode)}
    >
      <InspectorFieldGroup>
        <FormField label="Src">
          <Input value={node.src ?? ''} onChange={(e) => onTextChange('src', e.target.value)} />
        </FormField>
        <FormField label="Poster">
          <Input
            value={video?.poster ?? ''}
            placeholder="Image URL shown before playback"
            onChange={(e) => onTextChange('videoPoster', e.target.value)}
          />
        </FormField>
        <FormField label="Label">
          <Input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
        </FormField>
      </InspectorFieldGroup>
      <div className="editor-border-subtle border-b" aria-hidden="true" />
      <InspectorFieldGroup gap>
        <div className="editor-text-muted flex items-center gap-1.5 text-[11px] font-medium">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Playback</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {VIDEO_PLAYBACK_FLAGS.map((flag) => (
            <Label key={flag.field} className="flex items-center justify-between gap-2 text-[11px] font-medium">
              {flag.label}
              <Switch
                checked={readFlag(flag.field, flag.defaultValue)}
                onCheckedChange={(checked) => onTextChange(flag.field, checked ? 'true' : 'false')}
              />
            </Label>
          ))}
        </div>
      </InspectorFieldGroup>
      <div className="editor-border-subtle border-b" aria-hidden="true" />
      <FormField label="Preload" layout="inline">
        <Select
          size="compact"
          value={video?.preload ?? 'auto'}
          onValueChange={(value) => onTextChange('videoPreload', value)}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="metadata">Metadata</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    </InspectorSectionCard>
  );
}

export function VideoDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: VideoInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const shadowFallback = createShadowFallback(DEFAULT_IMAGE_SHADOW_COLOR, 0, 0, 0, 0);
  const shadow = readShadowFieldValues(node.style, shadowFallback);

  return (
    <InspectorSectionCard
      title="Design"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode ?? null, 'design', onEnterFocusedMode)}
    >
      <MediaFitFields
        objectFit={node.style?.objectFit}
        objectPosition={node.style?.objectPosition}
        fitFallback={DEFAULT_MEDIA_OBJECT_FIT_VIDEO}
        onTextChange={onTextChange}
      />
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
        <Label className="pt-1 text-[11px] font-medium">Border</Label>
        <BorderControlGroup
          nodeId={node.id}
          colorValue={readUnifiedBorderColor(node.style) || DEFAULT_IMAGE_BORDER_COLOR}
          widthValue={readUnifiedBorderWidth(node.style)}
          radiusValue={readUnifiedBorderRadius(node.style)}
          onColorChange={(value) => applyUnifiedLeafBorderColor(onTextChange, value)}
          onWidthChange={(value) => applyUnifiedLeafBorderWidth(onTextChange, value)}
          onRadiusChange={(value) => applyUnifiedLeafBorderRadius(onTextChange, value)}
          colorFallback={DEFAULT_IMAGE_BORDER_COLOR}
          widthPlaceholder="0"
          radiusPlaceholder="0"
        />
      </div>
      <div className="space-y-1.5">
        <ShadowControlGroup
          color={shadow.color}
          blur={shadow.blur}
          spread={shadow.spread}
          distance={shadow.distance}
          angle={shadow.angle}
          colorFallback={DEFAULT_IMAGE_SHADOW_COLOR}
          supportsSpread
          onColorChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { color: value })}
          onBlurChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { blur: value })}
          onSpreadChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { spread: value })}
          onDistanceChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { distance: value })}
          onAngleChange={(value) => applyLeafShadowPatch(onTextChange, node.style, shadowFallback, { angle: value })}
        />
      </div>
    </InspectorSectionCard>
  );
}
