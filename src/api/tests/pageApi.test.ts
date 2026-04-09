import { describe, expect, it } from 'vitest';
import { createInitialDocument, createContainerNode, createLinkTextNode, createTextNode } from '../../model/defaults';
import { createTextDocumentContent, createTextDocumentFromText } from '../../model/richContent';
import type { DocumentModel, RichTextLink, TextNode } from '../../model/types';
import { validateDocument } from '../../model/validation';
import { setTopLevelWrapperVisibility } from '../documentApi';
import {
  addPage,
  addPageSlugAlias,
  deletePage,
  getAllPageRoutes,
  getPageForSection,
  moveSectionToPage,
  removePageSlugAlias,
  reorderPage,
  resolvePageHierarchyUrl,
  resolvePageSystemAliasUrl,
  resolvePageUrl,
  setPageAsHome,
  setPageParent,
  setPageVisibility,
  setPageSlug,
  setPageViewTransition,
  setSiteSettings,
  syncPageHrefLinks,
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
    expect(result.pages?.[0].pageRole).toBe('home');
  });

  it('increments duplicate page names and slugs for new pages', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'New Page' });
    const result = addPage(doc, { displayName: 'New Page' });
    const newPage = (result.pages ?? []).at(-1);
    expect(newPage?.displayName).toBe('New Page 2');
    expect(newPage?.slug).toBe('new-page-2');
  });

  it('avoids collisions with existing slugs and slug aliases', () => {
    let doc = makeDoc();
    doc = addPage(doc, {
      displayName: 'About',
      slug: 'about',
      slugAliases: ['about-2'],
    });
    const result = addPage(doc, { displayName: 'About', slug: 'about' });
    const newPage = (result.pages ?? []).at(-1);
    expect(newPage?.displayName).toBe('About 2');
    expect(newPage?.slug).toBe('about-3');
  });

  it('regenerates auto-derived slugs from the uniquified page name', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'New Page', slug: 'new-page' });
    doc = addPage(doc, { displayName: 'New Page 2', slug: 'new-page-2' });

    const result = addPage(doc, { displayName: 'New Page', slug: 'new-page' });
    const newPage = (result.pages ?? []).at(-1);

    expect(newPage?.displayName).toBe('New Page 3');
    expect(newPage?.slug).toBe('new-page-3');
  });
});

