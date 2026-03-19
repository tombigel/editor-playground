import { useEffect, useRef } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditableNodeTitle } from './inspector/CommonSections';
import { InspectorPanel, type InspectorPanelProps } from './InspectorPanel';

export const INSPECTOR_EXPANDED_WIDTH_PX = 300;
export const INSPECTOR_COLLAPSED_WIDTH_PX = 60;
export const INSPECTOR_TRANSITION_MS = 180;

type Props = InspectorPanelProps & {
  inspectorCollapsed: boolean;
  temporaryInspectorOpen: boolean;
  onInspectorCollapsedChange: (value: boolean) => void;
  onTemporaryInspectorOpenChange: (value: boolean) => void;
};

export function resolveSidebarTitleCommit(value: string, fallbackValue: string) {
  const trimmedValue = value.trim();
  return trimmedValue || fallbackValue;
}

export function EditorSidebar({
  inspectorCollapsed,
  temporaryInspectorOpen,
  onInspectorCollapsedChange,
  onTemporaryInspectorOpenChange,
  ...inspectorProps
}: Props) {
  const temporaryCloseTimeoutRef = useRef<number | null>(null);
  const isFocusedModeActive = Boolean(inspectorProps.focusedMode);
  const showCollapsedHandle = inspectorCollapsed && !temporaryInspectorOpen;
  const selectedNodes = inspectorProps.selectedNodes ?? [];
  const isMultiSelect = selectedNodes.length > 1;
  const singleEditableNode =
    !isMultiSelect && inspectorProps.node && inspectorProps.node.type !== 'site' ? inspectorProps.node : null;
  const title = isMultiSelect
    ? `${selectedNodes.length} selected`
    : inspectorProps.node?.type === 'site'
      ? 'No selection'
      : singleEditableNode?.name?.trim() || singleEditableNode?.role || 'No selection';
  const roleLabel = isMultiSelect
    ? null
    : singleEditableNode
      ? singleEditableNode.role
      : null;
  const collapsedLayerClass = showCollapsedHandle ? 'opacity-100' : 'pointer-events-none opacity-0';
  const expandedLayerClass = showCollapsedHandle ? 'pointer-events-none opacity-0' : 'opacity-100';

  useEffect(() => {
    return () => {
      if (temporaryCloseTimeoutRef.current !== null) {
        window.clearTimeout(temporaryCloseTimeoutRef.current);
      }
    };
  }, []);

  function clearTemporaryCloseTimeout() {
    if (temporaryCloseTimeoutRef.current !== null) {
      window.clearTimeout(temporaryCloseTimeoutRef.current);
      temporaryCloseTimeoutRef.current = null;
    }
  }

  function scheduleTemporaryClose() {
    if (!temporaryInspectorOpen || !isFocusedModeActive) {
      return;
    }
    clearTemporaryCloseTimeout();
    temporaryCloseTimeoutRef.current = window.setTimeout(() => {
      onTemporaryInspectorOpenChange(false);
      temporaryCloseTimeoutRef.current = null;
    }, 300);
  }

  return (
    <aside
      aria-label="Inspector"
      className="editor-inspector-shell editor-bg-surface editor-border-subtle relative min-h-0 overflow-hidden border-l shadow-[-8px_0_24px_rgba(18,32,51,0.03)]"
      onMouseEnter={clearTemporaryCloseTimeout}
      onMouseLeave={scheduleTemporaryClose}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          className="editor-border-subtle relative h-[61px] shrink-0 border-b"
        >
          <div
            aria-hidden={!showCollapsedHandle}
            className={`absolute inset-0 flex items-center justify-end px-3 py-3 transition-opacity duration-150 ease-out ${collapsedLayerClass}`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="editor-icon-button-subtle rounded-lg border"
              aria-label="Open inspector"
              onClick={() =>
                isFocusedModeActive
                  ? onTemporaryInspectorOpenChange(true)
                  : onInspectorCollapsedChange(false)
              }
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </div>
          <div
            aria-hidden={showCollapsedHandle}
            className={`absolute inset-0 flex items-center justify-between gap-3 px-3 py-3 transition-opacity duration-150 ease-out ${expandedLayerClass}`}
          >
            <div className="min-w-0">
              <div className="mt-0.5 flex min-w-0 flex-col items-start gap-1 pl-1 text-left">
                {singleEditableNode ? (
                  <div className="min-w-0 flex-1">
                    <EditableNodeTitle
                      name={singleEditableNode.name}
                      onCommit={(value) => {
                        const nextValue = resolveSidebarTitleCommit(value, singleEditableNode.role);
                        if (nextValue !== singleEditableNode.name) {
                          inspectorProps.onTextChange('name', nextValue);
                        }
                      }}
                      className="editor-text-strong min-w-0 self-start truncate rounded-sm text-sm leading-tight font-medium outline-none transition-colors hover:text-[color:var(--editor-accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)]"
                      inputClassName="h-7 w-auto min-w-[8ch] max-w-full self-start rounded-sm px-1 py-0 text-sm leading-tight font-medium [field-sizing:content]"
                    />
                  </div>
                ) : (
                  <div className="editor-text-strong self-start truncate text-sm leading-tight font-medium">{title}</div>
                )}
                {roleLabel ? (
                  <span className="editor-pill-contrast inline-flex shrink-0 self-start rounded-md px-1.5 py-0 text-[10px] font-medium">
                    {roleLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="editor-icon-button-subtle rounded-lg border"
              aria-label="Collapse inspector"
              onClick={() =>
                temporaryInspectorOpen && isFocusedModeActive
                  ? onTemporaryInspectorOpenChange(false)
                  : onInspectorCollapsedChange(true)
              }
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="editor-bg-surface relative min-h-0 flex-1 overflow-hidden">
          <div
            aria-hidden={showCollapsedHandle}
            className={`absolute inset-0 overflow-hidden transition-opacity duration-150 ease-out ${expandedLayerClass}`}
          >
            <div
              className="editor-bg-surface ml-auto flex h-full min-h-0 overflow-hidden"
              style={{ width: `${INSPECTOR_EXPANDED_WIDTH_PX}px` }}
            >
              <InspectorPanel {...inspectorProps} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
