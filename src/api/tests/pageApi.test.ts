import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/initialDocument';
import type { DocumentModel } from '../../model/types';
import { validateDocument } from '../../model/validation';
import {
  addPage,
  addPageSlugAlias,
  deletePage,
  getPageForSection,
  moveSectionToPage,
  removePageSlugAlias,
  reorderPage,
  resolvePageUrl,
  setPageParent,
  setPageSlug,
  setSiteSettings,
  validatePageSlug,
} from '../pageApi';

function makeDoc(): DocumentModel {
  return createInitialDocument();
}

describe('addPage', () => {
  it('adds a page to the end of pages', () => {
    const doc = makeDoc();
    const result = addPage(doc, { displayName: 'About' });
    expect(result.pages).toHaveLength((doc.pages ?? []).length + 1);
  });

  it('new page has a unique id', () => {
    const doc = makeDoc();
    const result = addPage(doc, { displayName: 'About' });
    const ids = (result.pages ?? []).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('auto-generates slug from displayName', () => {
    const doc = makeDoc();
    const result = addPage(doc, { displayName: 'About Us' });
    const newPage = (result.pages ?? []).find((p) => p.displayName === 'About Us');
    expect(newPage?.slug).toBe('about-us');
  });

  it('initializes pages if undefined', () => {
    const doc = { ...makeDoc(), pages: undefined };
    const result = addPage(doc, { displayName: 'First' });
    expect(result.pages).toHaveLength(1);
  });
});

describe('deletePage', () => {
  it('removes the page', () => {
    const doc = makeDoc();
    const pageId = (doc.pages ?? [])[0].id;
    const result = deletePage(doc, pageId);
    expect((result.pages ?? []).find((p) => p.id === pageId)).toBeUndefined();
  });

  it("removes the page's section nodes from nodes", () => {
    const doc = makeDoc();
    const page = (doc.pages ?? [])[0];
    const sectionId = page.sectionIds[0];
    const result = deletePage(doc, page.id);
    expect(result.nodes[sectionId]).toBeUndefined();
  });

  it('shared regions (header/footer) remain in nodes', () => {
    const doc = makeDoc();
    const page = (doc.pages ?? [])[0];
    const sharedIds = doc.sharedRegionIds ?? [];
    const result = deletePage(doc, page.id);
    for (const id of sharedIds) {
      expect(result.nodes[id]).toBeDefined();
    }
  });
});

describe('reorderPage', () => {
  function makeMultiPageDoc(): DocumentModel {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'Page 2' });
    doc = addPage(doc, { displayName: 'Page 3' });
    return doc;
  }

  it('moves page forward', () => {
    const doc = makeMultiPageDoc();
    const pages = doc.pages ?? [];
    const firstId = pages[0].id;
    const result = reorderPage(doc, firstId, 'forward');
    expect((result.pages ?? [])[1].id).toBe(firstId);
  });

  it('noop at last position forward', () => {
    const doc = makeMultiPageDoc();
    const pages = doc.pages ?? [];
    const lastId = pages[pages.length - 1].id;
    const result = reorderPage(doc, lastId, 'forward');
    expect((result.pages ?? [])[pages.length - 1].id).toBe(lastId);
  });

  it('moves page backward', () => {
    const doc = makeMultiPageDoc();
    const pages = doc.pages ?? [];
    const secondId = pages[1].id;
    const result = reorderPage(doc, secondId, 'back');
    expect((result.pages ?? [])[0].id).toBe(secondId);
  });

  it('noop at first position back', () => {
    const doc = makeMultiPageDoc();
    const pages = doc.pages ?? [];
    const firstId = pages[0].id;
    const result = reorderPage(doc, firstId, 'back');
    expect((result.pages ?? [])[0].id).toBe(firstId);
  });
});

describe('setPageSlug', () => {
  it('updates the slug on the correct page', () => {
    const doc = makeDoc();
    const page = (doc.pages ?? [])[0];
    const result = setPageSlug(doc, page.id, 'new-slug');
    const updated = (result.pages ?? []).find((p) => p.id === page.id);
    expect(updated?.slug).toBe('new-slug');
  });
});

describe('addPageSlugAlias / removePageSlugAlias', () => {
  it('adds a slug alias', () => {
    const doc = makeDoc();
    const page = (doc.pages ?? [])[0];
    const result = addPageSlugAlias(doc, page.id, 'alias-one');
    const updated = (result.pages ?? []).find((p) => p.id === page.id);
    expect(updated?.slugAliases).toContain('alias-one');
  });

  it('removes a slug alias', () => {
    const doc = makeDoc();
    const page = (doc.pages ?? [])[0];
    const withAlias = addPageSlugAlias(doc, page.id, 'alias-one');
    const result = removePageSlugAlias(withAlias, page.id, 'alias-one');
    const updated = (result.pages ?? []).find((p) => p.id === page.id);
    expect(updated?.slugAliases ?? []).not.toContain('alias-one');
  });
});

