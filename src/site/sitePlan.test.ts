import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../model/defaults';
import { parseUnitValue } from '../model/units';
import { buildSiteRootPlan, getTrackSpacerDescriptor } from './sitePlan';

describe('site/sitePlan', () => {
  it('builds a root plan with header, main sections, and footer', () => {
    const plan = buildSiteRootPlan(createInitialDocument(), true);

    expect(plan.header?.kind).toBe('wrapper');
    expect(plan.header?.isTopLevel).toBe(true);
    expect(plan.main).toHaveLength(1);
    expect(plan.main[0]?.isTopLevel).toBe(true);
    expect(plan.footer?.kind).toBe('wrapper');
  });

  it('propagates measured geometry into wrapper mesh placement', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const plan = buildSiteRootPlan(document, true, {
      [section.id]: { width: 1200, height: 700 },
    });
    const mainSection = plan.main[0];

    expect(mainSection.meshLayout.columnTemplate).not.toBe('1fr');
    expect(mainSection.meshLayout.rowTemplate).not.toBe('1fr');
    const title = mainSection.children.find((child) => child.kind === 'leaf' && child.node.name === 'Post Title');
    expect(title?.meshPlacement).toMatchObject({
      gridColumn: expect.any(String),
      gridRow: expect.any(String),
    });
  });

  it('marks sticky wrappers and leaves with track/spacer metadata', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    const link = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link');
    if (!section || section.type !== 'wrapper' || !link || link.type !== 'leaf') {
      throw new Error('Expected section and link nodes');
    }

    section.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true },
      durationMode: 'custom',
      duration: parseUnitValue('40vh'),
      durationTop: parseUnitValue('40vh'),
      durationBottom: parseUnitValue('40vh'),
      offsetTop: parseUnitValue('12px'),
    };
    link.sticky = {
      enabled: true,
      target: 'self',
      edges: { bottom: true },
      durationMode: 'custom',
      duration: parseUnitValue('25vh'),
      durationTop: parseUnitValue('25vh'),
      durationBottom: parseUnitValue('25vh'),
      offsetBottom: parseUnitValue('10px'),
    };

    const plan = buildSiteRootPlan(document, true);
    const mainSection = plan.main[0];
    const linkPlan = mainSection.children.find((child) => child.kind === 'leaf' && child.node.id === link.id);

    expect(mainSection.contentSticky).toBe(true);
    expect(mainSection.contentSpacerClassName).toContain(`${section.id}`);
    expect(linkPlan?.kind).toBe('leaf');
    expect(linkPlan?.selfSticky).toBe(true);
    expect(linkPlan?.spacerEdgesBefore).toEqual(['bottom']);
    expect(getTrackSpacerDescriptor(link.id, 'bottom')).toMatchObject({
      edge: 'bottom',
      className: expect.stringContaining(`${link.id}-bottom-spacer`),
    });
  });

  it('adds brand mark image classes when the planned leaf is a brand mark', () => {
    const document = structuredClone(createInitialDocument());
    const image = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    if (!image || image.type !== 'leaf' || image.role !== 'image') {
      throw new Error('Expected image leaf');
    }

    image.name = 'Brand Mark';

    const plan = buildSiteRootPlan(document, true);
    const imagePlan = plan.main[0]?.children.find(
      (child): child is Extract<typeof child, { kind: 'leaf' }> => child.kind === 'leaf' && child.node.id === image.id,
    );

    expect(imagePlan).toBeDefined();
    expect(imagePlan?.isBrandMark).toBe(true);
    expect(imagePlan?.nodeClassName).toContain('is-brand-mark');
    expect(imagePlan?.imageClassName).toContain('sp-image');
  });
});
