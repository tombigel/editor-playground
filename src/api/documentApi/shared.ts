import type { DocumentModel } from '../../model/types';

export function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    rootId: document.rootId,
    nodes: structuredClone(document.nodes),
    fontLibrary: structuredClone(document.fontLibrary),
    ...(document.animationSettings !== undefined ? { animationSettings: structuredClone(document.animationSettings) } : {}),
    ...(document.pages !== undefined ? { pages: structuredClone(document.pages) } : {}),
    ...(document.siteSettings !== undefined ? { siteSettings: structuredClone(document.siteSettings) } : {}),
    ...(document.sharedRegionIds !== undefined ? { sharedRegionIds: [...document.sharedRegionIds] } : {}),
  };
}
