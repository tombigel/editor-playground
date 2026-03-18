import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const previewLinkId = useId();
  const [filters, setFilters] = useState<StoredBrowseState>(() => readStoredBrowseState());
  const [catalogPage, setCatalogPage] = useState(1);
  const usageMap = useMemo(() => getDocumentFontUsageMap(document), [document]);
  const { search, subset, category, favoritesOnly, usedOnly, hideVariable, pageSize } = filters;
  const catalogUpdatedAt = status === 'ready' ? formatGoogleFontsCatalogTimestamp(catalog.fetchedAt) : null;

  useEffect(() => {
    writeStoredBrowseState(filters);
  }, [filters]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = window.document.getElementById(previewLinkId) as HTMLLinkElement | null;
    if (!previewHref) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.href = previewHref;
      return;
    }

    const link = window.document.createElement('link');
    link.id = previewLinkId;
    link.rel = 'stylesheet';
    link.href = previewHref;
    window.document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [previewHref, previewLinkId]);

  return (
    <div className="space-y-3">
      <Card className="editor-border-subtle rounded-lg shadow-none">
        <CardHeader className="px-3 pt-3 pb-1">
          <CardTitle className="text-xs">Document fonts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pt-1.5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="editor-text-muted text-xs">{documentFamilies.length} families in this document library.</div>
            <Button type="button" variant="outline" size="sm" onClick={onPurgeUnused}>
              <RotateCcw className="h-4 w-4" />
              Purge unused
            </Button>
          </div>

          <div className="space-y-2">
            {documentFamilies.map((family) => {
              const usageCount = usageMap[family.family] ?? 0;
              const removable = usageCount === 0;
              return (
                <div key={family.family} className="editor-border-subtle flex items-start gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="editor-text-strong truncate text-[16px] font-medium leading-5" style={buildPreviewStyle(family)}>
                      {family.family}
                    </div>
                    <div className="editor-text-muted mt-1 truncate text-[14px] leading-5" style={buildPreviewStyle(family)}>
                      {getFontPreviewText(family, subset)}
                    </div>
                  </div>
                  <div className="editor-text-muted shrink-0 pt-0.5 text-right text-[11px] leading-5">
                    {formatFontMeta(family, usageCount)}
                  </div>
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="editor-border-subtle rounded-lg shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-3 pt-3 pb-1">
          <CardTitle className="text-xs">Browse Google Fonts</CardTitle>
          {status === 'ready' ? <div className="editor-text-muted text-[11px]">Catalog updated {catalogUpdatedAt}</div> : null}
        </CardHeader>
        <CardContent className="space-y-3 px-3 pt-1.5 pb-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_140px]">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Search</Label>
              <Input
                value={search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search families, languages, tags"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Language</Label>
              <Select value={subset} onValueChange={(value) => setFilters((current) => ({ ...current, subset: value }))}>
                <SelectTrigger className="h-9 text-[11px]">
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
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Category</Label>
              <Select value={category} onValueChange={(value) => setFilters((current) => ({ ...current, category: value }))}>
                <SelectTrigger className="h-9 text-[11px]">
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
            </div>
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

          {status === 'loading' ? <div className="editor-text-muted text-sm">Loading Google Fonts catalog…</div> : null}
          {status === 'error' ? (
            <div className="editor-border-subtle rounded-lg border px-3 py-3">
              <div className="editor-text-strong text-sm font-medium">Could not load Google Fonts</div>
              <div className="editor-text-muted mt-1 text-xs">{error}</div>
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={retry}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}
          {status === 'ready' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="editor-text-muted text-xs">
                  {catalogFamilies.length > 0
                    ? `Showing ${visibleRangeStart}-${visibleRangeEnd} of ${catalogFamilies.length} families`
                    : 'No families match the current filters.'}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="editor-text-muted text-[11px] font-medium">Page size</Label>
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
                  </div>
                  <CatalogPaginationControls
                    totalFamilies={catalogFamilies.length}
                    activePage={activeCatalogPage}
                    totalPages={totalCatalogPages}
                    pageSize={pageSize}
                    onPrevious={() => setCatalogPage((page) => Math.max(1, page - 1))}
                    onNext={() => setCatalogPage((page) => Math.min(totalCatalogPages, page + 1))}
                  />
                </div>
              </div>
              {visibleCatalogFamilies.map((family) => {
                const existing = getDocumentFontFamily(document, family.family);
                const usageCount = usageMap[family.family] ?? 0;
                return (
                  <div key={family.family} className="editor-border-subtle flex items-start gap-3 rounded-lg border px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="editor-text-strong truncate text-[16px] font-medium leading-5" style={buildPreviewStyle(family)}>
                        {family.family}
                      </div>
                      <div className="editor-text-muted mt-1 truncate text-[14px] leading-5" style={buildPreviewStyle(family)}>
                        {getFontPreviewText(family, subset)}
                      </div>
                    </div>
                    <div className="editor-text-muted shrink-0 pt-0.5 text-right text-[11px] leading-5">
                      {formatFontMeta(family, usageCount)}
                    </div>
                    {existing ? (
                      <Button
                        type="button"
                        variant={existing.favorite ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={existing.favorite ? `Unfavorite ${existing.family}` : `Favorite ${existing.family}`}
                        onClick={() => onToggleFavorite(existing.family)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddFont({ ...family, favorite: false, origin: 'added' })}
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end">
                <CatalogPaginationControls
                  totalFamilies={catalogFamilies.length}
                  activePage={activeCatalogPage}
                  totalPages={totalCatalogPages}
                  pageSize={pageSize}
                  onPrevious={() => setCatalogPage((page) => Math.max(1, page - 1))}
                  onNext={() => setCatalogPage((page) => Math.min(totalCatalogPages, page + 1))}
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
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
    <label className="flex items-center gap-2 text-[11px] font-medium">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span>{label}</span>
    </label>
  );
}

function CatalogPaginationControls({
  totalFamilies,
  activePage,
  totalPages,
  pageSize,
  onPrevious,
  onNext,
}: {
  totalFamilies: number;
  activePage: number;
  totalPages: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalFamilies <= pageSize) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={onPrevious}
        disabled={activePage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>
      <div className="editor-text-muted min-w-[72px] text-center text-[11px]">
        Page {activePage} / {totalPages}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={onNext}
        disabled={activePage === totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
