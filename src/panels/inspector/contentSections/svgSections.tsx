import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Maximize2, RotateCcw, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionsSelector } from '@/components/ui/options-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { InfoTooltip, InlineNotice } from '@/components/ui/settings-panel';
import {
  FormField,
  HoverColorField,
  InspectorFieldGroup,
  ShadowControlGroup,
  readShadowFieldValues,
} from '../../InspectorControls';
import {
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_MEDIA_OBJECT_FIT_VIDEO,
  DEFAULT_TEXT_COLOR,
} from '../../../api/documentViewApi';
import { sanitizeSvgMarkup } from '../../../lib/svgSanitize';
import type { SvgInspectorNode } from '../types';
import type { EditorTextField } from '../../../api/documentApi';
import type { SvgMarkupPayload } from '../../../api/documentApi';
import { applyLeafShadowPatch } from '../styleFields';
import { createFocusedModeEntry, InspectorSectionCard } from '../CommonSections';
import { type FocusModeCardProps, createShadowFallback } from './shared';
import { MediaFitFields } from './mediaFitFields';
import {
  ScaleWithShapeLabel,
  ScaleWithShapeSwitch,
  SVG_STROKE_CAP_OPTIONS,
  SVG_STROKE_JOIN_OPTIONS,
  SvgDashPatternFields,
  SvgStrokeLengthField,
  deriveSvgStrokeJoinFromCap,
} from './svgStrokeControls';

const SVG_MARKUP_DEBOUNCE_MS = 300;

const VIEW_BOX_PARTS = [
  { key: 'minX', label: 'Min X' },
  { key: 'minY', label: 'Min Y' },
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
] as const;

const SVG_STROKE_PAINT_ORDER_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'fill', label: 'Fill first' },
  { value: 'stroke', label: 'Stroke first' },
] as const;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

