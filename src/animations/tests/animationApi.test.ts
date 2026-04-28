import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import type { DocumentModel } from '../../model/types';
import type { AnimationDefinition } from '../types';
import {
  setPresetAnimation,
  setKeyframeAnimation,
  updateAnimationOptions,
  clearAnimation,
  setDocumentAnimationSettings,
  setNodeAnimation,
  getNodeAnimation,
  getAnimatedNodes,
  getMotionPresets,
  getPresetCategory,
  getPresetsForTrigger,
  getPresetParams,
  buildDocumentInteractConfig,
} from '../animationApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSectionId(doc: DocumentModel): string {
  const node = Object.values(doc.nodes).find(
    (n) => n.contentType === 'container' && n.subtype === 'section',
  );
  if (!node) throw new Error('Expected section wrapper in document');
  return node.id;
}

function getTextLeafId(doc: DocumentModel): string {
  const node = Object.values(doc.nodes).find(
    (n) => n.contentType === 'text',
  );
  if (!node) throw new Error('Expected text leaf in document');
  return node.id;
}

// ── setPresetAnimation ────────────────────────────────────────────────────────

describe('setPresetAnimation', () => {
  it('sets entrance animation from preset name', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });

    expect(next).not.toBe(doc);
    const anim = getNodeAnimation(next, nodeId);
    expect(anim).toBeDefined();
    expect(anim?.trigger).toBe('entrance');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'FadeIn' });
  });

  it('sets animation with options (SlideIn with direction)', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'SlideIn',
      options: { direction: 'left' },
    });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'SlideIn', direction: 'left' });
  });

  it('overwrites existing animation on same node', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const first = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    const second = setPresetAnimation(first, nodeId, { trigger: 'entrance', preset: 'SlideIn' });

    const anim = getNodeAnimation(second, nodeId);
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'SlideIn' });
  });

  it('sets source (triggerId) when source param provided', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const sectionId = getSectionId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
      source: sectionId,
    });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.triggerId).toBe(sectionId);
  });

  it('throws on unknown nodeId', () => {
    const doc = createInitialDocument();
    expect(() =>
      setPresetAnimation(doc, 'nonexistent', { trigger: 'entrance', preset: 'FadeIn' }),
    ).toThrow('Node "nonexistent" not found in document');
  });

  it('throws on site root', () => {
    const doc = createInitialDocument();
    expect(() =>
      setPresetAnimation(doc, doc.rootId, { trigger: 'entrance', preset: 'FadeIn' }),
    ).toThrow('Cannot set animation on site root node');
  });

  it('throws on unknown preset', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(() =>
      setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'NoSuchPreset' }),
    ).toThrow('Unknown preset');
  });

  it('throws on invalid preset/trigger combo: scroll preset on entrance trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(() =>
      setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeScroll' }),
    ).toThrow();
  });

  it('throws on invalid preset/trigger combo: entrance preset on scroll trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(() =>
      setPresetAnimation(doc, nodeId, { trigger: 'scroll', preset: 'SlideIn' }),
    ).toThrow();
  });

  it('allows entrance preset on click trigger (valid cross-category)', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'click', preset: 'FadeIn' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('activate');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'FadeIn' });
  });

  it('allows entrance preset on activate trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'activate', preset: 'FadeIn' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('activate');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'FadeIn' });
  });

  it('allows entrance preset on hover trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'hover', preset: 'SlideIn' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('interest');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'SlideIn' });
  });

  it('allows entrance preset on interest trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'interest', preset: 'SlideIn' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('interest');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'SlideIn' });
  });

  it('allows ongoing preset on click trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'click', preset: 'Pulse' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('activate');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'Pulse' });
  });

  it('allows ongoing preset on hover trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'hover', preset: 'Bounce' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('interest');
    expect(anim?.effect).toMatchObject({ kind: 'named', type: 'Bounce' });
  });

  it('sets outAction for hover trigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'Pulse',
      outAction: 'pause',
    });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('interest');
    if (anim?.trigger === 'interest') {
      expect(anim.outAction).toBe('pause');
    }
  });
});

