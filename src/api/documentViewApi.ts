/**
 * @module documentViewApi
 *
 * Read-only document/model facade for editor UI consumers.
 * App and panel code should use this module instead of importing from src/model directly.
 */

export * from '../model/colors';
export * from '../model/conversion';
export * from '../model/defaults';
export * from '../model/links';
export * from '../model/listContent';
export * from '../model/pageRoutes';
export * from '../model/richContent';
export * from '../model/selectors';
export * from '../model/styleDefaults';
export * from '../model/topLevelWrapperVisibility';

export {
  isContainerNode,
  isLeafNode,
  isMediaNode,
  isSiteNode,
  isTextNode,
} from '../model/types';

export type {
  BorderStyle,
  ContainerChildBoundary,
  ContainerLayout,
  ContainerNode,
  DescriptionListItem,
  DocumentFontFamily,
  FontLibrary,
  DocumentModel,
  DocumentNode,
  EditorTextField,
  LeafNode,
  LinkExtension,
  ListContent,
  ListTextItem,
  MediaNode,
  MediaObjectFit,
  NodeId,
  RichInlineNode,
  RichListBlock,
  RichTableBlock,
  RichTableCell,
  RichTableRow,
  RichTextLeaf,
  ShadowStyle,
  SiteNode,
  StickyDefinition,
  TableBlockContent,
  TableColumnAlignment,
  TextDocumentContent,
  TextNode,
  TextSubtype,
  ViewportMeasurement,
  WrapperStyleField,
} from '../model/types';

export type {
  DocumentPage,
  PageId,
  SiteSettings,
} from '../model/types/site';

export {
  validateLinks,
} from '../model/validation';

export type {
  LinkValidationError,
} from '../model/validation';

export {
  addGradientStop,
  changeGradientType,
  createDefaultGradient,
  isGradientText,
  moveGradientStopColor,
  parseGradient,
  removeGradientStop,
  serializeGradient,
} from '../model/gradient';

export type {
  GradientStop,
  GradientStopPosition,
  GradientType,
  ParsedGradient,
  RadialExtentKeyword,
} from '../model/gradient';
