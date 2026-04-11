---
name: version-bump
description: Bump one or all subsystem versions (minor or major). Explains when to use each level and the full workflow.
user-invocable: true
argument-hint: "[subsystem: project|document|api|editor|all] [level: minor|major]"
---

# Version Bump Skill

This project tracks four independent semver versions in `src/lib/version.ts`.
Patch bumps happen automatically on every commit via the pre-commit hook.
Use this skill when you need a manual minor or major bump.

## The four subsystems

| CLI name | Constant | What it tracks |
| --- | --- | --- |
| `project` | `PROJECT_VERSION` | Umbrella — mirrors `package.json "version"` |
| `document` | `DOCUMENT_MODEL_VERSION` | `DocumentModel` JSON schema |
| `api` | `API_VERSION` | `documentApi` / `editorApi` contract |
| `editor` | `EDITOR_VERSION` | Editor UI / shell |

## When to bump minor vs major

### document (DOCUMENT_MODEL_VERSION)

**Minor** when:
- A new optional field is added to `DocumentModel` or any node type
- A field is renamed but the old name is still handled in `normalizeDocument` / `migration.ts`
- A new page or animation setting is introduced with a safe default

**Major** when:
- A field is removed with no migration path
- The root structure of `DocumentModel` changes in a way that makes old documents unloadable even after migration
- The node discriminator (`contentType` / `subtype`) changes meaning

### api (API_VERSION)

**Minor** when:
- New functions are added to `documentApi.ts` or `editorApi.ts`
- An existing function gains new optional parameters with safe defaults
- A function's return type is widened (backward-compatible)

**Major** when:
- A function is removed or renamed without a compatibility shim
- A function's required parameter types change in a breaking way
- The semantic contract of an existing function changes (same signature, different behavior)

### editor (EDITOR_VERSION)

**Minor** when:
- A new panel, inspector section, or keyboard shortcut is added
- The editor layout changes but existing workflows are preserved
- A new UI theme or accent option is added

**Major** when:
- A core workflow is removed or replaced in an incompatible way
- The persisted editor state shape changes in a way that would force a factory reset for existing users
- A URL parameter or external integration contract changes

### project (PROJECT_VERSION)

`PROJECT_VERSION` is the umbrella version and is always kept in sync with `package.json "version"` automatically.

**Minor**: bump when shipping a meaningful release milestone (several features landed, stable point for external users).

**Major**: bump when the project reaches a new generation (1.0 = stable public API, 2.0 = major rewrite, etc.).

---

## Workflow

### Manual minor or major bump

```sh
node scripts/bump-version.mjs [subsystem|all] [minor|major]
```

After running:

1. Review the diff in `src/lib/version.ts` and `package.json`.
2. Add a new entry to `CHANGELOG.md` under the bumped version.
3. Commit. The pre-commit hook will patch-bump all four versions again — this is expected and correct. The manual bump you just made is the meaningful one; the patch on top is the hook's normal per-commit behavior.

### Examples

```sh
# Bump only the API version for a new minor API surface
node scripts/bump-version.mjs api minor

# Bump all versions for a release milestone
node scripts/bump-version.mjs all minor

# Breaking document schema change
node scripts/bump-version.mjs document major
```

### Checking current versions

Read `src/lib/version.ts` directly, or open the About panel in the editor (top-right menu → About).

---

## Implementation reference

- `src/lib/version.ts` — version constants (source of truth)
- `scripts/bump-version.mjs` — semver arithmetic and file writes
- `scripts/pre-commit-version-bump.mjs` — pre-commit hook entry point
- `package.json["simple-git-hooks"]` — hook registration
- `docs/API.md#versioning` — full versioning documentation
- `CHANGELOG.md` — release history