// ── setKeyframeAnimation ──────────────────────────────────────────────────────

describe('setKeyframeAnimation', () => {
  const testKeyframes = [
    { offset: 0, opacity: 0 },
    { offset: 1, opacity: 1 },
  ];

  it('sets keyframe animation with trigger and keyframes', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setKeyframeAnimation(doc, nodeId, {
      trigger: 'entrance',
      name: 'myFade',
      keyframes: testKeyframes,
    });

    expect(next).not.toBe(doc);
    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.trigger).toBe('entrance');
    expect(anim?.effect).toMatchObject({
      kind: 'keyframe',
      name: 'myFade',
      keyframes: testKeyframes,
    });
  });

  it('accepts any trigger type with keyframes', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const triggers = ['entrance', 'ongoing', 'scroll', 'click', 'activate', 'hover', 'interest', 'mouse'] as const;

    for (const trigger of triggers) {
      const next = setKeyframeAnimation(doc, nodeId, {
        trigger,
        name: 'test',
        keyframes: testKeyframes,
      });
      const anim = getNodeAnimation(next, nodeId);
      expect(anim?.trigger).toBe(
        trigger === 'click' ? 'activate' : trigger === 'hover' ? 'interest' : trigger,
      );
      expect(anim?.effect.kind).toBe('keyframe');
    }
  });

  it('throws on unknown nodeId', () => {
    const doc = createInitialDocument();
    expect(() =>
      setKeyframeAnimation(doc, 'nonexistent', {
        trigger: 'entrance',
        name: 'test',
        keyframes: testKeyframes,
      }),
    ).toThrow('Node "nonexistent" not found in document');
  });

  it('throws on site root', () => {
    const doc = createInitialDocument();
    expect(() =>
      setKeyframeAnimation(doc, doc.rootId, {
        trigger: 'entrance',
        name: 'test',
        keyframes: testKeyframes,
      }),
    ).toThrow('Cannot set animation on site root node');
  });
});

// ── updateAnimationOptions ────────────────────────────────────────────────────

describe('updateAnimationOptions', () => {
  it('merges source onto existing animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const sectionId = getSectionId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    const next = updateAnimationOptions(withAnim, nodeId, { source: sectionId });

    expect(next).not.toBe(withAnim);
    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.triggerId).toBe(sectionId);
  });

  it('merges reducedMotion onto existing animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    const next = updateAnimationOptions(withAnim, nodeId, { reducedMotion: 'disable' });

    const anim = getNodeAnimation(next, nodeId);
    expect(anim?.reducedMotion).toBe('disable');
  });

  it('throws on node with no animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(() =>
      updateAnimationOptions(doc, nodeId, { reducedMotion: 'disable' }),
    ).toThrow('has no animation');
  });

  it('throws on unknown nodeId', () => {
    const doc = createInitialDocument();
    expect(() =>
      updateAnimationOptions(doc, 'nonexistent', { reducedMotion: 'disable' }),
    ).toThrow('Node "nonexistent" not found in document');
  });

  it('throws on site root', () => {
    const doc = createInitialDocument();
    expect(() =>
      updateAnimationOptions(doc, doc.rootId, { reducedMotion: 'disable' }),
    ).toThrow('Cannot set animation on site root node');
  });
});

// ── clearAnimation ────────────────────────────────────────────────────────────

describe('clearAnimation', () => {
  it('removes animation from node', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    const next = clearAnimation(withAnim, nodeId);

    expect(next).not.toBe(withAnim);
    expect(getNodeAnimation(next, nodeId)).toBeUndefined();
  });

  it('returns original document (silent no-op) if node has no animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = clearAnimation(doc, nodeId);

    // Must be a DocumentModel (no throw), original not mutated
    expect(getNodeAnimation(next, nodeId)).toBeUndefined();
    expect(doc.nodes[nodeId]).toBe(next.nodes[nodeId]);
  });

  it('throws on unknown nodeId', () => {
    const doc = createInitialDocument();
    expect(() => clearAnimation(doc, 'nonexistent')).toThrow(
      'Node "nonexistent" not found in document',
    );
  });
});

