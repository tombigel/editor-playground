import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InspectorBlockList } from '../InspectorBlockList';
import type { ResolvedInspectorBlock } from '../inspector/types';

const TEST_BLOCKS: ResolvedInspectorBlock[] = [
  {
    id: 'layout',
    bucket: 'primary',
    align: 'stretch',
    layout: 'stack',
    sections: [
      {
        id: 'layout-section',
        render: () => <div>Layout</div>,
      },
    ],
  },
];

describe('panels/InspectorBlockList', () => {
  it('uses the shared editor scrollbar class when scrollable', () => {
    const markup = renderToStaticMarkup(<InspectorBlockList blocks={TEST_BLOCKS} />);

    expect(markup).toContain('editor-scrollbar');
  });

  it('omits the shared scrollbar class when scrolling is disabled', () => {
    const markup = renderToStaticMarkup(<InspectorBlockList blocks={TEST_BLOCKS} scrollable={false} />);

    expect(markup).not.toContain('editor-scrollbar');
  });
});
