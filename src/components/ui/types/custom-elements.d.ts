import type { ColorInput as HdrColorInputElement } from 'hdr-color-input';

declare module 'react' {
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
      'interact-element': React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & {
        'data-interact-key'?: string;
        'data-interact-initial'?: string;
      };
    }
  }
}
