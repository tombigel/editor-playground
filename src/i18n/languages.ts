import languageData from './languages.json';

export type LanguageOption = {
  tag: string;
  name: string;
  nativeName: string;
  order?: number;
  deprecated?: boolean;
  deprecatedNote?: string;
};

export type LanguageSelectOption = {
  value: string;
  label: string;
  keywords?: string[];
  description?: string;
  dividerAfter?: boolean;
};

const DEFAULT_SITE_LANGUAGE = 'en-US';

const allLanguages = [...(languageData.languages as LanguageOption[])];

export const LANGUAGE_OPTIONS = allLanguages.sort((left, right) => {
  const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.order ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.name.localeCompare(right.name);
});

const languageByTag = new Map(LANGUAGE_OPTIONS.map((language) => [language.tag, language]));

export function getDefaultSiteLanguage() {
  return DEFAULT_SITE_LANGUAGE;
}

export function getLanguageByTag(tag: string | null | undefined) {
  if (!tag) {
    return null;
  }
  return languageByTag.get(tag) ?? null;
}

export function getLanguageLabel(tag: string | null | undefined) {
  const language = getLanguageByTag(tag);
  if (!language) {
    return tag ?? '';
  }
  return `${language.name} (${language.tag})`;
}

export function matchesLanguageQuery(language: LanguageOption, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return (
    language.name.toLowerCase().includes(normalized) ||
    language.nativeName.toLowerCase().includes(normalized) ||
    language.tag.toLowerCase().includes(normalized)
  );
}

export function createLanguageSelectOptions({
  includeSiteLanguage = false,
  siteLanguageTag,
}: {
  includeSiteLanguage?: boolean;
  siteLanguageTag?: string | null | undefined;
} = {}): LanguageSelectOption[] {
  const options: LanguageSelectOption[] = [];

  if (includeSiteLanguage) {
    options.push({
      value: '__site__',
      label: 'Site language',
      description: getLanguageLabel(siteLanguageTag ?? getDefaultSiteLanguage()),
      keywords: ['site language'],
    });
  }

  options.push(
    ...LANGUAGE_OPTIONS.map((language) => ({
      value: language.tag,
      label: getLanguageLabel(language.tag),
      description:
        language.nativeName !== language.name ? language.nativeName : undefined,
      keywords: [language.name, language.nativeName, language.tag],
      dividerAfter: language.tag === 'he',
    })),
  );

  return options;
}