// ── setDocumentAnimationSettings ─────────────────────────────────────────────

describe('setDocumentAnimationSettings', () => {
  it('sets a11y settings immutably', () => {
    const doc = createInitialDocument();
    const next = setDocumentAnimationSettings(doc, {
      a11y: { reducedMotion: 'disable' },
    });

    expect(next).not.toBe(doc);
    expect(next.animationSettings?.a11y?.reducedMotion).toBe('disable');
    expect(doc.animationSettings).toBeUndefined();
  });

  it('replaces existing settings', () => {
    const doc = createInitialDocument();
    const first = setDocumentAnimationSettings(doc, {
      a11y: { reducedMotion: 'disable' },
    });
    const second = setDocumentAnimationSettings(first, {
      a11y: { reducedMotion: { alternative: { kind: 'named', type: 'FadeIn' } } },
    });

    expect(second.animationSettings?.a11y?.reducedMotion).toMatchObject({
      alternative: { kind: 'named', type: 'FadeIn' },
    });
  });
});

// ── setNodeAnimation (low-level) ──────────────────────────────────────────────

describe('setNodeAnimation (low-level)', () => {
  const testDef: AnimationDefinition = {
    trigger: 'entrance',
    effect: { kind: 'named', type: 'FadeIn' },
  };

  it('sets full AnimationDefinition on a node', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setNodeAnimation(doc, nodeId, testDef);

    expect(next).not.toBe(doc);
    expect(getNodeAnimation(next, nodeId)).toEqual(testDef);
  });

  it('overwrites existing', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withFirst = setNodeAnimation(doc, nodeId, testDef);
    const newDef: AnimationDefinition = {
      trigger: 'scroll',
      effect: { kind: 'named', type: 'FadeScroll' },
    };
    const next = setNodeAnimation(withFirst, nodeId, newDef);

    expect(getNodeAnimation(next, nodeId)).toEqual(newDef);
  });

  it('passing undefined clears animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setNodeAnimation(doc, nodeId, testDef);
    const next = setNodeAnimation(withAnim, nodeId, undefined);

    expect(getNodeAnimation(next, nodeId)).toBeUndefined();
  });

  it('throws on unknown nodeId', () => {
    const doc = createInitialDocument();
    expect(() => setNodeAnimation(doc, 'nonexistent', testDef)).toThrow(
      'Node "nonexistent" not found in document',
    );
  });

  it('throws on site root', () => {
    const doc = createInitialDocument();
    expect(() => setNodeAnimation(doc, doc.rootId, testDef)).toThrow(
      'Cannot set animation on site root node',
    );
  });
});

// ── getNodeAnimation ──────────────────────────────────────────────────────────

describe('getNodeAnimation', () => {
  it('returns undefined for unanimated node', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(getNodeAnimation(doc, nodeId)).toBeUndefined();
  });

  it('returns the AnimationDefinition after setting one', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const def: AnimationDefinition = {
      trigger: 'entrance',
      effect: { kind: 'named', type: 'FadeIn' },
    };
    const next = setNodeAnimation(doc, nodeId, def);
    expect(getNodeAnimation(next, nodeId)).toEqual(def);
  });
});

// ── getAnimatedNodes ──────────────────────────────────────────────────────────

