import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../model/defaults';
import { SiteRenderer } from './SiteRenderer';

describe('site/SiteRenderer', () => {
  it('renders text leaves using their configured html tag', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.htmlTag = 'h2';

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain('<h2');
    expect(markup).toContain('Plan sticky behavior before building scroll-driven animations');
  });

  it('renders text decoration styles for text leaves', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style ??= {};
    target.style.textDecorationLine = 'underline';

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain('text-decoration-line:underline');
  });

  it('renders text direction styles for text leaves', () => {
    const document = structuredClone(createInitialDocument());
    const target = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.name === 'Post Title',
    );

    if (!target || target.type !== 'leaf' || target.role !== 'text') {
      throw new Error('Expected post title text node');
    }

    target.style ??= {};
    target.style.direction = 'rtl';

    const markup = renderToStaticMarkup(<SiteRenderer document={document} />);

    expect(markup).toContain('direction:rtl');
  });
});
