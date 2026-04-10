import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { TopLevelWrapperVisibilityControl } from '../controls/TopLevelWrapperVisibilityControl';

function getTriggerMarkup(markup: string, ariaLabel: string) {
  const triggerStart = markup.indexOf(`aria-label="${ariaLabel}"`);
  const buttonStart = markup.lastIndexOf('<button', triggerStart);
  const buttonEnd = markup.indexOf('</button>', triggerStart);
  return markup.slice(buttonStart, buttonEnd + '</button>'.length);
}

describe('panels/TopLevelWrapperVisibilityControl', () => {
  it('summarizes custom page selection counts in the trigger label', () => {
    const document = createInitialDocument();

    const markup = renderToStaticMarkup(
      <TopLevelWrapperVisibilityControl
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        value={{ mode: 'customPages', pageIds: ['page_1', 'page_2'] }}
        onChange={() => {}}
      />,
    );

    expect(markup).toContain('Visibility: Custom pages (2)');
    expect(markup).toContain('Custom pages (2)');
    expect(markup).toContain('data-ui="select-option-row"');
  });

  it('supports an icon-only closed trigger while preserving the visibility aria label', () => {
    const document = createInitialDocument();

    const markup = renderToStaticMarkup(
      <TopLevelWrapperVisibilityControl
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        value={{ mode: 'allPages', pageIds: [] }}
        triggerDisplay="icon"
        onChange={() => {}}
      />,
    );

    const triggerMarkup = getTriggerMarkup(markup, 'Visibility: All pages');

    expect(markup).toContain('aria-label="Visibility: All pages"');
    expect(markup).toContain('role="tooltip"');
    expect(markup).toContain('Visibility: All pages</div>');
    expect(triggerMarkup).toContain('h-7 w-7 justify-center p-0');
    expect(triggerMarkup).not.toContain('data-ui="select-option-row"');
    expect(triggerMarkup).not.toContain('All pages</span>');
  });
});
