import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pager } from '../pager';

describe('components/ui/pager', () => {
  it('renders the shared pager contract', () => {
    const markup = renderToStaticMarkup(
      <Pager currentPage={2} totalPages={5} onPrevious={() => {}} onNext={() => {}} />,
    );

    expect(markup).toContain('data-ui="pager"');
    expect(markup).toContain('data-ui="pager-indicator"');
    expect(markup).toContain('Page 2 / 5');
    expect(markup).toContain('Prev');
    expect(markup).toContain('Next');
  });

  it('hides itself for a single page by default', () => {
    expect(renderToStaticMarkup(
      <Pager currentPage={1} totalPages={1} onPrevious={() => {}} onNext={() => {}} />,
    )).toBe('');
  });
});
