import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { Bold, Check, Italic, Link2, X } from 'lucide-react';
import { Editable, ReactEditor, type RenderElementProps, type RenderLeafProps, Slate } from 'slate-react';
import { Button } from '@/components/ui/button';
import { FloatingPanelShell } from '@/components/ui/floating-panel-shell';
import { Input } from '@/components/ui/input';
import { getLinkHref } from '../../model/links';
import type {
  DocumentModel,
  NodeId,
  RichContent,
  RichTextBlock,
  RichTextLeaf,
  RichTextLink,
} from '../../model/types';
import { getRichTextBlockTag, richLeafStyle } from '../../render/nodePresentation';
import {
  createRichEditor,
  fromSlateValue,
  insertLink,
  isMarkActive,
  isLinkActive,
  removeLink,
  toSlateValue,
  toggleMark,
} from '../../render/richTextEditor';

function renderEditLeaf({ attributes, children, leaf }: RenderLeafProps) {
  const style = richLeafStyle(leaf as RichTextLeaf);
  return (
    <span
      {...attributes}
      style={{
        ...style,
        pointerEvents: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}
    >
      {children}
    </span>
  );
}

function renderEditElement(
  { attributes, children, element }: RenderElementProps,
  documentModel: DocumentModel | undefined,
) {
  const el = element as RichTextLink | RichTextBlock | { type?: string };
  if ('type' in el && el.type === 'link') {
    const link = el as RichTextLink;
    const href = getLinkHref(link, documentModel);
    return (
      <a
        href={href}
        style={{
          textDecoration: 'underline',
          cursor: 'text',
          pointerEvents: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
        {...attributes}
      >
        {children}
      </a>
    );
  }
  const Tag = getRichTextBlockTag((el as RichTextBlock).type ?? 'div');
  return (
    <Tag
      {...attributes}
      style={{
        pointerEvents: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}
    >
      {children}
    </Tag>
  );
}

type LinkPopoverState = { open: false } | { open: true; href: string };

export function RichTextEditOverlay({
  nodeId,
  content,
  contentStyle,
  minHeight,
  document: documentModel,
  onCommit,
  onDiscard,
}: {
  nodeId: NodeId;
  content: RichContent;
  contentStyle?: CSSProperties;
  minHeight?: string;
  document?: DocumentModel;
  onCommit: (id: NodeId, content: RichContent) => void;
  onDiscard: () => void;
}) {
  const editor = useMemo(() => createRichEditor(), []);
  const initialValue = useMemo(() => toSlateValue(content), [content]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [linkPopover, setLinkPopover] = useState<LinkPopoverState>({ open: false });
  const [, setSelectionRevision] = useState(0);

  useEffect(() => {
    // Focus the editor after mount. Use rAF to ensure the DOM is ready and
    // any selection click that entered edit mode has already settled.
    const id = requestAnimationFrame(() => {
      try { ReactEditor.focus(editor); } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [editor]);

  const commitCurrentContent = useCallback(() => {
    onCommit(nodeId, fromSlateValue(editor.children));
  }, [editor, nodeId, onCommit]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Node) || root.contains(target)) {
        return;
      }
      commitCurrentContent();
    }

    globalThis.document?.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      globalThis.document?.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [commitCurrentContent]);

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
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key === 'Enter') {
        event.preventDefault();
        commitCurrentContent();
        return;
      }
      if (isMod && event.key === 'b') {
        event.preventDefault();
        toggleMark(editor, 'bold');
        setSelectionRevision((revision) => revision + 1);
        return;
      }
      if (isMod && event.key === 'i') {
        event.preventDefault();
        toggleMark(editor, 'italic');
        setSelectionRevision((revision) => revision + 1);
        return;
      }
      if (isMod && event.key === 'k') {
        event.preventDefault();
        if (isLinkActive(editor)) {
          removeLink(editor);
          setSelectionRevision((revision) => revision + 1);
        } else {
          setLinkPopover({ open: true, href: '' });
        }
        return;
      }
    },
    [commitCurrentContent, editor, onDiscard, linkPopover.open],
  );

  const handleLinkSubmit = useCallback(
    (href: string) => {
      if (href.trim()) {
        insertLink(editor, {
          type: 'link',
          linkType: 'external',
          href: href.trim(),
          openInNewTab: false,
        });
        setSelectionRevision((revision) => revision + 1);
      }
      setLinkPopover({ open: false });
      requestAnimationFrame(() => {
        try { ReactEditor.focus(editor); } catch {}
      });
    },
    [editor],
  );

  const handleMarkAction = useCallback((mark: 'bold' | 'italic') => {
    toggleMark(editor, mark);
    setSelectionRevision((revision) => revision + 1);
    requestAnimationFrame(() => {
      try { ReactEditor.focus(editor); } catch {}
    });
  }, [editor]);

  const handleLinkAction = useCallback(() => {
    if (isLinkActive(editor)) {
      removeLink(editor);
      setSelectionRevision((revision) => revision + 1);
      requestAnimationFrame(() => {
        try { ReactEditor.focus(editor); } catch {}
      });
      return;
    }
    setLinkPopover({ open: true, href: '' });
  }, [editor]);

  const boldActive = isMarkActive(editor, 'bold');
  const italicActive = isMarkActive(editor, 'italic');
  const linkActive = isLinkActive(editor);

  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onChange={() => {
        setSelectionRevision((revision) => revision + 1);
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: editor canvas overlay — stops propagation to drag layer */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: editor canvas overlay — stops propagation to drag layer */}
      <div
        ref={rootRef}
        data-stage-rich-edit-root="true"
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <FloatingPanelShell
          suppressPopover
          open
          positionMode="absolute"
          data-stage-rich-toolbar="true"
          style={{
            top: 0,
            left: 0,
            zIndex: 220,
            transform: 'translateY(calc(-100% - 10px))',
            maxWidth: 'min(100%, 480px)',
            pointerEvents: 'auto',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          bodyClassName="flex flex-wrap items-center gap-2 px-3 py-2"
          bodyStyle={{
            pointerEvents: 'auto',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <span
            style={{
              marginRight: 6,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--editor-utility-text-strong)',
            }}
          >
            Rich text edit
          </span>
          <ToolbarButton
            label="Bold"
            icon={<Bold size={14} />}
            active={boldActive}
            onActivate={() => handleMarkAction('bold')}
          />
          <ToolbarButton
            label="Italic"
            icon={<Italic size={14} />}
            active={italicActive}
            onActivate={() => handleMarkAction('italic')}
          />
          <ToolbarButton
            label={linkActive ? 'Unlink' : 'Link'}
            icon={<Link2 size={14} />}
            active={linkActive || linkPopover.open}
            onActivate={handleLinkAction}
          />
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: 'var(--editor-utility-text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            Cmd/Ctrl+Enter saves
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
            <X size={14} />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={commitCurrentContent}>
            <Check size={14} />
            Save
          </Button>
        </FloatingPanelShell>
        <div
          data-stage-rich-edit-box="true"
          style={{
            ...contentStyle,
            minHeight,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--editor-accent)',
            background: 'color-mix(in srgb, var(--editor-bg-surface, #ffffff) 96%, var(--editor-accent) 4%)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--editor-accent) 22%, transparent)',
            pointerEvents: 'auto',
            cursor: 'text',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          <Editable
            renderLeaf={renderEditLeaf}
            renderElement={(props) => renderEditElement(props, documentModel)}
            onKeyDown={handleKeyDown}
            style={{
              outline: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight,
              pointerEvents: 'auto',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
          />
        </div>
        {linkPopover.open && (
          <LinkInsertPopover
            initialHref={linkPopover.href}
            onSubmit={handleLinkSubmit}
            onCancel={() => setLinkPopover({ open: false })}
          />
        )}
      </div>
    </Slate>
  );
}

function ToolbarButton({
  label,
  icon,
  active,
  onActivate,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      aria-label={label}
      style={{ pointerEvents: 'auto' }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={onActivate}
    >
      {icon}
      {label}
    </Button>
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
    <FloatingPanelShell
      suppressPopover
      open
      positionMode="absolute"
      style={{
        top: 0,
        right: 0,
        zIndex: 230,
        transform: 'translateY(calc(-100% - 58px))',
        minWidth: 300,
        pointerEvents: 'auto',
      }}
      bodyClassName="flex items-center gap-2 px-3 py-2"
      bodyStyle={{ pointerEvents: 'auto' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, width: '100%' }}>
        <Input
          autoFocus
          type="url"
          placeholder="https://example.com"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onCancel();
            }
          }}
          style={{
            pointerEvents: 'auto',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        />
        <Button type="button" size="sm" variant="outline" style={{ pointerEvents: 'auto' }} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" style={{ pointerEvents: 'auto' }}>
          Apply
        </Button>
      </form>
    </FloatingPanelShell>
  );
}
