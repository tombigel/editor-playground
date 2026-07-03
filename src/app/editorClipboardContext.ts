import { isTextInputFocus } from './useEditorEnvironment';

const EDITOR_CLIPBOARD_PANEL_SELECTOR = [
  '.editor-settings-panel',
  '.editor-floating-panel',
  '.editor-layers-panel',
  '.editor-pages-panel',
  '.editor-ai-panel',
  '.editor-focused-panel',
  '.editor-section-templates',
  '.editor-shortcut-help',
  '.ui-dialog-popover',
].join(',');

const STAGE_EDITING_PANEL_SELECTOR = [
  '[data-stage-rich-toolbar="true"]',
  '[data-stage-rich-link-popover="true"]',
  '[data-stage-code-toolbar="true"]',
].join(',');

type ClipboardContextEvent = Pick<Event, 'target' | 'composedPath'>;

type ClipboardContextOptions = {
  activeElement?: Element | null;
  selection?: Pick<Selection, 'anchorNode' | 'focusNode' | 'isCollapsed'> | null;
};

export function shouldUseEditorClipboard(
  event?: ClipboardContextEvent | null,
  options: ClipboardContextOptions = {},
) {
  const activeElement = options.activeElement ?? getActiveElement();

  if (isTextInputFocus(activeElement as HTMLElement | null)) {
    return false;
  }

  if (isNodeInEditorClipboardPanel(activeElement)) {
    return false;
  }

  if (eventTargetIsInEditorClipboardPanel(event)) {
    return false;
  }

  if (selectionIntersectsEditorClipboardPanel(options.selection ?? getSelection())) {
    return false;
  }

  return true;
}

export function isNodeInEditorClipboardPanel(node: EventTarget | Node | null | undefined) {
  const element = getElementForClosest(node);
  if (!element) {
    return false;
  }

  if (matchesClosest(element, STAGE_EDITING_PANEL_SELECTOR)) {
    return false;
  }

  return matchesClosest(element, EDITOR_CLIPBOARD_PANEL_SELECTOR);
}

function eventTargetIsInEditorClipboardPanel(event?: ClipboardContextEvent | null) {
  if (!event) {
    return false;
  }

  if (isNodeInEditorClipboardPanel(event.target)) {
    return true;
  }

  if (typeof event.composedPath !== 'function') {
    return false;
  }

  return event.composedPath().some((target) => isNodeInEditorClipboardPanel(target));
}

function selectionIntersectsEditorClipboardPanel(
  selection?: Pick<Selection, 'anchorNode' | 'focusNode' | 'isCollapsed'> | null,
) {
  if (!selection || selection.isCollapsed) {
    return false;
  }

  return (
    isNodeInEditorClipboardPanel(selection.anchorNode) ||
    isNodeInEditorClipboardPanel(selection.focusNode)
  );
}

function getActiveElement() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.document.activeElement;
}

function getSelection() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.getSelection();
}

function getElementForClosest(node: EventTarget | Node | null | undefined) {
  if (!node) {
    return null;
  }

  if (hasClosest(node)) {
    return node;
  }

  if (hasParentElement(node)) {
    return node.parentElement && hasClosest(node.parentElement) ? node.parentElement : null;
  }

  return null;
}

function matchesClosest(element: { closest: (selector: string) => unknown }, selector: string) {
  return Boolean(element.closest(selector));
}

function hasClosest(value: unknown): value is { closest: (selector: string) => unknown } {
  return Boolean(value && typeof (value as { closest?: unknown }).closest === 'function');
}

function hasParentElement(
  value: unknown,
): value is { parentElement: { closest: (selector: string) => unknown } | null } {
  return Boolean(value && 'parentElement' in (value as { parentElement?: unknown }));
}
