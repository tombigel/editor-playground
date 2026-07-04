import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '../../InspectorControls';
import type { EditorTextField } from '../../../api/documentApi';
import type { MediaObjectFit } from '../../../api/documentViewApi';

const OBJECT_FIT_OPTIONS: { value: MediaObjectFit; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
  { value: 'scale-down', label: 'Scale down' },
];

const OBJECT_POSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'left top', label: 'Top left' },
  { value: 'center top', label: 'Top' },
  { value: 'right top', label: 'Top right' },
  { value: 'left center', label: 'Left' },
  { value: 'center center', label: 'Center' },
  { value: 'right center', label: 'Right' },
  { value: 'left bottom', label: 'Bottom left' },
  { value: 'center bottom', label: 'Bottom' },
  { value: 'right bottom', label: 'Bottom right' },
];

export function MediaFitFields({
  objectFit,
  objectPosition,
  fitFallback,
  onTextChange,
}: {
  objectFit?: MediaObjectFit;
  objectPosition?: string;
  fitFallback: MediaObjectFit;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  const positionValue = objectPosition ?? 'center center';
  const positionIsPreset = OBJECT_POSITION_OPTIONS.some((option) => option.value === positionValue);

  return (
    <>
      <FormField label="Fit" layout="inline">
        <Select
          size="compact"
          value={objectFit ?? fitFallback}
          onValueChange={(value) => onTextChange('objectFit', value)}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OBJECT_FIT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Position" layout="inline">
        <Select
          size="compact"
          value={positionValue}
          onValueChange={(value) => onTextChange('objectPosition', value)}
        >
          <SelectTrigger size="compact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!positionIsPreset ? (
              <SelectItem value={positionValue}>{positionValue}</SelectItem>
            ) : null}
            {OBJECT_POSITION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </>
  );
}
