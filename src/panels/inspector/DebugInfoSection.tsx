import { useState } from 'react';
import { Box, Check, ChevronLeft, ChevronRight, Clipboard, Hash, Pin, Tag, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NodeDebugInfo } from '../../editor/types';
import { InspectorSectionCard } from './CommonSections';

/** Shorten verbose CSS values for compact display */
function fmt(value: string): string {
  return value.replace(/^aspect-ratio\(/, 'aspect(');
}

export function DebugInfoSection({ items }: { items: NodeDebugInfo[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  if (items.length === 0) return null;

  const safeIndex = Math.min(currentIndex, items.length - 1);
  const debugInfo = items[safeIndex];

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goToPrev = () => {
    setExpanded(new Set());
    setCurrentIndex((i) => Math.max(0, i - 1));
  };
  const goToNext = () => {
    setExpanded(new Set());
    setCurrentIndex((i) => Math.min(items.length - 1, i + 1));
  };

  const isOpen = (id: string) => expanded.has(id);
  const m = debugInfo.measuredBounds;
  const isMulti = items.length > 1;

  const copyInteractConfig = () => {
    if (!debugInfo.animation.rawConfig) return;
    navigator.clipboard.writeText(JSON.stringify(debugInfo.animation.rawConfig, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const { edges } = debugInfo.sticky;
  const showTop = edges === 'top' || edges === 'both';
  const showBottom = edges === 'bottom' || edges === 'both';

  const headerContent = (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
      <span className="text-xs font-semibold">Debug</span>
      {isMulti && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={goToPrev}
            disabled={safeIndex === 0}
            className="editor-icon-button-subtle flex h-5 w-5 items-center justify-center rounded disabled:opacity-30"
            aria-label="Previous node"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="editor-text-muted min-w-[2.5rem] text-center font-mono text-[10px] tabular-nums">
            {safeIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={goToNext}
            disabled={safeIndex === items.length - 1}
            className="editor-icon-button-subtle flex h-5 w-5 items-center justify-center rounded disabled:opacity-30"
            aria-label="Next node"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <InspectorSectionCard title="Debug" headerContent={headerContent} contentClassName="px-3 pt-1 pb-3">
      <div className="space-y-0.5">

        {/* Name row */}
        <DebugRow
          rowId="name"
          icon={<Tag className="h-3 w-3" />}
          label="name"
          expanded={isOpen('name')}
          onToggle={() => toggle('name')}
          summary={
            <span className="editor-text-strong truncate text-[10px]">
              {debugInfo.name}
            </span>
          }
        >
          <DebugDetail label="name" value={debugInfo.name} />
          <DebugDetail label="type" value={`${debugInfo.family} · ${debugInfo.role}`} />
        </DebugRow>

        {/* ID row */}
        <DebugRow
          rowId="id"
          icon={<Hash className="h-3 w-3" />}
          label="id"
          expanded={isOpen('id')}
          onToggle={() => toggle('id')}
          summary={
            <span className="editor-text-strong truncate font-mono text-[10px]">
              {debugInfo.dataId}
            </span>
          }
        >
          <DebugDetail label="data" value={debugInfo.dataId} mono />
          {debugInfo.htmlId && <DebugDetail label="html" value={debugInfo.htmlId} mono />}
          <DebugDetail label="stage" value={debugInfo.stageId} mono />
          {debugInfo.parentId && <DebugDetail label="parent" value={debugInfo.parentId} mono />}
        </DebugRow>

        {/* Rect row */}
        <DebugRow
          rowId="rect"
          icon={<Box className="h-3 w-3" />}
          label="rect"
          expanded={isOpen('rect')}
          onToggle={() => toggle('rect')}
          summary={
            <span className="editor-text-strong font-mono text-[10px]">
              {fmt(debugInfo.authoredRect.x)} {fmt(debugInfo.authoredRect.y)} {fmt(debugInfo.authoredRect.width)} {fmt(debugInfo.authoredRect.height)}
            </span>
          }
        >
          <DebugDetail label="x" value={fmt(debugInfo.authoredRect.x)} mono computed={m ? `${m.left}px` : undefined} />
          <DebugDetail label="y" value={fmt(debugInfo.authoredRect.y)} mono computed={m ? `${m.top}px` : undefined} />
          <DebugDetail label="w" value={fmt(debugInfo.authoredRect.width)} mono computed={m ? `${m.width}px` : undefined} />
          <DebugDetail label="h" value={fmt(debugInfo.authoredRect.height)} mono computed={m ? `${m.height}px` : undefined} />
        </DebugRow>

        {/* Sticky row */}
        <DebugRow
          rowId="sticky"
          icon={<Pin className="h-3 w-3" />}
          label="sticky"
          expanded={isOpen('sticky')}
          onToggle={() => toggle('sticky')}
          summary={
            debugInfo.sticky.enabled ? (
              <span className="editor-text-strong text-[10px]">
                {debugInfo.sticky.edges}
                {debugInfo.sticky.target ? ` · ${debugInfo.sticky.target}` : ''}
                {debugInfo.sticky.elevated ? ' · elevated' : ''}
              </span>
            ) : (
              <span className="editor-text-muted text-[10px]">off</span>
            )
          }
        >
          <DebugDetail label="enabled" value={String(debugInfo.sticky.enabled)} />
          {debugInfo.sticky.enabled && (
            <>
              <DebugDetail label="edges" value={debugInfo.sticky.edges} />
              <DebugDetail label="target" value={debugInfo.sticky.target ?? '—'} />
              <DebugDetail label="dur mode" value={debugInfo.sticky.durationMode ?? '—'} />
              {debugInfo.sticky.duration && (
                <DebugDetail label="duration" value={debugInfo.sticky.duration} mono />
              )}
              {showTop && debugInfo.sticky.durationTop && (
                <DebugDetail label="dur top" value={debugInfo.sticky.durationTop} mono />
              )}
              {showBottom && debugInfo.sticky.durationBottom && (
                <DebugDetail label="dur btm" value={debugInfo.sticky.durationBottom} mono />
              )}
              {showTop && debugInfo.sticky.offsetTop && (
                <DebugDetail label="offset top" value={debugInfo.sticky.offsetTop} mono />
              )}
              {showBottom && debugInfo.sticky.offsetBottom && (
                <DebugDetail label="offset btm" value={debugInfo.sticky.offsetBottom} mono />
              )}
              <DebugDetail label="elevated" value={debugInfo.sticky.elevated === null ? '—' : String(debugInfo.sticky.elevated)} />
            </>
          )}
        </DebugRow>

        {/* Animation row */}
        <DebugRow
          rowId="anim"
          icon={<Zap className="h-3 w-3" />}
          label="anim"
          expanded={isOpen('anim')}
          onToggle={() => toggle('anim')}
          summary={
            debugInfo.animation.enabled ? (
              <span className="editor-text-strong text-[10px]">
                {debugInfo.animation.effect ?? '—'}
                {debugInfo.animation.trigger ? ` · ${debugInfo.animation.trigger}` : ''}
              </span>
            ) : (
              <span className="editor-text-muted text-[10px]">off</span>
            )
          }
        >
          <DebugDetail label="enabled" value={String(debugInfo.animation.enabled)} />
          {debugInfo.animation.enabled && (
            <>
              <DebugDetail label="effect" value={debugInfo.animation.effect ?? '—'} />
              <DebugDetail label="kind" value={debugInfo.animation.effectKind ?? '—'} />
              <DebugDetail label="trigger" value={debugInfo.animation.trigger ?? '—'} />
              {debugInfo.animation.triggerId && (
                <DebugDetail label="triggerId" value={debugInfo.animation.triggerId} mono />
              )}
              <DebugDetail label="isTarget" value={String(debugInfo.animation.isTriggerTarget)} />
              {debugInfo.animation.requiresSticky !== null && (
                <DebugDetail label="needsSticky" value={String(debugInfo.animation.requiresSticky)} />
              )}
              {debugInfo.animation.rawConfig && (
                <div className="mt-1.5 pt-1.5 border-t editor-border-subtle">
                  <button
                    type="button"
                    onClick={copyInteractConfig}
                    className="editor-icon-button-subtle flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {copied
                      ? <Check className="h-3 w-3 text-green-500" />
                      : <Clipboard className="h-3 w-3" />
                    }
                    <span className={copied ? 'text-green-500' : 'editor-text-muted'}>
                      {copied ? 'Copied!' : 'Copy interact config'}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </DebugRow>

      </div>
    </InspectorSectionCard>
  );
}

function DebugRow({
  rowId: _rowId,
  icon,
  label,
  summary,
  expanded,
  onToggle,
  children,
}: {
  rowId: string;
  icon: ReactNode;
  label: string;
  summary: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full min-w-0 items-center gap-1.5 rounded py-0.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span className="editor-text-muted flex h-3 w-3 shrink-0 items-center justify-center">
          {icon}
        </span>
        <span className="editor-text-muted w-9 shrink-0 text-[10px] leading-none">{label}</span>
        <div className="flex min-w-0 flex-1 items-center gap-x-1.5">{summary}</div>
        <ChevronRight
          className={`editor-text-muted h-2.5 w-2.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>
      {expanded && (
        <div className="editor-border-subtle editor-bg-subtle mt-0.5 mb-1 space-y-0.5 rounded-md border px-2 py-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

function DebugDetail({
  label,
  value,
  mono = false,
  computed,
}: {
  label: string;
  value: string;
  mono?: boolean;
  computed?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="editor-text-muted shrink-0 whitespace-nowrap text-[10px]">{label}</span>
      <span className={`editor-text-strong text-[10px] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
      {computed && computed !== value && (
        <span className="editor-text-muted font-mono text-[10px]">→ {computed}</span>
      )}
    </div>
  );
}
