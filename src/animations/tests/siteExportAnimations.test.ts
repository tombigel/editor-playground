import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { renderSiteBodyHtml, renderSiteHtmlDocument } from '../../site/siteExport';
import { buildDocumentInteractConfig, setPresetAnimation } from '../animationApi';

describe('site export — animations', () => {
  it('no animations → no script tags', () => {
    const doc = createInitialDocument();
    const html = renderSiteHtmlDocument(doc);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).not.toContain('@wix/interact');
    expect(html).not.toContain('<script');
  });

  it('one animated node → interact scripts injected', () => {
    const doc = createInitialDocument();
    const textNode = Object.values(doc.nodes).find(
      (n) => n.contentType === 'text',
    );

    if (!textNode) {
      throw new Error('Expected a text leaf node in the initial document');
    }

    const animatedDoc = setPresetAnimation(doc, textNode.id, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    const html = renderSiteHtmlDocument(animatedDoc);

    // Body should contain an inline module script that loads @wix/interact/web and motion-presets
    const bodySection = html.slice(html.indexOf('<body>'), html.indexOf('</body>') + 7);
    expect(bodySection).toContain('<script type="module">');
    expect(bodySection).toContain('@wix/interact');
    expect(bodySection).toContain('motion-presets');
    expect(bodySection).toContain('registerEffects');
    expect(bodySection).toContain('create(');
  });

  it('config round-trip — inline body script matches buildDocumentInteractConfig', () => {
    const doc = createInitialDocument();
    const textNode = Object.values(doc.nodes).find(
      (n) => n.contentType === 'text',
    );

    if (!textNode) {
      throw new Error('Expected a text leaf node in the initial document');
    }

    const animatedDoc = setPresetAnimation(doc, textNode.id, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    const html = renderSiteHtmlDocument(animatedDoc);
    const expectedConfig = buildDocumentInteractConfig(animatedDoc);

    // Extract the JSON config embedded in the inline init script.
    // The implementation is expected to embed it as a JSON literal passed to create().
    const jsonMatch = html.match(/create\((\{[\s\S]*?\})\s*\)/);

    if (!jsonMatch) {
      throw new Error(
        'Could not find a JSON config object passed to create() in the exported HTML',
      );
    }

    const parsedConfig = JSON.parse(jsonMatch[1]);
    expect(parsedConfig).toEqual(expectedConfig);
  });

  it('data-interact-key on animated node', () => {
    const doc = createInitialDocument();
    const textNode = Object.values(doc.nodes).find(
      (n) => n.contentType === 'text',
    );

    if (!textNode) {
      throw new Error('Expected a text leaf node in the initial document');
    }

    const animatedDoc = setPresetAnimation(doc, textNode.id, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    const bodyHtml = renderSiteBodyHtml(animatedDoc);

    expect(bodyHtml).toContain(`data-interact-key="${textNode.id}"`);
  });

  it('source triggerId → both trigger node and target node have data-interact-key', () => {
    const doc = createInitialDocument();
    const nonSiteNodes = Object.values(doc.nodes).filter((n) => n.contentType !== 'site');

    const targetNode = nonSiteNodes.find((n) => n.contentType === 'text');
    const triggerNode = nonSiteNodes.find(
      (n) => n.contentType === 'media',
    ) ?? nonSiteNodes.find((n) => n !== targetNode);

    if (!targetNode || !triggerNode) {
      throw new Error(
        'Expected at least two non-site nodes (one text leaf and one other node) in the initial document',
      );
    }

    const animatedDoc = setPresetAnimation(doc, targetNode.id, {
      trigger: 'mouse',
      preset: 'TrackMouse',
      source: triggerNode.id,
    });

    const bodyHtml = renderSiteBodyHtml(animatedDoc);

    expect(bodyHtml).toContain(`data-interact-key="${targetNode.id}"`);
    expect(bodyHtml).toContain(`data-interact-key="${triggerNode.id}"`);
  });

  it('includeAnimations: false suppresses interact script injection and data-interact-key attributes', () => {
    const doc = createInitialDocument();
    const textNode = Object.values(doc.nodes).find(
      (n) => n.contentType === 'text',
    );

    if (!textNode) {
      throw new Error('Expected a text leaf node in the initial document');
    }

    const animatedDoc = setPresetAnimation(doc, textNode.id, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    const html = renderSiteHtmlDocument(animatedDoc, { includeAnimations: false });

    expect(html).not.toContain('@wix/interact');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('data-interact-key');

    const bodyHtml = renderSiteBodyHtml(animatedDoc, { includeAnimations: false });

    expect(bodyHtml).not.toContain('data-interact-key');
  });
});
