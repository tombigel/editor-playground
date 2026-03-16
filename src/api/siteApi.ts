import {
  SiteRenderer as SiteRendererComponent,
  type SiteRendererProps,
} from '../site/SiteRenderer';
import {
  DEFAULT_SITE_CSS_FILE_NAME,
  DEFAULT_SITE_HTML_FILE_NAME,
  renderSiteBodyHtml,
  renderSiteCss,
  renderSiteExportBundle,
  renderSiteHtmlDocument,
  type SiteExportBundle,
  type SiteExportOptions,
} from '../site/siteExport';

export const SiteRenderer = SiteRendererComponent;

export type { SiteRendererProps, SiteExportBundle, SiteExportOptions };
export {
  DEFAULT_SITE_CSS_FILE_NAME,
  DEFAULT_SITE_HTML_FILE_NAME,
  renderSiteBodyHtml,
  renderSiteCss,
  renderSiteExportBundle,
  renderSiteHtmlDocument,
};
