import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { setPresetAnimation, buildDocumentInteractConfig } from '../animationApi';
import { filterInteractConfig, buildPreviewConfig, createAnimationPreview } from '../animationRuntime';
import type { DocumentModel } from '../../model/types';
// ── Mock setup ────────────────────────────────────────────────────────────────

vi.mock('@wix/interact/web', () => {
  const mockInstance = {
    destroy: vi.fn(),
    init: vi.fn(),
  };
  return {
    Interact: {
      create: vi.fn(() => mockInstance),
      destroy: vi.fn(),
      registerEffects: vi.fn(),
    },
    add: vi.fn(),
    remove: vi.fn(),
  };
});

vi.mock('@wix/motion-presets', () => ({}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTextLeafId(doc: DocumentModel): string {
  const node = Object.values(doc.nodes).find(
    (n) => n.contentType === 'text',
  );
  if (!node) throw new Error('Expected text leaf in document');
  return node.id;
}

function getSectionId(doc: DocumentModel): string {
  const node = Object.values(doc.nodes).find(
    (n) => n.contentType === 'container' && n.subtype === 'section',
  );
  if (!node) throw new Error('Expected section wrapper in document');
  return node.id;
}

// ── filterInteractConfig tests ─────────────────────────────────────────────────

describe('filterInteractConfig', () => {
  it('filters out scroll triggers when scroll is disabled', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withScroll = setPresetAnimation(doc, nodeId, {
      trigger: 'scroll',
      preset: 'FadeScroll',
    });
    const config = buildDocumentInteractConfig(withScroll);

    // Verify config has viewProgress interaction
    expect(config.interactions.some((i) => i.trigger === 'viewProgress')).toBe(true);

    // Filter with scroll disabled
    const filtered = filterInteractConfig(config, { scroll: false });

    // Verify viewProgress interaction is gone
    expect(filtered.interactions.some((i) => i.trigger === 'viewProgress')).toBe(false);
    expect(filtered.interactions).toEqual([]);
  });

  it('keeps entrance triggers when enabled', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withEntrance = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withEntrance);

    // Filter with entrance enabled
    const filtered = filterInteractConfig(config, { entrance: true });

    // Verify viewEnter interaction still present
    expect(filtered.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);
  });

  it('filters out mouse triggers', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withMouse = setPresetAnimation(doc, nodeId, {
      trigger: 'mouse',
      preset: 'TrackMouse',
    });
    const config = buildDocumentInteractConfig(withMouse);

    // Verify config has pointerMove interaction
    expect(config.interactions.some((i) => i.trigger === 'pointerMove')).toBe(true);

    // Filter with mouse disabled
    const filtered = filterInteractConfig(config, { mouse: false });

    // Verify pointerMove interaction is gone
    expect(filtered.interactions.some((i) => i.trigger === 'pointerMove')).toBe(false);
    expect(filtered.interactions).toEqual([]);
  });

  it('handles viewEnter mapping to both entrance and ongoing', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withEntrance = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withEntrance);

    // Verify config has viewEnter interaction
    expect(config.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);

    // Filter with entrance disabled but ongoing enabled
    // viewEnter should still be kept because it maps to both entrance and ongoing
    const filtered = filterInteractConfig(config, { entrance: false, ongoing: true });

    // Verify viewEnter interaction is kept (maps to ongoing)
    expect(filtered.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);
  });

  it('returns empty interactions when all triggers disabled', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withEntrance = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withEntrance);

    // Filter with all triggers disabled
    const filtered = filterInteractConfig(config, {
      entrance: false,
      ongoing: false,
      scroll: false,
      click: false,
      hover: false,
      mouse: false,
    });

    expect(filtered.interactions).toEqual([]);
  });

  it('does not mutate original config', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withEntrance = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withEntrance);
    const originalLength = config.interactions.length;

    // Create a deep copy to verify original is not mutated
    const configJson = JSON.stringify(config);

    // Filter
    filterInteractConfig(config, { entrance: false });

    // Verify original is unchanged
    expect(JSON.stringify(config)).toBe(configJson);
    expect(config.interactions.length).toBe(originalLength);
  });

  it('filters multiple trigger types independently', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);

    // Add entrance animation
    let doc2 = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    // Also add a click animation to a different node (if possible)
    const sectionId = getSectionId(doc2);
    doc2 = setPresetAnimation(doc2, sectionId, {
      trigger: 'click',
      preset: 'Pulse',
    });

    const config = buildDocumentInteractConfig(doc2);

    // Both should be present
    expect(config.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);
    expect(config.interactions.some((i) => i.trigger === 'activate')).toBe(true);

    // Filter with only entrance enabled
    const filtered = filterInteractConfig(config, { entrance: true, click: false });

    // Only viewEnter should remain
    expect(filtered.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);
    expect(filtered.interactions.some((i) => i.trigger === 'activate')).toBe(false);
  });
});

// ── buildPreviewConfig tests ───────────────────────────────────────────────────

