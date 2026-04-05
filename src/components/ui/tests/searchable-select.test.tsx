import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SearchableSelect, getSearchableSelectPosition } from '../searchable-select';

describe('components/ui/searchable-select', () => {
  it('renders a compact trigger with the selected label or placeholder', () => {
    const selectedMarkup = renderToStaticMarkup(
      <SearchableSelect
        value="en-US"
        options={[
          { value: '__site__', label: 'Site language' },
          { value: 'en-US', label: 'English (United States)' },
        ]}
        onValueChange={() => {}}
      />,
    );

    const placeholderMarkup = renderToStaticMarkup(
      <SearchableSelect
        options={[
          { value: '__site__', label: 'Site language' },
          { value: 'fr', label: 'French' },
        ]}
        placeholder="Site language"
        onValueChange={() => {}}
      />,
    );

    expect(selectedMarkup).toContain('aria-haspopup="listbox"');
    expect(selectedMarkup).toContain('English (United States)');
    expect(placeholderMarkup).toContain('Site language');
    expect(selectedMarkup).toContain('rounded-sm');
    expect(selectedMarkup).toContain('data-ui="select-trigger"');
  });

  it('clamps popup width and horizontal position within the viewport', () => {
    const position = getSearchableSelectPosition({
      triggerRect: {
        width: 180,
        left: 380,
        right: 560,
        top: 100,
        bottom: 132,
      } as DOMRect,
      viewportWidth: 420,
      viewportHeight: 700,
    });

    expect(position.left).toBe(168);
    expect(position.width).toBe(240);
    expect(position.top).toBe(138);
  });

  it('opens upward when there is more space above than below', () => {
    const position = getSearchableSelectPosition({
      triggerRect: {
        width: 280,
        left: 24,
        right: 304,
        top: 540,
        bottom: 572,
      } as DOMRect,
      viewportWidth: 800,
      viewportHeight: 640,
    });

    expect(position.top).toBe(278);
    expect(position.maxHeight).toBe(522);
  });
});
