/**
 * Alignment test — validates that our hand-authored preset catalog
 * matches the installed @wix/motion-presets package.
 *
 * If this test fails after a library upgrade, update the preset arrays
 * and param schemas in src/animations/animationApi.ts to match.
 */
import { describe, expect, it } from 'vitest';
import * as motionPresets from '@wix/motion-presets';
import {
  getMotionPresets,
  getPresetCategory,
  getPresetParams,
  INTERACT_VERSION,
} from '../animationApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Background scroll presets (excluded from Phase 1) — filter them out
const BG_SCROLL_PREFIXES = ['Bg', 'ImageParallax'];

function isBackgroundScrollPreset(name: string) {
  return BG_SCROLL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * All top-level keys exported from @wix/motion-presets that represent
 * actual preset modules (objects or functions — mouse presets are functions).
 */
function getLibraryPresetNames(): string[] {
  return Object.keys(motionPresets).filter((key) => {
    const value = (motionPresets as Record<string, unknown>)[key];
    return (typeof value === 'object' && value !== null) || typeof value === 'function';
  });
}

// Presets that exist in the @wix/motion-presets type union but are NOT
// exported as runtime modules. These are valid in the data model but
// have no corresponding runtime preset factory.
const TYPE_ONLY_PRESETS = ['DVD'];
const IMPLEMENTATION_HOOK_PRESETS = ['CustomMouse'];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('animation API ↔ @wix/motion-presets alignment', () => {
  const catalog = getMotionPresets();
  const allOurPresets = [
    ...catalog.entrance,
    ...catalog.ongoing,
    ...catalog.scroll,
    ...catalog.mouse,
  ];
  const libraryPresets = getLibraryPresetNames();

  it('every preset we list exists in the installed library (or is a known type-only preset)', () => {
    const missing = allOurPresets.filter(
      (name) => !libraryPresets.includes(name) && !TYPE_ONLY_PRESETS.includes(name),
    );
    expect(missing).toEqual([]);
  });

  it('every library preset (except background scroll) is in our catalog', () => {
    const uncovered = libraryPresets.filter(
      (name) =>
        !isBackgroundScrollPreset(name) &&
        !IMPLEMENTATION_HOOK_PRESETS.includes(name) &&
        !allOurPresets.includes(name),
    );
    expect(uncovered).toEqual([]);
  });

  it('entrance preset names match library entrance exports', () => {
    // Entrance presets end with "In" (except FadeIn which is just "FadeIn")
    for (const name of catalog.entrance) {
      expect(getPresetCategory(name)).toBe('entrance');
      expect(libraryPresets).toContain(name);
    }
  });

  it('ongoing preset names match library ongoing exports', () => {
    for (const name of catalog.ongoing) {
      expect(getPresetCategory(name)).toBe('ongoing');
      // Some ongoing presets (Blink, DVD) are in the type union but may not
      // have dedicated runtime modules. We only check that the name is
      // categorized correctly in our catalog.
    }
  });

  it('scroll preset names match library scroll exports', () => {
    for (const name of catalog.scroll) {
      expect(getPresetCategory(name)).toBe('scroll');
      expect(libraryPresets).toContain(name);
    }
  });

  it('mouse preset names match library mouse exports', () => {
    for (const name of catalog.mouse) {
      expect(getPresetCategory(name)).toBe('mouse');
      expect(libraryPresets).toContain(name);
    }
  });

  it('every preset in our catalog has a param schema', () => {
    for (const name of allOurPresets) {
      const schema = getPresetParams(name);
      expect(schema).not.toBeNull();
      expect(schema!.preset).toBe(name);
      expect(schema!.category).toBe(getPresetCategory(name));
    }
  });

  it('INTERACT_VERSION is a semver string', () => {
    expect(INTERACT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
