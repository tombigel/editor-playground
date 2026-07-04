# FormField Layout Audit Continuation Tasklist

## TODO Checklist

- [x] `TODO 1` Convert remaining inspector field rows
  - replace remaining inspector `InspectorInlineRow` field rows with `FormField layout=...`
  - use `inline-group` for grouped button/input rails
  - leave composite matrices and tool clusters custom
- [x] `TODO 2` Convert page/site/export editor field rows
  - update page editor content, site page settings, and export settings rows
  - keep settings-specific stacked fields unchanged when `LabeledFieldStack` remains the better fit
- [x] `TODO 3` Verification and cleanup
  - rerun focused tests and `npm run build`
  - confirm the remaining local layout classes are only on intentional composite controls

## Scope Notes

- Still excluded: `X/Y/W/H`, padding matrices, border/shadow groups, reorder/alignment clusters, debug trees, and list item editor rows.
- Goal: no remaining `InspectorInlineRow` usage in actual inspector/page panel surfaces; any remaining usage should be demo-only or an intentional non-inspector exception.