type ViewBoxPartKey = (typeof VIEW_BOX_PARTS)[number]['key'];
type SvgMarkupStatus = ReturnType<typeof readSvgMarkupStatus>;

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
  const initialMarkupSource = reconstructSvgSource(node);
  const [draftMarkup, setDraftMarkup] = useState(() => initialMarkupSource);
  const [markupStatus, setMarkupStatus] = useState(() => readSvgMarkupStatus(initialMarkupSource));
  const [viewBoxFitError, setViewBoxFitError] = useState(false);
  const lastSubmittedMarkupRef = useRef<string | null>(initialMarkupSource);
  const viewBoxFieldId = useId();
  const currentMarkupSource = reconstructSvgSource(node);
  const viewBoxSource = node.svg?.viewBox ?? node.svg?.originalViewBox ?? '';
  const [viewBoxPartsDraft, setViewBoxPartsDraft] = useState(() => parseViewBoxParts(viewBoxSource));

  // Re-seed the editor when a different node is selected.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset draft only when the node identity changes
  useEffect(() => {
    const nextSource = reconstructSvgSource(node);
    setDraftMarkup(nextSource);
    setMarkupStatus(readSvgMarkupStatus(nextSource));
    lastSubmittedMarkupRef.current = nextSource;
    setViewBoxFitError(false);
    setViewBoxPartsDraft(parseViewBoxParts(node.svg?.viewBox ?? node.svg?.originalViewBox ?? ''));
  }, [node.id]);

  useEffect(() => {
    const nextStatus = readSvgMarkupStatus(draftMarkup);
    setMarkupStatus(nextStatus);
    if (
      draftMarkup === currentMarkupSource ||
      draftMarkup === lastSubmittedMarkupRef.current ||
      nextStatus.kind === 'fail'
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastSubmittedMarkupRef.current = draftMarkup;
      setViewBoxFitError(false);
      setViewBoxPartsDraft(parseViewBoxParts(nextStatus.result.viewBox ?? ''));
      onSetSvgMarkup(node.id, {
        innerMarkup: nextStatus.result.innerMarkup,
        originalViewBox: nextStatus.result.viewBox,
      });
    }, SVG_MARKUP_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [currentMarkupSource, draftMarkup, node.id, onSetSvgMarkup]);

  useEffect(() => {
    setViewBoxPartsDraft(parseViewBoxParts(viewBoxSource));
  }, [viewBoxSource]);

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
        <FormField
          className="space-y-1.5"
          label={(
            <span className="flex w-full min-w-0 items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1">
                Markup
                <InfoTooltip>
                  SVG markup is sanitized before it is stored, rendered, or exported.
                </InfoTooltip>
              </span>
              <SvgMarkupStatusIndicator status={markupStatus} />
            </span>
          )}
        >
          <Textarea
            value={draftMarkup}
            rows={5}
            spellCheck={false}
            placeholder="Paste SVG markup"
            className="font-mono text-[12px]"
            onChange={(e) => setDraftMarkup(e.target.value)}
          />
        </FormField>
        {markupStatus.kind === 'fail' ? (
          <InlineNotice tone="danger">
            {markupStatus.description}
          </InlineNotice>
        ) : null}
      </InspectorFieldGroup>
      <InspectorFieldGroup gap>
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
          <span className="flex min-w-0 items-center gap-1">
            Decorative
            <InfoTooltip>
              Hidden from screen readers. Turn this off when the SVG needs a title or description.
            </InfoTooltip>
          </span>
          <Switch
            checked={a11y?.hidden ?? false}
            onCheckedChange={(checked) => onTextChange('svgHidden', checked ? 'true' : 'false')}
          />
        </div>
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
      <InspectorFieldGroup separated gap>
        <FormField
          label={(
            <span className="flex min-w-0 items-center gap-1">
              ViewBox
              <InfoTooltip>
                Controls the visible coordinate area for the inline SVG. Paste four values to fill all fields.
              </InfoTooltip>
            </span>
          )}
        >
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
        <div className="flex items-center justify-between gap-2">
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={fitViewBoxToContent}
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            Fit to content
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

function readSvgMarkupStatus(raw: string) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return raw.trim().startsWith('<svg')
      ? {
        kind: 'clean' as const,
        label: 'Clean',
        description: 'SVG source is ready for browser sanitization.',
        result: { innerMarkup: '', sourceStatus: 'clean' as const },
      }
      : {
        kind: 'fail' as const,
        label: 'Invalid',
        description: 'No usable SVG content survived sanitization.',
      };
  }

  const result = sanitizeSvgMarkup(raw);
  if (!result) {
    return {
      kind: 'fail' as const,
      label: 'Invalid',
      description: readSvgMarkupFailureDescription(raw),
    };
  }

  if (result.sourceStatus === 'sanitized') {
    return {
      kind: 'sanitized' as const,
      label: 'Sanitized',
      description: readSvgNamespaceIssue(raw) ?? 'DOMPurify changed the source before storage.',
      result,
    };
  }

  return {
    kind: 'clean' as const,
    label: 'Clean',
    description: 'DOMPurify returned the source unchanged.',
    result,
  };
}

function readSvgMarkupFailureDescription(raw: string) {
  const generic = 'No usable SVG content survived sanitization.';
  return readSvgNamespaceIssue(raw) ?? generic;
}

function readSvgNamespaceIssue(raw: string) {
  const doc = new DOMParser().parseFromString(raw.trim(), 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    return null;
  }

  const namespace = root.getAttribute('xmlns')?.trim();
  if (namespace && namespace !== SVG_NAMESPACE) {
    return `The SVG namespace was "${namespace}" and was normalized to "${SVG_NAMESPACE}".`;
  }

  return null;
}

