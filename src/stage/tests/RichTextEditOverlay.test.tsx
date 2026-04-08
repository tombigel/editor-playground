import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichTextEditOverlay } from '../stageRenderers/RichTextEditOverlay';
import type { RichContent } from '../../model/types';

const CONTENT: RichContent = [{ type: 'paragraph', children: [{ text: 'Edit me on stage' }] }];

describe('stage/RichTextEditOverlay', () => {
  it('renders the floating edit toolbar and preserves the authored minimum height', () => {
    const markup = renderToStaticMarkup(
      <RichTextEditOverlay
        nodeId="rich-node"
        content={CONTENT}
        minHeight="96px"
        onCommit={() => {}}
        onDiscard={() => {}}
      />,
    );

    expect(markup).toContain('data-stage-rich-toolbar="true"');
    expect(markup).toContain('Rich text edit');
    expect(markup).toContain('Cmd/Ctrl+Enter saves');
    expect(markup).toContain('min-height:96px');
  });
});
