import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichTextEditOverlay } from '../stageRenderers/RichTextEditOverlay';
import { createTextDocumentContent, listContentToRichListBlock } from '../../model/richContent';

const CONTENT = createTextDocumentContent([{ type: 'paragraph', children: [{ text: 'Edit me on stage' }] }]);

describe('stage/RichTextEditOverlay', () => {
  it('renders the floating edit toolbar and preserves the authored minimum height', () => {
    const markup = renderToStaticMarkup(
      <RichTextEditOverlay
        nodeId="rich-node"
        content={CONTENT}
        minHeight="96px"
        onCommit={() => {}}
        onUpdateBlockGap={() => {}}
        onDiscard={() => {}}
      />,
    );

    expect(markup).toContain('data-stage-rich-toolbar="true"');
    expect(markup).toContain('aria-label="Font family"');
    expect(markup).toContain('aria-label="Font size"');
    expect(markup).toContain('aria-label="Bold"');
    expect(markup).toContain('aria-label="Italic"');
    expect(markup).toContain('aria-label="Underline"');
    expect(markup).toContain('aria-label="Strikethrough"');
    expect(markup).toContain('aria-label="Text color"');
    expect(markup).toContain('aria-label="Highlight color"');
    expect(markup).toContain('aria-label="Link"');
    expect(markup).toContain('aria-label="Use text block"');
    expect(markup).toContain('aria-label="Use code block"');
    expect(markup).toContain('aria-label="Ordered list marker"');
    expect(markup).toContain('aria-label="Unordered list marker"');
    expect(markup).toContain('aria-label="Line height"');
    expect(markup).toContain('aria-label="Block spacing"');
    expect(markup).not.toContain('Rich text edit');
    expect(markup).not.toContain('Cmd/Ctrl+Enter saves');
    expect(markup).toContain('min-height:96px');
    expect(markup).toContain('padding:0');
    expect(markup).toContain('border-radius:0');
  });

  it('keeps list markers inside the edit box for list blocks', () => {
    const markup = renderToStaticMarkup(
      <RichTextEditOverlay
        nodeId="rich-node"
        content={createTextDocumentContent([
          listContentToRichListBlock({
            type: 'ol',
            items: [{ text: 'First', direction: 'ltr' }],
          }),
        ])}
        minHeight="96px"
        onCommit={() => {}}
        onUpdateBlockGap={() => {}}
        onDiscard={() => {}}
      />,
    );

    expect(markup).toContain('<ol');
    expect(markup).toContain('list-style-position:outside');
    expect(markup).toContain('padding-inline-start:1.25em');
  });
});
