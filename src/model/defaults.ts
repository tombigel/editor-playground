export type { SectionTemplateId, SectionTemplateSummary } from './types';

export { createDefaultFooter, createDefaultHeader } from './defaultChrome';
export {
  createDefaultRect,
  createDefaultSticky,
  createLeaf,
  createWrapper,
  nextId,
  syncIdCountersWithDocument,
} from './defaultFactories';
export { createInitialDocument } from './initialDocument';
export { createSectionFromTemplate, SECTION_TEMPLATES } from './sectionTemplates';
