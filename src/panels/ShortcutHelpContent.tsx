import { Keyboard } from 'lucide-react';
import { getShortcutDefinitionsByCategory, getShortcutGestures, getShortcutPlatform } from '@/lib/shortcuts';

type Props = {
  compact?: boolean;
  showHeader?: boolean;
};

export function ShortcutHelpContent({ compact = false, showHeader = true }: Props) {
  const platform = getShortcutPlatform();
  const categories = getShortcutDefinitionsByCategory(platform);
  const gestures = getShortcutGestures(platform);
  const modLabel = platform === 'mac' ? 'Cmd' : 'Ctrl';
  const itemTextClass = compact ? 'text-xs leading-4' : 'text-[13px] leading-4';
  const categoriesByName = Object.fromEntries(categories.map((category) => [category.category, category])) as Record<
    (typeof categories)[number]['category'],
    (typeof categories)[number]
  >;

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div className="flex items-center gap-2.5">
          <div className="editor-icon-surface flex h-9 w-9 items-center justify-center rounded-lg border">
            <Keyboard className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="editor-text-strong text-[13px] font-medium leading-4">Keyboard shortcuts</div>
            <div className="editor-text-muted text-xs leading-4">
              Mod maps to {modLabel}. Arrange keeps bracket keys for layer order with platform-specific front and back variants.
            </div>
          </div>
        </div>
      ) : null}

      {compact ? (
        <>
          <div className="grid gap-3 xl:grid-cols-2">
            {categories.map((category) => (
              <ShortcutSection
                key={category.category}
                title={category.category}
                items={category.items}
                itemTextClass={itemTextClass}
              />
            ))}
          </div>
          <PointerModifiersSection gestures={gestures} itemTextClass={itemTextClass} compact />
        </>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            <ShortcutSection
              title={categoriesByName.Edit.category}
              items={categoriesByName.Edit.items}
              itemTextClass={itemTextClass}
            />
            <ShortcutSection
              title={categoriesByName.View.category}
              items={categoriesByName.View.items}
              itemTextClass={itemTextClass}
            />
            <PointerModifiersSection gestures={gestures} itemTextClass={itemTextClass} />
          </div>
          <div className="space-y-3">
            <ShortcutSection
              title={categoriesByName.General.category}
              items={categoriesByName.General.items}
              itemTextClass={itemTextClass}
            />
            <ArrangeSection items={categoriesByName.Arrange.items} itemTextClass={itemTextClass} />
          </div>
        </div>
      )}
    </div>
  );
}

type ShortcutItem = ReturnType<typeof getShortcutDefinitionsByCategory>[number]['items'][number];

function ShortcutSection({
  title,
  items,
  itemTextClass,
  itemsClassName = 'mt-2.5 space-y-2.5',
}: {
  title: string;
  items: ShortcutItem[];
  itemTextClass: string;
  itemsClassName?: string;
}) {
  return (
    <section className="editor-bg-subtle editor-border-subtle rounded-lg border p-3.5">
      <div className="editor-text-muted text-[11px] font-medium leading-4">{title}</div>
      <div className={itemsClassName}>
        {items.map((item) => (
          <ShortcutRow key={item.id} item={item} itemTextClass={itemTextClass} />
        ))}
      </div>
    </section>
  );
}

function ArrangeSection({
  items,
  itemTextClass,
}: {
  items: ShortcutItem[];
  itemTextClass: string;
}) {
  const alignItems = items.filter((item) => item.id.startsWith('alignSelection'));
  const distributeItems = items.filter((item) => item.id.startsWith('distributeSelection'));
  const orderItems = items.filter((item) => item.id.startsWith('order'));

  return (
    <section className="editor-bg-subtle editor-border-subtle rounded-lg border p-3.5">
      <div className="editor-text-muted text-[11px] font-medium leading-4">Arrange</div>
      <div className="mt-2.5 space-y-3">
        <ShortcutSubsection title="Align" items={alignItems} itemTextClass={itemTextClass} />
        <ShortcutSubsection title="Distribute" items={distributeItems} itemTextClass={itemTextClass} />
        <ShortcutSubsection title="Order" items={orderItems} itemTextClass={itemTextClass} />
      </div>
    </section>
  );
}

function ShortcutSubsection({
  title,
  items,
  itemTextClass,
}: {
  title: string;
  items: ShortcutItem[];
  itemTextClass: string;
}) {
  return (
    <div>
      <div className="editor-text-muted text-[11px] font-medium leading-4">{title}</div>
      <div className="mt-2 space-y-2.5">
        {items.map((item) => (
          <ShortcutRow key={item.id} item={item} itemTextClass={itemTextClass} />
        ))}
      </div>
    </div>
  );
}

function ShortcutRow({
  item,
  itemTextClass,
}: {
  item: ShortcutItem;
  itemTextClass: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0">
        <div className={`editor-text-strong font-medium ${itemTextClass}`}>{item.description}</div>
      </div>
      <kbd className="editor-kbd max-w-[14rem] px-1.5 py-0.5 text-right text-[11px] font-medium leading-4 shadow-sm rounded-md border whitespace-normal break-words">
        {item.label}
      </kbd>
    </div>
  );
}

function PointerModifiersSection({
  gestures,
  itemTextClass,
  compact = false,
}: {
  gestures: ReturnType<typeof getShortcutGestures>;
  itemTextClass: string;
  compact?: boolean;
}) {
  return (
    <section className="editor-bg-subtle editor-border-subtle rounded-lg border p-3.5">
      <div className="editor-text-muted text-[11px] font-medium leading-4">Pointer Modifiers</div>
      <div className={`mt-2.5 grid gap-2.5 ${compact ? 'sm:grid-cols-2' : ''}`}>
        {gestures.map((gesture) => (
          <div key={gesture.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className={`editor-text-strong ${itemTextClass}`}>{gesture.description}</div>
            </div>
            <kbd className="editor-kbd max-w-[14rem] rounded-md border px-1.5 py-0.5 text-right text-[11px] font-medium leading-4 shadow-sm whitespace-normal break-words">
              {gesture.label}
            </kbd>
          </div>
        ))}
      </div>
    </section>
  );
}
