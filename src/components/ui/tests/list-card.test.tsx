import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ListCard } from '../list-card';

describe('components/ui/list-card', () => {
  it('renders a reusable list card with meta and actions', () => {
    const markup = renderToStaticMarkup(
      <ListCard
        title="Inter"
        description="Hamburgefonstiv 123"
        meta="sans-serif · Western · 4 used"
        actions={<button type="button">Favorite</button>}
        tone="subtle"
      />,
    );

    expect(markup).toContain('data-ui="list-card"');
    expect(markup).toContain('data-tone="subtle"');
    expect(markup).toContain('data-ui="list-card-title"');
    expect(markup).toContain('data-ui="list-card-description"');
    expect(markup).toContain('data-ui="list-card-meta"');
    expect(markup).toContain('data-ui="list-card-actions"');
    expect(markup).toContain('Inter');
    expect(markup).toContain('Favorite');
  });
});