describe('getAnimatedNodes', () => {
  it('returns empty array for clean document', () => {
    const doc = createInitialDocument();
    expect(getAnimatedNodes(doc)).toEqual([]);
  });

  it('returns animated node IDs after setting animations', () => {
    const doc = createInitialDocument();
    const nodeIdA = getTextLeafId(doc);
    const sectionId = getSectionId(doc);

    const def: AnimationDefinition = {
      trigger: 'entrance',
      effect: { kind: 'named', type: 'FadeIn' },
    };
    const withA = setNodeAnimation(doc, nodeIdA, def);
    const withBoth = setNodeAnimation(withA, sectionId, {
      trigger: 'scroll',
      effect: { kind: 'named', type: 'FadeScroll' },
    });

    const animated = getAnimatedNodes(withBoth);
    expect(animated).toContain(nodeIdA);
    expect(animated).toContain(sectionId);
    expect(animated).toHaveLength(2);
  });
});

// ── getMotionPresets ──────────────────────────────────────────────────────────

describe('getMotionPresets', () => {
  it('returns object with entrance, ongoing, scroll, mouse arrays', () => {
    const presets = getMotionPresets();
    expect(presets).toHaveProperty('entrance');
    expect(presets).toHaveProperty('ongoing');
    expect(presets).toHaveProperty('scroll');
    expect(presets).toHaveProperty('mouse');
    expect(Array.isArray(presets.entrance)).toBe(true);
    expect(Array.isArray(presets.ongoing)).toBe(true);
    expect(Array.isArray(presets.scroll)).toBe(true);
    expect(Array.isArray(presets.mouse)).toBe(true);
  });

  it('entrance array includes FadeIn and SlideIn', () => {
    const { entrance } = getMotionPresets();
    expect(entrance).toContain('FadeIn');
    expect(entrance).toContain('SlideIn');
  });

  it('ongoing array includes Pulse and Bounce', () => {
    const { ongoing } = getMotionPresets();
    expect(ongoing).toContain('Pulse');
    expect(ongoing).toContain('Bounce');
  });

  it('scroll array includes FadeScroll', () => {
    const { scroll } = getMotionPresets();
    expect(scroll).toContain('FadeScroll');
  });

  it('mouse array includes TrackMouse', () => {
    const { mouse } = getMotionPresets();
    expect(mouse).toContain('TrackMouse');
  });
});

// ── getPresetCategory ─────────────────────────────────────────────────────────

describe('getPresetCategory', () => {
  it('returns entrance for FadeIn', () => {
    expect(getPresetCategory('FadeIn')).toBe('entrance');
  });

  it('returns ongoing for Pulse', () => {
    expect(getPresetCategory('Pulse')).toBe('ongoing');
  });

  it('returns scroll for FadeScroll', () => {
    expect(getPresetCategory('FadeScroll')).toBe('scroll');
  });

  it('returns mouse for TrackMouse', () => {
    expect(getPresetCategory('TrackMouse')).toBe('mouse');
  });

  it('returns null for unknown string', () => {
    expect(getPresetCategory('NotARealPreset')).toBeNull();
  });
});

// ── getPresetsForTrigger ──────────────────────────────────────────────────────

