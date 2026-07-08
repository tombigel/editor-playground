import type { CSSProperties, ComponentType, ReactNode, Ref } from 'react';
import { AlignLeft, Clapperboard, Code2, FileText, Heading2, ImageIcon, ListOrdered, Navigation, Newspaper, PanelRight, Rows3, Shapes, SquareStack, Table2, TvMinimalPlay, Type } from 'lucide-react';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../api/editorApi';
import type { ContainerSubtype } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { FloatingPanelShell } from '@/components/ui/floating-panel-shell';
import { cn } from '@/lib/utils';
import { EditorPanelHeader } from '../panels/EditorPanelHeader';
import { PopoverTooltip } from '@/components/ui/popover';

const UPCOMING_SCROLL_TEMPLATES = [
  {
    id: 'scrollStory',
    name: 'Scroll Story (Soon)',
    description: 'Reserved for scroll-linked animation templates.',
  },
  {
    id: 'timelineMotion',
    name: 'Timeline Motion (Soon)',
    description: 'Reserved for narrative timeline animations.',
  },
] as const;

const TOPBAR_TOOLTIP_CLASS = 'editor-topbar-tooltip';
export function TopbarIconAction({
  icon: Icon,
  label,
  shortcut,
  disabled = false,
  active = false,
  expanded,
  hasPopup,
  panelTrigger,
  onClick,
  className,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  expanded?: boolean;
  hasPopup?: 'dialog';
  panelTrigger?: string;
  onClick: () => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="bottom"
      align="end"
      className={TOPBAR_TOOLTIP_CLASS}
      content={
        shortcut ? (
          <>
            <div className="leading-3.5 font-medium">{label}</div>
            <div className="editor-tooltip-shortcut mt-0.5 font-mono text-[10px] font-light leading-3">{shortcut}</div>
          </>
        ) : (
          <div className="leading-3.5 font-medium">{label}</div>
        )
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={label}
        aria-expanded={expanded}
        aria-haspopup={hasPopup}
        data-panel-trigger={panelTrigger}
        data-active={active ? 'true' : 'false'}
        disabled={disabled}
        onClick={onClick}
        className={cn('editor-topbar-icon-button', className)}
      >
        <Icon className="h-4 w-4" />
        {children}
      </Button>
    </PopoverTooltip>
  );
}

export function SectionTemplatePopover({
  panelRef,
  open,
  onOpenChange,
  onClose,
  onInsertTemplate,
  suppressPopover = false,
  style,
}: {
  panelRef?: Ref<HTMLDivElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onInsertTemplate: (templateId: SectionTemplateId) => void;
  suppressPopover?: boolean;
  style?: CSSProperties;
}) {
  if (!open) {
    return null;
  }

  return (
    <FloatingPanelShell
      ref={panelRef}
      open={open}
      onOpenChange={onOpenChange}
      positionMode="absolute"
      suppressPopover={suppressPopover}
      className="editor-section-templates w-[440px]"
      style={style}
      header={(
        <EditorPanelHeader
          icon={Rows3}
          title="Section Templates"
          description="Choose a layout to insert."
          closeLabel="Close section templates panel"
          onClose={onClose}
        />
      )}
      bodyClassName="editor-scrollbar editor-scrollbar-gutter max-h-[62vh] overflow-y-auto p-3"
    >
        <div className="grid grid-cols-2 gap-2.5">
          {SECTION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onInsertTemplate(template.id)}
              className="editor-template-card group flex min-h-[104px] flex-col rounded-lg border p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--editor-focus-ring-offset)]"
            >
              <div className="flex items-center justify-between">
                <span className="editor-text-strong text-xs font-semibold">{template.name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    template.category === 'sticky' ? 'editor-template-tag' : 'editor-pill-subtle'
                  }`}
                >
                  {template.category === 'sticky' ? 'Sticky' : 'Basic'}
                </span>
              </div>
              <span className="editor-text-muted mt-1.5 text-[11px] leading-4">{template.description}</span>
            </button>
          ))}
          {UPCOMING_SCROLL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="editor-template-card-muted editor-border-subtle flex min-h-[104px] flex-col rounded-lg border border-dashed p-2.5 text-left opacity-85"
            >
              <div className="flex items-center justify-between">
                <span className="editor-text-strong text-xs font-semibold">{template.name}</span>
                <span className="editor-pill-subtle rounded px-1.5 py-0.5 text-[10px] font-medium">Soon</span>
              </div>
              <span className="editor-text-muted mt-1.5 text-[11px] leading-4">{template.description}</span>
            </div>
          ))}
        </div>
    </FloatingPanelShell>
  );
}

export type TextTypeRole = 'heading' | 'text' | 'list' | 'table' | 'code' | 'richtext';
export type MediaTypeRole = 'image' | 'video' | 'svg';
export type ContainerTypeRole = Extract<ContainerSubtype, 'container' | 'nav' | 'aside' | 'article'>;

const CONTAINER_TYPE_OPTIONS: {
  role: ContainerTypeRole;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number }>;
}[] = [
  { role: 'container', label: 'Container', description: 'Nestable layout wrapper', icon: SquareStack },
  { role: 'nav', label: 'Nav', description: 'Navigation landmark', icon: Navigation },
  { role: 'aside', label: 'Aside', description: 'Complementary content', icon: PanelRight },
  { role: 'article', label: 'Article', description: 'Standalone content region', icon: Newspaper },
];

export function ContainerTypePopover({
  panelRef,
  open,
  onOpenChange,
  onClose,
  onInsert,
  suppressPopover = false,
  style,
}: {
  panelRef?: Ref<HTMLDivElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onInsert: (role: ContainerTypeRole) => void;
  suppressPopover?: boolean;
  style?: CSSProperties;
}) {
  if (!open) {
    return null;
  }

  return (
    <FloatingPanelShell
      ref={panelRef}
      open={open}
      onOpenChange={onOpenChange}
      positionMode="absolute"
      suppressPopover={suppressPopover}
      className="w-[232px]"
      style={style}
      header={(
        <EditorPanelHeader
          icon={SquareStack}
          title="Insert container"
          description="Choose a wrapper type."
          closeLabel="Close container type panel"
          onClose={onClose}
        />
      )}
      bodyClassName="p-2"
    >
      <div className="flex flex-col gap-1">
        {CONTAINER_TYPE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
          <button
            key={role}
            type="button"
            data-container-type-role={role}
            className="editor-template-card flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--editor-focus-ring-offset)]"
            onClick={() => {
              onInsert(role);
              onClose();
            }}
          >
            <Icon size={16} className="editor-text-muted shrink-0" />
            <div>
              <span className="editor-text-strong block text-xs font-semibold">{label}</span>
              <span className="editor-text-muted mt-0.5 block text-[10px]">{description}</span>
            </div>
          </button>
        ))}
      </div>
    </FloatingPanelShell>
  );
}

const TEXT_TYPE_OPTIONS: {
  role: TextTypeRole;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number }>;
}[] = [
  { role: 'heading', label: 'Heading', description: 'Section title (h2)', icon: Heading2 },
  { role: 'text', label: 'Paragraph', description: 'Plain text block', icon: AlignLeft },
  { role: 'list', label: 'List', description: 'Standalone list block', icon: ListOrdered },
  { role: 'table', label: 'Table', description: 'Simple text table', icon: Table2 },
  { role: 'code', label: 'Code', description: 'Monospace code snippet', icon: Code2 },
  { role: 'richtext', label: 'Rich text', description: 'Formatted inline content', icon: FileText },
];

export function TextTypePopover({
  panelRef,
  open,
  onOpenChange,
  onClose,
  onInsert,
  suppressPopover = false,
  style,
}: {
  panelRef?: Ref<HTMLDivElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onInsert: (role: TextTypeRole) => void;
  suppressPopover?: boolean;
  style?: CSSProperties;
}) {
  if (!open) {
    return null;
  }

  return (
    <FloatingPanelShell
      ref={panelRef}
      open={open}
      onOpenChange={onOpenChange}
      positionMode="absolute"
      suppressPopover={suppressPopover}
      className="w-[220px]"
      style={style}
      header={(
        <EditorPanelHeader
          icon={Type}
          title="Insert text"
          description="Choose a text type."
          closeLabel="Close text type panel"
          onClose={onClose}
        />
      )}
      bodyClassName="p-2"
    >
      <div className="flex flex-col gap-1">
        {TEXT_TYPE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
          <button
            key={role}
            type="button"
            data-text-type-role={role}
            className="editor-template-card flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--editor-focus-ring-offset)]"
            onClick={() => {
              onInsert(role);
              onClose();
            }}
          >
            <Icon size={16} className="editor-text-muted shrink-0" />
            <div>
              <span className="editor-text-strong block text-xs font-semibold">{label}</span>
              <span className="editor-text-muted mt-0.5 block text-[10px]">{description}</span>
            </div>
          </button>
        ))}
      </div>
    </FloatingPanelShell>
  );
}

const MEDIA_TYPE_OPTIONS: {
  role: MediaTypeRole;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; size?: number }>;
}[] = [
  { role: 'image', label: 'Image', description: 'Seeded visual', icon: ImageIcon },
  { role: 'video', label: 'Video', description: 'Embedded player', icon: TvMinimalPlay },
  { role: 'svg', label: 'SVG', description: 'Inline vector graphic', icon: Shapes },
];

export function MediaTypePopover({
  panelRef,
  open,
  onOpenChange,
  onClose,
  onInsert,
  suppressPopover = false,
  style,
}: {
  panelRef?: Ref<HTMLDivElement>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onInsert: (role: MediaTypeRole) => void;
  suppressPopover?: boolean;
  style?: CSSProperties;
}) {
  if (!open) {
    return null;
  }

  return (
    <FloatingPanelShell
      ref={panelRef}
      open={open}
      onOpenChange={onOpenChange}
      positionMode="absolute"
      suppressPopover={suppressPopover}
      className="w-[220px]"
      style={style}
      header={(
        <EditorPanelHeader
          icon={Clapperboard}
          title="Insert media"
          description="Choose a media type."
          closeLabel="Close media type panel"
          onClose={onClose}
        />
      )}
      bodyClassName="p-2"
    >
      <div className="flex flex-col gap-1">
        {MEDIA_TYPE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
          <button
            key={role}
            type="button"
            data-media-type-role={role}
            className="editor-template-card flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--editor-focus-ring-offset)]"
            onClick={() => {
              onInsert(role);
              onClose();
            }}
          >
            <Icon size={16} className="editor-text-muted shrink-0" />
            <div>
              <span className="editor-text-strong block text-xs font-semibold">{label}</span>
              <span className="editor-text-muted mt-0.5 block text-[10px]">{description}</span>
            </div>
          </button>
        ))}
      </div>
    </FloatingPanelShell>
  );
}

export function RailToggleButton({
  icon: Icon,
  pressed,
  label,
  shortcut,
  detail,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  pressed: boolean;
  label: string;
  shortcut?: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <PopoverTooltip
      side="right"
      align="center"
      content={
        shortcut ? (
          <>
            <div className="leading-3.5 font-medium">{label}</div>
            <div className="editor-tooltip-shortcut mt-0.5 font-mono text-[10px] font-light leading-3">{shortcut}</div>
          </>
        ) : (
          <div className="leading-3.5 font-medium">{detail ? `${label} · ${detail}` : label}</div>
        )
      }
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        data-pressed={pressed ? 'true' : 'false'}
        onClick={onClick}
        className="editor-rail-toggle-button"
      >
        <Icon className="h-4 w-4" />
      </button>
    </PopoverTooltip>
  );
}

export function SpacerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="4" rx="1" />
      <path d="M12 8v8" />
      <path d="M8 12h8" opacity="0.65" />
      <rect x="4" y="16" width="16" height="4" rx="1" />
    </svg>
  );
}

export function StickyModeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h5" opacity="0.7" />
      <path d="M15 12v5" />
      <path d="M12.5 14.5 15 12l2.5 2.5" />
    </svg>
  );
}
