import type { DocumentModel, DocumentNode, NodeId } from '../model/types';
import type { AnimationDefinition, ScrollAnimationDefinition } from './types';

export function hasAnimation(node: DocumentNode): boolean {
  return 'animation' in node && node.animation !== undefined;
}

function getAnimation(node: DocumentNode): AnimationDefinition | undefined {
  if (!('animation' in node)) return undefined;
  return (node as { animation?: AnimationDefinition }).animation;
}

export function getAnimationSummary(node: DocumentNode): {
  trigger: string;
  effectName: string;
  effectKind: 'named' | 'keyframe';
} | null {
  const animation = getAnimation(node);
  if (!animation) return null;
  const { trigger, effect } = animation;
  const effectKind = effect.kind;
  const effectName = effectKind === 'named' ? effect.type : effect.name;
  return { trigger, effectName, effectKind };
}

export function isScrollAnimation(node: DocumentNode): boolean {
  return getAnimation(node)?.trigger === 'scroll';
}

export function requiresStickyForAnimation(node: DocumentNode): boolean {
  return getAnimation(node)?.requiresSticky === true;
}

export function getScrollRange(node: DocumentNode): { start: number; end: number } {
  const anim = getAnimation(node);
  if (anim?.trigger !== 'scroll') return { start: 0, end: 100 };
  const scroll = anim as ScrollAnimationDefinition;
  return { start: scroll.scrollRangeStart ?? 0, end: scroll.scrollRangeEnd ?? 100 };
}

export function getAnimatedNodeIds(doc: DocumentModel): NodeId[] {
  return Object.values(doc.nodes).filter(hasAnimation).map((node) => node.id);
}
