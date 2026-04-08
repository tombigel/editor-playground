import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, Link2, List, ListOrdered, Type, X } from 'lucide-react';
import { Transforms, type BaseSelection } from 'slate';
import { Editable, ReactEditor, type RenderElementProps, type RenderLeafProps, Slate } from 'slate-react';
import { Button } from '@/components/ui/button';
import { FloatingPanelShell } from '@/components/ui/floating-panel-shell';
import { Input } from '@/components/ui/input';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { getSectionAnchorOptions, getLinkHref, isValidSectionAnchorTarget } from '../../model/links';
import type {
  DocumentModel,
  EditorTextField,
  NodeId,
  RichContent,
  RichTextBlock,
  RichTextBlockType,
  RichTextLeaf,
  RichTextLink,
} from '../../model/types';
import { getRichTextBlockTag, richLeafStyle } from '../../render/nodePresentation';
import {
  convertSelectionToBlockType,
  convertSelectionToList,
  createRichEditor,
  fromSlateValue,
  getMarkValue,
  getSelectedBlockType,
  getSelectedLineHeight,
  getSelectedListKind,
  getSelectedListMarkerStyle,
  insertLink,
  isLinkActive,
  isMarkActive,
  removeLink,
  setMarkValue,
  setSelectedBlocksLineHeight,
  setSelectedListMarkerStyle,
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

type LinkPopoverDraft = {
  open: boolean;
  linkType: 'external' | 'page' | 'anchor';
  href: string;
  targetPageId: string;
  pageAnchorId: string;
  anchorTargetId: string;
};

const DEFAULT_LINK_POPOVER: LinkPopoverDraft = {
  open: false,
  linkType: 'external',
  href: '',
  targetPageId: '',
  pageAnchorId: '',
  anchorTargetId: '',
};

const BLOCK_TYPE_OPTIONS: Array<{ value: RichTextBlockType; label: string }> = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'div', label: 'Div' },
  { value: 'blockquote', label: 'Quote' },
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
];

const ORDERED_MARKER_OPTIONS = [
  { value: 'decimal', label: '1.' },
  { value: 'lower-alpha', label: 'a.' },
  { value: 'upper-alpha', label: 'A.' },
  { value: 'lower-roman', label: 'i.' },
  { value: 'upper-roman', label: 'I.' },
] as const;

const UNORDERED_MARKER_OPTIONS = [
  { value: 'disc', label: 'Disc' },
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
] as const;

function cloneSelection(selection: BaseSelection): BaseSelection {
  if (!selection) {
    return null;
  }

  return {
    anchor: { ...selection.anchor },
    focus: { ...selection.focus },
  };
}

