# FormField Layout Audit Tasklist

## TODO Checklist

- [x] `TODO 1` Design-system menu fix
  - add `base-form-field` to the design-system registry
  - keep ordering aligned with the rendered base demos
  - add/update navigation coverage if needed
- [x] `TODO 2` Audit and convert simple inspector rows
  - convert eligible single label/control rows to `FormField layout="inline"` or `stack`
  - convert eligible grouped rows to `layout="inline-group"` only when they are still one semantic field
  - leave complex composite rows untouched
- [x] `TODO 3` Audit shared inspector content sections
  - update repeated eligible patterns in shared content helpers and page inspector content
  - keep multiline, matrix, and action-heavy layouts custom
- [x] `TODO 4` Docs and tests sync
  - update `docs/PLAYGROUND_SPEC.md`
  - update `docs/EDITOR_STYLE_GUIDE.md` only if the current wording needs a tighter exception rule
  - add/update representative tests for converted rows
- [x] `TODO 5` Final verification
  - run targeted tests
  - run `npm run build`
  - fix any introduced failures before completion

## Execution Notes

- Scope excludes complex composite rows such as `X/Y/W/H`, padding matrices, border/shadow groups, reorder clusters, and block-level inspector layout containers.
- Prefer `FormField layout="inline"` for simple inspector rows, `stack` for wide text inputs, and `inline-group` only for semantically grouped controls that still read as one field.
