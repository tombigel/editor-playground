import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoTooltip } from '@/components/ui/settings-panel';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, CircleAlert, Loader2, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
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

type ValidationStatus = {
  state: 'idle' | 'checking' | 'valid' | 'error';
  message?: string;
};

const VALIDATION_DELAY_MS = 550;

function useVideoSourceValidation(src: string | undefined): ValidationStatus {
  const [status, setStatus] = useState<ValidationStatus>({ state: 'idle' });

  useEffect(() => {
    const url = src?.trim();
    if (!url) {
      setStatus({ state: 'idle' });
      return;
    }

    setStatus({ state: 'checking', message: 'Checking video source...' });
    const timeout = window.setTimeout(() => {
      const video = document.createElement('video');
      let settled = false;
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoaded);
        video.removeEventListener('canplay', handleLoaded);
        video.removeEventListener('error', handleError);
        video.removeAttribute('src');
        video.load();
      };
      const finish = (next: ValidationStatus) => {
        if (settled) return;
        settled = true;
        setStatus(next);
        cleanup();
      };
      const handleLoaded = () => finish({ state: 'valid', message: 'Video metadata loaded.' });
      const handleError = () => {
        const code = video.error?.code;
        const codeText = code ? `Media error ${code}` : 'Media error';
        finish({ state: 'error', message: `${codeText}: the video source could not be loaded.` });
      };

      video.preload = 'metadata';
      video.muted = true;
      video.addEventListener('loadedmetadata', handleLoaded);
      video.addEventListener('canplay', handleLoaded);
      video.addEventListener('error', handleError);
      video.src = url;
      video.load();
    }, VALIDATION_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [src]);

  return status;
}

function usePosterValidation(src: string | undefined): ValidationStatus {
  const [status, setStatus] = useState<ValidationStatus>({ state: 'idle' });

  useEffect(() => {
    const url = src?.trim();
    if (!url) {
      setStatus({ state: 'idle' });
      return;
    }

    setStatus({ state: 'checking', message: 'Checking poster image...' });
    const timeout = window.setTimeout(() => {
      let settled = false;
      const image = new Image();
      const finish = (next: ValidationStatus) => {
        if (settled) return;
        settled = true;
        setStatus(next);
      };
      image.onload = () => finish({ state: 'valid', message: 'Poster image loaded.' });
      image.onerror = () => finish({ state: 'error', message: 'Poster image could not be loaded.' });
      image.src = url;
      if (typeof image.decode === 'function') {
        image.decode()
          .then(() => finish({ state: 'valid', message: 'Poster image decoded.' }))
          .catch(() => {
            if (!settled) finish({ state: 'error', message: 'Poster image could not be decoded.' });
          });
      }
    }, VALIDATION_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [src]);

  return status;
}

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span>{label}</span>
      <InfoTooltip>{tooltip}</InfoTooltip>
    </span>
  );
}

function ValidationIndicator({ status, label }: { status: ValidationStatus; label: string }) {
  if (status.state === 'idle') {
    return null;
  }

  const content = status.message ?? label;
  const icon =
    status.state === 'checking' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
    ) : status.state === 'valid' ? (
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
    );
  const className =
    status.state === 'valid'
      ? 'text-emerald-600 dark:text-emerald-400'
      : status.state === 'error'
        ? 'text-amber-600 dark:text-amber-400'
        : 'editor-text-muted';

  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="editor-tooltip-panel max-w-[16rem] rounded-lg border px-3 py-2 text-xs font-normal leading-5"
      content={content}
    >
      <span className={`inline-flex h-7 w-6 items-center justify-center ${className}`} role="img" aria-label={content}>
        {icon}
      </span>
    </PopoverTooltip>
  );
}

