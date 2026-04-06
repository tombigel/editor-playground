import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { buildRenderRootPlan } from '../renderPlan';
import { getRootPlanWrappers, getTrackSpacerDescriptors, walkRootPlan } from '../renderPlanHelpers';

describe('render/renderPlanHelpers', () => {
  it('flattens root wrappers in header-main-footer order', () => {
    const plan = buildRenderRootPlan(createInitialDocument(), true);
    const wrappers = getRootPlanWrappers(plan);

    expect(wrappers.map((wrapper) => wrapper.node.subtype)).toEqual(['header', 'section', 'footer']);
  });

  it('walks the full site render tree once', () => {
    const document = createInitialDocument();
    const plan = buildRenderRootPlan(document, true);
    const visited: string[] = [];

    walkRootPlan(plan, (node) => visited.push(node.node.id));

    const exportableCount = Object.values(document.nodes).filter((node) => node.contentType !== 'site').length;
    expect(visited).toHaveLength(exportableCount);
    expect(new Set(visited).size).toBe(exportableCount);
  });

  it('builds before/after sticky spacer descriptors for track wrappers', () => {
    const descriptors = getTrackSpacerDescriptors('text_1', ['bottom'], ['top']);

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
