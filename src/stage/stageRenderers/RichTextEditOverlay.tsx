import {
  type CSSProperties,
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { Editor } from 'slate';
import { Editable, type ReactEditor, type RenderElementProps, type RenderLeafProps, Slate } from 'slate-react';
import { getLinkHref } from '../../model/links';
import type { DocumentModel, NodeId, RichContent, RichTextLeaf, RichTextLink } from '../../model/types';
import { richLeafStyle } from '../../render/nodePresentation';
import {
  createRichEditor,
  fromSlateValue,
  insertLink,
  isLinkActive,
  removeLink,
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

type LinkPopoverState = { open: false } | { open: true; href: string };

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
  const [linkPopover, setLinkPopover] = useState<LinkPopoverState>({ open: false });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (linkPopover.open) {
          setLinkPopover({ open: false });
          return;
        }
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
      if (isMod && event.key === 'k') {
        event.preventDefault();
        if (isLinkActive(editor)) {
          removeLink(editor);
        } else {
          setLinkPopover({ open: true, href: '' });
        }
        return;
      }
    },
    [editor, onDiscard, linkPopover.open],
  );

  const handleBlur = useCallback(() => {
    if (linkPopover.open) return; // don't commit while popover is open
    onCommit(nodeId, fromSlateValue(editor.children));
  }, [editor, nodeId, onCommit, linkPopover.open]);

  const handleLinkSubmit = useCallback(
    (href: string) => {
      if (href.trim()) {
        insertLink(editor, {
          type: 'link',
          linkType: 'external',
          href: href.trim(),
          openInNewTab: false,
        });
      }
      setLinkPopover({ open: false });
    },
    [editor],
  );

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
        {linkPopover.open && (
          <LinkInsertPopover
            initialHref={linkPopover.href}
            onSubmit={handleLinkSubmit}
            onCancel={() => setLinkPopover({ open: false })}
          />
        )}
      </Tag>
    </Slate>
  );
}

function LinkInsertPopover({
  initialHref,
  onSubmit,
  onCancel,
}: {
  initialHref: string;
  onSubmit: (href: string) => void;
  onCancel: () => void;
}) {
  const [href, setHref] = useState(initialHref);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(href);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 100,
        marginTop: 4,
        display: 'flex',
        gap: 4,
        padding: '6px 8px',
        borderRadius: 6,
        background: 'var(--editor-bg, #fff)',
        border: '1px solid var(--editor-border-subtle, #e2e8f0)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        minWidth: 260,
      }}
    >
      <input
        // biome-ignore lint/a11y/noAutofocus: popover must grab focus immediately
        autoFocus
        type="url"
        placeholder="https://example.com"
        value={href}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
        style={{
          flex: 1,
          fontSize: 12,
          padding: '3px 6px',
          borderRadius: 4,
          border: '1px solid var(--editor-border-subtle, #e2e8f0)',
          outline: 'none',
          background: 'var(--editor-input-bg, #f8fafc)',
          color: 'var(--editor-text, inherit)',
        }}
      />
      <button
        type="submit"
        style={{
          fontSize: 12,
          padding: '3px 10px',
          borderRadius: 4,
          background: 'var(--editor-accent, #3b82f6)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Add
      </button>
    </form>
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
