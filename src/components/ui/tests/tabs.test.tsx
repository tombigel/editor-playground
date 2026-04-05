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
    expect(markup).toContain('Page content');
    expect(markup).not.toContain('Settings content');
  });
});
