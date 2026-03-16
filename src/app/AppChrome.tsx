import type { ComponentType, Ref } from 'react';
import { X } from 'lucide-react';
import { SECTION_TEMPLATES, type SectionTemplateId } from '../api/editorApi';
import { Button } from '@/components/ui/button';
import { PopoverSurface, PopoverTooltip } from '@/components/ui/popover';
import type { ResolvedTheme } from '@/lib/theme';

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

const TOPBAR_TOOLTIP_CLASS =
  'rounded-lg border border-slate-700 bg-[#0f172a] px-3 py-2 text-xs font-medium text-slate-100 shadow-[0_16px_36px_rgba(2,6,23,0.38)]';

function getTopbarIconButtonClass(theme: ResolvedTheme) {
  return theme === 'dark'
    ? 'h-8 w-8 rounded-md border border-white/10 bg-white/[0.035] p-0 text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-white/14 hover:bg-white/[0.065] hover:text-white/92 focus-visible:border-white/20 focus-visible:bg-white/[0.08] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131720]'
    : 'h-8 w-8 rounded-md border border-[#5d90ff] bg-[#1f5de6] p-0 text-white shadow-[0_8px_18px_rgba(18,48,128,0.18),inset_0_1px_0_rgba(255,255,255,0.07)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#81a9ff] hover:bg-[#1854d9] hover:text-white hover:shadow-[0_10px_22px_rgba(18,48,128,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:border-[#8db1ff] focus-visible:bg-[#1854d9] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f6df6]';
}

function getTopbarActiveButtonClass(theme: ResolvedTheme) {
  return theme === 'dark'
    ? 'h-8 w-8 rounded-md border border-white/16 bg-white/[0.12] p-0 text-white shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-white/22 hover:bg-white/[0.16] hover:text-white focus-visible:border-white/24 focus-visible:bg-white/[0.16] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#131720]'
    : 'h-8 w-8 rounded-md border border-[#8ab0ff] bg-[#4f83fd] p-0 text-white shadow-[0_12px_26px_rgba(18,48,128,0.24),inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-[#a3c0ff] hover:bg-[#6694ff] hover:text-white hover:shadow-[0_14px_30px_rgba(18,48,128,0.28),inset_0_0_0_1px_rgba(255,255,255,0.1)] focus-visible:border-[#a9c4ff] focus-visible:bg-[#6694ff] focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2f6df6]';
}

export function TopbarIconAction({
  icon: Icon,
  label,
  shortcut,
  theme,
  disabled = false,
  active = false,
  expanded,
  hasPopup,
  panelTrigger,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
  theme: ResolvedTheme;
  disabled?: boolean;
  active?: boolean;
  expanded?: boolean;
  hasPopup?: 'dialog';
  panelTrigger?: string;
  onClick: () => void;
}) {
  return (
    <PopoverTooltip
      side="bottom"
      align="end"
      className={TOPBAR_TOOLTIP_CLASS}
      content={
        <>
          <div className="leading-3.5 font-medium">{label}</div>
          <div className="editor-tooltip-shortcut mt-0.5 font-mono text-[10px] font-light leading-3">{shortcut}</div>
        </>
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
        disabled={disabled}
        onClick={onClick}
        className={active ? getTopbarActiveButtonClass(theme) : getTopbarIconButtonClass(theme)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </PopoverTooltip>
  );
}

export function SectionTemplatePopover({
  panelRef,
  open,
  position,
  onOpenChange,
  onClose,
  onInsertTemplate,
}: {
  panelRef?: Ref<HTMLDivElement>;
  open: boolean;
  position: { top: number; left: number };
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onInsertTemplate: (templateId: SectionTemplateId) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <PopoverSurface
      ref={panelRef}
      open={open}
      onOpenChange={onOpenChange}
      className="editor-floating-panel editor-section-templates editor-bg-surface editor-border-subtle fixed w-[440px] rounded-xl border shadow-[0_16px_34px_rgba(18,32,51,0.18)]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="editor-border-subtle flex items-start justify-between border-b px-4 py-3">
        <div>
          <div className="editor-text-strong text-sm font-semibold">Section templates</div>
          <div className="editor-text-muted mt-0.5 text-xs">Choose a layout to insert.</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="editor-icon-button-subtle rounded-lg border focus-visible:ring-blue-500/45"
          onClick={onClose}
          aria-label="Close section templates panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[62vh] overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2.5">
          {SECTION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onInsertTemplate(template.id)}
              className="editor-template-card group flex min-h-[104px] flex-col rounded-lg border p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
      </div>
    </PopoverSurface>
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
        aria-pressed={pressed}
        onClick={onClick}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          pressed
            ? 'border-[#3772ff] bg-[#3772ff] text-white shadow-[0_12px_24px_rgba(55,114,255,0.22),inset_0_0_0_1px_rgba(34,87,214,0.42)] hover:border-[#6f9dff] hover:bg-[#4a7ffc] hover:shadow-[0_16px_30px_rgba(55,114,255,0.3),inset_0_0_0_1px_rgba(34,87,214,0.6)]'
            : 'editor-icon-button-subtle editor-text-strong shadow-[0_2px_10px_rgba(18,32,51,0.05)] hover:shadow-[0_10px_22px_rgba(18,32,51,0.1)]'
        }`}
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
