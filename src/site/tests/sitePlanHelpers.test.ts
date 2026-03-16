import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { getSiteTrackSpacerDescriptors, getSiteRootPlanWrappers, walkSiteRootPlan } from '../sitePlanHelpers';
import { buildSiteRootPlan } from '../sitePlan';

describe('site/sitePlanHelpers', () => {
  it('flattens root wrappers in header-main-footer order', () => {
    const plan = buildSiteRootPlan(createInitialDocument(), true);
    const wrappers = getSiteRootPlanWrappers(plan);

    expect(wrappers.map((wrapper) => wrapper.node.role)).toEqual(['header', 'section', 'footer']);
  });

  it('walks the full site render tree once', () => {
    const document = createInitialDocument();
    const plan = buildSiteRootPlan(document, true);
    const visited: string[] = [];

    walkSiteRootPlan(plan, (node) => visited.push(node.node.id));

    const exportableCount = Object.values(document.nodes).filter((node) => node.type !== 'site').length;
    expect(visited).toHaveLength(exportableCount);
    expect(new Set(visited).size).toBe(exportableCount);
  });

  it('builds before/after sticky spacer descriptors for track wrappers', () => {
    const descriptors = getSiteTrackSpacerDescriptors('text_1', ['bottom'], ['top']);

    expect(descriptors.before).toEqual([
      expect.objectContaining({
        edge: 'bottom',
        className: expect.stringContaining('text_1-bottom-spacer'),
      }),
    ]);
    expect(descriptors.after).toEqual([
      expect.objectContaining({
        edge: 'top',
        className: expect.stringContaining('text_1-top-spacer'),
      }),
    ]);
  });
});
