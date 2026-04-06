import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useFontPreviewStylesheet } from '../inspector/useFontPreviewStylesheet';
import { Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import type { DocumentFontFamily, DocumentModel } from '../../model/types';
import {
  buildFontFamilyStack,
  buildFontPreviewStylesheetHref,
  getDocumentFontFamily,
  getDocumentFontUsageMap,
  queryGoogleFontFamilies,
  resolveNearestSupportedFontWeight,
  useGoogleFontsCatalog,
} from '../../api/fontApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListCard } from '@/components/ui/list-card';
import { PopoverTooltip } from '@/components/ui/popover';
import { Pager } from '@/components/ui/pager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabeledControlRow, LabeledFieldStack, NoticeSurface } from '@/components/ui/settings-panel';
import { Switch } from '@/components/ui/switch';
import { FONT_CATALOG_PAGE_SIZE, FONT_CATALOG_PAGE_SIZE_OPTIONS, paginateCatalogFamilies } from './pagination';

type Props = {
  document: DocumentModel;
  onAddFont: (family: DocumentFontFamily) => void;
  onRemoveFont: (familyName: string) => void;
  onToggleFavorite: (familyName: string) => void;
  onPurgeUnused: () => void;
};

type StoredBrowseState = {
  search: string;
  subset: string;
  category: string;
  favoritesOnly: boolean;
  usedOnly: boolean;
  hideVariable: boolean;
  pageSize: number;
};

const MANAGE_FONTS_STORAGE_KEY = 'sticky-playground.manage-fonts.filters';
export const DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER = 'western';

type LanguageFilterOption = {
  id: string;
  label: string;
};

type LanguageGroupDefinition = {
  id: string;
  label: string;
  subsets: string[];
  previewText: string;
};

const LANGUAGE_GROUP_DEFINITIONS: LanguageGroupDefinition[] = [
  {
    id: DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER,
    label: 'Western',
    subsets: ['latin', 'latin-ext'],
    previewText: 'Hamburgefonstiv 123',
  },
  {
    id: 'hebrew',
    label: 'Hebrew',
    subsets: ['hebrew'],
    previewText: 'אבגדהוז חטיכלמ נסעפצ',
  },
  {
    id: 'arabic',
    label: 'Arabic',
    subsets: ['arabic'],
    previewText: 'ابتثجح خدذرز سشص',
  },
  {
    id: 'cyrillic',
    label: 'Cyrillic',
    subsets: ['cyrillic', 'cyrillic-ext'],
    previewText: 'Аа Бб Вв Гг Дд Ее Жж',
  },
  {
    id: 'greek',
    label: 'Greek',
    subsets: ['greek', 'greek-ext'],
    previewText: 'Αα Ββ Γγ Δδ Εε Ζζ',
  },
  {
    id: 'devanagari',
    label: 'Devanagari',
    subsets: ['devanagari'],
    previewText: 'अआ इई उऊ कख गघ',
  },
  {
    id: 'thai',
    label: 'Thai',
    subsets: ['thai'],
    previewText: 'กข คฆ งจ ฉช ซญ',
  },
  {
    id: 'vietnamese',
    label: 'Vietnamese',
    subsets: ['vietnamese'],
    previewText: 'ĂÂ Ê Ô Ơ Ư Sắc Hỏi 123',
  },
];

export function ManageFontsPanel({
  document,
  onAddFont,
  onRemoveFont,
  onToggleFavorite,
  onPurgeUnused,
}: Props) {
  const { status, catalog, error, retry } = useGoogleFontsCatalog();
  const [filters, setFilters] = useState<StoredBrowseState>(() => readStoredBrowseState());
  const [catalogPage, setCatalogPage] = useState(1);
  const usageMap = useMemo(() => getDocumentFontUsageMap(document), [document]);
  const { search, subset, category, favoritesOnly, usedOnly, hideVariable, pageSize } = filters;
  const catalogUpdatedAt = status === 'ready' ? formatGoogleFontsCatalogTimestamp(catalog.fetchedAt) : null;

  useEffect(() => {
    writeStoredBrowseState(filters);
  }, [filters]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when any filter field changes
  useEffect(() => {
    setCatalogPage(1);
  }, [search, subset, category, favoritesOnly, usedOnly, hideVariable, pageSize]);

  const subsetOptions = useMemo(() => buildLanguageFilterOptions(catalog?.families ?? []), [catalog]);
  const categoryOptions = useMemo(
    () => ['all', ...new Set((catalog?.families ?? []).map((family) => family.category).filter(isNonEmptyString))].sort(compareStrings),
    [catalog],
  );

  useEffect(() => {
    if (!subsetOptions.some((option) => option.id === subset)) {
      setFilters((current) => ({ ...current, subset: DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER }));
    }
  }, [subset, subsetOptions]);

  useEffect(() => {
    if (category !== 'all' && !categoryOptions.includes(category)) {
      setFilters((current) => ({ ...current, category: 'all' }));
    }
  }, [category, categoryOptions]);

  const catalogFamilies = useMemo(() => {
    if (!catalog) {
      return [];
    }

    const queried = queryGoogleFontFamilies(catalog.families, {
      search,
      subsets: resolveLanguageFilterSubsets(subset, catalog.families),
      category: category === 'all' ? undefined : category,
      favoritesOnly,
      usedOnly,
      favoriteFamilies: document.fontLibrary.favorites,
      usedFamilies: document.fontLibrary.usedFamilies.map((family) => family.family),
      usageCounts: usageMap,
      sort: 'alpha',
    });

    return queried.filter((family) => !hideVariable || !family.isVariable).sort((left, right) => {
      const leftEntry = getDocumentFontFamily(document, left.family);
      const rightEntry = getDocumentFontFamily(document, right.family);
      const favoriteDelta = Number(Boolean(rightEntry?.favorite)) - Number(Boolean(leftEntry?.favorite));
      if (favoriteDelta !== 0) {
        return favoriteDelta;
      }

      const usedDelta = (usageMap[right.family] ?? 0) - (usageMap[left.family] ?? 0);
      if (usedDelta !== 0) {
        return usedDelta;
      }

      const subsetDelta = compareStrings(left.subsets[0], right.subsets[0]);
      if (subsetDelta !== 0) {
        return subsetDelta;
      }

      return compareStrings(left.family, right.family);
    });
  }, [catalog, category, document, favoritesOnly, hideVariable, search, subset, usageMap, usedOnly]);

  const documentFamilies = useMemo(
    () =>
      [...document.fontLibrary.usedFamilies].sort((left, right) => {
        const favoriteDelta = Number(Boolean(right.favorite)) - Number(Boolean(left.favorite));
        if (favoriteDelta !== 0) {
          return favoriteDelta;
        }

        const usedDelta = (usageMap[right.family] ?? 0) - (usageMap[left.family] ?? 0);
        if (usedDelta !== 0) {
          return usedDelta;
        }

        const subsetDelta = compareStrings(left.subsets[0], right.subsets[0]);
        if (subsetDelta !== 0) {
          return subsetDelta;
        }

        return compareStrings(left.family, right.family);
      }),
    [document.fontLibrary.usedFamilies, usageMap],
  );

  const pagination = useMemo(
    () => paginateCatalogFamilies(catalogFamilies, catalogPage, pageSize),
    [catalogFamilies, catalogPage, pageSize],
  );
  const {
    items: visibleCatalogFamilies,
    activePage: activeCatalogPage,
    totalPages: totalCatalogPages,
    rangeStart: visibleRangeStart,
    rangeEnd: visibleRangeEnd,
  } = pagination;

  const previewFamilies = useMemo(
    () => [
      ...documentFamilies,
      ...visibleCatalogFamilies.filter((family) => !documentFamilies.some((entry) => entry.family === family.family)),
    ],
    [documentFamilies, visibleCatalogFamilies],
  );
  const previewHref = useMemo(() => buildFontPreviewStylesheetHref(previewFamilies), [previewFamilies]);

  useEffect(() => {
    if (catalogPage > totalCatalogPages) {
      setCatalogPage(totalCatalogPages);
    }
  }, [catalogPage, totalCatalogPages]);

  useFontPreviewStylesheet(previewHref);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="editor-text-muted text-xs">{documentFamilies.length} families in this site library.</div>
          <Button type="button" variant="destructive" size="sm" onClick={onPurgeUnused}>
            <RotateCcw className="h-4 w-4" />
            Purge unused
          </Button>
        </div>

        <div className="space-y-2">
          {documentFamilies.map((family) => {
            const usageCount = usageMap[family.family] ?? 0;
            const removable = usageCount === 0;
            return (
              <ListCard
                key={family.family}
                title={family.family}
                description={getFontPreviewText(family, subset)}
                meta={formatFontMeta(family, usageCount)}
                tone="subtle"
                titleStyle={buildPreviewStyle(family)}
                descriptionStyle={buildPreviewStyle(family)}
                actions={
                  <>
                    <FontButtonTooltip label={family.favorite ? 'Unfavorite' : 'Favorite'}>
                      <Button
                        type="button"
                        variant={family.favorite ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={family.favorite ? `Unfavorite ${family.family}` : `Favorite ${family.family}`}
                        onClick={() => onToggleFavorite(family.family)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    </FontButtonTooltip>
                    <FontButtonTooltip label={removable ? 'Remove from site' : 'Used fonts cannot be deleted'}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={`Remove ${family.family}`}
                        onClick={() => onRemoveFont(family.family)}
                        disabled={!removable}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </FontButtonTooltip>
                  </>
                }
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="editor-text-strong text-sm font-semibold">Browse Google Fonts</div>
          {status === 'ready' ? <div className="editor-text-muted text-[11px]">Catalog updated {catalogUpdatedAt}</div> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px]">
          <LabeledFieldStack label="Search" className="space-y-1" labelClassName="text-[11px] font-medium">
            <Input
              value={search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search families, languages, tags"
            />
          </LabeledFieldStack>
          <LabeledFieldStack label="Language" className="space-y-1" labelClassName="text-[11px] font-medium">
            <Select value={subset} onValueChange={(value) => setFilters((current) => ({ ...current, subset: value }))}>
              <SelectTrigger className="text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subsetOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledFieldStack>
          <LabeledFieldStack label="Category" className="space-y-1" labelClassName="text-[11px] font-medium">
            <Select value={category} onValueChange={(value) => setFilters((current) => ({ ...current, category: value }))}>
              <SelectTrigger className="text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabeledFieldStack>
        </div>

        <div className="flex flex-wrap gap-4">
          <FilterToggle
            label="Favorites only"
            checked={favoritesOnly}
            onCheckedChange={(checked) => setFilters((current) => ({ ...current, favoritesOnly: checked }))}
          />
          <FilterToggle
            label="Used only"
            checked={usedOnly}
            onCheckedChange={(checked) => setFilters((current) => ({ ...current, usedOnly: checked }))}
          />
          <FilterToggle
            label="Hide variable"
            checked={hideVariable}
            onCheckedChange={(checked) => setFilters((current) => ({ ...current, hideVariable: checked }))}
          />
        </div>

        {status === 'loading' ? (
          <NoticeSurface tone="muted" className="px-0 py-0 text-sm">
            Loading Google Fonts catalog…
          </NoticeSurface>
        ) : null}
        {status === 'error' ? (
          <NoticeSurface tone="danger" className="block px-3 py-3">
            <div className="editor-text-strong text-sm font-medium">Could not load Google Fonts</div>
            <div className="mt-1 text-xs">{error}</div>
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          </NoticeSurface>
        ) : null}
        {status === 'ready' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="editor-text-muted text-xs">
                {catalogFamilies.length > 0
                  ? `Showing ${visibleRangeStart}-${visibleRangeEnd} of ${catalogFamilies.length}`
                  : 'No families match the current filters.'}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <LabeledControlRow
                    label="Show"
                    className="gap-2"
                    labelClassName="editor-text-muted flex-none text-[11px] font-medium"
                    controlClassName="ml-0"
                  >
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) =>
                        setFilters((current) => ({ ...current, pageSize: normalizeCatalogPageSize(Number.parseInt(value, 10)) }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[72px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_CATALOG_PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </LabeledControlRow>
                </div>
                <Pager
                  currentPage={activeCatalogPage}
                  totalPages={totalCatalogPages}
                  onPrevious={() => setCatalogPage((page) => Math.max(1, page - 1))}
                  onNext={() => setCatalogPage((page) => Math.min(totalCatalogPages, page + 1))}
                  hideWhenSinglePage={catalogFamilies.length <= pageSize}
                />
              </div>
            </div>
            {visibleCatalogFamilies.map((family) => {
              const existing = getDocumentFontFamily(document, family.family);
              const usageCount = usageMap[family.family] ?? 0;
              return (
                <ListCard
                  key={family.family}
                  title={family.family}
                  description={getFontPreviewText(family, subset)}
                  meta={formatFontMeta(family, usageCount)}
                  titleStyle={buildPreviewStyle(family)}
                  descriptionStyle={buildPreviewStyle(family)}
                  actions={
                    <>
                      <FontButtonTooltip label={existing?.favorite ? 'Unfavorite' : 'Favorite'}>
                        <Button
                          type="button"
                          variant={existing?.favorite ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={existing?.favorite ? `Unfavorite ${family.family}` : `Favorite ${family.family}`}
                          onClick={() =>
                            existing
                              ? onToggleFavorite(existing.family)
                              : onAddFont({ ...family, favorite: true, origin: 'added' })
                          }
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      </FontButtonTooltip>
                      {!existing ? (
                        <FontButtonTooltip label="Add to site">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label={`Add ${family.family}`}
                            onClick={() => onAddFont({ ...family, favorite: false, origin: 'added' })}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </FontButtonTooltip>
                      ) : null}
                    </>
                  }
                />
              );
            })}
            <div className="flex justify-end">
              <Pager
                currentPage={activeCatalogPage}
                totalPages={totalCatalogPages}
                onPrevious={() => setCatalogPage((page) => Math.max(1, page - 1))}
                onNext={() => setCatalogPage((page) => Math.min(totalCatalogPages, page + 1))}
                hideWhenSinglePage={catalogFamilies.length <= pageSize}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function compareStrings(left: unknown, right: unknown) {
  return sanitizeString(left).localeCompare(sanitizeString(right));
}

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStoredBrowseState(): StoredBrowseState {
  if (typeof window === 'undefined') {
    return createDefaultBrowseState();
  }

  try {
    const raw = window.localStorage.getItem(MANAGE_FONTS_STORAGE_KEY);
    if (!raw) {
      return createDefaultBrowseState();
    }

    return sanitizeStoredBrowseState(JSON.parse(raw));
  } catch {
    return createDefaultBrowseState();
  }
}

function writeStoredBrowseState(state: StoredBrowseState) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(MANAGE_FONTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function sanitizeStoredBrowseState(value: unknown): StoredBrowseState {
  if (!value || typeof value !== 'object') {
    return createDefaultBrowseState();
  }

  const state = value as Partial<StoredBrowseState>;
  return {
    search: typeof state.search === 'string' ? state.search : '',
    subset: normalizeManageFontsLanguageFilter(typeof state.subset === 'string' ? state.subset : ''),
    category: typeof state.category === 'string' && state.category.trim() ? state.category : 'all',
    favoritesOnly: Boolean(state.favoritesOnly),
    usedOnly: Boolean(state.usedOnly),
    hideVariable: state.hideVariable === undefined ? true : Boolean(state.hideVariable),
    pageSize: normalizeCatalogPageSize(typeof state.pageSize === 'number' ? state.pageSize : Number.NaN),
  };
}

function createDefaultBrowseState(): StoredBrowseState {
  return {
    search: '',
    subset: DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER,
    category: 'all',
    favoritesOnly: false,
    usedOnly: false,
    hideVariable: true,
    pageSize: FONT_CATALOG_PAGE_SIZE,
  };
}

export function normalizeCatalogPageSize(value: number) {
  return FONT_CATALOG_PAGE_SIZE_OPTIONS.includes(value as (typeof FONT_CATALOG_PAGE_SIZE_OPTIONS)[number])
    ? value
    : FONT_CATALOG_PAGE_SIZE;
}

export function formatGoogleFontsCatalogTimestamp(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'unknown';
  }

  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function buildPreviewStyle(family: DocumentFontFamily) {
  return {
    fontFamily: buildFontFamilyStack(family.family),
    fontWeight: resolveNearestSupportedFontWeight(400, family),
  };
}

function getFontPreviewText(family: DocumentFontFamily, activeSubset: string) {
  const previewSubset = resolvePreviewSubset(family, activeSubset);
  return LANGUAGE_GROUP_DEFINITIONS.find((group) => group.subsets.includes(previewSubset))?.previewText ?? 'Hamburgefonstiv 123';
}

function formatFontMeta(family: DocumentFontFamily, usageCount: number) {
  return [
    family.category,
    getPrimaryLanguageLabel(family),
    `${usageCount} used`,
    family.isVariable ? 'variable' : `${family.variants.length} styles`,
  ].join(' · ');
}

export function buildLanguageFilterOptions(families: Array<Pick<DocumentFontFamily, 'subsets'>>): LanguageFilterOption[] {
  const availableSubsets = collectAvailableSubsets(families);
  const coveredSubsets = new Set(LANGUAGE_GROUP_DEFINITIONS.flatMap((group) => group.subsets));
  const options: LanguageFilterOption[] = [
    { id: DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER, label: 'Western' },
    { id: 'all', label: 'All languages' },
  ];

  for (const group of LANGUAGE_GROUP_DEFINITIONS) {
    if (group.id === DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER) {
      continue;
    }
    if (group.subsets.some((subset) => availableSubsets.has(subset))) {
      options.push({ id: group.id, label: group.label });
    }
  }

  if ([...availableSubsets].some((subset) => !coveredSubsets.has(subset))) {
    options.push({ id: 'other', label: 'Other' });
  }

  return options;
}

export function normalizeManageFontsLanguageFilter(value: string) {
  const normalizedValue = sanitizeString(value).toLowerCase();
  if (!normalizedValue) {
    return DEFAULT_MANAGE_FONTS_LANGUAGE_FILTER;
  }
  if (normalizedValue === 'all' || normalizedValue === 'other') {
    return normalizedValue;
  }
  if (LANGUAGE_GROUP_DEFINITIONS.some((group) => group.id === normalizedValue)) {
    return normalizedValue;
  }
  const matchedGroup = LANGUAGE_GROUP_DEFINITIONS.find((group) => group.subsets.includes(normalizedValue));
  if (matchedGroup) {
    return matchedGroup.id;
  }
  return 'other';
}

export function resolveLanguageFilterSubsets(filterId: string, families: Array<Pick<DocumentFontFamily, 'subsets'>>) {
  const normalizedFilter = normalizeManageFontsLanguageFilter(filterId);
  if (normalizedFilter === 'all') {
    return undefined;
  }

  const availableSubsets = collectAvailableSubsets(families);
  if (normalizedFilter === 'other') {
    const knownSubsets = new Set(LANGUAGE_GROUP_DEFINITIONS.flatMap((group) => group.subsets));
    const otherSubsets = [...availableSubsets].filter((subset) => !knownSubsets.has(subset));
    return otherSubsets.length > 0 ? otherSubsets : undefined;
  }

  const matchedGroup = LANGUAGE_GROUP_DEFINITIONS.find((group) => group.id === normalizedFilter);
  if (!matchedGroup) {
    return undefined;
  }

  const matchingSubsets = matchedGroup.subsets.filter((subset) => availableSubsets.has(subset));
  return matchingSubsets.length > 0 ? matchingSubsets : matchedGroup.subsets;
}

function collectAvailableSubsets(families: Array<Pick<DocumentFontFamily, 'subsets'>>) {
  return new Set(families.flatMap((family) => family.subsets.map((subset) => sanitizeString(subset).toLowerCase()).filter(Boolean)));
}

function resolvePreviewSubset(family: DocumentFontFamily, activeFilter: string) {
  const familySubsets = family.subsets.map((subset) => sanitizeString(subset).toLowerCase()).filter(Boolean);
  const normalizedFilter = normalizeManageFontsLanguageFilter(activeFilter);

  if (normalizedFilter === 'all') {
    return familySubsets[0] ?? 'latin';
  }

  if (normalizedFilter === 'other') {
    const knownSubsets = new Set(LANGUAGE_GROUP_DEFINITIONS.flatMap((group) => group.subsets));
    return familySubsets.find((subset) => !knownSubsets.has(subset)) ?? familySubsets[0] ?? 'latin';
  }

  const matchedGroup = LANGUAGE_GROUP_DEFINITIONS.find((group) => group.id === normalizedFilter);
  return matchedGroup?.subsets.find((subset) => familySubsets.includes(subset)) ?? familySubsets[0] ?? 'latin';
}

function getPrimaryLanguageLabel(family: DocumentFontFamily) {
  const primarySubset = family.subsets.map((subset) => sanitizeString(subset).toLowerCase()).find(Boolean);
  if (!primarySubset) {
    return 'General';
  }
  return LANGUAGE_GROUP_DEFINITIONS.find((group) => group.subsets.includes(primarySubset))?.label ?? 'Other';
}

function FontButtonTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <PopoverTooltip
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
      side="top"
      align="center"
      offset={8}
    >
      {children}
    </PopoverTooltip>
  );
}

function FilterToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: label wraps Radix Switch which renders an internal input
    <label className="flex items-center gap-2 text-[11px] font-medium">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </label>
  );
}
