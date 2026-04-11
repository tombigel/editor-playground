import type { AnimationDefinition } from './types';
import type { DocumentModel, DocumentNode, NodeId } from '../model/types';

/** Whether the node has any animation definition */
export function hasAnimation(node: DocumentNode): boolean {
  return 'animation' in node && node.animation !== undefined;
}

function getAnimation(node: DocumentNode): AnimationDefinition | undefined {
  if (!('animation' in node)) return undefined;
  return (node as { animation?: AnimationDefinition }).animation;
}

/** Summary of a node's animation for display in UI */
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

/** Whether the node has a scroll-triggered animation */
export function isScrollAnimation(node: DocumentNode): boolean {
  return getAnimation(node)?.trigger === 'scroll';
}

/** Whether the node's animation requires sticky to be enabled */
export function requiresStickyForAnimation(node: DocumentNode): boolean {
  return getAnimation(node)?.requiresSticky === true;
}

/** Get all node IDs in the document that have animations */
export function getAnimatedNodeIds(doc: DocumentModel): NodeId[] {
  return Object.values(doc.nodes)
    .filter(hasAnimation)
    .map((node) => node.id);
}
