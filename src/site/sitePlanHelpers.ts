import type { SiteRenderPlanNode, SiteRootPlan, SiteTrackSpacerEdge } from './types';
import { getTrackSpacerDescriptor } from './sitePlan';

export function getSiteRootPlanWrappers(plan: SiteRootPlan) {
  return [
    ...(plan.header ? [plan.header] : []),
    ...plan.main,
    ...(plan.footer ? [plan.footer] : []),
  ];
}

export function walkSiteRootPlan(plan: SiteRootPlan, visit: (node: SiteRenderPlanNode) => void) {
  for (const wrapper of getSiteRootPlanWrappers(plan)) {
    walkSiteRenderPlanNode(wrapper, visit);
  }
}

export function walkSiteRenderPlanNode(node: SiteRenderPlanNode, visit: (node: SiteRenderPlanNode) => void) {
  visit(node);
  if (node.kind === 'wrapper') {
    for (const child of node.children) {
      walkSiteRenderPlanNode(child, visit);
    }
  }
}

export function getSiteTrackSpacerDescriptors(
  nodeId: string,
  spacerEdgesBefore: SiteTrackSpacerEdge[],
  spacerEdgesAfter: SiteTrackSpacerEdge[],
) {
  return {
    before: spacerEdgesBefore.map((edge) => getTrackSpacerDescriptor(nodeId, edge)),
    after: spacerEdgesAfter.map((edge) => getTrackSpacerDescriptor(nodeId, edge)),
  };
}