describe('buildPreviewConfig', () => {
  it('combines build and filter', () => {
    const doc = createInitialDocument();
    const textId = getTextLeafId(doc);
    const sectionId = getSectionId(doc);

    // Add entrance animation on text node
    let doc2 = setPresetAnimation(doc, textId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    // Add scroll animation on section node (different node — one anim per node)
    doc2 = setPresetAnimation(doc2, sectionId, {
      trigger: 'scroll',
      preset: 'FadeScroll',
    });

    // Build preview config with only entrance enabled
    const config = buildPreviewConfig(doc2, { entrance: true, scroll: false });

    // Should have entrance interaction
    expect(config.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);

    // Should NOT have scroll interaction
    expect(config.interactions.some((i) => i.trigger === 'viewProgress')).toBe(false);
  });

  it('returns empty config for document with no animations', () => {
    const doc = createInitialDocument();

    const config = buildPreviewConfig(doc, {
      entrance: true,
      ongoing: true,
      scroll: true,
      click: true,
      hover: true,
      mouse: true,
    });

    expect(config.interactions).toEqual([]);
  });

  it('respects all trigger filters', () => {
    const doc = createInitialDocument();
    const textId = getTextLeafId(doc);
    const sectionId = getSectionId(doc);

    // Add entrance animation on text node
    let doc2 = setPresetAnimation(doc, textId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    // Add hover animation on section node (different node — one anim per node)
    doc2 = setPresetAnimation(doc2, sectionId, {
      trigger: 'hover',
      preset: 'SlideIn',
    });

    // Build with entrance enabled, hover explicitly disabled
    const config = buildPreviewConfig(doc2, { entrance: true, hover: false });

    // Should have entrance but not hover
    expect(config.interactions.some((i) => i.trigger === 'viewEnter')).toBe(true);
    expect(config.interactions.some((i) => i.trigger === 'interest')).toBe(false);
  });
});

// ── createAnimationPreview tests ──────────────────────────────────────────────

describe('createAnimationPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isActive returns true after creation', async () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withAnim);

    const handle = await createAnimationPreview(config);

    expect(handle.isActive()).toBe(true);
  });

  it('isActive returns false after destroy', async () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withAnim);

    const handle = await createAnimationPreview(config);
    expect(handle.isActive()).toBe(true);

    handle.destroy();

    expect(handle.isActive()).toBe(false);
  });

  it('destroy is idempotent', async () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withAnim);

    const handle = await createAnimationPreview(config);

    // First destroy
    expect(() => handle.destroy()).not.toThrow();

    // Second destroy should not throw
    expect(() => handle.destroy()).not.toThrow();

    expect(handle.isActive()).toBe(false);
  });

  it('updateConfig accepts new config', async () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withAnim);

    const handle = await createAnimationPreview(config);
    expect(handle.isActive()).toBe(true);

    // Create a new config
    const doc2 = createInitialDocument();
    const nodeId2 = getTextLeafId(doc2);
    const withAnim2 = setPresetAnimation(doc2, nodeId2, {
      trigger: 'scroll',
      preset: 'FadeScroll',
    });
    const config2 = buildDocumentInteractConfig(withAnim2);

    // Update should not throw
    expect(() => handle.updateConfig(config2)).not.toThrow();
    expect(handle.isActive()).toBe(true);
  });

  it('invoke accepts valid actions', async () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'FadeIn',
    });
    const config = buildDocumentInteractConfig(withAnim);

    const handle = await createAnimationPreview(config);

    // These should not throw
    expect(() => handle.invoke(nodeId, 'click')).not.toThrow();
    expect(() => handle.invoke(nodeId, 'hoverIn')).not.toThrow();
    expect(() => handle.invoke(nodeId, 'hoverOut')).not.toThrow();
  });

  it('invoke dispatches mouseenter and mouseleave for hover actions', async () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'FadeIn',
      outAction: 'none',
    });
    const config = buildDocumentInteractConfig(withAnim);

    const dispatched: string[] = [];
    const el = {
      dispatchEvent: vi.fn((event: Event) => {
        dispatched.push(event.type);
        return true;
      }),
    };
    const originalDocument = globalThis.document;
    const originalMouseEvent = globalThis.MouseEvent;
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => el),
      querySelectorAll: vi.fn(() => []),
    });
    vi.stubGlobal('MouseEvent', class extends Event {});

    try {
      const handle = await createAnimationPreview(config);
      handle.invoke(nodeId, 'hoverIn');
      handle.invoke(nodeId, 'hoverOut');

      expect(dispatched).toContain('mouseenter');
      expect(dispatched).toContain('mouseleave');
    } finally {
      if (originalDocument === undefined) {
        // @ts-expect-error restoring deleted global in test
        delete globalThis.document;
      } else {
        vi.stubGlobal('document', originalDocument);
      }
      if (originalMouseEvent === undefined) {
        // @ts-expect-error restoring deleted global in test
        delete globalThis.MouseEvent;
      } else {
        vi.stubGlobal('MouseEvent', originalMouseEvent);
      }
    }
  });
});
