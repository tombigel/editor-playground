import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createSectionFromTemplate } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import { buildRenderRootPlan } from '../../render/renderPlan';
import type { RenderLeafPlanNode, RenderWrapperPlanNode } from '../../render/types';
import { SiteRenderer } from '../SiteRenderer';
import { renderSiteCss } from '../siteExport';

describe('site parity against shared render plan', () => {
  it('keeps sticky edge lab self-sticky track structure aligned with the shared render plan', () => {
    const document = structuredClone(createInitialDocument());
    const stickySteps = createSectionFromTemplate('stickySteps', document.rootId);
    document.nodes = {
      ...document.nodes,
      ...stickySteps.nodes,
    };
    document.nodes[document.rootId].children.push(stickySteps.wrapper.id);

    const plan = buildRenderRootPlan(document, true);
    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);
    const css = renderSiteCss(document);
    const nodes = flattenPlans(plan);

    const trackedNodes = nodes.filter((node) => node.selfStickyTrack);
    expect(trackedNodes.length).toBeGreaterThanOrEqual(3);

    for (const tracked of trackedNodes) {
      expect(markup).toContain(`data-node-track-for="${tracked.node.id}"`);
      expect(markup).toContain(tracked.trackClassName);
      for (const edge of tracked.spacerEdgesBefore) {
        expect(markup).toContain(`sp-node-${tracked.node.id}-${edge}-spacer`);
        expect(css).toContain(`.sp-node-${tracked.node.id}-${edge}-spacer`);
      }
      for (const edge of tracked.spacerEdgesAfter) {
        expect(markup).toContain(`sp-node-${tracked.node.id}-${edge}-spacer`);
        expect(css).toContain(`.sp-node-${tracked.node.id}-${edge}-spacer`);
      }
    }
  });

  it('keeps auto self-sticky leaves unwrapped when the shared render plan says no synthetic track', () => {
    const document = structuredClone(createInitialDocument());
    const stickyPinnedCards = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    document.nodes = {
      ...document.nodes,
      ...stickyPinnedCards.nodes,
    };
    document.nodes[document.rootId].children.push(stickyPinnedCards.wrapper.id);

    const plan = buildRenderRootPlan(document, true);
    const pinnedLead = flattenPlans(plan).find(
      (node): node is RenderLeafPlanNode => node.kind === 'leaf' && node.node.name === 'Pinned Lead',
    );

    if (!pinnedLead) {
      throw new Error('Expected pinned lead leaf plan');
    }

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);
    const css = renderSiteCss(document);

    expect(pinnedLead.selfSticky).toBe(true);
    expect(pinnedLead.selfStickyTrack).toBe(false);
    expect(markup).toContain(`data-node-id="${pinnedLead.node.id}"`);
    expect(markup).not.toContain(`data-node-track-for="${pinnedLead.node.id}"`);
    expect(css).toContain(`.sp-node-${pinnedLead.node.id}.sp-role-text.sp-leaf`);
    expect(css).toContain('position: sticky;');
  });

  it('keeps content-wrapper sticky structure aligned between plan, markup, and css', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    section.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('60vh'),
      durationTop: parseUnitValue('60vh'),
      durationBottom: parseUnitValue('60vh'),
      offsetTop: parseUnitValue('12vh'),
    };

    const plan = buildRenderRootPlan(document, true);
    const sectionPlan = flattenPlans(plan).find(
      (node): node is RenderWrapperPlanNode => node.kind === 'wrapper' && node.node.id === section.id,
    );

    if (!sectionPlan) {
      throw new Error('Expected section plan');
    }

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);
    const css = renderSiteCss(document);
    const contentClass = `sp-node-${section.id}-content`;
    const contentSpacerClass = `sp-node-${section.id}-content-spacer`;

    expect(sectionPlan.contentSticky).toBe(true);
    expect(markup).toContain(sectionPlan.contentClassName);
    expect(markup).toContain(sectionPlan.contentSpacerClassName);
    expect(css).toContain(`.${contentClass} {`);
    expect(css).toContain(`.${contentSpacerClass} {`);
    expect(css).toContain('position: sticky;');
  });
});

function flattenPlans(plan: ReturnType<typeof buildRenderRootPlan>) {
  const nodes: Array<RenderWrapperPlanNode | RenderLeafPlanNode> = [];

  const visit = (node: RenderWrapperPlanNode | RenderLeafPlanNode) => {
    nodes.push(node);
    if (node.kind === 'wrapper') {
      for (const child of node.children) {
        visit(child);
      }
    }
  };

  if (plan.header) {
    visit(plan.header);
  }
  for (const wrapper of plan.main) {
    visit(wrapper);
  }
  if (plan.footer) {
    visit(plan.footer);
  }

  return nodes;
}
