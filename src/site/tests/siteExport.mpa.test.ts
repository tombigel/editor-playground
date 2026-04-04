import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/initialDocument';
import { addPage, resolvePageUrl, setPageParent } from '../../api/pageApi';
import { buildRenderRootPlan } from '../../render/renderPlan';
import { buildRouteManifest, renderPageHtmlDocument, renderSiteExportBundles } from '../siteExport';

describe('site/siteExport MPA', () => {
  it('buildRenderRootPlan with pageId returns only that page sections plus shared header/footer', () => {
    let doc = createInitialDocument();
    const homePage = doc.pages![0];

    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const aboutPage = doc.pages![1];

    const plan = buildRenderRootPlan(doc, true, {}, undefined, homePage.id);
    const aboutPlan = buildRenderRootPlan(doc, true, {}, undefined, aboutPage.id);

    expect(plan.main.length).toBe(homePage.sectionIds.length);
    expect(aboutPlan.main.length).toBe(aboutPage.sectionIds.length);

    const homeMainIds = plan.main.map((n) => n.node.id);
    const aboutMainIds = aboutPlan.main.map((n) => n.node.id);

    for (const id of homePage.sectionIds) {
      expect(homeMainIds).toContain(id);
    }
    for (const id of aboutPage.sectionIds) {
      expect(aboutMainIds).not.toContain(undefined);
    }

    for (const id of homeMainIds) {
      expect(aboutMainIds).not.toContain(id);
    }
  });

  it('renderSiteExportBundles directory mode produces correct paths for 2-page doc', () => {
    let doc = createInitialDocument();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'directory' });

    expect(bundles).toHaveLength(2);
    expect(bundles[0].path).toBe('index.html');
    expect(bundles[1].path).toBe('about/index.html');
  });

  it('renderSiteExportBundles flat mode produces correct paths for 2-page doc', () => {
    let doc = createInitialDocument();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'flat' });

    expect(bundles).toHaveLength(2);
    expect(bundles[0].path).toBe('index.html');
    expect(bundles[1].path).toBe('about.html');
  });

  it('buildRouteManifest maps slugs to correct file paths', () => {
    let doc = createInitialDocument();
    doc = addPage(doc, { displayName: 'About', slug: 'about' });

    const manifest = buildRouteManifest(doc);

    expect(manifest.routes).toHaveLength(2);
    expect(manifest.routes[0].slug).toBe('');
    expect(manifest.routes[0].url).toBe('/');
    expect(manifest.routes[0].filePath).toBe('index.html');
    expect(manifest.routes[1].slug).toBe('about');
    expect(manifest.routes[1].url).toBe('/about/');
    expect(manifest.routes[1].filePath).toBe('about/index.html');
  });

  it('renderPageHtmlDocument for about page has lang from siteSettings and contains sp-site', () => {
    let doc = createInitialDocument();
    doc = {
      ...doc,
      siteSettings: { ...doc.siteSettings!, lang: 'fr', status: 'draft', viewTransition: 'none' },
    };
    doc = addPage(doc, { displayName: 'About', slug: 'about' });
    const aboutPage = doc.pages![1];

    const html = renderPageHtmlDocument(doc, aboutPage.id);

    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('class="sp-site"');
    expect(html).toContain('<!doctype html>');
  });

  it('resolvePageUrl for nested page returns /parent-slug/child-slug/', () => {
    let doc = createInitialDocument();
    doc = addPage(doc, { displayName: 'Parent', slug: 'parent' });
    const parentPage = doc.pages![1];
    doc = addPage(doc, { displayName: 'Child', slug: 'child' });
    const childPage = doc.pages![2];
    doc = setPageParent(doc, childPage.id, parentPage.id);

    const url = resolvePageUrl(doc, childPage.id);

    expect(url).toBe('/parent/child/');
  });
});