describe('setPageParent', () => {
  it('sets parentPageId', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'Child' });
    const pages = doc.pages ?? [];
    const parentId = pages[0].id;
    const childId = pages[1].id;
    const result = setPageParent(doc, childId, parentId);
    const updated = (result.pages ?? []).find((p) => p.id === childId);
    expect(updated?.parentPageId).toBe(parentId);
  });

  it('returns original if cycle detected (page set as own parent)', () => {
    const doc = makeDoc();
    const pageId = (doc.pages ?? [])[0].id;
    const result = setPageParent(doc, pageId, pageId);
    const page = (result.pages ?? []).find((p) => p.id === pageId);
    expect(page?.parentPageId).toBeUndefined();
  });

  it('returns original if setting ancestor as child', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'Child' });
    const pages = doc.pages ?? [];
    const parentId = pages[0].id;
    const childId = pages[1].id;
    doc = setPageParent(doc, childId, parentId);
    const result = setPageParent(doc, parentId, childId);
    const parent = (result.pages ?? []).find((p) => p.id === parentId);
    expect(parent?.parentPageId).toBeUndefined();
  });
});

describe('moveSectionToPage', () => {
  it('removes sectionId from source page and appends to target page', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'Target' });
    const pages = doc.pages ?? [];
    const fromPage = pages[0];
    const toPage = pages[1];
    const sectionId = fromPage.sectionIds[0];

    const result = moveSectionToPage(doc, sectionId, fromPage.id, toPage.id);
    const updatedFrom = (result.pages ?? []).find((p) => p.id === fromPage.id);
    const updatedTo = (result.pages ?? []).find((p) => p.id === toPage.id);

    expect(updatedFrom?.sectionIds).not.toContain(sectionId);
    expect(updatedTo?.sectionIds).toContain(sectionId);
  });
});

describe('getPageForSection', () => {
  it('returns correct page for a sectionId', () => {
    const doc = makeDoc();
    const page = (doc.pages ?? [])[0];
    const sectionId = page.sectionIds[0];
    const result = getPageForSection(doc, sectionId);
    expect(result?.id).toBe(page.id);
  });

  it('returns null for unknown sectionId', () => {
    const doc = makeDoc();
    const result = getPageForSection(doc, 'nonexistent-id');
    expect(result).toBeNull();
  });
});

describe('resolvePageUrl', () => {
  it('home page with slug "" resolves to "/"', () => {
    const doc = makeDoc();
    const homePage = (doc.pages ?? []).find((p) => p.slug === '');
    expect(homePage).toBeDefined();
    const url = resolvePageUrl(doc, homePage!.id);
    expect(url).toBe('/');
  });

  it('page with slug "about" resolves to "/about/"', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const aboutPage = (doc.pages ?? []).find((p) => p.slug === 'about');
    expect(aboutPage).toBeDefined();
    const url = resolvePageUrl(doc, aboutPage!.id);
    expect(url).toBe('/about/');
  });

  it('nested "team" (parent "about") resolves to "/about/team/"', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const aboutPage = (doc.pages ?? []).find((p) => p.slug === 'about')!;
    doc = addPage(doc, { displayName: 'Team', slug: 'team', parentPageId: aboutPage.id });
    const teamPage = (doc.pages ?? []).find((p) => p.slug === 'team')!;
    const url = resolvePageUrl(doc, teamPage.id);
    expect(url).toBe('/about/team/');
  });
});

describe('validatePageSlug', () => {
  it('returns error for empty string', () => {
    expect(validatePageSlug('')).not.toHaveLength(0);
  });

  it('returns error for slug with uppercase and spaces ("Hello World")', () => {
    expect(validatePageSlug('Hello World')).not.toHaveLength(0);
  });

  it('returns error for slug starting with hyphen ("-bad")', () => {
    expect(validatePageSlug('-bad')).not.toHaveLength(0);
  });

  it('returns error for slug ending with hyphen ("bad-")', () => {
    expect(validatePageSlug('bad-')).not.toHaveLength(0);
  });

  it('no error for valid slug "about-us"', () => {
    expect(validatePageSlug('about-us')).toHaveLength(0);
  });
});

describe('setSiteSettings', () => {
  it('merges patch into existing siteSettings', () => {
    const doc = makeDoc();
    const result = setSiteSettings(doc, { status: 'published', title: 'My Site' });
    expect(result.siteSettings?.status).toBe('published');
    expect(result.siteSettings?.title).toBe('My Site');
    expect(result.siteSettings?.lang).toBe('en');
  });
});

describe('validateDocument', () => {
  it('returns empty errors array for createInitialDocument()', () => {
    const doc = createInitialDocument();
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(0);
  });
});
