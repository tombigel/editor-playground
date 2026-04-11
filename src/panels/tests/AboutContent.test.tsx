import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AboutContent } from '../AboutContent';

describe('panels/AboutContent', () => {
  it('renders documentation links as entry-targeted buttons', () => {
    const markup = renderToStaticMarkup(<AboutContent />);

    expect(markup).toContain('Getting Started');
    expect(markup).toContain('Reference Overview');
    expect(markup).toContain('API Reference');
    expect(markup).toContain('Playground Spec');
    expect(markup).toContain('data-help-entry-target="doc:docs/GETTING_STARTED.md"');
    expect(markup).not.toContain('docs/USAGE.md');
  });
});
