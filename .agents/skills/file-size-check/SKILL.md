---
name: file-size-check
description: Find source files exceeding size limits defined in CLAUDE.md (500/800 lines)
user-invocable: true
---

# File Size Check

This skill enforces the component size limits from CLAUDE.md:
- Files exceeding **500 lines** should be considered for splitting
- Files exceeding **800 lines** are a strong signal to split

## What to check

Count lines for all `.ts` and `.tsx` files in `src/`, excluding:
- `src/**/*.test.ts` and `src/**/*.test.tsx`
- `src/**/*.e2e.test.ts` and `src/**/*.e2e.test.tsx`
- `src/**/types/index.ts` (type barrels can be large by nature)
- `src/panels/generated/*` (auto-generated)
- `node_modules/`

## Output format

Report files in descending order by line count:

```
WARNING (>800 lines — strong signal to split):
  1283  src/components/ui/menubar.tsx
   956  src/stage/stageRenderers/RichTextEditOverlay.tsx

CONSIDER (500-800 lines):
   672  src/panels/LayersPanel.tsx
   534  src/api/documentApi.ts

OK: 142 files under 500 lines
```

For each file over 800 lines, briefly suggest how it could be split based on its export structure:
- Which groups of functions/components could become submodules?
- Is there a natural domain boundary inside the file?
- Would a barrel re-export maintain backward compatibility?

## When to run

- After a feature branch adds significant code
- During code review
- When `/maintenance` invokes it
