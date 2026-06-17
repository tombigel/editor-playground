# Hash-Routed Modes Plan

Archived: 2026-06-17

This plan was completed by the hash-routed modes and onboarding implementation.

## Decisions

- Clean `/`, `#/`, and unknown hash routes render onboarding.
- `#/edit` opens the editor.
- `#/preview` opens fullscreen preview.
- `#/design-system` opens the design-system showcase.
- Editor navigation state lives in `#/edit?...`.
- Legacy root query mode URLs such as `?mode=preview` and root-query tour URLs are not supported.
- The onboarding home offers Continue current site, Start blank, Load JSON, Start tour, and Design system.
- The editor Settings menu exposes `Start fresh...`, which returns to onboarding without clearing local work.

## Completion Notes

- Blank starter document factory added through model, document API, and editor API.
- Preview and showcase tour links moved to hash-routed URLs.
- Active docs updated; this planning record is historical only.
