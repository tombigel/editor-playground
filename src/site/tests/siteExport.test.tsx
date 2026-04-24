import { describe, expect, it } from 'vitest';
import { createInitialDocument, createButtonTextNode, createSectionFromTemplate, createContainerNode, createTextNode } from '../../model/defaults';
import { createTextDocumentFromCode, createTextDocumentFromText } from '../../model/richContent';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from '../../model/units';
import { renderSiteCss, renderSiteExportBundle, renderSiteHtmlDocument } from '../siteExport';

describe('site/siteExport', () => {
  it('uses the document default font stack for site fallback typography', () => {
    const document = createInitialDocument();
    document.fontLibrary.defaults = ['Playfair Display'];

    const css = renderSiteCss(document);

    expect(css).toContain("font-family: 'Playfair Display', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");
  });

  it('renders a complete html document that links to the exported stylesheet', () => {
    const document = createInitialDocument();
    const html = renderSiteHtmlDocument(document, { title: 'Landing Page', htmlFileName: 'landing-page' });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>Landing Page</title>');
    expect(html).toContain('<link rel="stylesheet" href="landing-page.css" />');
    expect(html).toContain('class="sp-site"');
    expect(html).toContain('<main class="sp-site-main">');
  });

  it('exports wrapped standalone code markup inside the leaf width shell', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const standaloneCode = createTextNode('code', section.id);
    standaloneCode.id = 'code_wrap_test';
    standaloneCode.name = 'Code Wrap Test';
    standaloneCode.rect.width.base = parseWidthValue('fit-content');
    standaloneCode.content = createTextDocumentFromCode('const total = items.reduce((sum, item) => sum + item.value, 0);', {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const total = items.reduce((sum, item) =&gt; sum + item.value, 0);',
    });
    standaloneCode.code = {
      language: 'typescript',
      theme: 'dark',
      highlightedHtml: 'const total = items.reduce((sum, item) =&gt; sum + item.value, 0);',
    };

    document.nodes[standaloneCode.id] = standaloneCode;
    section.children.push(standaloneCode.id);

    const html = renderSiteHtmlDocument(document);

    expect(html).toContain(`class="sp-node sp-node-${standaloneCode.id} sp-role-text sp-leaf"`);
    expect(html).toContain(`data-node-id="${standaloneCode.id}"`);
    expect(html).toContain('<pre class="language-typescript"');
    expect(html).toContain('white-space:pre-wrap');
    expect(html).toContain('word-break:break-word');
  });

  it('exports code theme css for auto dark mode and authored token color inheritance', () => {
    const css = renderSiteCss(createInitialDocument());

    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('pre[data-code-theme="auto"]');
    expect(css).toContain('pre[data-code-theme="dark"]');
    expect(css).toContain('pre[data-code-color="author"] code[class*="language-"] .token');
    expect(css).toContain('color: inherit;');
  });

  it('links the seeded Google Fonts needed by the default typography pairings', () => {
    const html = renderSiteHtmlDocument(createInitialDocument());

    expect(html).toContain('fonts.googleapis.com/css2');
    expect(html).toContain('family=Playfair+Display');
    expect(html).toContain('family=Inter');
  });

  it('exports link and button navigation targets including new-tab behavior', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!section || section.contentType !== 'container' || !link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected section wrapper and post link node');
    }

    const button = createButtonTextNode(section.id);
    if (button.subtype !== 'block') {
      throw new Error('Expected button leaf');
    }
    button.content = createTextDocumentFromText('Start testing');
    button.link = { ...(button.link ?? { linkType: 'external' }), href: 'https://example.com/start' };
    button.link = { ...(button.link ?? { linkType: 'external' }), openInNewTab: true };
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    link.link = { ...(link.link ?? { linkType: 'external' }), linkType: 'external' };
    link.link = { ...(link.link ?? { linkType: 'external' }), href: 'https://example.com/spec' };
    link.link = { ...(link.link ?? { linkType: 'external' }), openInNewTab: true };

    const html = renderSiteHtmlDocument(document);

    expect(html).toMatch(
      new RegExp(
        `<p[^>]+data-node-id="${link.id}"[^>]*>\\s*<a[^>]+href="https://example\\.com/spec"[^>]+target="_blank"[^>]+rel="noopener noreferrer"`,
      ),
    );
    expect(html).toMatch(
      new RegExp(
        `<a[^>]+data-node-id="${button.id}"[^>]+href="https://example\\.com/start"[^>]+target="_blank"[^>]+rel="noopener noreferrer"`,
      ),
    );
    expect(html).not.toMatch(new RegExp(`<button[^>]+data-node-id="${button.id}"`));
  });

  it('exports same-page anchor links against section ids', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );
    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );

    if (!section || section.contentType !== 'container' || !link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected post section and link node');
    }

    link.link = { ...(link.link ?? { linkType: 'anchor' }), linkType: 'anchor', anchorTargetId: section.id, href: `#${section.id}`, openInNewTab: true };

    const html = renderSiteHtmlDocument(document);

    expect(html).toContain(`data-node-id="${section.id}" data-top-level="true" id="${section.id}"`);
    expect(html).toMatch(new RegExp(`<p[^>]+data-node-id="${link.id}"[^>]*>\\s*<a[^>]+href="#${section.id}"`));
    expect(html).not.toMatch(new RegExp(`<p[^>]+data-node-id="${link.id}"[^>]*>\\s*<a[^>]+target="_blank"`));
  });

  it('exports same-page anchor buttons against section ids', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected post section');
    }

    const button = createButtonTextNode(section.id);
    if (button.contentType !== 'text' || button.subtype !== 'block') {
      throw new Error('Expected button node');
    }
    document.nodes[button.id] = button;
    section.children.push(button.id);

    button.link = { ...(button.link ?? { linkType: 'anchor' }), linkType: 'anchor', anchorTargetId: section.id, href: `#${section.id}`, openInNewTab: true };

    const html = renderSiteHtmlDocument(document);

    expect(html).toMatch(new RegExp(`<a[^>]+data-node-id="${button.id}"[^>]+href="#${section.id}"`));
    expect(html).not.toMatch(new RegExp(`<a[^>]+data-node-id="${button.id}"[^>]+target="_blank"`));
  });

  it('generates text styling in css instead of inline styles', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!target || target.contentType !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style ??= {};
    target.style!.fontSize = parseFontSizeValue('31px');
    target.style!.fontWeight = 700;
    target.style!.lineHeight = 1.4;
    target.style!.textDecorationLine = 'underline';

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${target.id}.sp-role-text`);
    expect(css).toContain('font-size: 31px;');
    expect(css).toContain('font-weight: 700;');
    expect(css).toContain('line-height: 1.4;');
    expect(css).toContain('text-decoration-line: underline;');
  });

  it('omits un-authored text design styles when the model does not override them', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!target || target.contentType !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style = {};

    const css = renderSiteCss(document);
    const targetRule = css.match(new RegExp(`\\.sp-node-${target.id}\\.sp-role-text[^}]+\\}`, 'm'))?.[0] ?? '';

    expect(targetRule).toContain(`.sp-node-${target.id}.sp-role-text`);
    expect(targetRule).not.toContain('color: #16202a;');
    expect(targetRule).not.toContain('font-size: 18px;');
    expect(targetRule).not.toContain('letter-spacing: -0.02em;');
  });

  it('exports custom text and link design styles including filter shadows', () => {
    const document = structuredClone(createInitialDocument());
    const text = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );
    const link = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.link != null && node.name === 'Post Link',
    );
    if (!text || text.contentType !== 'text' || !link || link.contentType !== 'text' || link.link == null) {
      throw new Error('Expected text and link leaves');
    }

    text.style ??= {};
    text.style!.color = '#0f172a';
    text.style!.shadowColor = 'rgba(15, 23, 42, 0.18)';
    text.style!.shadowBlur = 16;
    text.style!.shadowOffsetX = 4;
    text.style!.shadowOffsetY = 8;
    link.style ??= {};
    link.style!.color = '#1d4ed8';
    link.style!.fontWeight = 700;
    link.style!.textAlign = 'center';
    link.style!.textWrap = 'wrap';
    link.style!.shadowColor = 'rgba(29, 78, 216, 0.28)';
    link.style!.shadowBlur = 10;
    link.style!.shadowOffsetX = 2;
    link.style!.shadowOffsetY = 6;

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${text.id}.sp-role-text`);
    expect(css).toContain('filter: drop-shadow(4px 8px 16px rgba(15, 23, 42, 0.18));');
    expect(css).toContain(`.sp-node-${link.id}.sp-role-link`);
    expect(css).toContain('display: block;');
    expect(css).toContain('width: 100%;');
    expect(css).toContain('color: #1d4ed8;');
    expect(css).toContain('font-weight: 700;');
    expect(css).toContain('text-align: center;');
    expect(css).toContain('white-space: normal;');
    expect(css).toContain('filter: drop-shadow(2px 6px 10px rgba(29, 78, 216, 0.28));');
  });

  it('preserves authored extended color space strings in exported css', () => {
    const document = structuredClone(createInitialDocument());
    const text = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!text || text.contentType !== 'text' || !section || section.contentType !== 'container') {
      throw new Error('Expected text leaf and section wrapper');
    }

    const button = createButtonTextNode(section.id);
    if (button.subtype !== 'block') {
      throw new Error('Expected button leaf');
    }
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    text.style ??= {};
    text.style!.color = 'oklch(70% 0.2 250 / 0.7)';
    button.style ??= {};
    button.style!.background = 'color(display-p3 0.24 0.52 0.88 / 0.9)';

    const css = renderSiteCss(document);

    expect(css).toContain('color: oklch(70% 0.2 250 / 0.7);');
    expect(css).toContain('background: color(display-p3 0.24 0.52 0.88 / 0.9);');
  });

  it('exports button typography and wrap settings', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const button = createButtonTextNode(section.id);
    if (button.subtype !== 'block') {
      throw new Error('Expected button leaf');
    }
    button.style ??= {};
    button.style!.fontSize = parseFontSizeValue('22px');
    button.style!.fontStyle = 'italic';
    button.style!.textAlign = 'center';
    button.style!.textWrap = 'wrap';
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(button.id);

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${button.id}.sp-role-button.sp-leaf`);
    expect(css).toContain('font-size: 22px;');
    expect(css).toContain('font-style: italic;');
    expect(css).toContain('text-align: center;');
    expect(css).toContain('white-space: normal;');
  });

  it('normalizes native text and button elements without adding hidden visual defaults in exported css', () => {
    const css = renderSiteCss(createInitialDocument());

    expect(css).toContain('.sp-leaf.sp-role-text {');
    expect(css).toContain('font: inherit;');
    expect(css).toContain('quotes: none;');
    expect(css).toContain('.sp-leaf.sp-role-link > a {');
    expect(css).toContain('a.sp-leaf.sp-role-image {');
    expect(css).toContain('button.sp-leaf.sp-role-button {');
    expect(css).toContain('appearance: none;');
    expect(css).toContain('font: inherit;');
    expect(css).toContain('cursor: pointer;');
  });

  it('exports linked images as anchors that wrap the image element', () => {
    const document = structuredClone(createInitialDocument());
    const image = Object.values(document.nodes).find(
      (node) => node.contentType === 'media' && node.subtype === 'image',
    );

    if (!image || image.contentType !== 'media') {
      throw new Error('Expected image node');
    }

    image.link = { linkType: 'external', href: 'https://example.com/image', openInNewTab: true };

    const html = renderSiteHtmlDocument(document);

    expect(html).toMatch(
      new RegExp(
        `<a[^>]+data-node-id="${image.id}"[^>]+href="https://example\\.com/image"[^>]+target="_blank"[^>]+rel="noopener noreferrer"[^>]*>\\s*<img`,
      ),
    );
  });

  it('uses the shared stage mesh grid for wrapper content and child placement', () => {
    const document = createInitialDocument();
    const css = renderSiteCss(document);
    const heroSection = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );
    const postTitle = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!heroSection || heroSection.contentType !== 'container' || !postTitle || (postTitle.contentType !== 'text' && postTitle.contentType !== 'media')) {
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
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );

    if (!section || section.contentType !== 'container') {
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
      (node) => node.contentType === 'container' && node.subtype === 'section' && node.name === 'Post Layout',
    );

    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    section.style!.borderColor = undefined;
    section.style!.borderWidth = undefined;
    section.style!.sectionBorderBottomColor = '#cbd5e1';
    section.style!.sectionBorderBottomWidth = parseUnitValue('2px');

    const css = renderSiteCss(document);
    const sectionRule = css.match(new RegExp(`\\.sp-node-${section.id}-content[^}]+\\}`, 'm'))?.[0] ?? '';

    expect(sectionRule).toContain(`.sp-node-${section.id}-content`);
    expect(sectionRule).toContain('border-bottom-color: #cbd5e1;');
    expect(sectionRule).toContain('border-bottom-width: 2px;');
    expect(sectionRule).not.toContain('border-width: 1px;');
  });

  it('exports container, image, and button design surfaces', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const image = Object.values(document.nodes).find(
      (node) => node.contentType === 'media',
    );
    if (!section || section.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }
    const container = createContainerNode('container', section.id);
    const button = createButtonTextNode(section.id);
    document.nodes[container.id] = container;
    document.nodes[button.id] = button;
    document.nodes[section.id].children.push(container.id, button.id);
    if (!container || container.contentType !== 'container' || !image || image.contentType !== 'media' || image.subtype !== 'image' || !button || button.contentType !== 'text' || button.subtype !== 'block') {
      throw new Error('Expected container, image, and button nodes');
    }

    container.style!.background = '#ffffff';
    container.style!.borderWidth = parseUnitValue('2px');
    container.style!.borderColor = '#cbd5e1';
    container.style!.borderRadius = parseUnitValue('18px');
    container.style!.shadowColor = 'rgba(18, 32, 51, 0.16)';
    container.style!.shadowBlur = 22;
    container.style!.shadowSpread = 6;
    container.style!.shadowOffsetX = 0;
    container.style!.shadowOffsetY = 14;

    image.style ??= {};
    image.style!.borderWidth = parseUnitValue('3px');
    image.style!.borderColor = '#2563eb';
    image.style!.borderRadius = parseUnitValue('28px');
    image.style!.shadowColor = 'rgba(37, 99, 235, 0.2)';
    image.style!.shadowBlur = 18;
    image.style!.shadowSpread = 4;
    image.style!.shadowOffsetX = 0;
    image.style!.shadowOffsetY = 12;

    button.style ??= {};
    button.style!.color = '#0f172a';
    button.style!.background = '#f8fafc';
    button.style!.paddingBlock = parseSpacingValue('0.75em');
    button.style!.paddingInline = parseSpacingValue('1.5rem');
    button.style!.borderWidth = parseUnitValue('1px');
    button.style!.borderColor = '#0f172a';
    button.style!.shadowColor = 'rgba(15, 23, 42, 0.15)';
    button.style!.shadowBlur = 14;
    button.style!.shadowSpread = 3;
    button.style!.shadowOffsetX = 0;
    button.style!.shadowOffsetY = 8;

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${container.id}-content {`);
    expect(css).toContain('box-sizing: border-box;');
    expect(css).toContain('background-clip: padding-box;');
    expect(css).toContain('border-radius: 18px;');
    expect(css).toContain('box-shadow: 0px 14px 22px 6px rgba(18, 32, 51, 0.16);');
    expect(css).toContain(`.sp-node-${image.id}.sp-role-image.sp-leaf`);
    expect(css).toContain('border-width: 3px;');
    expect(css).toContain('border-radius: 28px;');
    expect(css).toContain('box-shadow: 0px 12px 18px 4px rgba(37, 99, 235, 0.2);');
    expect(css).toContain(`.sp-node-${button.id}.sp-role-button.sp-leaf`);
    expect(css).toContain('background: #f8fafc;');
    expect(css).toContain('padding-block: 0.75em;');
    expect(css).toContain('padding-inline: 1.5rem;');
    expect(css).toContain('background-clip: padding-box;');
    expect(css).toContain('border-color: #0f172a;');
    expect(css).toContain('box-shadow: 0px 8px 14px 3px rgba(15, 23, 42, 0.15);');
  });

  it('does not serialize zero-width borders, zero radius, or fully transparent shadows into export css', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    const image = Object.values(document.nodes).find(
      (node) => node.contentType === 'media',
    );

    if (!section || section.contentType !== 'container' || !image || image.contentType !== 'media' || image.subtype !== 'image') {
      throw new Error('Expected section wrapper and image leaf');
    }

    const container = createContainerNode('container', section.id);
    document.nodes[container.id] = container;
    document.nodes[section.id].children.push(container.id);

    container.style!.background = '#ffffff';
    container.style!.borderWidth = parseUnitValue('0px');
    container.style!.borderColor = '#cbd5e1';
    container.style!.borderRadius = parseUnitValue('0px');
    container.style!.shadowColor = 'rgba(18, 32, 51, 0)';
    container.style!.shadowBlur = 22;
    container.style!.shadowSpread = 6;
    container.style!.shadowOffsetY = 14;

    image.style ??= {};
    image.style!.borderWidth = parseUnitValue('0px');
    image.style!.borderRadius = parseUnitValue('0px');
    image.style!.shadowColor = 'rgba(18, 32, 51, 0)';

    const css = renderSiteCss(document);
    const containerRule = css.match(new RegExp(`\\.sp-node-${container.id}-content \\{[^}]+\\}`, 'm'))?.[0] ?? '';
    const imageRule = css.match(new RegExp(`\\.sp-node-${image.id}\\.sp-role-image\\.sp-leaf \\{[^}]+\\}`, 'm'))?.[0] ?? '';

    expect(containerRule).toContain(`.sp-node-${container.id}-content`);
    expect(containerRule).toContain('background: #ffffff;');
    expect(containerRule).toContain('box-sizing: border-box;');
    expect(containerRule).not.toContain('background-clip: padding-box;');
    expect(containerRule).not.toContain('border-width: 0px;');
    expect(containerRule).not.toContain('border-color: #cbd5e1;');
    expect(containerRule).not.toContain('border-radius: 0px;');
    expect(containerRule).not.toContain('box-shadow:');

    expect(imageRule).toContain(`.sp-node-${image.id}.sp-role-image.sp-leaf`);
    expect(imageRule).not.toContain('border-width: 0px;');
    expect(imageRule).not.toContain('border-radius: 0px;');
    expect(imageRule).not.toContain('box-shadow:');
  });

  it('does not add an export-only wrapper height floor above authored short sticky containers', () => {
    const document = structuredClone(createInitialDocument());
    const stickySteps = createSectionFromTemplate('stickySteps', document.rootId);
    document.nodes = {
      ...document.nodes,
      ...stickySteps.nodes,
    };
    document.nodes[document.rootId].children.push(stickySteps.wrapper.id);
    const topCard = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'container' && node.name === 'Top Edge Card Container',
    );
    const bottomCard = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'container' && node.name === 'Bottom Edge Card Container',
    );

    if (!topCard || topCard.contentType !== 'container' || !bottomCard || bottomCard.contentType !== 'container') {
      throw new Error('Expected sticky edge lab card containers');
    }

    const css = renderSiteCss(document);

    expect(css).toContain(`.sp-node-${topCard.id}-content {`);
    expect(css).toContain('height: 151px;');
    expect(css).toContain(`.sp-node-${bottomCard.id}-content {`);
    expect(css).toContain('height: 146px;');
    expect(css).not.toContain('.sp-wrapper.sp-role-section, .sp-wrapper.sp-role-container');
    expect(css).not.toContain('min-height: 180px;');
  });

  it('emits framed image styling and brand mark overrides', () => {
    const document = createInitialDocument();
    const css = renderSiteCss(document);

    expect(css).toContain('img.sp-image {');
    expect(css).toContain('object-fit: cover;');
    expect(css).toContain('border-radius: 16px;');
    expect(css).toContain('img.sp-image.is-brand-mark {');
    expect(css).toContain('object-fit: contain;');
    expect(css).toContain('box-shadow: none;');
  });

  it('emits sticky spacer rules for self sticky exports', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.contentType === 'text' && node.name === 'Post Title',
    );

    if (!target || target.contentType !== 'text') {
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
      (node) => node.contentType === 'text' && node.name === 'Pinned Lead',
    );

    if (!pinnedLead || pinnedLead.contentType !== 'text') {
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
