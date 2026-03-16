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
    const section = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    const title = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.name === 'Post Title');
    if (!section || section.type !== 'wrapper' || !title || title.type !== 'leaf') {
      throw new Error('Expected wrapper and leaf nodes');
    }

    expect(formatNodeLabel(section)).toBe('Section');
    expect(getNodeAriaLabel(title)).toBe('Text: Post Title');
  });

  it('shares leaf text content and brand-mark detection', () => {
    const document = createInitialDocument();
    const image = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    const link = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'link');
    if (!image || image.type !== 'leaf' || image.role !== 'image' || !link || link.type !== 'leaf') {
      throw new Error('Expected image and link leaves');
    }

    image.name = 'Brand Mark';

    expect(getNodeTextContent(image)).toBe(image.alt);
    expect(getNodeTextContent(link)).toBe(link.label);
    expect(isBrandMark(image)).toBe(true);
  });

  it('renders shared leaf content with stage-style options', () => {
    const document = createInitialDocument();
    const image = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');
    const link = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'link');
    if (!image || image.type !== 'leaf' || image.role !== 'image' || !link || link.type !== 'leaf') {
      throw new Error('Expected image and link leaves');
    }

    image.src = '';

    const imageMarkup = renderToStaticMarkup(
      <>{renderLeafContent(image, { imagePlaceholderClassName: 'image-placeholder' })}</>,
    );
    const linkMarkup = renderToStaticMarkup(
      <>{renderLeafContent(link, { disableTabNavigation: true })}</>,
    );

    expect(imageMarkup).toContain('class="image-placeholder"');
    expect(linkMarkup).toContain('tabindex="-1"');
  });
});
