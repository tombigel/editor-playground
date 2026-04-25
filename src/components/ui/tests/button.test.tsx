import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '../button';

describe('components/ui/button', () => {
  it('uses the shared 28px compact control contract', () => {
    const defaultMarkup = renderToStaticMarkup(<Button>Save</Button>);
    const smallMarkup = renderToStaticMarkup(<Button size="sm">Save</Button>);
    const iconMarkup = renderToStaticMarkup(
      <Button size="icon" aria-label="Save">
        S
      </Button>,
    );

    expect(defaultMarkup).toContain('h-7');
    expect(smallMarkup).toContain('h-7');
    expect(iconMarkup).toContain('size-7');
    expect(defaultMarkup).not.toContain('h-8');
    expect(iconMarkup).not.toContain('size-8');
  });
});
