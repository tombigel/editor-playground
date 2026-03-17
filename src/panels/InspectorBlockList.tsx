import type { ResolvedInspectorBlock } from './inspector/types';

export function InspectorBlockList({
  blocks,
  compact = false,
  scrollable = true,
}: {
  blocks: ResolvedInspectorBlock[];
  compact?: boolean;
  scrollable?: boolean;
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col text-xs ${scrollable ? 'overflow-auto' : ''} ${
        compact ? 'gap-2' : 'gap-1.5 p-2.5 pb-4'
      }`}
    >
      {blocks.map((block) => (
        <div
          key={block.id}
          data-inspector-block={block.id}
          data-inspector-bucket={block.bucket}
          data-inspector-align={block.align}
          data-inspector-layout={block.layout}
          className={block.align === 'start' ? 'self-start' : undefined}
        >
          {block.render ? (
            block.render()
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className={block.layout === 'grid-2' ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}>
                {block.sections.map((section) => (
                  <div key={section.id} data-inspector-section={section.id}>
                    {section.render()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
