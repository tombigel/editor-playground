import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import {
  formatNodeLabel,
  getNodeAriaLabel,
  getNodeTextContent,
  isBrandMark,
  renderLeafContent,
} from '../nodePresentation';

describe('render/nodePresentation', () => {
  it('formats shared node labels and aria labels', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find((node) => node.contentType === 'container' && node.subtype === 'section');
    const title = Object.values(document.nodes).find((node) => node.contentType !== 'container' && node.contentType !== 'site' && node.name === 'Post Title');
    if (!section || section.contentType !== 'container' || !title || (title.contentType !== 'text' && title.contentType !== 'media')) {
      throw new Error('Expected wrapper and leaf nodes');
    }

    expect(formatNodeLabel(section)).toBe('Section');
    expect(getNodeAriaLabel(title)).toBe('Text: Post Title');
  });

  it('shares leaf text content and brand-mark detection', () => {
    const document = createInitialDocument();
    const image = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const link = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.link != null);
    if (!image || image.contentType !== 'media' || image.subtype !== 'image' || !link || link.contentType !== 'text') {
      throw new Error('Expected image and link leaves');
    }

    image.name = 'Brand Mark';

    expect(getNodeTextContent(image)).toBe(image.alt);
    expect(getNodeTextContent(link)).toBe(link.content);
    expect(isBrandMark(image)).toBe(true);
  });

  it('renders shared leaf content with stage-style options', () => {
    const document = createInitialDocument();
    const image = Object.values(document.nodes).find((node) => node.contentType === 'media');
    const link = Object.values(document.nodes).find((node) => node.contentType === 'text' && node.link != null);
    if (!image || image.contentType !== 'media' || image.subtype !== 'image' || !link || link.contentType !== 'text') {
      throw new Error('Expected image and link leaves');
    }

    image.src = '';

    const imageMarkup = renderToStaticMarkup(
      renderLeafContent(image, { imagePlaceholderClassName: 'image-placeholder' }),
    );
    const linkMarkup = renderToStaticMarkup(
      renderLeafContent(link, { disableTabNavigation: true, contentStyle: { color: '#1d4ed8' } }),
    );

    expect(imageMarkup).toContain('class="image-placeholder"');
    expect(linkMarkup).toContain('tabindex="-1"');
    expect(linkMarkup).toContain('style="color:#1d4ed8"');
  });
});
