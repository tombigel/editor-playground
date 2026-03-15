import { Keyboard } from 'lucide-react';
import { SHORTCUT_GESTURES, getShortcutDefinitionsByCategory, getShortcutPlatform } from '@/lib/shortcuts';

type Props = {
  compact?: boolean;
};

export function ShortcutHelpContent({ compact = false }: Props) {
  const platform = getShortcutPlatform();
  const categories = getShortcutDefinitionsByCategory(platform);
  const modLabel = platform === 'mac' ? 'Cmd' : 'Ctrl';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="editor-icon-surface flex h-10 w-10 items-center justify-center rounded-xl border">
          <Keyboard className="h-4 w-4" />
        </div>
        <div>
          <div className="editor-text-strong text-sm font-medium">Keyboard shortcuts</div>
          <div className="editor-text-muted text-sm">
            Mod maps to {modLabel}. Arrange uses the standard bracket keys for layer order.
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? 'xl:grid-cols-2' : 'md:grid-cols-2'}`}>
        {categories.map((category) => (
          <section key={category.category} className="editor-bg-subtle editor-border-subtle rounded-xl border p-4">
            <div className="editor-text-muted text-xs font-semibold uppercase tracking-[0.12em]">{category.category}</div>
            <div className="mt-3 space-y-3">
              {category.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="editor-text-strong text-sm font-medium">{item.description}</div>
                  </div>
                  <kbd className="editor-kbd rounded-md border px-2 py-1 text-xs font-medium shadow-sm">
                    {item.label}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="editor-bg-subtle editor-border-subtle rounded-xl border p-4">
        <div className="editor-text-muted text-xs font-semibold uppercase tracking-[0.12em]">Pointer Modifiers</div>
        <div className="mt-3 space-y-3">
          {SHORTCUT_GESTURES.map((gesture) => (
            <div key={gesture.label} className="flex items-start justify-between gap-4">
              <div className="editor-text-strong text-sm">{gesture.description}</div>
              <kbd className="editor-kbd rounded-md border px-2 py-1 text-xs font-medium shadow-sm">
                {gesture.label}
              </kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
