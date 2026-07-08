import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/initialDocument';
import { createPage } from '../../model/pageDefaults';
import { buildRenderRootPlan } from '../../render/renderPlan';
import { buildHostingConfigs, buildRouteManifest, renderPageHtmlDocument, renderSiteCss, renderSiteExportBundles, resolvePageUrl } from '../siteExport';

function appendPage(document: ReturnType<typeof createInitialDocument>, displayName: string, slug: string) {
  const page = createPage({ displayName, slug });
  document.pages = [...(document.pages ?? []), page];
  return { document, page };
}

function promoteHome(document: ReturnType<typeof createInitialDocument>, pageId: string) {
  document.pages = (document.pages ?? []).map((page) => ({
    ...page,
    pageRole: page.id === pageId ? 'home' : 'default',
  }));
  return document;
}

describe('site/siteExport MPA', () => {
  it('buildRenderRootPlan with pageId returns only that page wrappers plus shared top-level wrappers', () => {
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

  it('renderPageHtmlDocument only includes custom top-level wrappers on targeted pages', () => {
    let doc = createInitialDocument();
    const homePage = doc.pages?.[0];
    const aboutResult = appendPage(doc, 'About', 'about');
    doc = aboutResult.document;
    const aboutPage = aboutResult.page;
    const section = Object.values(doc.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    if (!homePage || !section || section.contentType !== 'container') {
      throw new Error('Expected home page and section wrapper');
    }

    const custom = structuredClone(doc);
    custom.pages = (custom.pages ?? []).map((page) => ({
      ...page,
      sectionIds: page.sectionIds.filter((sectionId) => sectionId !== section.id),
    }));
    custom.sharedRegionIds = (custom.sharedRegionIds ?? []).filter((id) => id !== section.id);
    const customSection = custom.nodes[section.id];
    if (!customSection || customSection.contentType !== 'container') {
      throw new Error('Expected wrapper node');
    }
    customSection.pageTargetIds = [homePage.id];

    expect(renderPageHtmlDocument(custom, homePage.id)).toContain(`data-node-id="${section.id}"`);
    expect(renderPageHtmlDocument(custom, aboutPage.id)).not.toContain(`data-node-id="${section.id}"`);
  });

  it('renderSiteExportBundles directory mode produces correct paths for 2-page doc', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'directory' });

    expect(bundles).toHaveLength(3);
    expect(bundles.map((bundle) => bundle.path)).toEqual(
      expect.arrayContaining(['index.html', 'home/index.html', 'about/index.html']),
    );
  });

  it('renderSiteExportBundles flat mode produces correct paths for 2-page doc', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'flat' });

    expect(bundles).toHaveLength(3);
    expect(bundles.map((bundle) => bundle.path)).toEqual(
      expect.arrayContaining(['index.html', 'home.html', 'about.html']),
    );
  });

  it('buildRouteManifest directory mode maps slugs to correct file paths', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const manifest = buildRouteManifest(doc, { outputStructure: 'directory' });

    expect(manifest.routes).toHaveLength(3);
    expect(manifest.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'home', url: '/', filePath: 'index.html', kind: 'canonical' }),
        expect.objectContaining({ slug: 'home', url: '/home/', filePath: 'home/index.html', kind: 'system-alias', redirectTo: '/' }),
        expect.objectContaining({ slug: 'about', url: '/about/', filePath: 'about/index.html', kind: 'canonical' }),
      ]),
    );
  });

  it('buildRouteManifest flat mode maps slugs to flat file paths', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;

    const manifest = buildRouteManifest(doc, { outputStructure: 'flat' });

    expect(manifest.routes).toHaveLength(3);
    expect(manifest.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'home', url: '/', filePath: 'index.html', kind: 'canonical' }),
        expect.objectContaining({ slug: 'home', url: '/home/', filePath: 'home.html', kind: 'system-alias', redirectTo: '/' }),
        expect.objectContaining({ slug: 'about', url: '/about/', filePath: 'about.html', kind: 'canonical' }),
      ]),
    );
  });

  it('renderPageHtmlDocument for about page has lang from siteSettings and contains sp-site', () => {
    let doc = createInitialDocument();
    doc = {
      ...doc,
      siteSettings: { ...doc.siteSettings!, lang: 'fr', status: 'draft', viewTransition: 'none', background: '#fef3c7' },
    };
    const aboutResult = appendPage(doc, 'About', 'about');
    doc = aboutResult.document;
    const aboutPage = aboutResult.page;

    const html = renderPageHtmlDocument(doc, aboutPage.id);
    const css = renderSiteCss(doc);

    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('class="sp-site"');
    expect(css).toContain('background: #fef3c7;');
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

    it('directory mode netlify redirects file includes the default home alias redirect', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });

      expect(configs['hosting/netlify/_redirects']).toContain('/home  /  301!');
    });

    it('directory mode vercel config includes the default home alias redirect', () => {
      const doc = createInitialDocument();
      const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });

      expect(JSON.parse(configs['hosting/vercel/vercel.json'])).toEqual({
        redirects: [
          { source: '/home', destination: '/', permanent: true },
          { source: '/home/', destination: '/', permanent: true },
        ],
      });
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

      expect(configs['hosting/netlify/_redirects']).toContain('/home  /  301!');
      expect(configs['hosting/netlify/_redirects']).toContain('/about /about.html  200');
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

  it('exports redirect stubs and redirect metadata for a promoted home page', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;
    const aboutPage = doc.pages?.find((page) => page.slug === 'about');
    doc = promoteHome(doc, aboutPage!.id);

    const bundles = renderSiteExportBundles(doc, { outputStructure: 'directory' });
    const aliasBundle = bundles.find((bundle) => bundle.path === 'about/index.html');
    const manifest = buildRouteManifest(doc, { outputStructure: 'directory' });

    expect(aliasBundle).toMatchObject({ kind: 'redirect', redirectTo: '/' });
    expect(aliasBundle?.htmlDocument).toContain('<link rel="canonical" href="/" />');
    expect(manifest.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pageId: aboutPage!.id, kind: 'canonical', url: '/', filePath: 'index.html' }),
        expect.objectContaining({ pageId: aboutPage!.id, kind: 'system-alias', url: '/about/', redirectTo: '/', filePath: 'about/index.html' }),
      ]),
    );
  });

  it('generates host redirects for promoted home aliases', () => {
    let doc = createInitialDocument();
    doc = appendPage(doc, 'About', 'about').document;
    const aboutPage = doc.pages?.find((page) => page.slug === 'about');
    doc = promoteHome(doc, aboutPage!.id);

    const configs = buildHostingConfigs(doc, { outputStructure: 'directory' });
    const vercel = JSON.parse(configs['hosting/vercel/vercel.json']);

    expect(configs['hosting/netlify/_redirects']).toContain('/about  /  301!');
    expect(configs['hosting/nginx/nginx.conf']).toContain('return 308 /;');
    expect(vercel.redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: '/about', destination: '/', permanent: true }),
      ]),
    );
  });
});
