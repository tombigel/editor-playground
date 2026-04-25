import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

describe('components/ui/tabs', () => {
  it('renders tablist, selected trigger, and active tabpanel content', () => {
    const markup = renderToStaticMarkup(
      <Tabs value="page">
        <TabsList>
          <TabsTrigger value="page">Page</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="page">Page content</TabsContent>
        <TabsContent value="settings">Settings content</TabsContent>
      </Tabs>,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('h-7');
    expect(markup).toContain('rounded-[6px]');
    expect(markup).toContain('Page content');
    expect(markup).not.toContain('Settings content');
  });

  it('supports segmented compact tabs as a shared variant', () => {
    const markup = renderToStaticMarkup(
      <Tabs value="page">
        <TabsList variant="segmented">
          <TabsTrigger value="page" variant="segmented" size="compact">
            Page
          </TabsTrigger>
          <TabsTrigger value="settings" variant="segmented" size="compact">
            Settings
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(markup).toContain('data-ui="tabs-list"');
    expect(markup).toContain('data-variant="segmented"');
    expect(markup).toContain('data-size="compact"');
    expect(markup).toContain('gap-0.5');
    expect(markup).toContain('h-6');
    expect(markup).toContain('rounded-sm');
    expect(markup).toContain('text-[11px]');
    expect(markup).toContain('p-0.5');
    expect(markup).not.toContain('h-7');
    expect(markup).not.toContain('min-w-[76px]');
    expect(markup).not.toContain('p-1');
    expect(markup).toContain('editor-pill-subtle');
    expect(markup).toContain(
      'hover:bg-[color:color-mix(in_srgb,var(--editor-accent)_12%,var(--editor-surface-background))]',
    );
    expect(markup).toContain('hover:text-[color:var(--editor-accent)]');
  });
});
