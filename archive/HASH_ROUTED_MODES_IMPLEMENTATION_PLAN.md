# Hash-Routed Modes Implementation Plan

Archived: 2026-06-17

## Completed Task List

1. Added a blank starter document factory and exported it through `documentApi` and `editorApi`.
2. Added a typed hash mode router for onboarding, edit, preview, and design-system modes.
3. Updated preview, Back-to-editor, and showcase tour URL behavior to use hash routes.
4. Added the onboarding home and one-shot startup actions for blank, JSON import, and tour flows.
5. Added the non-destructive `Start fresh...` editor menu action.
6. Updated active docs and tour examples for hash-routed modes.
7. Ran the manual all-subsystem minor version bump.
8. Archived this implementation plan and the companion routing plan.

## Verification Notes

- Focused model/API, routing, onboarding, AppShell, tour config/controller, and version tests were run during implementation.
- Final acceptance required `pnpm run build` after archive commit.
