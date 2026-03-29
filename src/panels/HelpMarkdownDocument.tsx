import { createElement, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { resolveHelpLink, slugifyMarkdownHeading, type HelpLinkTarget, type MarkdownHelpEntry } from './helpDocs';

type Props = {
  entry: MarkdownHelpEntry;
  availableDocPaths: Set<string>;
  onNavigate: (target: HelpLinkTarget) => void;
};

export function HelpMarkdownDocument({ entry, availableDocPaths, onNavigate }: Props) {
  const components: Components = {
    h1: createHeadingComponent('h1', 'editor-text-strong text-2xl font-semibold tracking-tight'),
    h2: createHeadingComponent('h2', 'editor-text-strong pt-2 text-lg font-semibold tracking-tight'),
    h3: createHeadingComponent('h3', 'editor-text-strong pt-1 text-base font-semibold tracking-tight'),
    h4: createHeadingComponent('h4', 'editor-text-strong pt-1 text-sm font-semibold tracking-tight'),
    h5: createHeadingComponent('h5', 'editor-text-strong pt-1 text-sm font-semibold tracking-tight'),
    h6: createHeadingComponent('h6', 'editor-text-strong pt-1 text-sm font-semibold tracking-tight'),
    p: ({ children }) => <p className="editor-text-strong text-sm leading-6">{children}</p>,
    ul: ({ children }) => <ul className="editor-text-strong list-disc pl-5 text-sm leading-6">{children}</ul>,
    ol: ({ children }) => <ol className="editor-text-strong list-decimal pl-5 text-sm leading-6">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="editor-bg-subtle editor-border-subtle editor-text-muted rounded-lg border-l-4 p-4 text-sm leading-6">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="editor-border-subtle my-5 border-t" />,
    table: ({ children }) => (
      <div className="editor-scrollbar overflow-x-auto">
        <table className="editor-border-subtle min-w-full border-collapse overflow-hidden rounded-lg border text-left text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="editor-bg-subtle">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="editor-border-subtle border-t">{children}</tr>,
    th: ({ children }) => <th className="border-b px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
    pre: ({ children }) => (
      <pre className="editor-bg-subtle editor-border-subtle editor-scrollbar overflow-x-auto rounded-lg border p-4 text-xs leading-5">
        {children}
      </pre>
    ),
    code: ({ children, className }) =>
      !className ? (
        <code className="editor-bg-subtle editor-border-subtle rounded px-1.5 py-0.5 text-[0.92em]">{children}</code>
      ) : (
        <code className={className}>{children}</code>
      ),
    a: ({ href, children }) => {
      const target = resolveHelpLink(entry.path, href ?? '', availableDocPaths);

      if (target.kind === 'document' || target.kind === 'anchor') {
        return (
          <button
            type="button"
            className="text-[color:var(--editor-accent)] underline underline-offset-2"
            onClick={() => onNavigate(target)}
          >
            {children}
          </button>
        );
      }

      if (target.kind === 'external') {
        return (
          <a href={target.href} target="_blank" rel="noreferrer" className="text-[color:var(--editor-accent)] underline underline-offset-2">
            {children}
          </a>
        );
      }

      return <span className="editor-text-muted underline decoration-dotted underline-offset-2">{children}</span>;
    },
  };

  return (
    <div className="space-y-4 text-sm leading-6">
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {entry.raw}
      </Markdown>
    </div>
  );
}

function createHeadingComponent(tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', className: string) {
  return function Heading({ children }: { children?: ReactNode }) {
    const anchor = slugifyMarkdownHeading(childrenToText(children));
    return createElement(tagName, { id: anchor, 'data-help-anchor': anchor, className }, children);
  };
}

function childrenToText(children: ReactNode): string {
  if (children == null || typeof children === 'boolean') {
    return '';
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map((child) => childrenToText(child)).join('');
  }
  if (typeof children === 'object' && 'props' in children) {
    return childrenToText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}
