import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import {
  DEFAULT_SITE_CSS_FILE_NAME,
  DEFAULT_SITE_HTML_FILE_NAME,
  renderSiteBodyHtml,
  renderSiteCss,
  renderSiteExportBundle,
  renderSiteHtmlDocument,
  SiteRenderer,
} from '../siteApi';

describe('api/siteApi', () => {
  it('re-exports the site renderer and export helpers', () => {
    const document = createInitialDocument();

    expect(SiteRenderer).toBeTypeOf('function');
    expect(DEFAULT_SITE_HTML_FILE_NAME).toBe('sticky-playground-site.html');
    expect(DEFAULT_SITE_CSS_FILE_NAME).toBe('sticky-playground-site.css');
    expect(renderSiteBodyHtml(document)).toContain('class="sp-site"');
    expect(renderSiteCss(document)).toContain('.sp-site {');
    expect(renderSiteHtmlDocument(document)).toContain('<!doctype html>');
    expect(renderSiteExportBundle(document)).toMatchObject({
      htmlFileName: DEFAULT_SITE_HTML_FILE_NAME,
      cssFileName: DEFAULT_SITE_CSS_FILE_NAME,
    });
  });
});
