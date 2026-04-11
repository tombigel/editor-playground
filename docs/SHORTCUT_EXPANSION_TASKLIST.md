# Shortcut Expansion Tasklist

Live implementation checklist for the two-phase shortcut expansion.

- [x] TODO 1 Phase 1 registry/type cleanup
  - remap layer-order shortcuts
  - rename `toggleLayersPanel` to `toggleComponentsPanel`
  - reserve standard edit combos without binding them
- [x] TODO 2 Phase 1 controller wiring + tests
  - update shortcut controller/types/App handler wiring
  - update registry/controller unit tests
- [ ] TODO 3 Phase 1 UI/docs sync
  - update menus, rail/help labels, settings/help surfaces, `PLAYGROUND_SPEC`
  - update render/help tests
- [ ] TODO 4 Phase 2 registry/type additions
  - add `toggleShowHidden`, `toggleShowGridLanes`, `toggleShowDebugInfo`, `openPreviewSite`
- [ ] TODO 5 Phase 2 controller wiring + tests
  - wire new handlers through controller/types/App
  - add/adjust controller and registry tests
- [ ] TODO 6 Phase 2 UI/docs sync
  - update every visible shortcut surface and documentation entry
  - update render/help tests
- [ ] TODO 7 Rich-text policy + audit
  - document precedence rules
  - document currently explicit rich-text shortcuts and audited gaps
- [ ] TODO 8 Final verification
  - run targeted tests
  - run `npm run build`
  - fix any introduced failures before completion