export function RichTextEditOverlay({
  nodeId,
  content,
  contentStyle,
  minHeight,
  document: documentModel,
  onCommit,
  onUpdateTextField,
  onDiscard,
}: {
  nodeId: NodeId;
  content: RichContent;
  contentStyle?: CSSProperties;
  minHeight?: string;
  document?: DocumentModel;
  onCommit: (id: NodeId, content: RichContent) => void;
  onUpdateTextField: (id: NodeId, field: EditorTextField, value: string) => void;
  onDiscard: () => void;
}) {
  const editor = useMemo(() => createRichEditor(), []);
  const initialValue = useMemo(() => toSlateValue(content), [content]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [linkPopover, setLinkPopover] = useState<LinkPopoverDraft>(DEFAULT_LINK_POPOVER);
  const [linkSelection, setLinkSelection] = useState<BaseSelection>(null);
  const [toolbarSelection, setToolbarSelection] = useState<BaseSelection>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [blockSpacingDraft, setBlockSpacingDraft] = useState(String(readInitialBlockSpacing(contentStyle)));
  const [toolbarPlacement, setToolbarPlacement] = useState<'above' | 'below'>('above');

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        ReactEditor.focus(editor);
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [editor]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    setToolbarPlacement(rect.top < 164 ? 'below' : 'above');
  }, [selectionRevision]);

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

  const fontFamilies = useMemo(() => {
    const defaults = documentModel?.fontLibrary.defaults ?? [];
    const used = documentModel?.fontLibrary.usedFamilies.map((family) => family.family) ?? [];
    return ['__inherit__', ...new Set([...defaults, ...used])];
  }, [documentModel]);

  const pages = documentModel?.pages ?? [];
  const sectionOptions = useMemo(
    () => (documentModel ? getSectionAnchorOptions(documentModel) : []),
    [documentModel],
  );

  const targetPage = pages.find((page) => page.id === linkPopover.targetPageId);
  const targetPageSectionOptions = useMemo(() => {
    if (!documentModel || !targetPage) {
      return [];
    }
    return targetPage.sectionIds
      .map((sectionId) => {
        const sectionNode = documentModel.nodes[sectionId];
        if (!sectionNode) {
          return null;
        }
        return { id: sectionId, name: sectionNode.name || sectionId };
      })
      .filter((option): option is { id: string; name: string } => option !== null);
  }, [documentModel, targetPage]);

  const boldActive = isMarkActive(editor, 'bold');
  const italicActive = isMarkActive(editor, 'italic');
  const underlineActive = isMarkActive(editor, 'underline');
  const strikethroughActive = isMarkActive(editor, 'strikethrough');
  const linkActive = isLinkActive(editor);
  const selectedBlockType = getSelectedBlockType(editor) ?? 'paragraph';
  const selectedListKind = getSelectedListKind(editor);
  const selectedListMarkerStyle = getSelectedListMarkerStyle(editor);
  const selectedLineHeight = getSelectedLineHeight(editor);
  const currentFontFamily = getMarkValue(editor, 'fontFamily') || '__inherit__';
  const currentFontSize = getMarkValue(editor, 'fontSize');
  const currentTextColor = normalizeColorInputValue(getMarkValue(editor, 'color'), '#111827');
  const currentHighlightColor = normalizeColorInputValue(getMarkValue(editor, 'backgroundColor'), '#fff59d');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (linkPopover.open) {
          setLinkPopover(DEFAULT_LINK_POPOVER);
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
          setLinkSelection(null);
          setSelectionRevision((revision) => revision + 1);
        } else {
          const currentSelection = editor.selection
            ? {
                anchor: { ...editor.selection.anchor },
                focus: { ...editor.selection.focus },
              }
            : null;
          setLinkSelection(currentSelection);
          setLinkPopover({
            ...DEFAULT_LINK_POPOVER,
            open: true,
            anchorTargetId: sectionOptions[0]?.id ?? '',
            href: sectionOptions[0]?.href ?? '',
            targetPageId: pages[0]?.id ?? '',
          });
        }
      }
    },
    [commitCurrentContent, editor, linkPopover.open, onDiscard, pages, sectionOptions],
  );

  const restoreToolbarSelection = useCallback(() => {
    const selectionToRestore = linkSelection ?? toolbarSelection;
    if (!selectionToRestore) {
      return false;
    }

    ReactEditor.focus(editor);
    Transforms.select(editor, selectionToRestore);
    return true;
  }, [editor, linkSelection, toolbarSelection]);

  const handleBooleanMark = useCallback((mark: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    restoreToolbarSelection();
    toggleMark(editor, mark);
    setSelectionRevision((revision) => revision + 1);
    requestAnimationFrame(() => {
      try {
        ReactEditor.focus(editor);
      } catch {}
    });
  }, [editor, restoreToolbarSelection]);

  const handleValueMark = useCallback((mark: 'color' | 'backgroundColor' | 'fontFamily' | 'fontSize', value: string) => {
    restoreToolbarSelection();
    setMarkValue(editor, mark, value === '__inherit__' ? '' : value);
    setSelectionRevision((revision) => revision + 1);
  }, [editor, restoreToolbarSelection]);

  const handleBlockSpacingCommit = useCallback(() => {
    onUpdateTextField(nodeId, 'blockGap', blockSpacingDraft);
  }, [blockSpacingDraft, nodeId, onUpdateTextField]);

  const handleLinkAction = useCallback(() => {
    if (isLinkActive(editor)) {
      removeLink(editor);
      setLinkSelection(null);
      setSelectionRevision((revision) => revision + 1);
      return;
    }

    const currentSelection = cloneSelection(editor.selection);
    setLinkSelection(currentSelection);
    setLinkPopover({
      ...DEFAULT_LINK_POPOVER,
      open: true,
      anchorTargetId: sectionOptions[0]?.id ?? '',
      href: '',
      targetPageId: pages[0]?.id ?? '',
    });
  }, [editor, pages, sectionOptions]);

  const handleLinkSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();

    if (linkPopover.linkType === 'external' && !linkPopover.href.trim()) {
      setLinkSelection(null);
      setLinkPopover(DEFAULT_LINK_POPOVER);
      return;
    }

    restoreToolbarSelection();

    insertLink(editor, {
      type: 'link',
      linkType: linkPopover.linkType,
      ...(linkPopover.linkType === 'external' ? { href: linkPopover.href.trim(), openInNewTab: false } : {}),
      ...(linkPopover.linkType === 'page' ? { targetPageId: linkPopover.targetPageId || undefined, pageAnchorId: linkPopover.pageAnchorId || undefined } : {}),
      ...(linkPopover.linkType === 'anchor'
        ? {
            anchorTargetId: documentModel && isValidSectionAnchorTarget(documentModel, linkPopover.anchorTargetId)
              ? linkPopover.anchorTargetId
              : undefined,
            href: sectionOptions.find((option) => option.id === linkPopover.anchorTargetId)?.href,
          }
        : {}),
    });
    setLinkSelection(null);
    setLinkPopover(DEFAULT_LINK_POPOVER);
    setSelectionRevision((revision) => revision + 1);
  }, [documentModel, editor, linkPopover, restoreToolbarSelection, sectionOptions]);

  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onChange={() => {
        if (editor.selection) {
          setToolbarSelection(cloneSelection(editor.selection));
        }
        setSelectionRevision((revision) => revision + 1);
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stage edit root only stops propagation into the drag layer */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stage edit root only stops propagation into the drag layer */}
      <div
        ref={rootRef}
        data-stage-rich-edit-root="true"
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
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
            transform: toolbarPlacement === 'above'
              ? 'translateY(calc(-100% - 10px))'
              : 'translateY(calc(100% + 10px))',
            maxWidth: 'min(100%, 960px)',
            pointerEvents: 'auto',
          }}
          bodyClassName="flex flex-wrap items-center gap-1.5 px-2 py-2"
          bodyStyle={{ pointerEvents: 'auto' }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <CompactSelect
            label="Font family"
            value={currentFontFamily}
            onValueChange={(value) => handleValueMark('fontFamily', value)}
            options={fontFamilies.map((family) => ({
              value: family,
              label: family === '__inherit__' ? 'Inherit' : family,
            }))}
            width={128}
          />
          <CompactTextField
            label="Font size"
            value={currentFontSize}
            placeholder="18px"
            width={68}
            onChange={(value) => handleValueMark('fontSize', value)}
          />
          <ToolbarButton label="Bold" active={boldActive} onActivate={() => handleBooleanMark('bold')}>
            <span className="font-black tracking-[-0.02em]">B</span>
          </ToolbarButton>
          <ToolbarButton label="Italic" active={italicActive} onActivate={() => handleBooleanMark('italic')}>
            <span className="font-medium italic">I</span>
          </ToolbarButton>
          <ToolbarButton label="Underline" active={underlineActive} onActivate={() => handleBooleanMark('underline')}>
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" active={strikethroughActive} onActivate={() => handleBooleanMark('strikethrough')}>
            <span className="line-through">S</span>
          </ToolbarButton>
          <CompactColorField label="Text color" value={currentTextColor} onChange={(value) => handleValueMark('color', value)} />
          <CompactColorField label="Highlight color" value={currentHighlightColor} onChange={(value) => handleValueMark('backgroundColor', value)} />
          <ToolbarButton label={linkActive ? 'Unlink' : 'Link'} active={linkActive || linkPopover.open} onActivate={handleLinkAction}>
            <Link2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Convert to text block"
            active={selectedListKind == null}
            onActivate={() => {
              restoreToolbarSelection();
              convertSelectionToBlockType(editor, selectedBlockType);
            }}
          >
            <Type size={14} />
          </ToolbarButton>
          <CompactSelect
            label="Block type"
            value={selectedBlockType}
            onValueChange={(value) => {
              restoreToolbarSelection();
              convertSelectionToBlockType(editor, value as RichTextBlockType);
            }}
            options={BLOCK_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            width={108}
          />
          <ToolbarButton
            label="Convert to ordered list"
            active={selectedListKind === 'ol'}
            onActivate={() => {
              restoreToolbarSelection();
              convertSelectionToList(editor, 'ol');
            }}
          >
            <ListOrdered size={14} />
          </ToolbarButton>
          <CompactSelect
            label="Ordered list marker"
            value={selectedListKind === 'ol' ? selectedListMarkerStyle || 'decimal' : 'decimal'}
            onValueChange={(value) => {
              restoreToolbarSelection();
              setSelectedListMarkerStyle(editor, value as typeof ORDERED_MARKER_OPTIONS[number]['value']);
            }}
            options={ORDERED_MARKER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            width={84}
          />
          <ToolbarButton
            label="Convert to unordered list"
            active={selectedListKind === 'ul'}
            onActivate={() => {
              restoreToolbarSelection();
              convertSelectionToList(editor, 'ul');
            }}
          >
            <List size={14} />
          </ToolbarButton>
          <CompactSelect
            label="Unordered list marker"
            value={selectedListKind === 'ul' ? selectedListMarkerStyle || 'disc' : 'disc'}
            onValueChange={(value) => {
              restoreToolbarSelection();
              setSelectedListMarkerStyle(editor, value as typeof UNORDERED_MARKER_OPTIONS[number]['value']);
            }}
            options={UNORDERED_MARKER_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            width={88}
          />
          <CompactTextField
            label="Line height"
            value={String(selectedLineHeight)}
            placeholder="1.2"
            width={58}
            onChange={(value) => {
              const parsed = Number.parseFloat(value);
              if (Number.isFinite(parsed) && parsed > 0) {
                restoreToolbarSelection();
                setSelectedBlocksLineHeight(editor, parsed);
                setSelectionRevision((revision) => revision + 1);
              }
            }}
          />
          <CompactTextField
            label="Block spacing"
            value={blockSpacingDraft}
            placeholder="0"
            width={64}
            onChange={setBlockSpacingDraft}
            onBlur={handleBlockSpacingCommit}
          />
          <ToolbarButton label="Discard changes" active={false} onActivate={onDiscard}>
            <X size={14} />
          </ToolbarButton>
          <ToolbarButton label="Save changes" active={false} onActivate={commitCurrentContent}>
            <Check size={14} />
          </ToolbarButton>
        </FloatingPanelShell>
        <div
          data-stage-rich-edit-box="true"
          style={{
            ...contentStyle,
            minHeight,
            padding: 0,
            borderRadius: 0,
            border: 0,
            background: 'transparent',
            boxShadow: 'none',
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
        {linkPopover.open ? (
          <LinkInsertPopover
            draft={linkPopover}
            placement={toolbarPlacement}
            pages={pages}
            sectionOptions={sectionOptions}
            targetPageSectionOptions={targetPageSectionOptions}
            onChange={setLinkPopover}
            onCancel={() => {
              setLinkSelection(null);
              setLinkPopover(DEFAULT_LINK_POPOVER);
            }}
            onSubmit={handleLinkSubmit}
          />
        ) : null}
        <span hidden>{selectionRevision}</span>
      </div>
    </Slate>
  );
}

function ToolbarButton({
  label,
  active,
  onActivate,
  children,
}: {
  label: string;
  active: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="icon"
        aria-label={label}
        aria-pressed={active}
        className="pointer-events-auto h-8 w-8 rounded-sm"
        style={{ pointerEvents: 'auto' }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={onActivate}
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

function CompactSelect({
  label,
  value,
  onValueChange,
  options,
  width,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  width: number;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-label={label}
        className="pointer-events-auto h-8 rounded-sm text-xs"
        style={{ width, pointerEvents: 'auto' }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
          <span className="truncate text-left">
            {options.find((option) => option.value === value)?.label ?? label}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PopoverTooltip>
  );
}

function CompactTextField({
  label,
  value,
  placeholder,
  width,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder?: string;
  width: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        className="pointer-events-auto h-8 rounded-sm px-2 text-xs"
        style={{ width, pointerEvents: 'auto' }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </PopoverTooltip>
  );
}

function CompactColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <input
        aria-label={label}
        type="color"
        value={value}
        className="pointer-events-auto h-8 w-8 cursor-pointer rounded-sm border border-[color:var(--editor-border-subtle)] bg-transparent p-0"
        style={{ pointerEvents: 'auto' }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onChange={(event) => onChange(event.target.value)}
      />
    </PopoverTooltip>
  );
}

function LinkInsertPopover({
  draft,
  placement,
  pages,
  sectionOptions,
  targetPageSectionOptions,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: LinkPopoverDraft;
  placement: 'above' | 'below';
  pages: NonNullable<DocumentModel['pages']>;
  sectionOptions: ReturnType<typeof getSectionAnchorOptions>;
  targetPageSectionOptions: Array<{ id: string; name: string }>;
  onChange: (draft: LinkPopoverDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <FloatingPanelShell
      suppressPopover
      open
      positionMode="absolute"
      style={{
        top: 0,
        right: 0,
        zIndex: 230,
        transform: placement === 'above'
          ? 'translateY(calc(-100% - 58px))'
          : 'translateY(calc(100% + 58px))',
        minWidth: 320,
        pointerEvents: 'auto',
      }}
      bodyClassName="space-y-2 px-3 py-3"
      bodyStyle={{ pointerEvents: 'auto' }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <form className="space-y-2" onSubmit={onSubmit}>
        <CompactSelect
          label="Link type"
          value={draft.linkType}
          onValueChange={(value) => onChange({ ...draft, linkType: value as LinkPopoverDraft['linkType'] })}
          options={[
            { value: 'external', label: 'External' },
            { value: 'anchor', label: 'Internal' },
            ...(pages.length > 0 ? [{ value: 'page', label: 'Page' }] : []),
          ]}
          width={120}
        />
        {draft.linkType === 'external' ? (
          <Input
            autoFocus
            aria-label="Link URL"
            type="url"
            placeholder="https://example.com"
            className="pointer-events-auto"
            style={{ pointerEvents: 'auto' }}
            value={draft.href}
            onChange={(event) => onChange({ ...draft, href: event.target.value })}
          />
        ) : draft.linkType === 'anchor' ? (
          <Select
            value={draft.anchorTargetId}
            onValueChange={(value) => onChange({ ...draft, anchorTargetId: value })}
          >
            <SelectTrigger aria-label="Section target" className="pointer-events-auto" style={{ pointerEvents: 'auto' }}>
              <span className="truncate text-left">
                {sectionOptions.find((option) => option.id === draft.anchorTargetId)?.name ?? 'Select section'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Select
              value={draft.targetPageId}
              onValueChange={(value) => onChange({ ...draft, targetPageId: value })}
            >
              <SelectTrigger aria-label="Target page" className="pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                <span className="truncate text-left">
                  {pages.find((page) => page.id === draft.targetPageId)?.displayName ?? 'Select page'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.displayName || page.slug || page.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetPageSectionOptions.length > 0 ? (
              <Select
                value={draft.pageAnchorId || '__none__'}
                onValueChange={(value) => onChange({ ...draft, pageAnchorId: value === '__none__' ? '' : value })}
              >
                <SelectTrigger aria-label="Target page section" className="pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                  <span className="truncate text-left">
                    {draft.pageAnchorId
                      ? (targetPageSectionOptions.find((option) => option.id === draft.pageAnchorId)?.name ?? draft.pageAnchorId)
                      : 'No section jump'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No section jump</SelectItem>
                  {targetPageSectionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="pointer-events-auto" style={{ pointerEvents: 'auto' }} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" className="pointer-events-auto" style={{ pointerEvents: 'auto' }}>
            Apply
          </Button>
        </div>
      </form>
    </FloatingPanelShell>
  );
}

function readInitialBlockSpacing(contentStyle: CSSProperties | undefined): number {
  const rowGap = contentStyle?.rowGap;
  if (typeof rowGap === 'number') {
    return rowGap;
  }
  if (typeof rowGap === 'string') {
    const parsed = Number.parseFloat(rowGap);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeColorInputValue(color: string, fallback: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}