describe('deletePage', () => {
  it('does not delete the only page', () => {
    const doc = makeDoc();
    const pageId = (doc.pages ?? [])[0].id;
    const result = deletePage(doc, pageId);
    expect(result).toBe(doc);
    expect((result.pages ?? []).find((p) => p.id === pageId)).toBeDefined();
  });

  it("removes the page's section nodes from nodes when another page remains", () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const page = (doc.pages ?? [])[1];
    const root = doc.nodes[doc.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }
    const section = createContainerNode('section', doc.rootId);
    doc.nodes[section.id] = section;
    root.children.splice(root.children.length - 1, 0, section.id);
    page.sectionIds.push(section.id);
    const result = deletePage(doc, page.id);
    expect(result.nodes[section.id]).toBeUndefined();
  });

  it('shared regions (header/footer) remain in nodes', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const page = (doc.pages ?? [])[1];
    const sharedIds = doc.sharedRegionIds ?? [];
    const result = deletePage(doc, page.id);
    for (const id of sharedIds) {
      expect(result.nodes[id]).toBeDefined();
    }
  });

  it('removes deleted pages from custom top-level wrapper targets', () => {
    let doc = makeDoc();
    const aboutResult = addPage(doc, { displayName: 'About', slug: 'about' });
    doc = aboutResult;
    const aboutPage = (doc.pages ?? []).find((page) => page.slug === 'about');
    const homePage = (doc.pages ?? [])[0];
    const section = Object.values(doc.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!aboutPage || !homePage || !section || section.contentType !== 'container') {
      throw new Error('Expected home page, about page, and section wrapper');
    }

    const custom = setTopLevelWrapperVisibility(doc, homePage.id, section.id, 'customPages', [
      homePage.id,
      aboutPage.id,
    ]);
    const result = deletePage(custom, aboutPage.id);
    const updatedSection = result.nodes[section.id];

    if (updatedSection.contentType !== 'container') {
      throw new Error('Expected wrapper node');
    }

    expect(updatedSection.pageTargetIds).toEqual([homePage.id]);
  });

  it('promotes the first remaining page to home when deleting the home page', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const homePage = doc.pages?.find((page) => page.pageRole === 'home');
    const result = deletePage(doc, homePage!.id);
    expect(result.pages?.[0].pageRole).toBe('home');
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

describe('setPageVisibility', () => {
  it('does not allow hiding the home page', () => {
    const doc = makeDoc();
    const homePage = doc.pages?.find((page) => page.pageRole === 'home');

    const result = setPageVisibility(doc, homePage!.id, false);

    expect(result).toBe(doc);
    expect(result.pages?.find((page) => page.id === homePage!.id)?.visible).toBe(true);
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

describe('setPageAsHome', () => {
  it('promotes any page to home without changing page order', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const beforeOrder = doc.pages?.map((page) => page.id);
    const aboutPage = doc.pages?.find((page) => page.slug === 'about');

    const result = setPageAsHome(doc, aboutPage!.id);

    expect(result.pages?.map((page) => page.id)).toEqual(beforeOrder);
    expect(result.pages?.find((page) => page.id === aboutPage!.id)?.pageRole).toBe('home');
    expect(result.pages?.filter((page) => page.pageRole === 'home')).toHaveLength(1);
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
  it('home page resolves to "/"', () => {
    const doc = makeDoc();
    const homePage = (doc.pages ?? []).find((p) => p.pageRole === 'home');
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

  it('keeps the hierarchy url as a system alias for the home page', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const aboutPage = (doc.pages ?? []).find((p) => p.slug === 'about')!;
    doc = setPageAsHome(doc, aboutPage.id);

    expect(resolvePageUrl(doc, aboutPage.id)).toBe('/');
    expect(resolvePageHierarchyUrl(doc, aboutPage.id)).toBe('/about/');
    expect(resolvePageSystemAliasUrl(doc, aboutPage.id)).toBe('/about/');
  });
});

describe('getAllPageRoutes', () => {
  it('returns canonical and alias routes for the home page', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', slug: 'about', slugAliases: ['about-us'] });
    const aboutPage = (doc.pages ?? []).find((p) => p.slug === 'about')!;
    doc = setPageAsHome(doc, aboutPage.id);

    expect(getAllPageRoutes(doc)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pageId: aboutPage.id, kind: 'canonical', url: '/' }),
        expect.objectContaining({ pageId: aboutPage.id, kind: 'system-alias', url: '/about/', redirectTo: '/' }),
        expect.objectContaining({ pageId: aboutPage.id, kind: 'manual-alias', url: '/about-us/', redirectTo: '/' }),
      ]),
    );
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

describe('setPageViewTransition', () => {
  it('sets viewTransition on the target page', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About' });
    const pageId = (doc.pages ?? [])[1].id;
    const result = setPageViewTransition(doc, pageId, 'crossfade');
    const updated = (result.pages ?? []).find((p) => p.id === pageId);
    expect(updated?.viewTransition).toBe('crossfade');
  });

  it('can clear viewTransition by setting undefined', () => {
    let doc = makeDoc();
    doc = addPage(doc, { displayName: 'About', viewTransition: 'slide' });
    const pageId = (doc.pages ?? [])[1].id;
    const result = setPageViewTransition(doc, pageId, undefined);
    const updated = (result.pages ?? []).find((p) => p.id === pageId);
    expect(updated?.viewTransition).toBeUndefined();
  });

  it('returns document unchanged for unknown pageId', () => {
    const doc = makeDoc();
    const pages = doc.pages ?? [];
    // Use an ID that cannot exist in a fresh document
    const fakeId = (`${pages[0].id}-nonexistent`) as typeof pages[0]['id'];
    const result = setPageViewTransition(doc, fakeId, 'slide');
    expect(result).toBe(doc);
  });
});

describe('setSiteSettings', () => {
  it('merges patch into existing siteSettings', () => {
    const doc = makeDoc();
    const result = setSiteSettings(doc, { status: 'published', title: 'My Site' });
    expect(result.siteSettings?.status).toBe('published');
    expect(result.siteSettings?.title).toBe('My Site');
    expect(result.siteSettings?.lang).toBe('en-US');
  });
});

describe('validateDocument', () => {
  it('returns empty errors array for createInitialDocument()', () => {
    const doc = createInitialDocument();
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(0);
  });
});

describe('syncPageHrefLinks', () => {
  function makeDocWithLinkNode(href: string): DocumentModel {
    const doc = makeDoc();
    const root = doc.nodes[doc.rootId];
    const sectionId = root.children[0];
    const section = doc.nodes[sectionId];
    const linkNode = createLinkTextNode(sectionId) as TextNode;
    linkNode.id = 'link-node-1';
    linkNode.content = createTextDocumentFromText('Click me');
    linkNode.link = { ...(linkNode.link ?? { linkType: 'external' }), href };
    return {
      ...doc,
      nodes: {
        ...doc.nodes,
        [linkNode.id]: linkNode,
        [sectionId]: { ...section, children: [...section.children, linkNode.id] },
      },
    };
  }

  it('updates href on link nodes matching oldUrl', () => {
    const doc = makeDocWithLinkNode('/about/');
    const result = syncPageHrefLinks(doc, '/about/', '/about-us/');
    expect((result.nodes['link-node-1'] as { link?: { href?: string } }).link?.href).toBe('/about-us/');
  });

  it('does not update href on link nodes not matching oldUrl', () => {
    const doc = makeDocWithLinkNode('/contact/');
    const result = syncPageHrefLinks(doc, '/about/', '/about-us/');
    expect((result.nodes['link-node-1'] as { link?: { href?: string } }).link?.href).toBe('/contact/');
  });

  it('returns original document reference when nothing matches', () => {
    const doc = makeDocWithLinkNode('/contact/');
    const result = syncPageHrefLinks(doc, '/about/', '/about-us/');
    expect(result).toBe(doc);
  });

  it('does nothing when oldUrl is "/"', () => {
    const doc = makeDocWithLinkNode('/');
    const result = syncPageHrefLinks(doc, '/', '/home/');
    expect((result.nodes['link-node-1'] as { link?: { href?: string } }).link?.href).toBe('/');
  });

  it('does nothing when oldUrl equals newUrl', () => {
    const doc = makeDocWithLinkNode('/about/');
    const result = syncPageHrefLinks(doc, '/about/', '/about/');
    expect(result).toBe(doc);
  });

  it('updates matching href inside RichContent inline links', () => {
    const doc = makeDoc();
    const root = doc.nodes[doc.rootId];
    const sectionId = root.children[0];
    const section = doc.nodes[sectionId];
    const rich = createTextNode('rich', sectionId) as TextNode;
    rich.id = 'rich-node-1';
    rich.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { text: 'Visit ' },
          { type: 'link', linkType: 'external', href: '/old/', children: [{ text: 'here' }] },
          { text: '.' },
        ],
      },
    ]);
    const docWithRich: DocumentModel = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [rich.id]: rich,
        [sectionId]: { ...section, children: [...section.children, rich.id] },
      },
    };
    const result = syncPageHrefLinks(docWithRich, '/old/', '/new/');
    const updatedRich = result.nodes['rich-node-1'] as TextNode;
    const inlineLink = (updatedRich.content.blocks[0]?.children?.[1]) as RichTextLink;
    expect(inlineLink.href).toBe('/new/');
  });

  it('leaves non-matching inline links untouched', () => {
    const doc = makeDoc();
    const root = doc.nodes[doc.rootId];
    const sectionId = root.children[0];
    const section = doc.nodes[sectionId];
    const rich = createTextNode('rich', sectionId) as TextNode;
    rich.id = 'rich-node-2';
    rich.content = createTextDocumentContent([
      {
        type: 'paragraph',
        children: [
          { type: 'link', linkType: 'external', href: '/other/', children: [{ text: 'other' }] },
        ],
      },
    ]);
    const docWithRich: DocumentModel = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [rich.id]: rich,
        [sectionId]: { ...section, children: [...section.children, rich.id] },
      },
    };
    const result = syncPageHrefLinks(docWithRich, '/old/', '/new/');
    const updatedRich = result.nodes['rich-node-2'] as TextNode;
    const inlineLink = (updatedRich.content.blocks[0]?.children?.[0]) as RichTextLink;
    expect(inlineLink.href).toBe('/other/');
  });

  it('returns original document reference when no rich content links match', () => {
    const doc = makeDoc();
    const root = doc.nodes[doc.rootId];
    const sectionId = root.children[0];
    const section = doc.nodes[sectionId];
    const rich = createTextNode('rich', sectionId) as TextNode;
    rich.id = 'rich-node-3';
    rich.content = createTextDocumentContent([{ type: 'paragraph', children: [{ text: 'no links' }] }]);
    const docWithRich: DocumentModel = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [rich.id]: rich,
        [sectionId]: { ...section, children: [...section.children, rich.id] },
      },
    };
    const result = syncPageHrefLinks(docWithRich, '/old/', '/new/');
    expect(result).toBe(docWithRich);
  });
});
