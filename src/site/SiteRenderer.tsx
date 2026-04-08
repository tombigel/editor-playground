import type { ReactElement } from 'react';
import type { NodeId } from '../model/types';
import { isMediaNode, isTextNode } from '../model/types';
import { getLinkHref } from '../model/links';
import { getNodeTextContent, renderListContent, renderRichContent } from '../render/nodePresentation';
import { buildRenderRootPlan } from '../render/renderPlan';
import { getTrackSpacerDescriptors } from '../render/renderPlanHelpers';
import type { RenderLeafPlanNode, RenderPlanNode, RenderWrapperPlanNode } from '../render/types';
import { collectInteractKeys, SITE_MAIN_CLASS, SITE_ROOT_CLASS } from './siteShared';
import type { DocumentModel, RichContent } from '../model/types';
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

function externalNavProps(linkType: string, openInNewTab?: boolean) {
  if (linkType === 'anchor' || linkType === 'page') return {};
  return openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

function pageCurrentProps(linkType: string, targetPageId?: string, pageAnchorId?: string) {
  return linkType === 'page' && targetPageId && targetPageId === renderPageId && !pageAnchorId
    ? { 'aria-current': 'page' as const }
    : {};
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
  let leaf: ReactElement = <div key={node.id} className={plan.nodeClassName} data-node-id={node.id} />;

  if (isMediaNode(node)) {
    leaf = node.src ? (
      <img
        key={node.id}
        className={plan.imageClassName}
        data-node-id={node.id}
        src={node.src}
        alt={node.alt ?? ''}
      />
    ) : (
      <div key={node.id} className={plan.imagePlaceholderClassName} data-node-id={node.id}>
        {getNodeTextContent(node)}
      </div>
    );
  } else if (isTextNode(node) && node.subtype === 'rich') {
    leaf = (
      <div key={node.id} className={plan.nodeClassName} data-node-id={node.id}>
        {renderRichContent(node.content as RichContent, renderDocument)}
      </div>
    );
  } else if (isTextNode(node) && node.subtype === 'list') {
    leaf = renderListContent(node.content as import('../model/types').ListContent, {
      document: renderDocument,
      className: plan.nodeClassName,
      dataNodeId: node.id,
    }) as ReactElement;
  } else if (isTextNode(node) && node.link) {
    const link = node.link;
    const href = getLinkHref(link, renderDocument);
    leaf = (
      <a
        key={node.id}
        className={plan.nodeClassName}
        data-node-id={node.id}
        href={href}
        {...externalNavProps(link.linkType, link.openInNewTab)}
        {...pageCurrentProps(link.linkType, link.targetPageId, link.pageAnchorId)}
      >
        {getNodeTextContent(node)}
      </a>
    );
  } else if (isTextNode(node) && node.style?.background) {
    // button variant (no link — render as <button>)
    leaf = (
      <button key={node.id} className={plan.nodeClassName} data-node-id={node.id} type="button">
        {getNodeTextContent(node)}
      </button>
    );
  } else if (isTextNode(node)) {
    const Tag = node.htmlTag ?? 'p';
    leaf = (
      <Tag key={node.id} className={plan.nodeClassName} data-node-id={node.id}>
        {getNodeTextContent(node)}
      </Tag>
    );
  }

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
