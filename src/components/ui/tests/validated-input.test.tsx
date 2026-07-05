import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InputValidationIndicator, ValidatedInput } from '../validated-input';

describe('components/ui/validated-input', () => {
  it('renders a compact trailing status icon with tooltip content', () => {
    const markup = renderToStaticMarkup(
      <ValidatedInput
        value="https://cdn.example.com/video.mp4"
        onValueChange={() => {}}
        status={{ state: 'valid', message: 'Video metadata loaded.' }}
        statusLabel="Video source status"
      />,
    );

    expect(markup).toContain('value="https://cdn.example.com/video.mp4"');
    expect(markup).toContain('role="tooltip"');
    expect(markup).toContain('Video metadata loaded.');
    expect(markup).toContain('lucide-circle-check');
  });

  it('omits idle status indicators', () => {
    const markup = renderToStaticMarkup(
      <InputValidationIndicator status={{ state: 'idle' }} label="Poster status" />,
    );

    expect(markup).toBe('');
  });
});
