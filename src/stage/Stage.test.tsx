import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../model/defaults';
import { parseWidthValue } from '../model/units';
import { Stage } from './Stage';

describe('stage/Stage', () => {
  it.each(['fit-content', 'max-content', 'min-content'])(
    'preserves %s width for text leaves in the stage DOM',
    (widthKeyword) => {
      const document = structuredClone(createInitialDocument());
      const target = Object.values(document.nodes).find(
        (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
      );

      if (!target || target.type !== 'leaf' || target.role !== 'text') {
        throw new Error('Expected post title text node');
      }

      target.rect.width.base = parseWidthValue(widthKeyword);

      const markup = renderToStaticMarkup(
        <Stage
          document={document}
          selectedId={null}
          previewSticky={true}
          spacerVisibility="selected"
          showGridLanes={false}
          snapEnabled={true}
          onStageFocus={() => {}}
          onSelect={() => {}}
          onMove={() => {}}
          onReparent={() => {}}
          onResize={() => {}}
          onResizeStart={() => {}}
          onResizeEnd={() => {}}
        />,
      );

      expect(markup).toContain(`id="stage-node-${target.id}"`);
      const nodeMarkupMatch = markup.match(new RegExp(`id="stage-node-${target.id}"[^>]*style="([^"]+)"`));
      expect(nodeMarkupMatch?.[1]).toContain(`width:${widthKeyword}`);
      expect(nodeMarkupMatch?.[1]).not.toContain('width:100%');
    },
  );
});
