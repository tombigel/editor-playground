import { getNodeTextContent } from '../render/nodePresentation';
import { SITE_MAIN_CLASS, SITE_ROOT_CLASS } from './siteShared';
import {
  buildSiteRootPlan,
  getTrackSpacerDescriptor,
  type SiteLeafPlan,
  type SiteRenderPlanNode,
  type SiteWrapperPlan,
} from './sitePlan';
import type { SiteRendererProps } from './types';

export type { SiteRendererProps } from './types';

export function SiteRenderer({ document, previewSticky = true }: SiteRendererProps) {
  const plan = buildSiteRootPlan(document, previewSticky);

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

function renderPlanNode(plan: SiteRenderPlanNode): JSX.Element {
  return plan.kind === 'wrapper' ? renderWrapperPlan(plan) : renderLeafPlan(plan);
}

function renderWrapperPlan(plan: SiteWrapperPlan): JSX.Element {
  const Tag = plan.tag;
  const wrapperChildren = plan.children.map((child) => renderPlanNode(child));
  const wrapper = (
    <Tag key={plan.node.id} className={plan.nodeClassName} data-node-id={plan.node.id} data-top-level={plan.isTopLevel ? 'true' : 'false'}>
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
        {plan.spacerEdgesBefore.map((edge) => (
          <div key={`${plan.node.id}-${edge}-before`} className={getTrackSpacerDescriptor(plan.node.id, edge).className} aria-hidden="true" />
        ))}
        {wrapper}
        {plan.spacerEdgesAfter.map((edge) => (
          <div key={`${plan.node.id}-${edge}-after`} className={getTrackSpacerDescriptor(plan.node.id, edge).className} aria-hidden="true" />
        ))}
      </div>
    );
  }

  return wrapper;
}

function renderLeafPlan(plan: SiteLeafPlan) {
  let leaf: JSX.Element;
  if (plan.node.role === 'text') {
    const Tag = plan.node.htmlTag;
    leaf = (
      <Tag key={plan.node.id} className={plan.nodeClassName} data-node-id={plan.node.id}>
        {getNodeTextContent(plan.node)}
      </Tag>
    );
  } else if (plan.node.role === 'image') {
    leaf = plan.node.src ? (
      <img
        key={plan.node.id}
        className={plan.imageClassName}
        data-node-id={plan.node.id}
        src={plan.node.src}
        alt={plan.node.alt ?? ''}
      />
    ) : (
      <div key={plan.node.id} className={plan.imagePlaceholderClassName} data-node-id={plan.node.id}>
        {getNodeTextContent(plan.node)}
      </div>
    );
  } else if (plan.node.role === 'link') {
    leaf = (
      <a key={plan.node.id} className={plan.nodeClassName} data-node-id={plan.node.id} href={plan.node.href}>
        {getNodeTextContent(plan.node)}
      </a>
    );
  } else {
    leaf = (
      <button key={plan.node.id} className={plan.nodeClassName} data-node-id={plan.node.id} type="button">
        {getNodeTextContent(plan.node)}
      </button>
    );
  }

  if (plan.selfStickyTrack) {
    return (
      <div key={`${plan.node.id}-track`} className={plan.trackClassName} data-node-track-for={plan.node.id}>
        {plan.spacerEdgesBefore.map((edge) => (
          <div key={`${plan.node.id}-${edge}-before`} className={getTrackSpacerDescriptor(plan.node.id, edge).className} aria-hidden="true" />
        ))}
        {leaf}
        {plan.spacerEdgesAfter.map((edge) => (
          <div key={`${plan.node.id}-${edge}-after`} className={getTrackSpacerDescriptor(plan.node.id, edge).className} aria-hidden="true" />
        ))}
      </div>
    );
  }

  return leaf;
}
