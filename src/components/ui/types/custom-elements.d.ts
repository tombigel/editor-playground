import type * as React from 'react';
import type { ColorInput as HdrColorInputElement } from 'hdr-color-input';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'color-input': React.DetailedHTMLProps<React.HTMLAttributes<HdrColorInputElement>, HdrColorInputElement> & {
        class?: string;
        'data-ui'?: string;
        'data-allow-alpha'?: string;
        'no-alpha'?: '';
        theme?: 'light' | 'dark';
        value?: string;
        suppressHydrationWarning?: boolean;
      };
    }
  }
}

export {};
