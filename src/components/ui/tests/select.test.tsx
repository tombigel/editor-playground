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
});
