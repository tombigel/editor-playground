import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SearchableMultiSelect,
  getSearchableMultiSelectSummary,
  toggleSearchableMultiSelectValue,
} from '../searchable-multi-select';

const OPTIONS = [
  { value: 'home', label: 'Home', description: '/home' },
  { value: 'about', label: 'About', description: '/about' },
  { value: 'contact', label: 'Contact', description: '/contact' },
];

describe('components/ui/searchable-multi-select', () => {
  it('renders placeholder, single value, and count summaries', () => {
    expect(getSearchableMultiSelectSummary([], OPTIONS, 'Choose pages')).toBe('Choose pages');
    expect(getSearchableMultiSelectSummary(['home'], OPTIONS, 'Choose pages')).toBe('Home');
    expect(getSearchableMultiSelectSummary(['home', 'about'], OPTIONS, 'Choose pages')).toBe('2 selected');
  });

  it('toggles values while preserving option order', () => {
    expect(toggleSearchableMultiSelectValue(['about'], 'home', OPTIONS)).toEqual(['home', 'about']);
    expect(toggleSearchableMultiSelectValue(['home', 'about'], 'home', OPTIONS)).toEqual(['about']);
  });

  it('renders selected checkmarks and empty states in the embedded view', () => {
    const selectedMarkup = renderToStaticMarkup(
      <SearchableMultiSelect
        embedded
        values={['about']}
        options={OPTIONS}
        searchPlaceholder="Search pages"
        onValuesChange={() => {}}
      />,
    );

    const emptyMarkup = renderToStaticMarkup(
      <SearchableMultiSelect
        embedded
        values={[]}
        options={[]}
        emptyText="No pages match."
        onValuesChange={() => {}}
      />,
    );

    expect(selectedMarkup).toContain('aria-multiselectable="true"');
    expect(selectedMarkup).toContain('h-7 text-xs');
    expect(selectedMarkup).toContain('data-ui="searchable-multi-select-item"');
    expect(selectedMarkup).toContain('editor-searchable-multi-select-item');
    expect(selectedMarkup).not.toContain('editor-menubar-item');
    expect(selectedMarkup).toContain('aria-selected="true"');
    expect(selectedMarkup).toContain('data-ui="searchable-multi-select-marker"');
    expect(emptyMarkup).toContain('No pages match.');
  });

  it('renders a standalone trigger summary', () => {
    const markup = renderToStaticMarkup(
      <SearchableMultiSelect
        values={['home', 'about']}
        options={OPTIONS}
        placeholder="Choose pages"
        onValuesChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain('2 selected');
    expect(markup).toContain('data-ui="select-trigger"');
    expect(markup).toContain('flex h-7 w-full');
    expect(markup).not.toContain('h-8');
  });
});
