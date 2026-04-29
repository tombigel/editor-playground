import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { renderPageHtmlDocument, renderSiteBodyHtml, renderSiteExportBundles, renderSiteHtmlDocument } from '../../site/siteExport';
import { buildDocumentInteractConfig, setPresetAnimation } from '../animationApi';
import {
  INTERACT_CDN_VERSION,
  INTERACT_ROOT_KEY,
  MOTION_PRESETS_CDN_VERSION,
} from '../interactIntegration';

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
    expect(bodySection).toContain('Interact.create(interactConfig, { useCustomElement: false })');
    expect(bodySection).toContain(`@wix/interact@${INTERACT_CDN_VERSION}`);
    expect(bodySection).toContain(`@wix/motion-presets@${MOTION_PRESETS_CDN_VERSION}`);
    expect(bodySection).toContain('add(element, element.getAttribute("data-interact-key"))');
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

    const jsonMatch = html.match(/const interactConfig = (\{[\s\S]*?\});/);

    if (!jsonMatch) {
      throw new Error(
        'Could not find a JSON config object assigned to interactConfig in the exported HTML',
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

  it('default mouse animation exports the stable root key and target key', () => {
    const doc = createInitialDocument();
    const textNode = Object.values(doc.nodes).find(
      (n) => n.contentType === 'text',
    );

    if (!textNode) {
      throw new Error('Expected a text leaf node in the initial document');
    }

    const animatedDoc = setPresetAnimation(doc, textNode.id, {
      trigger: 'mouse',
      preset: 'TrackMouse',
    });

    const bodyHtml = renderSiteBodyHtml(animatedDoc);
    const config = buildDocumentInteractConfig(animatedDoc);
    const mouseInteraction = config.interactions.find((i) => i.trigger === 'pointerMove');

    expect(mouseInteraction?.key).toBe(INTERACT_ROOT_KEY);
    expect(bodyHtml).toContain(`class="sp-site" data-interact-key="${INTERACT_ROOT_KEY}"`);
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

  it('page html and multi-page bundles include the same Interact config and script', () => {
    const doc = createInitialDocument();
    const pageId = doc.pages?.[0]?.id;
    const textNode = Object.values(doc.nodes).find(
      (n) => n.contentType === 'text',
    );

    if (!pageId || !textNode) {
      throw new Error('Expected an initial page and text node');
    }

    const animatedDoc = setPresetAnimation(doc, textNode.id, {
      trigger: 'entrance',
      preset: 'FadeIn',
    });

    const pageHtml = renderPageHtmlDocument(animatedDoc, pageId);
    const bundles = renderSiteExportBundles(animatedDoc);
    const htmlPages = bundles.filter((bundle) => bundle.kind !== 'redirect');

    expect(pageHtml).toContain('const interactConfig = ');
    expect(pageHtml).toContain('@wix/interact');
    expect(htmlPages.length).toBeGreaterThan(0);
    for (const bundle of htmlPages) {
      expect(bundle.bodyHtml).toContain(`data-interact-key="${textNode.id}"`);
      expect(bundle.htmlDocument).toContain('const interactConfig = ');
      expect(bundle.htmlDocument).toContain('@wix/interact');
    }
  });
});