function InputWithStatus({
  value,
  placeholder,
  onChange,
  status,
  statusLabel,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  status?: ValidationStatus;
  statusLabel?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {status && statusLabel ? <ValidationIndicator status={status} label={statusLabel} /> : null}
    </div>
  );
}

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
  const sourceStatus = useVideoSourceValidation(node.src);
  const posterStatus = usePosterValidation(video?.poster);
  const autoplayEnabled = video?.autoplay === true;
  const showTitle = video?.titleHidden !== true;
  const hasCaptionData = Boolean(video?.captions?.src || video?.captions?.label || video?.captions?.srclang || video?.captions?.default);
  const [captionsEnabled, setCaptionsEnabled] = useState(hasCaptionData);

  useEffect(() => {
    if (hasCaptionData) {
      setCaptionsEnabled(true);
    }
  }, [hasCaptionData]);

  const readFlag = (field: EditorTextField, defaultValue: boolean) => {
    if (field === 'videoControls') return true;
    if (field === 'videoMuted') return video?.muted ?? defaultValue;
    if (field === 'videoAutoplay') return video?.autoplay ?? defaultValue;
    return video?.loop ?? defaultValue;
  };
  const isFlagDisabled = (field: EditorTextField) => field === 'videoControls' || (field === 'videoMuted' && autoplayEnabled);
  const toggleCaptions = (enabled: boolean) => {
    setCaptionsEnabled(enabled);
    if (!enabled) {
      onTextChange('videoCaptionsSrc', '');
      onTextChange('videoCaptionsLang', '');
      onTextChange('videoCaptionsLabel', '');
      onTextChange('videoCaptionsDefault', 'false');
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
        <FormField label="Src">
          <InputWithStatus
            value={node.src ?? ''}
            onChange={(value) => onTextChange('src', value)}
            status={sourceStatus}
            statusLabel="Video source status"
          />
        </FormField>
        <FormField label="Poster">
          <InputWithStatus
            value={video?.poster ?? ''}
            placeholder="Image URL shown before playback"
            onChange={(value) => onTextChange('videoPoster', value)}
            status={posterStatus}
            statusLabel="Poster status"
          />
        </FormField>
        <FormField label="Title">
          <Input value={video?.title ?? node.alt ?? ''} onChange={(e) => onTextChange('videoTitle', e.target.value)} />
        </FormField>
        <FormField label="Show title" layout="inline">
          <Switch checked={showTitle} onCheckedChange={(checked) => onTextChange('videoTitleHidden', checked ? 'false' : 'true')} />
        </FormField>
        {showTitle ? (
          <FormField label="Heading" layout="inline">
            <Select
              size="compact"
              value={video?.titleTag ?? 'h3'}
              onValueChange={(value) => onTextChange('videoTitleTag', value)}
            >
              <SelectTrigger size="compact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1</SelectItem>
                <SelectItem value="h2">H2</SelectItem>
                <SelectItem value="h3">H3</SelectItem>
                <SelectItem value="h4">H4</SelectItem>
                <SelectItem value="h5">H5</SelectItem>
                <SelectItem value="h6">H6</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        ) : null}
        <FormField label="Long description">
          <Input value={video?.description ?? ''} onChange={(e) => onTextChange('videoDescription', e.target.value)} />
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
            <div key={flag.field} className="flex items-center justify-between gap-2 text-[11px] font-medium">
              <span>{flag.label}</span>
              <Switch
                checked={readFlag(flag.field, flag.defaultValue)}
                disabled={isFlagDisabled(flag.field)}
                onCheckedChange={(checked) => onTextChange(flag.field, checked ? 'true' : 'false')}
              />
            </div>
          ))}
        </div>
      </InspectorFieldGroup>
      <div className="editor-border-subtle border-b" aria-hidden="true" />
      <FormField label={<LabelWithTooltip label="Preload" tooltip="Controls how much media the browser may fetch before playback. None waits, Metadata loads duration/dimensions, Auto lets the browser preload more." />} layout="inline">
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
      <div className="editor-border-subtle border-b" aria-hidden="true" />
      <InspectorFieldGroup>
        <FormField label="Captions" layout="inline">
          <Switch checked={captionsEnabled} onCheckedChange={toggleCaptions} />
        </FormField>
        {captionsEnabled ? (
          <>
            <FormField label="Captions URL">
              <Input value={video?.captions?.src ?? ''} placeholder="captions-en.vtt" onChange={(e) => onTextChange('videoCaptionsSrc', e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Language">
                <Input value={video?.captions?.srclang ?? ''} placeholder="en" onChange={(e) => onTextChange('videoCaptionsLang', e.target.value)} />
              </FormField>
              <FormField label="Track label">
                <Input value={video?.captions?.label ?? ''} placeholder="English CC" onChange={(e) => onTextChange('videoCaptionsLabel', e.target.value)} />
              </FormField>
            </div>
            <FormField label="Default captions" layout="inline">
              <Switch checked={video?.captions?.default === true} onCheckedChange={(checked) => onTextChange('videoCaptionsDefault', checked ? 'true' : 'false')} />
            </FormField>
          </>
        ) : null}
        <FormField label="Transcript URL">
          <Input value={video?.transcriptSrc ?? ''} placeholder="/transcripts/video.html" onChange={(e) => onTextChange('videoTranscriptSrc', e.target.value)} />
        </FormField>
      </InspectorFieldGroup>
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
