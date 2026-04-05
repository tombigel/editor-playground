import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/initialDocument';
import { createPage } from '../../model/pageDefaults';
import { buildRenderRootPlan } from '../../render/renderPlan';
import { buildHostingConfigs, buildRouteManifest, renderPageHtmlDocument, renderSiteExportBundles, resolvePageUrl } from '../siteExport';

function appendPage(document: ReturnType<typeof createInitialDocument>, displayName: string, slug: string) {
  const page = createPage({ displayName, slug });
  document.pages = [...(document.pages ?? []), page];
  return { document, page };
}

describe('site/siteExport MPA', () => {
  it('buildRenderRootPlan with pageId returns only that page sections plus shared header/footer', () => {
    let doc = createInitialDocument();
    const homePage = doc.pages![0];

    const aboutResult = appendPage(doc, 'About', 'about');
    doc = aboutResult.document;
    const aboutPage = aboutResult.page;

    const plan = buildRenderRootPlan(doc, true, {}, undefined, homePage.id);
    const aboutPlan = buildRenderRootPlan(doc, true, {}, undefined, aboutPage.id);

    expect(plan.main.length).toBe(homePage.sectionIds.length);
    expect(aboutPlan.main.length).toBe(aboutPage.sectionIds.length);

    const homeMainIds = plan.main.map((n) => n.node.id);
    const aboutMainIds = aboutPlan.main.map((n) => n.node.id);

    for (const id of homePage.sectionIds) {
      expect(homeMainIds).toContain(id);
    }
    for (const _id of aboutPage.sectionIds) {
      expect(aboutMainIds).not.toContain(undefined);
    }

    for (const id of homeMainIds) {
      expect(aboutMainIds).not.toContain(id);
    }
  });

  it('renderSiteExportBundles directory mode produces correct paths for 2-page doc', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'directory' });

    expect(bundles).toHaveLength(2);
    expect(bundles[0].path).toBe('index.html');
    expect(bundles[1].path).toBe('about/index.html');
  });

  it('renderSiteExportBundles flat mode produces correct paths for 2-page doc', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'flat' });

    expect(bundles).toHaveLength(2);
    expect(bundles[0].path).toBe('index.html');
    expect(bundles[1].path).toBe('about.html');
  });

  it('buildRouteManifest directory mode maps slugs to correct file paths', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const manifest = buildRouteManifest(doc, { outputStructure: 'directory' });

    expect(manifest.routes).toHaveLength(2);
    expect(manifest.routes[0].slug).toBe('');
    expect(manifest.routes[0].url).toBe('/');
    expect(manifest.routes[0].filePath).toBe('index.html');
    expect(manifest.routes[1].slug).toBe('about');
    expect(manifest.routes[1].url).toBe('/about/');
    expect(manifest.routes[1].filePath).toBe('about/index.html');
  });

  it('buildRouteManifest flat mode maps slugs to flat file paths', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const manifest = buildRouteManifest(doc, { outputStructure: 'flat' });

    expect(manifest.routes).toHaveLength(2);
    expect(manifest.routes[0].slug).toBe('');
    expect(manifest.routes[0].url).toBe('/');
    expect(manifest.routes[0].filePath).toBe('index.html');
    expect(manifest.routes[1].slug).toBe('about');
    expect(manifest.routes[1].url).toBe('/about/');
    expect(manifest.routes[1].filePath).toBe('about.html');
  });

  it('renderPageHtmlDocument for about page has lang from siteSettings and contains sp-site', () => {
    let doc = createInitialDocument();
    doc = {
      ...doc,
      siteSettings: { ...doc.siteSettings!, lang: 'fr', status: 'draft', viewTransition: 'none' },
    };
    const aboutResult = appendPage(doc, 'About', 'about');
    doc = aboutResult.document;
    const aboutPage = aboutResult.page;

    const html = renderPageHtmlDocument(doc, aboutPage.id);

    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('class="sp-site"');
    expect(html).toContain('<!doctype html>');
  });

  it('resolvePageUrl for nested page returns /parent-slug/child-slug/', () => {
    let doc = createInitialDocument();
    const parentResult = appendPage(doc, 'Parent', 'parent');
    doc = parentResult.document;
    const childResult = appendPage(doc, 'Child', 'child');
    doc = {
      ...childResult.document,
      pages: childResult.document.pages!.map((page) =>
        page.id === childResult.page.id ? { ...page, parentPageId: parentResult.page.id } : page,
      ),
    };
    const childPage = childResult.page;

    const url = resolvePageUrl(doc, childPage.id);

    expect(url).toBe('/parent/child/');
  });

  describe('buildHostingConfigs', () => {
    it('directory mode produces expected file keys', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });

      expect(Object.keys(configs)).toEqual([
        'hosting/netlify/_redirects',
        'hosting/vercel/vercel.json',
        'hosting/nginx/nginx.conf',
        'hosting/README.txt',
      ]);
    });

    it('directory mode netlify redirects file says no redirects required', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });

      expect(configs['hosting/netlify/_redirects']).toContain('no redirects required');
    });

    it('directory mode vercel config is empty object', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });

      expect(JSON.parse(configs['hosting/vercel/vercel.json'])).toEqual({});
    });

    it('directory mode nginx config uses $uri/ try_files', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });

      expect(configs['hosting/nginx/nginx.conf']).toContain('try_files $uri $uri/ =404');
    });

    it('flat mode netlify redirects contains per-page rewrite rules', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, 'About', 'about').document;
      const configs = buildHostingConfigs(doc, { outputStructure: 'flat' });

      expect(configs['hosting/netlify/_redirects']).toContain('/about  /about.html  200');
    });

    it('flat mode vercel config contains rewrites array', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, 'About', 'about').document;
      const configs = buildHostingConfigs(doc, { outputStructure: 'flat' });
      const vercel = JSON.parse(configs['hosting/vercel/vercel.json']);

      expect(vercel.rewrites).toEqual([{ source: '/about', destination: '/about.html' }]);
    });

    it('flat mode nginx config uses $uri.html try_files', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'flat' });

      expect(configs['hosting/nginx/nginx.conf']).toContain('try_files $uri $uri.html $uri/ =404');
    });
  });
});
