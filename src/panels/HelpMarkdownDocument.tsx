import { createElement, type MouseEvent, type ReactNode, useEffect, useEffectEvent, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveHelpLink, slugifyMarkdownHeading, type HelpLinkTarget, type MarkdownHelpEntry } from './helpDocs';

const helpDocumentCache = new Map<string, string>();

type Props = {
  entry: MarkdownHelpEntry;
  availableDocPaths: Set<string>;
  onNavigate: (target: HelpLinkTarget) => void;
  onContentReady: () => void;
};

const HELP_LINK_CLASS_NAME = 'text-left text-[color:var(--editor-accent)] underline underline-offset-2';

export function HelpMarkdownDocument({ entry, availableDocPaths, onNavigate, onContentReady }: Props) {
  const [raw, setRaw] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const notifyContentReady = useEffectEvent(onContentReady);

  useEffect(() => {
    const controller = new AbortController();
    const cachedRaw = helpDocumentCache.get(entry.assetUrl);

    if (cachedRaw != null) {
      setRaw(cachedRaw);
      setLoadError(false);
      return () => controller.abort();
    }

    setRaw(null);
    setLoadError(false);

    void fetch(entry.assetUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load help document: ${entry.assetUrl}`);
        }
        return response.text();
      })
      .then((nextRaw) => {
        helpDocumentCache.set(entry.assetUrl, nextRaw);
        setRaw(nextRaw);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setLoadError(true);
      });

    return () => controller.abort();
  }, [entry.assetUrl]);

  useEffect(() => {
    if (raw == null) {
      return;
    }
    notifyContentReady();
  }, [raw]);

  const components: Components = {
    h1: createHeadingComponent('h1'),
    h2: createHeadingComponent('h2'),
    h3: createHeadingComponent('h3'),
    h4: createHeadingComponent('h4'),
    h5: createHeadingComponent('h5'),
    h6: createHeadingComponent('h6'),
    table: ({ children }) => (
      <div className="help-markdown-table editor-scrollbar">
        <table>{children}</table>
      </div>
    ),
    a: ({ href, children }) => renderHelpLink({
      currentPath: entry.path,
      href: href ?? '',
      availableDocPaths,
      onNavigate,
      children,
    }),
  };

  if (loadError) {
    return <div className="editor-text-muted text-sm">Unable to load {entry.fileName}.</div>;
  }

  if (raw == null) {
    return (
      <div className="space-y-3">
        <div className="editor-text-muted text-sm">Loading {entry.fileName}…</div>
        <div className="editor-bg-subtle editor-border-subtle h-24 rounded-lg border" />
        <div className="editor-bg-subtle editor-border-subtle h-24 rounded-lg border" />
      </div>
    );
  }

  return (
    <div className="help-markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {raw}
      </Markdown>
    </div>
  );
}

function createHeadingComponent(tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
  return function Heading({ children }: { children?: ReactNode }) {
    const anchor = slugifyMarkdownHeading(childrenToText(children));
    return createElement(tagName, { id: anchor, 'data-help-anchor': anchor }, children);
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

type RenderHelpLinkOptions = {
  currentPath: string;
  href: string;
  availableDocPaths: Set<string>;
  onNavigate: (target: HelpLinkTarget) => void;
  children?: ReactNode;
};

export function renderHelpLink({ currentPath, href, availableDocPaths, onNavigate, children }: RenderHelpLinkOptions) {
  const target = resolveHelpLink(currentPath, href, availableDocPaths);

  if (target.kind === 'document' || target.kind === 'anchor') {
    return (
      <a
        href={href}
        className={HELP_LINK_CLASS_NAME}
        onClick={(event) => handleInternalHelpLinkClick(event, target, onNavigate)}
      >
        {children}
      </a>
    );
  }

  if (target.kind === 'external') {
    return (
      <a href={target.href} target="_blank" rel="noreferrer" className={HELP_LINK_CLASS_NAME}>
        {children}
      </a>
    );
  }

  return <span className="editor-text-muted underline decoration-dotted underline-offset-2">{children}</span>;
}

function handleInternalHelpLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  target: Extract<HelpLinkTarget, { kind: 'document' | 'anchor' }>,
  onNavigate: (target: HelpLinkTarget) => void,
) {
  event.preventDefault();
  onNavigate(target);
}
