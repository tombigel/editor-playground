import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Layers2, Pin, PencilLine } from 'lucide-react';
import {
  TreeRowActionButton,
  TreeRowItem,
  TreeRowLabelContent,
  VisibilityToggle,
} from '../tree-row';

describe('components/ui/tree-row', () => {
  it('renders shared tree row label content with badges and subtitle', () => {
    const markup = renderToStaticMarkup(
      <TreeRowItem
        depth={1}
        hasChildren
        isExpanded
        icon={<Layers2 className="h-3.5 w-3.5" />}
        label={(
          <TreeRowLabelContent
            title="Sticky Card"
            subtitle="Container"
            badges={<Pin className="h-3 w-3" />}
          />
        )}
      />,
    );

    expect(markup).toContain('data-ui="tree-row-label-content"');
    expect(markup).toContain('Sticky Card');
    expect(markup).toContain('Container');
    expect(markup).toContain('editor-layers-row-badges');
  });

  it('supports the shared compact menu row variant', () => {
    const markup = renderToStaticMarkup(
      <TreeRowItem
        depth={0}
        hasChildren
        isExpanded={false}
        variant="menu"
        icon={<Layers2 className="h-3.5 w-3.5" />}
        label={<TreeRowLabelContent title="Usage" subtitle="Core editor workflows" />}
      />,
    );

    expect(markup).toContain('data-variant="menu"');
    expect(markup).toContain('editor-layers-disclosure');
  });

  // Multiline wrap-vs-truncate behavior for tree row labels (wrapTitle/wrapSubtitle)
  // is expressed purely via Tailwind utility classes with no data attribute to assert
  // on; this is covered by the Playwright e2e suite / visual review instead.

  it('renders shared row action buttons and visibility toggles', () => {
    const markup = renderToStaticMarkup(
      <>
        <TreeRowActionButton
          ariaLabel="Edit Sticky Card"
          tooltip="Edit title"
          onClick={() => {}}
        >
          <PencilLine className="h-3.5 w-3.5" />
        </TreeRowActionButton>
        <VisibilityToggle
          isHidden={false}
          onToggle={() => {}}
          nodeId="Sticky Card"
          label="Hide"
        />
      </>,
    );

    expect(markup).toContain('aria-label="Edit Sticky Card"');
    expect(markup).toContain('Edit title');
    expect(markup).toContain('aria-label="Hide Sticky Card"');
    expect(markup).toContain('data-variant="menu"');
  });
});
