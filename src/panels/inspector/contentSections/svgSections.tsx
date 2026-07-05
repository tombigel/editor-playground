import { useEffect, useId, useState } from 'react';
import { Check, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { InlineNotice } from '@/components/ui/settings-panel';
import {
  FormField,
  HoverColorField,
  InspectorFieldGroup,
  NumberInput,
  ShadowControlGroup,
  readShadowFieldValues,
} from '../../InspectorControls';
import {
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_MEDIA_OBJECT_FIT_VIDEO,
} from '../../../api/documentViewApi';
import { sanitizeSvgMarkup } from '../../../lib/svgSanitize';
import type { SvgInspectorNode } from '../types';
import type { EditorTextField } from '../../../api/documentApi';
import type { SvgMarkupPayload } from '../../../api/documentApi';
import { applyLeafShadowPatch } from '../styleFields';
import { createFocusedModeEntry, InspectorSectionCard } from '../CommonSections';
import { type FocusModeCardProps, createShadowFallback } from './shared';
import { MediaFitFields } from './mediaFitFields';

const VIEW_BOX_PARTS = [
  { key: 'minX', label: 'Min X' },
  { key: 'minY', label: 'Min Y' },
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
] as const;

type ViewBoxPartKey = (typeof VIEW_BOX_PARTS)[number]['key'];

function reconstructSvgSource(node: SvgInspectorNode): string {
  const svg = node.svg;
  if (!svg?.innerMarkup) {
    return '';
  }
  const viewBox = svg.originalViewBox ? ` viewBox="${svg.originalViewBox}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg"${viewBox}>${svg.innerMarkup}</svg>`;
}

export function SvgContentSection({
  node,
  onTextChange,
  onSetSvgMarkup,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: SvgInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
  onSetSvgMarkup: (nodeId: string, payload: SvgMarkupPayload) => void;
} & FocusModeCardProps) {
  const [draftMarkup, setDraftMarkup] = useState(() => reconstructSvgSource(node));
  const [markupError, setMarkupError] = useState(false);
  const [viewBoxFitError, setViewBoxFitError] = useState(false);
  const viewBoxFieldId = useId();
  const viewBoxSource = node.svg?.viewBox ?? node.svg?.originalViewBox ?? '';
  const [viewBoxPartsDraft, setViewBoxPartsDraft] = useState(() => parseViewBoxParts(viewBoxSource));

  // Re-seed the editor when a different node is selected.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset draft only when the node identity changes
  useEffect(() => {
    setDraftMarkup(reconstructSvgSource(node));
    setMarkupError(false);
    setViewBoxFitError(false);
    setViewBoxPartsDraft(parseViewBoxParts(node.svg?.viewBox ?? node.svg?.originalViewBox ?? ''));
  }, [node.id]);

  useEffect(() => {
    setViewBoxPartsDraft(parseViewBoxParts(viewBoxSource));
  }, [viewBoxSource]);

  const applyMarkup = () => {
    const sanitized = sanitizeSvgMarkup(draftMarkup);
    if (!sanitized) {
      setMarkupError(true);
      return;
    }
    setMarkupError(false);
    setViewBoxFitError(false);
    setViewBoxPartsDraft(parseViewBoxParts(sanitized.viewBox ?? ''));
    onSetSvgMarkup(node.id, { innerMarkup: sanitized.innerMarkup, originalViewBox: sanitized.viewBox });
  };

  const fitViewBoxToContent = () => {
    setViewBoxFitError(false);
    const element = globalThis.document
      ?.getElementById(`stage-node-${node.id}`)
      ?.querySelector<SVGSVGElement>('svg');

    try {
      const bbox = element?.getBBox();
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        const nextViewBox = formatViewBox(bbox);
        setViewBoxPartsDraft(parseViewBoxParts(nextViewBox));
        onTextChange('svgViewBox', nextViewBox);
        return;
      }
    } catch {
      // getBBox can throw for detached, hidden, or otherwise unmeasurable SVGs.
    }
    setViewBoxFitError(true);
  };

  const a11y = node.svg?.a11y;

  const updateViewBoxPart = (key: ViewBoxPartKey, value: string) => {
    setViewBoxFitError(false);
    const pastedViewBox = parsePastedViewBox(value);
    if (pastedViewBox) {
      setViewBoxPartsDraft(partsArrayToViewBoxRecord(pastedViewBox));
      onTextChange('svgViewBox', pastedViewBox.join(' '));
      return;
    }

    const nextDraft = { ...viewBoxPartsDraft, [key]: value };
    setViewBoxPartsDraft(nextDraft);
    const nextValue = composeViewBoxValue(nextDraft);
    if (nextValue) {
      onTextChange('svgViewBox', nextValue);
    }
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
        <FormField label="Markup">
          <Textarea
            value={draftMarkup}
            rows={5}
            spellCheck={false}
            placeholder="Paste SVG markup"
            className="font-mono text-[12px]"
            onChange={(e) => setDraftMarkup(e.target.value)}
          />
        </FormField>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={applyMarkup}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Apply markup
          </Button>
        </div>
        {markupError ? (
          <InlineNotice tone="warning">
            The pasted markup has no usable SVG content after sanitization.
          </InlineNotice>
        ) : null}
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <Label className="flex items-center justify-between gap-2 text-[11px] font-medium">
          Decorative (hidden from screen readers)
          <Switch
            checked={a11y?.hidden ?? false}
            onCheckedChange={(checked) => onTextChange('svgHidden', checked ? 'true' : 'false')}
          />
        </Label>
        {a11y?.hidden ? null : (
          <>
            <FormField label="Title">
              <Input
                value={a11y?.title ?? ''}
                placeholder="Accessible name (aria-label)"
                onChange={(e) => onTextChange('svgTitle', e.target.value)}
              />
            </FormField>
            <FormField label="Description">
              <Input
                value={a11y?.desc ?? ''}
                placeholder="Long description (aria-describedby)"
                onChange={(e) => onTextChange('svgDesc', e.target.value)}
              />
            </FormField>
          </>
        )}
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <FormField label="ViewBox">
          <div className="grid grid-cols-4 gap-1.5">
            {VIEW_BOX_PARTS.map((part) => {
              const inputId = `${viewBoxFieldId}-${part.key}`;
              return (
                <label key={part.key} htmlFor={inputId} className="min-w-0 space-y-0.5">
                  <span className="editor-text-muted block truncate text-[10px] leading-4">{part.label}</span>
                  <Input
                    id={inputId}
                    value={viewBoxPartsDraft[part.key]}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`SVG viewBox ${part.label}`}
                    className="h-7 px-2 text-[12px]"
                    onChange={(e) => updateViewBoxPart(part.key, e.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </FormField>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fitViewBoxToContent}
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Fit to content
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setViewBoxFitError(false);
              setViewBoxPartsDraft(parseViewBoxParts(''));
              onTextChange('svgViewBox', '');
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>
        {viewBoxFitError ? (
          <InlineNotice tone="warning">
            The SVG content could not be measured for an automatic viewBox.
          </InlineNotice>
        ) : null}
      </InspectorFieldGroup>
    </InspectorSectionCard>
  );
}

function parseViewBoxParts(value: string): Record<ViewBoxPartKey, string> {
  const parts = value.trim().split(/[\s,]+/);
  if (parts.length !== VIEW_BOX_PARTS.length) {
    return { minX: '', minY: '', width: '', height: '' };
  }
  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

export function readNextSvgViewBoxValue(
  currentValue: string,
  key: ViewBoxPartKey,
  value: string,
): string | null {
  const pastedViewBox = parsePastedViewBox(value);
  if (pastedViewBox) {
    return pastedViewBox.join(' ');
  }

  return composeViewBoxValue({ ...parseViewBoxParts(currentValue), [key]: value });
}

function parsePastedViewBox(value: string): string[] | null {
  const parts = value.trim().split(/[\s,]+/);
  return parts.length === VIEW_BOX_PARTS.length && parts.every((part) => part !== '') ? parts : null;
}

function partsArrayToViewBoxRecord(parts: string[]): Record<ViewBoxPartKey, string> {
  return {
    minX: parts[0] ?? '',
    minY: parts[1] ?? '',
    width: parts[2] ?? '',
    height: parts[3] ?? '',
  };
}

function composeViewBoxValue(parts: Record<ViewBoxPartKey, string>): string | null {
  if (!VIEW_BOX_PARTS.every((part) => parts[part.key].trim() !== '')) {
    return null;
  }
  return VIEW_BOX_PARTS.map((part) => parts[part.key].trim()).join(' ');
}

function formatViewBox(bbox: DOMRect) {
  return `${round2(bbox.x)} ${round2(bbox.y)} ${round2(bbox.width)} ${round2(bbox.height)}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function SvgDesignSection({
  node,
  onTextChange,
  focusedMode,
  onEnterFocusedMode,
  headerContent,
  headerAction,
  contentClassName = 'space-y-2.5 px-3 pt-1.5 pb-3',
}: {
  node: SvgInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
} & FocusModeCardProps) {
  const shadowFallback = createShadowFallback(DEFAULT_IMAGE_SHADOW_COLOR, 0, 0, 0, 0);
  const shadow = readShadowFieldValues(node.style, shadowFallback);
  const monochrome = node.svg?.monochrome;
  const stroke = node.svg?.stroke;

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
      <InspectorFieldGroup gap>
        <Label className="flex items-center justify-between gap-2 text-[11px] font-medium">
          Monochrome
          <Switch
            checked={monochrome?.enabled ?? false}
            onCheckedChange={(checked) => onTextChange('svgMonochrome', checked ? 'true' : 'false')}
          />
        </Label>
        {monochrome?.enabled ? (
          <FormField label="Fill" layout="inline">
            <HoverColorField
              value={monochrome.fill}
              ariaLabel="SVG fill color"
              fallback="#16202a"
              onChange={(value) => onTextChange('svgFill', value)}
            />
          </FormField>
        ) : null}
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <Label className="flex items-center justify-between gap-2 text-[11px] font-medium">
          Stroke
          <Switch
            checked={stroke?.enabled ?? false}
            onCheckedChange={(checked) => onTextChange('svgStrokeEnabled', checked ? 'true' : 'false')}
          />
        </Label>
        {stroke?.enabled ? (
          <>
            <FormField label="Color" layout="inline">
              <HoverColorField
                value={stroke.color}
                ariaLabel="SVG stroke color"
                fallback="#16202a"
                onChange={(value) => onTextChange('svgStrokeColor', value)}
              />
            </FormField>
            <FormField label="Width" layout="inline">
              <NumberInput
                value={stroke.width ?? 1}
                min={0}
                max={100}
                step={0.5}
                onChange={(value) => onTextChange('svgStrokeWidth', String(value))}
              />
            </FormField>
          </>
        ) : null}
      </InspectorFieldGroup>
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
