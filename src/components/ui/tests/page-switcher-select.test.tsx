import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageSwitcherSelect } from '../page-switcher-select';

describe('components/ui/page-switcher-select', () => {
  it('reuses the shared select primitives for page switching and page creation', () => {
    const markup = renderToStaticMarkup(
      <PageSwitcherSelect
        value="home"
        defaultOpen
        options={[
          { id: 'home', label: 'Home', depth: 0 },
          { id: 'about', label: 'About', depth: 1 },
        ]}
        onValueChange={() => {}}
        onCreatePage={() => {}}
      />,
    );

    expect(markup).toContain('data-ui="select-trigger"');
    expect(markup).toContain('data-ui="select-content"');
    expect(markup).toContain('editor-topbar-page-switcher');
    expect(markup).toContain('data-size="small"');
    expect(markup).toContain('editor-topbar-page-switcher-row');
    expect(markup).toContain('New page');
  });

  it('still exposes page creation when only one page exists', () => {
    const markup = renderToStaticMarkup(
      <PageSwitcherSelect
        value="home"
        defaultOpen
        options={[{ id: 'home', label: 'Home', depth: 0 }]}
        onValueChange={() => {}}
        onCreatePage={() => {}}
      />,
    );

    expect(markup).toContain('Home');
    expect(markup).toContain('New page');
  });
});
