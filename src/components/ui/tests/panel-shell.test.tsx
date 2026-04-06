import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Layers3 } from 'lucide-react';
import { FloatingPanelShell } from '../floating-panel-shell';
import { PanelHeader } from '../panel-header';

describe('components/ui/panel-shell', () => {
  it('renders a shared panel header contract with trailing actions and close affordance', () => {
    const markup = renderToStaticMarkup(
      <PanelHeader
        icon={<Layers3 className="h-4 w-4" />}
        title="Components"
        description="Structure, visibility, and order."
        closeLabel="Close components panel"
        onClose={() => {}}
        actions={<span>Actions</span>}
      />,
    );

    expect(markup).toContain('data-ui="panel-header"');
    expect(markup).toContain('data-ui="panel-header-title"');
    expect(markup).toContain('data-ui="panel-header-actions"');
    expect(markup).toContain('editor-panel-header-close');
    expect(markup).toContain('Close components panel');
  });

  it('renders a shared floating panel shell with header and body slots', () => {
    const markup = renderToStaticMarkup(
      <FloatingPanelShell
        open
        onOpenChange={() => {}}
        className="w-[320px]"
        style={{ top: '12px', left: '24px' }}
        header={
          <PanelHeader
            title="Section Templates"
            closeLabel="Close section templates panel"
            onClose={() => {}}
          />
        }
        bodyClassName="max-h-[120px] overflow-y-auto"
      >
        <div>Body content</div>
      </FloatingPanelShell>,
    );

    expect(markup).toContain('data-ui="floating-panel-shell"');
    expect(markup).toContain('data-ui="floating-panel-body"');
    expect(markup).toContain('data-ui="panel-header"');
    expect(markup).toContain('Body content');
  });

  it('can render the shared shell without native popover attributes for static demos', () => {
    const markup = renderToStaticMarkup(
      <FloatingPanelShell
        suppressPopover
        open
        onOpenChange={() => {}}
        className="absolute w-[320px]"
        style={{ top: '0px', left: '0px' }}
        header={
          <PanelHeader
            title="Section Templates"
            closeLabel="Close section templates panel"
            onClose={() => {}}
          />
        }
      >
        <div>Static body</div>
      </FloatingPanelShell>,
    );

    expect(markup).toContain('data-ui="floating-panel-shell"');
    expect(markup).toContain('Static body');
    expect(markup).not.toContain('popover="manual"');
  });
});
