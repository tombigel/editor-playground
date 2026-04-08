import { cloneElement, type ReactElement } from 'react';
import type { NodeId } from '../model/types';
import { renderLeafContent } from '../render/nodePresentation';
import { buildRenderRootPlan } from '../render/renderPlan';
import { getTrackSpacerDescriptors } from '../render/renderPlanHelpers';
import type { RenderLeafPlanNode, RenderPlanNode, RenderWrapperPlanNode } from '../render/types';
import { collectInteractKeys, SITE_MAIN_CLASS, SITE_ROOT_CLASS } from './siteShared';
import type { DocumentModel } from '../model/types';
import type { SiteRendererProps } from './types';

export type { SiteRendererProps } from './types';

// Module-level variables populated per render pass — avoids threading through every function
let activeInteractKeys: Set<NodeId> = new Set();
let renderDocument: DocumentModel | undefined;
let renderPageId: NodeId | undefined;

/** Wraps a rendered element in <interact-element> if the node has animations. */
function wrapInteract(nodeId: NodeId, element: ReactElement): ReactElement {
  if (activeInteractKeys.has(nodeId)) {
    return (
      <interact-element key={`interact-${nodeId}`} data-interact-key={nodeId}>
        {element}
      </interact-element>
    );
  }
  return element;
}

export function SiteRenderer({ document, previewSticky = true, includeAnimations = true, pageId }: SiteRendererProps) {
  const plan = buildRenderRootPlan(document, previewSticky, {}, undefined, pageId);
  activeInteractKeys = includeAnimations ? collectInteractKeys(document) : new Set();
  renderDocument = document;
  renderPageId = pageId;

  return (
    <div className={SITE_ROOT_CLASS}>
      {plan.header ? renderWrapperPlan(plan.header) : null}
      <main className={SITE_MAIN_CLASS}>
        {plan.main.map((wrapper) => renderWrapperPlan(wrapper))}
      </main>
      {plan.footer ? renderWrapperPlan(plan.footer) : null}
    </div>
  );
}

function renderPlanNode(plan: RenderPlanNode): ReactElement {
  return plan.kind === 'wrapper' ? renderWrapperPlan(plan) : renderLeafPlan(plan);
}

function renderWrapperPlan(plan: RenderWrapperPlanNode): ReactElement {
  const Tag = plan.tag;
  const wrapperChildren = plan.children.map((child) => renderPlanNode(child));
  const trackSpacers = getTrackSpacerDescriptors(plan.node.id, plan.spacerEdgesBefore, plan.spacerEdgesAfter);
  const wrapper = (
    <Tag
      key={plan.node.id}
      className={plan.nodeClassName}
      data-node-id={plan.node.id}
      data-top-level={plan.isTopLevel ? 'true' : 'false'}
      {...(
        plan.node.subtype === 'header' || plan.node.subtype === 'section' || plan.node.subtype === 'footer'
          ? { id: plan.node.id }
          : {}
      )}
    >
      {plan.contentSticky ? (
        <>
          <div className={plan.contentClassName}>
            {wrapperChildren}
          </div>
          <div className={plan.contentSpacerClassName} aria-hidden="true" />
        </>
      ) : (
        <div className={plan.contentClassName}>
          {wrapperChildren}
        </div>
      )}
    </Tag>
  );

  if (plan.selfStickyTrack) {
    return (
      <div key={`${plan.node.id}-track`} className={plan.trackClassName} data-node-track-for={plan.node.id}>
        {trackSpacers.before.map((descriptor) => (
          <div key={`${plan.node.id}-${descriptor.edge}-before`} className={descriptor.className} aria-hidden="true" />
        ))}
        {wrapInteract(plan.node.id, wrapper)}
        {trackSpacers.after.map((descriptor) => (
          <div key={`${plan.node.id}-${descriptor.edge}-after`} className={descriptor.className} aria-hidden="true" />
        ))}
      </div>
    );
  }

  return wrapInteract(plan.node.id, wrapper);
}

function renderLeafPlan(plan: RenderLeafPlanNode) {
  const trackSpacers = getTrackSpacerDescriptors(plan.node.id, plan.spacerEdgesBefore, plan.spacerEdgesAfter);
  const node = plan.node;
  const leafElement = renderLeafContent(node, {
    document: renderDocument,
    leafClassName: plan.nodeClassName,
    dataNodeId: node.id,
    currentPageId: renderPageId,
    imageClassName: plan.imageClassName,
    imagePlaceholderClassName: plan.imagePlaceholderClassName,
  }) as ReactElement;
  const leaf = leafElement.key == null ? cloneElement(leafElement, { key: node.id }) : leafElement;

  if (plan.selfStickyTrack) {
    return (
      <div key={`${plan.node.id}-track`} className={plan.trackClassName} data-node-track-for={plan.node.id}>
        {trackSpacers.before.map((descriptor) => (
          <div key={`${plan.node.id}-${descriptor.edge}-before`} className={descriptor.className} aria-hidden="true" />
        ))}
        {wrapInteract(plan.node.id, leaf)}
        {trackSpacers.after.map((descriptor) => (
          <div key={`${plan.node.id}-${descriptor.edge}-after`} className={descriptor.className} aria-hidden="true" />
        ))}
      </div>
    );
  }

  return wrapInteract(plan.node.id, leaf);
}
