import type { DocumentModel } from './types';
import { nextId } from './defaultFactories';
import { createDefaultFooter, createDefaultHeader } from './defaultChrome';
import { createSectionFromTemplate } from './sectionTemplates';
import { createDefaultFontLibrary } from '../fonts/defaults';
import { createPage, createInitialSiteSettings } from './pageDefaults';

export function createInitialDocument(): DocumentModel {
  const siteId = nextId('site');
  const { wrapper: header, nodes: headerNodes } = createDefaultHeader(siteId);
  const { wrapper: starterSection, nodes: starterSectionNodes } = createSectionFromTemplate('post', siteId);
  const { wrapper: footer, nodes: footerNodes } = createDefaultFooter(siteId);

  return {
    rootId: siteId,
    fontLibrary: createDefaultFontLibrary(),
    pages: [createPage({ displayName: 'Home', slug: '', sectionIds: [starterSection.id] })],
    siteSettings: createInitialSiteSettings(),
    sharedRegionIds: [header.id, footer.id],
    nodes: {
      [siteId]: {
        id: siteId,
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
