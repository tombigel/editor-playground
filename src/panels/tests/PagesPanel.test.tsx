import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { PagesPanel } from '../PagesPanel';

describe('panels/PagesPanel', () => {
  it('renders the page tab as a two-column page tree plus embedded page editor', () => {
    const document = createInitialDocument();
    const pageId = document.pages?.[0]?.id ?? null;

    const markup = renderToStaticMarkup(
      <PagesPanel
        position={{ top: 24, left: 24 }}
        onPositionChange={() => {}}
        document={document}
        activePageId={pageId}
        selectedPageId={pageId}
        initialTab="page"
        onClose={() => {}}
        onSetSiteSettings={() => {}}
        onSetActivePage={() => {}}
        onAddPage={() => {}}
        onDeletePage={() => {}}
        onSetPageDisplayName={() => {}}
        onSetPageAsHome={() => {}}
        onSetPageLang={() => {}}
        onSetPageSlug={() => {}}
        onAddPageAlias={() => {}}
        onRemovePageAlias={() => {}}
        onSetPageVisibility={() => {}}
        onSetPageViewTransition={() => {}}
        onSetPageParent={() => {}}
        onReorderPage={() => {}}
        onSyncPageLinks={() => {}}
        onValidateLinks={() => {}}
      />,
    );

    expect(markup).toContain('editor-pages-panel');
    expect(markup).toContain('editor-panel-header-actions');
    expect(markup).toContain('editor-bg-subtle');
    expect(markup).toContain('editor-border-subtle');
    expect(markup).toContain('editor-scrollbar');
    expect(markup).toContain('editor-scrollbar-gutter');
    expect(markup).toContain('Home');
    expect(markup).toContain('Add page');
    expect(markup).toContain('Language');
    expect(markup).toContain('Home page');
    expect(markup).toContain('Slug');
    expect(markup).toContain('Transition');
    expect(markup).toContain('Validate links');
    expect(markup).toContain('Parent');
    expect(markup).toContain('system canonical');
    expect(markup).not.toContain('Canonical route:');
  });

  it('keeps the page tree visible while the settings view swaps only the right panel content', () => {
    const document = createInitialDocument();

    const markup = renderToStaticMarkup(
      <PagesPanel
        position={{ top: 24, left: 24 }}
        onPositionChange={() => {}}
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        initialTab="settings"
        onClose={() => {}}
        onSetSiteSettings={() => {}}
        onSetActivePage={() => {}}
        onAddPage={() => {}}
        onDeletePage={() => {}}
        onSetPageDisplayName={() => {}}
        onSetPageAsHome={() => {}}
        onSetPageLang={() => {}}
        onSetPageSlug={() => {}}
        onAddPageAlias={() => {}}
        onRemovePageAlias={() => {}}
        onSetPageVisibility={() => {}}
        onSetPageViewTransition={() => {}}
        onSetPageParent={() => {}}
        onReorderPage={() => {}}
        onSyncPageLinks={() => {}}
        onValidateLinks={() => {}}
      />,
    );

    expect(markup).toContain('Site page settings');
    expect(markup).toContain('Home');
    expect(markup).toContain('Add page');
    expect(markup).toContain('editor-bg-subtle');
    expect(markup).toContain('editor-border-subtle');
    expect(markup).toContain('Title');
    expect(markup).toContain('Site language');
    expect(markup).toContain('Site transition');
    expect(markup).toContain('English (United States) (en-US)');
    expect(markup).not.toContain('Status');
    expect(markup).not.toContain('Output structure');
    expect(markup).not.toContain('Rendered Site');
  });
});
