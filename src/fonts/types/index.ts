import type { DocumentFontFamily, FontAxis } from '../../model/types';

export type GoogleFontsRemoteSort = 'alpha' | 'date' | 'popularity' | 'style' | 'trending';
export type GoogleFontSort = 'used' | 'language' | 'alpha' | 'popularity' | 'trending' | 'date' | 'style';

export type GoogleFontsApiAxis = {
  tag: string;
  start: number;
  end: number;
};

export type GoogleFontsApiFamily = {
  family: string;
  category: string;
  subsets?: string[];
  variants?: string[];
  axes?: GoogleFontsApiAxis[];
  lastModified?: string;
  version?: string;
  tags?: string[];
};

export type GoogleFontsApiResponse = {
  kind: string;
  items: GoogleFontsApiFamily[];
};

export type GoogleFontFamily = DocumentFontFamily & {
  tags?: string[];
};

export type GoogleFontsCatalog = {
  source: 'google-fonts';
  families: GoogleFontFamily[];
  fetchedAt: string;
  remoteSort: GoogleFontsRemoteSort;
};

export type GoogleFontsQuery = {
  search?: string;
  subsets?: string[];
  category?: string;
  favoritesOnly?: boolean;
  usedOnly?: boolean;
  variableOnly?: boolean;
  sort?: GoogleFontSort;
  limit?: number;
  favoriteFamilies?: string[];
  usedFamilies?: string[];
  usageCounts?: Record<string, number>;
};

export type GoogleFontsFetchOptions = {
  apiKey?: string;
  sort?: GoogleFontsRemoteSort;
  signal?: AbortSignal;
};

export type NormalizedGoogleFontFamily = GoogleFontFamily;
export type NormalizedGoogleFontAxis = FontAxis;
