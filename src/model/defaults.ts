export type { SectionTemplateId, SectionTemplateSummary } from './types';

export { createDefaultFooter, createDefaultHeader } from './defaultChrome';
export {
  createButtonTextNode,
  createContainerNode,
  createDefaultRect,
  createDefaultSticky,
  createLinkTextNode,
  createMediaNode,
  createTextNode,
  nextId,
  syncIdCountersWithDocument,
} from './defaultFactories';
export { createInitialDocument } from './initialDocument';
export { createSectionFromTemplate, SECTION_TEMPLATES } from './sectionTemplates';
