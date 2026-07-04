import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DocumentModel } from '../../../api/editorApi';
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
  DEFAULT_IMAGE_BORDER_RADIUS,
  DEFAULT_IMAGE_BORDER_WIDTH,
  DEFAULT_IMAGE_SHADOW_BLUR_PX,
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_IMAGE_SHADOW_SPREAD_PX,
  DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
  DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
  DEFAULT_MEDIA_OBJECT_FIT_IMAGE,
} from '../../../api/documentViewApi';
import { MediaFitFields } from './mediaFitFields';
import type { ImageInspectorNode } from '../types';
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
  LinkEnabledRow,
  NavigationFields,
} from './shared';

export function ImageContentSection({
  document,
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  document: DocumentModel;
  node: ImageInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
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
        <FormField label="Alt">
          <Input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
        </FormField>
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <LinkEnabledRow
          checked={Boolean(node.link)}
          onCheckedChange={(checked) => onTextChange('linkEnabled', checked ? 'true' : '')}
        />
        {node.link ? <NavigationFields document={document} node={node} onTextChange={onTextChange} /> : null}
      </InspectorFieldGroup>
    </InspectorSectionCard>
  );
}

export function ImageDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: ImageInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const shadowFallback = createShadowFallback(
    DEFAULT_IMAGE_SHADOW_COLOR,
    DEFAULT_IMAGE_SHADOW_BLUR_PX,
    DEFAULT_IMAGE_SHADOW_SPREAD_PX,
    DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
    DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
  );
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
          fitFallback={DEFAULT_MEDIA_OBJECT_FIT_IMAGE}
          onTextChange={onTextChange}
        />
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-1">
          <Label className="pt-1 text-[11px] font-medium">Border</Label>
          <BorderControlGroup
            nodeId={node.id}
            colorValue={readUnifiedBorderColor(node.style) || DEFAULT_IMAGE_BORDER_COLOR}
            widthValue={readUnifiedBorderWidth(node.style) || DEFAULT_IMAGE_BORDER_WIDTH}
            radiusValue={readUnifiedBorderRadius(node.style) || DEFAULT_IMAGE_BORDER_RADIUS}
            onColorChange={(value) => applyUnifiedLeafBorderColor(onTextChange, value)}
            onWidthChange={(value) => applyUnifiedLeafBorderWidth(onTextChange, value)}
            onRadiusChange={(value) => applyUnifiedLeafBorderRadius(onTextChange, value)}
            colorFallback={DEFAULT_IMAGE_BORDER_COLOR}
            widthPlaceholder="1"
            radiusPlaceholder="16"
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
