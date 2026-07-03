import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { File } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectOptionRow,
  SelectTrigger,
  SelectValue,
} from '../select';

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

    expect(markup).toContain('h-7');
    expect(markup).toContain('rounded-sm');
    expect(markup).not.toContain('rounded-md');
    expect(markup).not.toContain('h-8');
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
    expect(compactMarkup).toContain('h-7');
    expect(compactMarkup).toContain('text-xs');
    expect(smallMarkup).toContain('data-size="small"');
    expect(smallMarkup).toContain('h-7');
    expect(smallMarkup).toContain('text-[11px]');
  });

  it('renders icon and supporting text through the shared select row helper', () => {
    const markup = renderToStaticMarkup(
      <Select value="currentPage" defaultOpen>
        <SelectTrigger aria-label="Visibility">
          <SelectOptionRow
            icon={<File className="h-3.5 w-3.5" />}
            label="Current page"
            description="Appears on the active page"
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="currentPage">
            <SelectOptionRow
              icon={<File className="h-3.5 w-3.5" />}
              label="Current page"
              description="Appears on the active page"
            />
          </SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(markup).toContain('data-ui="select-option-row"');
    expect(markup).toContain('data-ui="select-option-icon"');
    expect(markup).toContain('data-ui="select-option-description"');
  });

  it('exposes grouped option labels through shared Radix wrappers', () => {
    const markup = renderToStaticMarkup(
      <Select value="free" defaultOpen>
        <SelectTrigger aria-label="Model">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Automatic</SelectLabel>
            <SelectItem value="free">Free</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    expect(markup).toContain('data-ui="select-group"');
    expect(markup).toContain('data-ui="select-label"');
    expect(markup).toContain('Automatic');
    expect(markup).toContain('uppercase');
  });
});
