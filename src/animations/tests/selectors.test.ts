import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import type { DocumentModel } from '../../model/types';
import { setPresetAnimation, setKeyframeAnimation } from '../animationApi';
import {
  hasAnimation,
  getAnimationSummary,
  isScrollAnimation,
  requiresStickyForAnimation,
  getAnimatedNodeIds,
} from '../selectors';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTextLeafId(doc: DocumentModel): string {
  const node = Object.values(doc.nodes).find((n) => n.contentType === 'text');
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

// ── hasAnimation ──────────────────────────────────────────────────────────────

describe('hasAnimation', () => {
  it('returns false for a node with no animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(hasAnimation(doc.nodes[nodeId])).toBe(false);
  });

  it('returns true for a node with an animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    expect(hasAnimation(next.nodes[nodeId])).toBe(true);
  });

  it('returns false for site root (no animation field)', () => {
    const doc = createInitialDocument();
    expect(hasAnimation(doc.nodes[doc.rootId])).toBe(false);
  });
});

// ── getAnimationSummary ───────────────────────────────────────────────────────

describe('getAnimationSummary', () => {
  it('returns null for a node with no animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(getAnimationSummary(doc.nodes[nodeId])).toBeNull();
  });

  it('returns correct summary for entrance named effect', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    const summary = getAnimationSummary(next.nodes[nodeId]);
    expect(summary).not.toBeNull();
    expect(summary?.trigger).toBe('entrance');
    expect(summary?.effectName).toBe('FadeIn');
    expect(summary?.effectKind).toBe('named');
  });

  it('returns correct summary for scroll named effect', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'scroll', preset: 'FadeScroll' });
    const summary = getAnimationSummary(next.nodes[nodeId]);
    expect(summary).not.toBeNull();
    expect(summary?.trigger).toBe('scroll');
    expect(summary?.effectName).toBe('FadeScroll');
    expect(summary?.effectKind).toBe('named');
  });

  it('returns correct summary for entrance keyframe effect', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setKeyframeAnimation(doc, nodeId, {
      trigger: 'entrance',
      name: 'MyCustomFade',
      keyframes: [
        { offset: 0, opacity: 0 },
        { offset: 1, opacity: 1 },
      ],
    });
    const summary = getAnimationSummary(next.nodes[nodeId]);
    expect(summary).not.toBeNull();
    expect(summary?.trigger).toBe('entrance');
    expect(summary?.effectName).toBe('MyCustomFade');
    expect(summary?.effectKind).toBe('keyframe');
  });

  it('returns correct summary for scroll keyframe effect', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setKeyframeAnimation(doc, nodeId, {
      trigger: 'scroll',
      name: 'ScrollReveal',
      keyframes: [
        { offset: 0, opacity: 0 },
        { offset: 1, opacity: 1 },
      ],
    });
    const summary = getAnimationSummary(next.nodes[nodeId]);
    expect(summary).not.toBeNull();
    expect(summary?.trigger).toBe('scroll');
    expect(summary?.effectName).toBe('ScrollReveal');
    expect(summary?.effectKind).toBe('keyframe');
  });
});

// ── isScrollAnimation ─────────────────────────────────────────────────────────

describe('isScrollAnimation', () => {
  it('returns false for a node with no animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(isScrollAnimation(doc.nodes[nodeId])).toBe(false);
  });

  it('returns false for an entrance animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    expect(isScrollAnimation(next.nodes[nodeId])).toBe(false);
  });

  it('returns true for a scroll animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'scroll', preset: 'FadeScroll' });
    expect(isScrollAnimation(next.nodes[nodeId])).toBe(true);
  });
});

// ── requiresStickyForAnimation ────────────────────────────────────────────────

describe('requiresStickyForAnimation', () => {
  it('returns false for a node with no animation', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    expect(requiresStickyForAnimation(doc.nodes[nodeId])).toBe(false);
  });

  it('returns false when requiresSticky is not set', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    expect(requiresStickyForAnimation(next.nodes[nodeId])).toBe(false);
  });

  it('returns true when requiresSticky is set to true', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, {
      trigger: 'entrance',
      preset: 'FadeIn',
      requiresSticky: true,
    });
    expect(requiresStickyForAnimation(next.nodes[nodeId])).toBe(true);
  });
});

// ── getAnimatedNodeIds ────────────────────────────────────────────────────────

describe('getAnimatedNodeIds', () => {
  it('returns empty array when no nodes have animations', () => {
    const doc = createInitialDocument();
    expect(getAnimatedNodeIds(doc)).toEqual([]);
  });

  it('returns the id of a single animated node', () => {
    const doc = createInitialDocument();
    const nodeId = getTextLeafId(doc);
    const next = setPresetAnimation(doc, nodeId, { trigger: 'entrance', preset: 'FadeIn' });
    expect(getAnimatedNodeIds(next)).toEqual([nodeId]);
  });

  it('returns ids of multiple animated nodes and excludes non-animated ones', () => {
    const doc = createInitialDocument();
    const textId = getTextLeafId(doc);
    const sectionId = getSectionId(doc);

    const step1 = setPresetAnimation(doc, textId, { trigger: 'entrance', preset: 'FadeIn' });
    const step2 = setPresetAnimation(step1, sectionId, { trigger: 'ongoing', preset: 'Pulse' });

    const animatedIds = getAnimatedNodeIds(step2);
    expect(animatedIds).toHaveLength(2);
    expect(animatedIds).toContain(textId);
    expect(animatedIds).toContain(sectionId);

    // site root should not be included
    expect(animatedIds).not.toContain(doc.rootId);
  });
});