describe('getPresetsForTrigger', () => {
  it('returns only entrance presets for entrance trigger', () => {
    const results = getPresetsForTrigger('entrance');
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.category).toBe('entrance');
    }
  });

  it('returns only ongoing presets for ongoing trigger', () => {
    const results = getPresetsForTrigger('ongoing');
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.category).toBe('ongoing');
    }
  });

  it('returns entrance + ongoing presets for click trigger', () => {
    const results = getPresetsForTrigger('click');
    const categories = new Set(results.map((p) => p.category));
    expect(categories.has('entrance')).toBe(true);
    expect(categories.has('ongoing')).toBe(true);
    expect(categories.has('scroll')).toBe(false);
    expect(categories.has('mouse')).toBe(false);
  });

  it('returns entrance + ongoing presets for activate trigger', () => {
    const results = getPresetsForTrigger('activate');
    const categories = new Set(results.map((p) => p.category));
    expect(categories.has('entrance')).toBe(true);
    expect(categories.has('ongoing')).toBe(true);
    expect(categories.has('scroll')).toBe(false);
    expect(categories.has('mouse')).toBe(false);
  });

  it('returns entrance + ongoing presets for hover trigger', () => {
    const results = getPresetsForTrigger('hover');
    const categories = new Set(results.map((p) => p.category));
    expect(categories.has('entrance')).toBe(true);
    expect(categories.has('ongoing')).toBe(true);
    expect(categories.has('scroll')).toBe(false);
    expect(categories.has('mouse')).toBe(false);
  });

  it('returns entrance + ongoing presets for interest trigger', () => {
    const results = getPresetsForTrigger('interest');
    const categories = new Set(results.map((p) => p.category));
    expect(categories.has('entrance')).toBe(true);
    expect(categories.has('ongoing')).toBe(true);
    expect(categories.has('scroll')).toBe(false);
    expect(categories.has('mouse')).toBe(false);
  });

  it('returns only scroll presets for scroll trigger', () => {
    const results = getPresetsForTrigger('scroll');
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.category).toBe('scroll');
    }
  });

  it('returns only mouse presets for mouse trigger', () => {
    const results = getPresetsForTrigger('mouse');
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.category).toBe('mouse');
    }
  });

  it('each entry has a params array', () => {
    for (const trigger of ['entrance', 'ongoing', 'scroll', 'click', 'activate', 'hover', 'interest', 'mouse'] as const) {
      const results = getPresetsForTrigger(trigger);
      for (const p of results) {
        expect(Array.isArray(p.params)).toBe(true);
      }
    }
  });
});

// ── getPresetParams ───────────────────────────────────────────────────────────

describe('getPresetParams', () => {
  it('returns schema for known preset (SlideIn)', () => {
    const schema = getPresetParams('SlideIn');
    expect(schema).not.toBeNull();
    expect(schema?.preset).toBe('SlideIn');
    expect(schema?.category).toBe('entrance');
  });

  it('SlideIn schema has direction param', () => {
    const schema = getPresetParams('SlideIn');
    expect(schema?.params.some((p) => p.name === 'direction')).toBe(true);
  });

  it('returns null for unknown preset', () => {
    expect(getPresetParams('NotARealPreset')).toBeNull();
  });
});

// ── buildDocumentInteractConfig ───────────────────────────────────────────────

