---
name: design-system-check
description: Audit editor UI for design system violations — hardcoded colors, missing tokens, duplicated patterns
user-invocable: true
argument-hint: "[--fix to auto-migrate violations]"
---

# Design System Compliance Check

This skill enforces the editor style guide (`docs/EDITOR_STYLE_GUIDE.md`) and design token system (`src/styles/variables.css`).

## What to check

### 1. Hardcoded color classes in UI components

Search `src/components/ui/` for Tailwind color classes that bypass CSS tokens:

```
Patterns to flag:
- bg-slate-* (should use --editor-* tokens)
- text-slate-* (should use --editor-* tokens)
- border-slate-* (should use --editor-* tokens)
- bg-gray-*, text-gray-*, border-gray-*
- Any hardcoded hex color in className
- Any rgba() in className
```

For each match, check if a corresponding CSS variable exists in `src/styles/variables.css`. If it does, the component should use `bg-[var(--editor-*)]` syntax instead.

### 2. Hardcoded colors in stage/canvas CSS

Search `src/styles/stage.css` and `src/styles/` for:
- Hardcoded `rgba()` values that could derive from `--editor-accent` or other tokens
- Hardcoded `#hex` colors
- Any color that duplicates an existing token value

### 3. Duplicated class strings

Search for any class string that appears identically in 3+ files. The dark tooltip pattern (`DARK_TOOLTIP_CLASS` in `src/lib/utils.ts`) was an example — there may be others.

```
grep -rn "className=" src/components/ui/ src/panels/ src/stage/ --include="*.tsx" \
  | extract class strings | find duplicates with 3+ occurrences
```

### 4. Missing design system components

Check `src/panels/` and `src/stage/` for UI patterns that should be in `src/components/ui/` but aren't:
- Repeated button+icon combinations that aren't using `Button`
- Custom select/dropdown implementations not using `Select` or `SearchableSelect`
- Custom tooltip rendering not using `PopoverTooltip`

### 5. Light/dark theme parity

For any component using hardcoded colors, check if it would break in the opposite theme. Components using CSS tokens automatically work in both themes.

## Output format

| Severity | File | Line | Issue | Existing token |
|---|---|---|---|---|
| High | switch.tsx | 13 | `bg-slate-300` | `--editor-switch-background` |
| Medium | stage.css | 210 | `rgba(55,114,255,0.14)` | derive from `--editor-accent` |
| Low | SomePanel.tsx | 42 | class string duplicated 4x | extract to shared const |

If `$ARGUMENTS` contains `--fix`:
- Replace hardcoded classes with token-backed equivalents
- Extract duplicated strings to `src/lib/utils.ts` constants
- Add missing tokens to `src/styles/variables.css` when needed

## Reference files

- Token definitions: `src/styles/variables.css`
- Style guide: `docs/EDITOR_STYLE_GUIDE.md`
- Shared constants: `src/lib/utils.ts` (`DARK_TOOLTIP_CLASS`)
- Design system components: `src/components/ui/`

## When to run

- After touching editor UI styling
- Before a maintenance pass
- When `/maintenance` invokes it
