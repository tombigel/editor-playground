import { type CSSProperties, useCallback, useMemo, type KeyboardEvent } from 'react';
import { Editor } from 'slate';
import { Editable, type ReactEditor, type RenderElementProps, type RenderLeafProps, Slate } from 'slate-react';
import { getLinkHref } from '../../model/links';
import type { DocumentModel, NodeId, RichContent, RichTextLeaf, RichTextLink } from '../../model/types';
import { richLeafStyle } from '../../render/nodePresentation';
import {
  createRichEditor,
  fromSlateValue,
  toSlateValue,
} from '../../render/richTextEditor';

function renderEditLeaf({ attributes, children, leaf }: RenderLeafProps) {
  const style = richLeafStyle(leaf as RichTextLeaf);
  return <span {...attributes} style={style}>{children}</span>;
}

function renderEditElement(
  { attributes, children, element }: RenderElementProps,
  document: DocumentModel | undefined,
) {
  const el = element as RichTextLink | { type?: string };
  if ('type' in el && el.type === 'link') {
    const link = el as RichTextLink;
    const href = getLinkHref(link, document);
    return (
      // biome-ignore lint/a11y/useValidAnchor: edit-mode inline link — not navigable
      <a href={href} style={{ textDecoration: 'underline', cursor: 'text' }} {...attributes}>
        {children}
      </a>
    );
  }
  return <span {...attributes}>{children}</span>;
}

export function RichTextEditOverlay({
  nodeId,
  content,
  contentStyle,
  htmlTag,
  document,
  onCommit,
  onDiscard,
}: {
  nodeId: NodeId;
  content: RichContent;
  contentStyle?: CSSProperties;
  htmlTag?: string;
  document?: DocumentModel;
  onCommit: (id: NodeId, content: RichContent) => void;
  onDiscard: () => void;
}) {
  const editor = useMemo(() => createRichEditor(), []);
  const initialValue = useMemo(() => toSlateValue(content), [content]);
  const Tag = (htmlTag ?? 'p') as keyof JSX.IntrinsicElements;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDiscard();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        return;
      }
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key === 'b') {
        event.preventDefault();
        toggleMark(editor, 'bold');
        return;
      }
      if (isMod && event.key === 'i') {
        event.preventDefault();
        toggleMark(editor, 'italic');
        return;
      }
    },
    [editor, onDiscard],
  );

  const handleBlur = useCallback(() => {
    onCommit(nodeId, fromSlateValue(editor.children));
  }, [editor, nodeId, onCommit]);

  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Tag
        style={contentStyle}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: contenteditable is interactive by definition
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <Editable
          autoFocus
          renderLeaf={renderEditLeaf}
          renderElement={(props) => renderEditElement(props, document)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{ outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
      </Tag>
    </Slate>
  );
}

function toggleMark(editor: ReactEditor, mark: string) {
  const marks = Editor.marks(editor);
  const isActive = marks ? (marks as Record<string, unknown>)[mark] === true : false;
  if (isActive) {
    Editor.removeMark(editor, mark);
  } else {
    Editor.addMark(editor, mark, true);
  }
}