function SvgMarkupStatusIndicator({ status }: { status: SvgMarkupStatus }) {
  const toneClass =
    status.kind === 'clean'
      ? 'editor-success-text'
      : status.kind === 'sanitized'
        ? 'editor-warning-text'
        : 'editor-danger-text';
  const iconClassName = 'h-3.5 w-3.5 shrink-0';
  const icon: ReactNode =
    status.kind === 'clean' ? (
      <Check className={iconClassName} aria-hidden="true" />
    ) : status.kind === 'sanitized' ? (
      <TriangleAlert className={iconClassName} aria-hidden="true" />
    ) : (
      <X className={iconClassName} aria-hidden="true" />
    );

  return (
    <span
      role="status"
      className={`${toneClass} inline-flex shrink-0 items-center gap-1 text-[11px] font-medium`}
      aria-label={`SVG source ${status.label.toLowerCase()}: ${status.description}`}
      title={status.description}
    >
      {icon}
      <span>{status.label}</span>
    </span>
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
  const strokeCap = stroke?.cap ?? 'butt';
  const strokeJoin = stroke?.join ?? deriveSvgStrokeJoinFromCap(strokeCap);
  const strokePaintOrder = stroke?.paintOrder ?? 'normal';
  const hasOpenStrokeSection = Boolean(stroke?.enabled);

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
              fallback={DEFAULT_TEXT_COLOR}
              onChange={(value) => onTextChange('svgFill', value)}
            />
          </FormField>
        ) : null}
      </InspectorFieldGroup>
      <InspectorFieldGroup gap separated={monochrome?.enabled ?? false}>
        <Label className="flex items-center justify-between gap-2 text-[11px] font-medium">
          Stroke
          <Switch
            checked={stroke?.enabled ?? false}
            onCheckedChange={(checked) => onTextChange('svgStrokeEnabled', checked ? 'true' : 'false')}
          />
        </Label>
        {stroke?.enabled ? (
          <>
            <FormField label="Width" layout="inline">
              <SvgStrokeLengthField
                value={stroke.width}
                min={0}
                ariaLabel="SVG stroke width"
                onChange={(value) => onTextChange('svgStrokeWidth', value)}
              />
            </FormField>
            <FormField label={<ScaleWithShapeLabel />} layout="inline">
              <ScaleWithShapeSwitch
                nonScaling={stroke.nonScaling}
                onChange={(nextNonScaling) => onTextChange('svgStrokeNonScaling', nextNonScaling ? 'true' : 'false')}
              />
            </FormField>
            <FormField label="Color" layout="inline" controlClassName="gap-2">
              <HoverColorField
                value={stroke.color}
                ariaLabel="SVG stroke color"
                fallback={DEFAULT_TEXT_COLOR}
                onChange={(value) => onTextChange('svgStrokeColor', value)}
              />
            </FormField>
            <FormField label="Cap" layout="inline">
              <OptionsSelector
                value={strokeCap}
                options={SVG_STROKE_CAP_OPTIONS}
                display="label"
                size="compact"
                ariaLabel="SVG stroke cap"
                onValueChange={(value) => onTextChange('svgStrokeCap', value)}
              />
            </FormField>
            <FormField label="Join" layout="inline">
              <OptionsSelector
                value={strokeJoin}
                options={SVG_STROKE_JOIN_OPTIONS}
                display="label"
                size="compact"
                ariaLabel="SVG stroke join"
                onValueChange={(value) => onTextChange('svgStrokeJoin', value)}
              />
            </FormField>
            <FormField label="Dash" layout="stack">
              <SvgDashPatternFields
                value={stroke.dashArray}
                onChange={(value) => onTextChange('svgStrokeDashArray', value)}
              />
            </FormField>
            <FormField label="Paint order" layout="inline">
              <Select
                value={strokePaintOrder}
                onValueChange={(value) => onTextChange('svgStrokePaintOrder', value)}
              >
                <SelectTrigger size="compact" aria-label="SVG stroke paint order" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SVG_STROKE_PAINT_ORDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </>
        ) : null}
      </InspectorFieldGroup>
      <div className={`space-y-1.5 ${hasOpenStrokeSection ? 'editor-border-subtle border-t pt-2.5' : ''}`}>
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
