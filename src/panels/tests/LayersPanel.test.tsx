import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../../model/defaults';
import { LayersPanelContent } from '../LayersPanel';

describe('panels/LayersPanel', () => {
  it('renders compact rows with a type line and explicit edit action', () => {
    const document = createInitialDocument();

    const markup = renderToStaticMarkup(
      <LayersPanelContent
        document={document}
        selectedIds={[]}
        onSelectNode={() => undefined}
        onRenameNode={() => undefined}
        onDeleteNode={() => undefined}
        onSetNodeVisibility={() => undefined}
        onMoveNodeInTree={() => undefined}
      />,
    );

    expect(markup).toContain('editor-layers-row-type');
    expect(markup).toContain('editor-layers-divider');
    expect(markup).toContain('aria-label="Edit Playground Header"');
    expect(markup).toContain('aria-label="Hide Playground Header"');
    expect(markup).toContain('editor-layers-action editor-layers-action-edit h-7 w-7');
    expect(markup).toContain('editor-layers-action editor-layers-action-visibility h-7 w-7');
    expect(markup).toContain('Edit title');
    expect(markup).toContain('Hide');
    expect(markup).not.toContain('aria-label="Delete Playground Header"');
    expect(markup.indexOf('aria-label="Edit Playground Header"')).toBeLessThan(
      markup.indexOf('aria-label="Hide Playground Header"'),
    );
    expect(markup).not.toContain('editor-pill-contrast');
  });
});