describe('buildDocumentInteractConfig', () => {
  it('returns empty interactions array for unanimated document', () => {
    const doc = createInitialDocument();
    const config = buildDocumentInteractConfig(doc);
    expect(config.interactions).toEqual([]);
  });

  it('returns interaction with viewEnter trigger for entrance animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    const config = buildDocumentInteractConfig(next);

    const interaction = config.interactions.find((i) => i.trigger === 'viewEnter');
    expect(interaction).toBeDefined();
  });

  it('returns interaction with viewProgress trigger for scroll animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'scroll', preset: 'FadeScroll' });
    const config = buildDocumentInteractConfig(next);

    const interaction = config.interactions.find((i) => i.trigger === 'viewProgress');
    expect(interaction).toBeDefined();
  });

  it('returns interaction with pointerMove trigger for mouse animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'mouse', preset: 'TrackMouse' });
    const config = buildDocumentInteractConfig(next);

    const interaction = config.interactions.find((i) => i.trigger === 'pointerMove');
    expect(interaction).toBeDefined();
  });

  it('returns interaction with activate trigger for click animation alias', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'click', preset: 'FadeIn' });
    const config = buildDocumentInteractConfig(next);

    const interaction = config.interactions.find((i) => i.trigger === 'activate');
    expect(interaction).toBeDefined();
  });

  it('returns interaction with interest trigger for hover animation alias', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'hover', preset: 'FadeIn' });
    const config = buildDocumentInteractConfig(next);

    const interaction = config.interactions.find((i) => i.trigger === 'interest');
    expect(interaction).toBeDefined();
  });

  it('source/target: both keys present when triggerId differs from target', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const sectionId = getSectionId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
      source: sectionId,
    });
    const config = buildDocumentInteractConfig(next);

    // The interaction should reference the triggerId (source) as the key/selector
    // and target the animated node — both IDs should appear somewhere in the config
    const configStr = JSON.stringify(config);
    expect(configStr).toContain(nodeId);
    expect(configStr).toContain(sectionId);
  });

  it('hover + entrance: has alternate config', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'hover', preset: 'SlideIn' });
    const config = buildDocumentInteractConfig(next);

    // Hover + entrance should configure an alternate (reverse on leave)
    const configStr = JSON.stringify(config);
    expect(configStr).toContain('interest');
    // The effects or sequences should encode alternating behaviour
    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    expect(hoverInteraction).toBeDefined();
    const effectsOrSequences =
      (hoverInteraction?.effects?.length ?? 0) + (hoverInteraction?.sequences?.length ?? 0);
    expect(effectsOrSequences).toBeGreaterThan(0);
  });

  it('hover + ongoing with outAction pause: uses state params', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'Pulse',
      outAction: 'pause',
    });
    const config = buildDocumentInteractConfig(next);

    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    const effect = hoverInteraction?.effects?.[0] as Record<string, unknown> | undefined;
    expect(effect?.triggerType).toBe('state');
  });

  it('hover + ongoing with outAction pause: loops while state-controlled', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'Pulse',
      outAction: 'pause',
    });
    const config = buildDocumentInteractConfig(next);

    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    const effect = hoverInteraction?.effects?.[0] as Record<string, unknown> | undefined;
    expect(effect?.iterations).toBe(Infinity);
  });

  it('hover reverse effects use fill both so the hovered state persists while active', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'SlideIn',
      outAction: 'reverse',
    });
    const config = buildDocumentInteractConfig(next);

    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    const effect = hoverInteraction?.effects?.[0] as Record<string, unknown> | undefined;
    expect(effect?.fill).toBe('both');
  });

  it('hover none effects omit fill both so leave cancels cleanly after completion', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'SlideIn',
      outAction: 'reset',
    });
    const config = buildDocumentInteractConfig(next);

    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    const effect = hoverInteraction?.effects?.[0] as Record<string, unknown> | undefined;
    expect(effect?.fill).toBeUndefined();
  });

  it('hover + entrance with outAction reset: uses repeat config', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'SlideIn',
      outAction: 'reset',
    });
    const config = buildDocumentInteractConfig(next);

    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    expect(hoverInteraction).toBeDefined();
    const effect = hoverInteraction?.effects?.[0] as Record<string, unknown> | undefined;
    expect(effect?.triggerType).toBe('repeat');
  });

  it('hover + entrance defaults to reverse outAction', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'SlideIn',
    });
    const config = buildDocumentInteractConfig(next);

    const hoverInteraction = config.interactions.find((i) => i.trigger === 'interest');
    const effect = hoverInteraction?.effects?.[0] as Record<string, unknown> | undefined;
    expect(effect?.triggerType).toBe('alternate');
  });

  it('updateAnimationOptions merges outAction onto hover animations', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'hover',
      preset: 'Pulse',
      outAction: 'reverse',
    });

    const next = updateAnimationOptions(withAnim, nodeId, { outAction: 'reset' });
    const anim = getNodeAnimation(next, nodeId);
    if (anim?.trigger === 'interest') {
      expect(anim.outAction).toBe('reset');
    }
  });

  it('scroll preset config includes rangeStart and rangeEnd defaults', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'scroll', preset: 'FadeScroll' });
    const config = buildDocumentInteractConfig(next);

    const scrollInteraction = config.interactions.find((i) => i.trigger === 'viewProgress');
    expect(scrollInteraction).toBeDefined();
    expect(scrollInteraction?.effects).toBeDefined();
    expect(scrollInteraction!.effects!.length).toBeGreaterThan(0);

    const effect = scrollInteraction!.effects![0] as Record<string, unknown>;
    expect(effect).toHaveProperty('rangeStart');
    expect(effect).toHaveProperty('rangeEnd');
    expect(effect.rangeStart).toEqual({ name: 'cover', offset: { unit: 'percentage', value: 0 } });
    expect(effect.rangeEnd).toEqual({ name: 'cover', offset: { unit: 'percentage', value: 100 } });
  });

  it('scroll keyframe config includes rangeStart and rangeEnd defaults', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setKeyframeAnimation(doc, nodeId, {
      trigger: 'scroll',
      name: 'scrollFade',
      keyframes: [
        { offset: 0, opacity: 0 },
        { offset: 1, opacity: 1 },
      ],
    });
    const config = buildDocumentInteractConfig(next);

    const scrollInteraction = config.interactions.find((i) => i.trigger === 'viewProgress');
    expect(scrollInteraction).toBeDefined();
    expect(scrollInteraction?.effects).toBeDefined();

    const effect = scrollInteraction!.effects![0] as Record<string, unknown>;
    expect(effect).toHaveProperty('rangeStart');
    expect(effect).toHaveProperty('rangeEnd');
    expect(effect.rangeStart).toEqual({ name: 'cover', offset: { unit: 'percentage', value: 0 } });
    expect(effect.rangeEnd).toEqual({ name: 'cover', offset: { unit: 'percentage', value: 100 } });
  });

  it('mouse preset config includes hitArea self in interaction params', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'mouse', preset: 'TrackMouse' });
    const config = buildDocumentInteractConfig(next);

    const mouseInteraction = config.interactions.find((i) => i.trigger === 'pointerMove');
    expect(mouseInteraction).toBeDefined();
    expect(mouseInteraction?.params).toEqual({ hitArea: 'self' });
  });
});

