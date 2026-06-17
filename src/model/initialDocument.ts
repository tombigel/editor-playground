import type { DocumentModel } from './types';
import { nextId } from './defaultFactories';
import { createDefaultFooter, createDefaultHeader } from './defaultChrome';
import { createSectionFromTemplate } from './sectionTemplates';
import { createDefaultFontLibrary } from '../fonts/defaults';
import { createPage, createInitialSiteSettings } from './pageDefaults';

export function createInitialDocument(): DocumentModel {
  return createStarterDocument('post');
}

export function createBlankInitialDocument(): DocumentModel {
  return createStarterDocument('blank');
}

function createStarterDocument(templateId: 'post' | 'blank'): DocumentModel {
  const siteId = nextId('site');
  const { wrapper: header, nodes: headerNodes } = createDefaultHeader(siteId);
  const { wrapper: starterSection, nodes: starterSectionNodes } = createSectionFromTemplate(templateId, siteId);
  const { wrapper: footer, nodes: footerNodes } = createDefaultFooter(siteId);

  return {
    rootId: siteId,
    fontLibrary: createDefaultFontLibrary(),
    pages: [createPage({ displayName: 'Home', slug: 'home', pageRole: 'home', sectionIds: [starterSection.id] })],
    siteSettings: createInitialSiteSettings(),
    sharedRegionIds: [header.id, footer.id],
    nodes: {
      [siteId]: {
        id: siteId,
        contentType: 'site',
        type: 'site',
        parentId: null,
        children: [header.id, starterSection.id, footer.id],
        name: 'Site',
        visible: true,
        locked: false,
      },
      ...headerNodes,
      ...starterSectionNodes,
      ...footerNodes,
    },
  };
}
