import type { RenderPlanNode, RenderRootPlan, RenderTrackSpacerEdge } from './types';
import { getTrackSpacerDescriptor } from './renderPlan';

export function getRootPlanWrappers(plan: RenderRootPlan) {
  return [
    ...(plan.header ? [plan.header] : []),
    ...plan.main,
    ...(plan.footer ? [plan.footer] : []),
  ];
}

export function walkRootPlan(plan: RenderRootPlan, visit: (node: RenderPlanNode) => void) {
  for (const wrapper of getRootPlanWrappers(plan)) {
    walkRenderPlanNode(wrapper, visit);
  }
}

export function walkRenderPlanNode(node: RenderPlanNode, visit: (node: RenderPlanNode) => void) {
  visit(node);
  if (node.kind === 'wrapper') {
    for (const child of node.children) {
      walkRenderPlanNode(child, visit);
    }
  }
}

export function getTrackSpacerDescriptors(
  nodeId: string,
  spacerEdgesBefore: RenderTrackSpacerEdge[],
  spacerEdgesAfter: RenderTrackSpacerEdge[],
) {
  return {
    before: spacerEdgesBefore.map((edge) => getTrackSpacerDescriptor(nodeId, edge)),
    after: spacerEdgesAfter.map((edge) => getTrackSpacerDescriptor(nodeId, edge)),
  };
}
