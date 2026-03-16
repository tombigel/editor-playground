import type { DocumentNode } from '../../model/types';

export type SiteExportableNode = Exclude<DocumentNode, { type: 'site' }>;
