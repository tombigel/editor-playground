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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
          <Keyboard className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-900">Keyboard shortcuts</div>
          <div className="text-sm text-slate-500">
            Mod maps to {modLabel}. Arrange uses the standard bracket keys for layer order.
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? 'xl:grid-cols-2' : 'md:grid-cols-2'}`}>
        {categories.map((category) => (
          <section key={category.category} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{category.category}</div>
            <div className="mt-3 space-y-3">
              {category.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">{item.description}</div>
                  </div>
                  <kbd className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
                    {item.label}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pointer Modifiers</div>
        <div className="mt-3 space-y-3">
          {SHORTCUT_GESTURES.map((gesture) => (
            <div key={gesture.label} className="flex items-start justify-between gap-4">
              <div className="text-sm text-slate-900">{gesture.description}</div>
              <kbd className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
                {gesture.label}
              </kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
