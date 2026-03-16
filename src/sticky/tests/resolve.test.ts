import { describe, expect, it } from 'vitest';
import { createDefaultRect, createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import { getMainWrappers } from '../../model/selectors';
import { parseUnitValue } from '../../model/units';
import type { TextLeaf, WrapperNode } from '../../model/types';
import { resolveStickyLayout, resolveWrapperStickyState } from '../resolve';

function createBaseDocument() {
  const document = createInitialDocument();
  const section = getMainWrappers(document)[0];
  section.rect = createDefaultRect('0px', '0px', '1000px', '1000px');
  section.children = [];
  return { document, section };
}

function addStickyLeaf(section: WrapperNode, document: ReturnType<typeof createBaseDocument>['document']) {
  const leaf = createLeaf('text', section.id) as TextLeaf;
  leaf.rect = createDefaultRect('20px', '100px', '200px', '100px');
  document.nodes[leaf.id] = leaf;
  section.children.push(leaf.id);
  return leaf;
}

describe('sticky/resolve', () => {
  it('registers self-sticky leaves with expected custom duration math', () => {
    const { document, section } = createBaseDocument();
    const leaf = addStickyLeaf(section, document);
    leaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('200px'),
      durationTop: parseUnitValue('200px'),
      offsetTop: parseUnitValue('10px'),
    };

    const result = resolveStickyLayout(document);
    const registration = result[section.id]?.registrations[0];
    expect(registration).toBeTruthy();
    expect(registration?.parentWrapperId).toBe(section.id);
    expect(registration?.startPx).toBe(200);
    expect(registration?.durationPx).toBe(200);
    expect(registration?.endPx).toBe(400);
    expect(registration?.extentPx).toBe(0);
  });

  it('uses owner wrapper height for auto duration without adding extra extent', () => {
    const { document, section } = createBaseDocument();
    const leaf = addStickyLeaf(section, document);
    leaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'auto',
      duration: parseUnitValue('1px'),
      durationTop: parseUnitValue('1px'),
      offsetTop: parseUnitValue('0px'),
    };

    const result = resolveStickyLayout(document);
    const registration = result[section.id]?.registrations[0];
    expect(registration?.durationPx).toBe(1000);
    expect(registration?.extentPx).toBe(0);
  });

  it('sums top and bottom durations for both-edge custom sticky', () => {
    const { document, section } = createBaseDocument();
    const leaf = addStickyLeaf(section, document);
    leaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: true },
      durationMode: 'custom',
      duration: parseUnitValue('150px'),
      durationTop: parseUnitValue('100px'),
      durationBottom: parseUnitValue('50px'),
      offsetTop: parseUnitValue('0px'),
      offsetBottom: parseUnitValue('0px'),
    };

    const result = resolveStickyLayout(document);
    const registration = result[section.id]?.registrations[0];
    expect(registration?.topDurationPx).toBe(100);
    expect(registration?.bottomDurationPx).toBe(50);
    expect(registration?.durationPx).toBe(150);
  });

  it('computes content-wrapper sticky extent and stores it as wrapper extra extent', () => {
    const { document, section } = createBaseDocument();
    section.rect = createDefaultRect('0px', '0px', '1000px', '300px');
    section.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('600px'),
      durationTop: parseUnitValue('600px'),
      offsetTop: parseUnitValue('0px'),
    };

    const result = resolveStickyLayout(document);
    const registration = result[section.id]?.registrations[0];
    expect(registration?.target).toBe('contentWrapper');
    expect(registration?.startPx).toBe(300);
    expect(registration?.durationPx).toBe(600);
    expect(registration?.extentPx).toBe(600);
    expect(result[section.id]?.totalExtraExtentPx).toBe(600);
  });

  it('uses measured geometry when resolving wrapper-local sticky layout', () => {
    const { section } = createBaseDocument();
    section.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('50%'),
      durationTop: parseUnitValue('50%'),
      offsetTop: parseUnitValue('0px'),
    };

    const result = resolveWrapperStickyState(section, [], {
      nodeSizes: {
        [section.id]: { width: 1000, height: 320 },
      },
    });

    expect(result.registrations[0]?.durationPx).toBe(160);
    expect(result.totalExtraExtentPx).toBe(160);
  });

  it('uses layout-level measured geometry when resolving percent-based durations', () => {
    const { document, section } = createBaseDocument();
    const leaf = addStickyLeaf(section, document);
    leaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('50%'),
      durationTop: parseUnitValue('50%'),
      offsetTop: parseUnitValue('0px'),
    };

    const result = resolveStickyLayout(document, {
      nodeSizes: {
        [section.id]: { width: 1000, height: 640 },
      },
    });

    expect(result[section.id]?.registrations[0]?.durationPx).toBe(320);
  });

  it('computes nested content-wrapper sticky extent from measured container geometry', () => {
    const { document, section } = createBaseDocument();
    const container = createWrapper('container', section.id);
    container.rect = createDefaultRect('20px', '120px', '600px', '400px');
    container.sticky = {
      enabled: true,
      target: 'contentWrapper',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('25%'),
      durationTop: parseUnitValue('25%'),
      offsetTop: parseUnitValue('0px'),
    };
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const result = resolveStickyLayout(document, {
      nodeSizes: {
        [container.id]: { width: 600, height: 400 },
      },
    });

    expect(result[container.id]?.registrations[0]).toMatchObject({
      ownerId: container.id,
      target: 'contentWrapper',
      startPx: 400,
      durationPx: 100,
      extentPx: 100,
    });
    expect(result[container.id]?.totalExtraExtentPx).toBe(100);
  });

  it('resolves viewport duration units against the provided viewport height', () => {
    const { document, section } = createBaseDocument();
    const leaf = addStickyLeaf(section, document);
    leaf.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('25vh'),
      durationTop: parseUnitValue('25vh'),
      offsetTop: parseUnitValue('0px'),
    };

    const result = resolveStickyLayout(document, {
      viewportHeight: 1000,
    });

    expect(result[section.id]?.registrations[0]?.durationPx).toBe(250);
  });

  it('derives aspect-ratio leaf height when computing sticky start positions', () => {
    const { document, section } = createBaseDocument();
    const image = createLeaf('image', section.id);
    image.rect = createDefaultRect('20px', '50px', '400px', 'aspect-ratio(4/3)');
    image.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('100px'),
      durationTop: parseUnitValue('100px'),
      offsetTop: parseUnitValue('0px'),
    };
    document.nodes[image.id] = image;
    section.children.push(image.id);

    const result = resolveStickyLayout(document);

    expect(result[section.id]?.registrations[0]).toMatchObject({
      ownerId: image.id,
      startPx: 350,
      durationPx: 100,
      endPx: 450,
    });
  });

  it('ignores disabled sticky nodes', () => {
    const { document, section } = createBaseDocument();
    const leaf = addStickyLeaf(section, document);
    leaf.sticky = {
      enabled: false,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: parseUnitValue('200px'),
      durationTop: parseUnitValue('200px'),
      offsetTop: parseUnitValue('0px'),
    };

    const result = resolveStickyLayout(document);
    expect(result[section.id]?.registrations).toEqual([]);
  });
});
