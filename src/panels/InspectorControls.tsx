// ---------------------------------------------------------------------------
// Thin barrel — re-exports everything for backward compatibility
// ---------------------------------------------------------------------------

// All control components
export {
  BorderControlGroup,
  COMPACT_UNIT_ICON_SUFFIX_WIDTH,
  COMPACT_UNIT_SUFFIX_WIDTH,
  FontPickerPopover,
  FontSizeField,
  FormField,
  HoverColorField,
  InspectorInlineRow,
  LabeledImplicitUnitField,
  LabeledNumberField,
  LabeledUnitField,
  MINIMAL_UNIT_SUFFIX_WIDTH,
  NumberInput,
  NumericUnitInlineField,
  OrderIconButton,
  RangeField,
  ShadowControlGroup,
  SizeInlineField,
  SpacingField,
  StickyOffsetBandField,
  TextStyleIconButton,
  WrapperActions,
} from './controls';

// ---------------------------------------------------------------------------
// Re-exports — keep backward-compatible public API
// ---------------------------------------------------------------------------

export type { SizeFieldAxis, SizeFieldDescriptor, SpacingAxis } from './inspector/stageConversions';

export {
  applyPersistentSelectValueChange,
  orderFontFamiliesForPicker,
} from './inspector/fontPickerHelpers';

export {
  buildSizeFieldValue,
  clamp,
  convertRenderedPxToBorderRadiusValue,
  convertRenderedPxToFontSizeValue,
  convertRenderedPxToSpacingValue,
  convertRenderedPxToUnitValue,
  convertStageBorderRadiusToValue,
  convertStageFontSizeToInput,
  convertStageMeasurementToInput,
  convertStageSpacingToInput,
  describeSizeFieldValue,
  getSizeModeOptions,
  normalizeAspectRatioExpression,
  offsetsFromDistanceAndAngle,
  readShadowFieldValues,
  readUnifiedBorderColor,
  readUnifiedBorderRadius,
  readUnifiedBorderWidth,
  validateNumberInputDraft,
} from './inspector/stageConversions';
