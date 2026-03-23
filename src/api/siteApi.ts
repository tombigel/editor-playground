/**
 * @module siteApi
 *
 * Pass-through re-exports from the site subsystem.
 * Covers the React site renderer component and static HTML/CSS export utilities.
 */

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

/** React component that renders a full site from a DocumentModel. */
export const SiteRenderer = SiteRendererComponent;

export type { SiteRendererProps, SiteExportBundle, SiteExportOptions };

/** Static site export: render HTML, CSS, and full export bundles from a DocumentModel. */
export {
  DEFAULT_SITE_CSS_FILE_NAME,
  DEFAULT_SITE_HTML_FILE_NAME,
  renderSiteBodyHtml,
  renderSiteCss,
  renderSiteExportBundle,
  renderSiteHtmlDocument,
};
