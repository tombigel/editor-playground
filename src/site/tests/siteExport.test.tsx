import { describe, expect, it } from 'vitest';
import { createInitialDocument, createSectionFromTemplate } from '../../model/defaults';
import { parseFontSizeValue, parseHeightValue, parseUnitValue } from '../../model/units';
import { renderSiteCss, renderSiteExportBundle, renderSiteHtmlDocument } from '../siteExport';

describe('site/siteExport', () => {
  it('renders a complete html document that links to the exported stylesheet', () => {
    const document = createInitialDocument();
    const html = renderSiteHtmlDocument(document, { title: 'Landing Page', htmlFileName: 'landing-page' });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>Landing Page</title>');
    expect(html).toContain('<link rel="stylesheet" href="landing-page.css" />');
    expect(html).toContain('class="sp-site"');
    expect(html).toContain('<main class="sp-site-main">');
  });

  it('generates text styling in css instead of inline styles', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style ??= {};
    target.style.fontSize = parseFontSizeValue('31px');
    target.style.fontWeight = 'bold';
    target.style.lineHeight = 1.4;
    target.style.textDecorationLine = 'underline';

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${target.id}.sp-role-text`);
    expect(css).toContain('font-size: 31px;');
    expect(css).toContain('font-weight: bold;');
    expect(css).toContain('line-height: 1.4;');
    expect(css).toContain('text-decoration-line: underline;');
  });

  it('emits renderer text defaults when the model does not override them', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style = {};

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${target.id}.sp-role-text`);
    expect(css).toContain('color: #16202a;');
    expect(css).toContain('font-size: 18px;');
    expect(css).toContain('font-weight: 500;');
    expect(css).toContain('letter-spacing: -0.02em;');
    expect(css).toContain('line-height: 1.24;');
    expect(css).toContain('direction: ltr;');
    expect(css).toContain('text-align: left;');
  });

  it('normalizes native text and button element defaults in exported css', () => {
    const css = renderSiteCss(createInitialDocument());

    expect(css).toContain('.sp-leaf.sp-role-text {');
    expect(css).toContain('font: inherit;');
    expect(css).toContain('quotes: none;');
    expect(css).toContain('.sp-leaf.sp-role-link {');
    expect(css).toContain('text-decoration: underline;');
    expect(css).toContain('text-underline-offset: 3px;');
    expect(css).toContain('button.sp-leaf.sp-role-button {');
    expect(css).toContain('appearance: none;');
    expect(css).toContain('background: #05070a;');
    expect(css).toContain('border-radius: 999px;');
    expect(css).toContain('padding: 13px 24px;');
    expect(css).toContain('box-shadow: 0 10px 18px rgba(5, 7, 10, 0.16);');
  });

  it('uses the shared stage mesh grid for wrapper content and child placement', () => {
    const document = createInitialDocument();
    const css = renderSiteCss(document);
    const heroSection = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );
    const postTitle = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!heroSection || heroSection.type !== 'wrapper' || !postTitle || postTitle.type !== 'leaf') {
      throw new Error('Expected hero section and post title nodes');
    }

    expect(css).toContain(`.sp-node-${heroSection.id}-content {`);
    expect(css).toContain('display: grid;');
    expect(css).toContain('grid-template-columns:');
    expect(css).toContain('grid-template-rows:');
    expect(css).toContain(`.sp-node-${postTitle.id}.sp-role-text`);
    expect(css).toContain('grid-column:');
    expect(css).toContain('grid-row:');
  });

  it('serializes authored section height into exported wrapper content css', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.rect.height.base = parseHeightValue('720px');

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${section.id}-content {`);
    expect(css).toContain('min-height: 720px;');
  });

  it('serializes section bottom divider styles without adding implicit wrapper borders', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    section.style.borderColor = undefined;
    section.style.borderWidth = undefined;
    section.style.sectionBorderBottomColor = '#cbd5e1';
    section.style.sectionBorderBottomWidth = parseUnitValue('2px');

    const css = renderSiteCss(document);
    const sectionRule = css.match(new RegExp(`\\.sp-node-${section.id}[^}]+\\}`, 'm'))?.[0] ?? '';

    expect(sectionRule).toContain(`.sp-node-${section.id}`);
    expect(sectionRule).toContain('border-bottom-color: #cbd5e1;');
    expect(sectionRule).toContain('border-bottom-width: 2px;');
    expect(sectionRule).not.toContain('border-width: 1px;');
  });

  it('does not add an export-only wrapper min-height floor above authored short sticky containers', () => {
    const document = structuredClone(createInitialDocument());
    const stickySteps = createSectionFromTemplate('stickySteps', document.rootId);
    document.nodes = {
      ...document.nodes,
      ...stickySteps.nodes,
    };
    document.nodes[document.rootId].children.push(stickySteps.wrapper.id);
    const topCard = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'container' && node.name === 'Top Edge Card Container',
    );
    const bottomCard = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'container' && node.name === 'Bottom Edge Card Container',
    );

    if (!topCard || topCard.type !== 'wrapper' || !bottomCard || bottomCard.type !== 'wrapper') {
      throw new Error('Expected sticky edge lab card containers');
    }

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${topCard.id}-content {`);
    expect(css).toContain('min-height: 151px;');
    expect(css).toContain(`.sp-node-${bottomCard.id}-content {`);
    expect(css).toContain('min-height: 146px;');
    expect(css).not.toContain('.sp-wrapper.sp-role-section, .sp-wrapper.sp-role-container');
    expect(css).not.toContain('min-height: 180px;');
  });

  it('emits framed image styling and brand mark overrides', () => {
    const document = createInitialDocument();
    const css = renderSiteCss(document);

    expect(css).toContain('img.sp-leaf.sp-role-image.sp-image {');
    expect(css).toContain('object-fit: cover;');
    expect(css).toContain('border-radius: 16px;');
    expect(css).toContain('background: #f4f6fa;');
    expect(css).toContain('.sp-leaf.sp-role-image.is-brand-mark.sp-image {');
    expect(css).toContain('object-fit: contain;');
    expect(css).toContain('box-shadow: none;');
  });

  it('emits sticky spacer rules for self sticky exports', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf') {
      throw new Error('Expected text leaf');
    }

    target.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true },
      durationMode: 'custom',
      duration: parseUnitValue('45vh'),
      durationTop: parseUnitValue('45vh'),
      durationBottom: parseUnitValue('45vh'),
      offsetTop: parseUnitValue('8vh'),
    };

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${target.id}-track`);
    expect(css).toContain(`.sp-node-${target.id}-top-spacer`);
    expect(css).toContain('height: 45vh;');
    expect(css).toContain('top: 8vh;');
  });

  it('keeps auto self-sticky leaves sticky on the node instead of a synthetic track wrapper', () => {
    const document = structuredClone(createInitialDocument());
    const stickyPinnedCards = createSectionFromTemplate('stickyPinnedCards', document.rootId);
    document.nodes = {
      ...document.nodes,
      ...stickyPinnedCards.nodes,
    };
    document.nodes[document.rootId].children.push(stickyPinnedCards.wrapper.id);

    const pinnedLead = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Pinned Lead',
    );

    if (!pinnedLead || pinnedLead.type !== 'leaf' || pinnedLead.role !== 'text') {
      throw new Error('Expected pinned lead text node');
    }

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${pinnedLead.id}.sp-role-text.sp-leaf`);
    expect(css).toContain('position: sticky;');
    expect(css).toContain('top: 12vh;');
    expect(css).not.toContain(`.sp-node-${pinnedLead.id}-track`);
  });

  it('returns html, css, document output, and bundle file names together', () => {
    const bundle = renderSiteExportBundle(createInitialDocument(), {
      htmlFileName: 'landing-page',
    });

    expect(bundle.htmlFileName).toBe('landing-page.html');
    expect(bundle.cssFileName).toBe('landing-page.css');
    expect(bundle.bodyHtml).toContain('class="sp-site"');
    expect(bundle.css).toContain('.sp-site {');
    expect(bundle.htmlDocument).toContain('<!doctype html>');
    expect(bundle.htmlDocument).toContain('href="landing-page.css"');
  });
});
