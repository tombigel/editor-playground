import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

describe('components/ui/select', () => {
  it('uses the shared compact control radius for trigger and content', () => {
    const markup = renderToStaticMarkup(
      <Select value="air" defaultOpen>
        <SelectTrigger aria-label="Theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="air">Air</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(markup).toContain('rounded-sm');
    expect(markup).not.toContain('rounded-md');
  });

  it('supports compact and small trigger sizes without consumer-owned height classes', () => {
    const compactMarkup = renderToStaticMarkup(
      <Select value="air" defaultOpen>
        <SelectTrigger aria-label="Theme" size="compact">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="air">Air</SelectItem>
        </SelectContent>
      </Select>,
    );

    const smallMarkup = renderToStaticMarkup(
      <Select value="air" defaultOpen>
        <SelectTrigger aria-label="Theme" size="small">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="air">Air</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(compactMarkup).toContain('data-size="compact"');
    expect(compactMarkup).toContain('text-xs');
    expect(smallMarkup).toContain('data-size="small"');
    expect(smallMarkup).toContain('text-[11px]');
  });
});