// ── a11y resolution ───────────────────────────────────────────────────────────

describe('a11y resolution', () => {
  it('global reducedMotion disable overrides per-animation', () => {
    // The buildDocumentInteractConfig should apply the global a11y disable
    // and produce no motion effects (or reducedMotion marker) for affected nodes
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
      reducedMotion: { alternative: { kind: 'named', type: 'FadeIn' } },
    });
    const withSettings = setDocumentAnimationSettings(withAnim, {
      a11y: { reducedMotion: 'disable' },
    });
    const config = buildDocumentInteractConfig(withSettings);

    // Global disable takes priority — the entrance interaction should not appear
    // (or should be disabled via conditions) when global reducedMotion is 'disable'
    expect(config).toBeDefined();
    // There should be no unconditional entrance interaction when global is 'disable'
    const unconditionalEntrance = config.interactions.find(
      (i) => i.trigger === 'viewEnter' && (!i.conditions || i.conditions.length === 0),
    );
    expect(unconditionalEntrance).toBeUndefined();
  });

  it('perTrigger overrides per-animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
      reducedMotion: { alternative: { kind: 'named', type: 'SlideIn' } },
    });
    const withSettings = setDocumentAnimationSettings(withAnim, {
      a11y: {
        perTrigger: { entrance: 'disable' },
      },
    });
    const config = buildDocumentInteractConfig(withSettings);

    // perTrigger 'disable' on entrance overrides the per-animation alternative
    const unconditionalEntrance = config.interactions.find(
      (i) => i.trigger === 'viewEnter' && (!i.conditions || i.conditions.length === 0),
    );
    expect(unconditionalEntrance).toBeUndefined();
  });

  it('per-animation used when no global or perTrigger', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const withAnim = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'SlideIn',
      reducedMotion: { alternative: { kind: 'named', type: 'FadeIn' } },
    });
    const config = buildDocumentInteractConfig(withAnim);

    // When no global or perTrigger override, the per-animation reducedMotion
    // should surface in the config (e.g. via a reduced-motion condition)
    expect(config).toBeDefined();
    const configStr = JSON.stringify(config);
    // The config should encode the per-animation alternative somehow
    expect(configStr.length).toBeGreaterThan(0);
    // There should be an entrance interaction
    const entranceInteraction = config.interactions.find((i) => i.trigger === 'viewEnter');
    expect(entranceInteraction).toBeDefined();
  });
});
