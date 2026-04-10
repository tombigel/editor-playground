---
name: interaction-pattern
description: Guide for building new interactive components — checklists, available hooks, design system primitives
user-invocable: true
argument-hint: "<component-type: popover|panel|dialog|dropdown|draggable>"
---

# Interactive Component Pattern Guide

Use this skill when building a new interactive component (panel, popover, dialog, dropdown, or draggable element). It provides the checklist of shared hooks and primitives to use instead of reimplementing behavior.

## Available shared hooks

| Hook | Import | Use for |
|---|---|---|
| `useEscapeKey(callback, enabled?)` | `@/lib/useEscapeKey` | Dismiss on Escape key. Adds/removes document keydown listener. |
| `useClickOutside(refs, callback, enabled?)` | `@/lib/useClickOutside` | Dismiss on click outside. Accepts single ref or array. |

## Available shared constants

| Constant | Import | Use for |
|---|---|---|
| `DARK_TOOLTIP_CLASS` | `@/lib/utils` | Dark inverted tooltip styling. Use instead of inline class strings. |

## Available design system primitives

| Component | Import | Use for |
|---|---|---|
| `PopoverSurface` | `@/components/ui/popover` | Any floating content that needs the HTML Popover API |
| `PopoverTooltip` | `@/components/ui/popover` | Hover tooltips with smart positioning |
| `Dialog` / `DialogContent` | `@/components/ui/dialog` | Modal dialogs with backdrop |
| `FloatingPanelShell` | `@/components/ui/floating-panel-shell` | Draggable floating panels |
| `Select` / `SearchableSelect` | `@/components/ui/select`, `searchable-select` | Dropdown selection |
| `MenubarMenu` | `@/components/ui/menubar` | Menu bar dropdowns with keyboard nav |
| `Button` | `@/components/ui/button` | All clickable controls |
| `TreeRowItem` | `@/components/ui/tree-row` | Hierarchical list items with drag |

## Checklist by component type

### Popover / Dropdown (`$ARGUMENTS` = "popover" or "dropdown")

- [ ] Use `PopoverSurface` as the container
- [ ] Use `useEscapeKey` for dismiss — pass a callback that closes and optionally restores focus to trigger
- [ ] Use `useClickOutside` with refs for both trigger and surface — dismiss on outside click
- [ ] Add scroll/resize listeners for repositioning if the popover is absolutely positioned
- [ ] Use `DARK_TOOLTIP_CLASS` for any tooltip labels inside the popover
- [ ] Follow editor style guide tokens for colors, borders, shadows

### Panel (`$ARGUMENTS` = "panel")

- [ ] Use `FloatingPanelShell` for the container
- [ ] Use `useEscapeKey` to close/minimize
- [ ] Panel drag is handled by `FloatingPanelShell`'s header slot — no custom drag needed
- [ ] Register in the panel state system if it needs open/close persistence

### Dialog (`$ARGUMENTS` = "dialog")

- [ ] Use `Dialog` and `DialogContent` from the design system
- [ ] Escape and backdrop click are handled by the Dialog component automatically
- [ ] Use `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` for structure
- [ ] For confirmation dialogs: use the dialog + explicit confirm/cancel buttons

### Draggable Element (`$ARGUMENTS` = "draggable")

- [ ] Stage drag-and-drop: use `src/stage/dragDrop/useStageDragDrop.ts` (complex, stage-specific)
- [ ] Tree reordering: use `TreeRowItem` with its built-in drag support
- [ ] Panel dragging: use `FloatingPanelShell` which handles it via header
- [ ] Do NOT create new pointer-tracking implementations — use existing patterns

## What NOT to do

- Do NOT add `document.addEventListener('keydown', ...)` for Escape — use `useEscapeKey`
- Do NOT add `document.addEventListener('pointerdown', ...)` for click-outside — use `useClickOutside`
- Do NOT duplicate the dark tooltip class string — import `DARK_TOOLTIP_CLASS`
- Do NOT use hardcoded Tailwind slate colors — use CSS variables from `src/styles/variables.css`
- Do NOT create new positioning logic if `PopoverTooltip` or `PopoverSurface` can handle it

## When to use

- Before building any new interactive UI component
- During code review of new interactive components
