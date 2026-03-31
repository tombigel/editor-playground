import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownToLine,
  Eye,
  Keyboard,
  SlidersHorizontal,
  ToggleRight,
  Type,
} from 'lucide-react';

export type SettingsSectionId =
  | 'display'
  | 'defaults'
  | 'fonts'
  | 'transfer'
  | 'advanced'
  | 'shortcuts';

export type SettingsSectionMeta = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const DEFAULT_SETTINGS_SECTION_ID: SettingsSectionId = 'display';

export const SETTINGS_SECTION_META: SettingsSectionMeta[] = [
  {
    id: 'display',
    label: 'UI',
    icon: Eye,
    description: 'Theme, preview, and guides.',
  },
  {
    id: 'defaults',
    label: 'Defaults',
    icon: ToggleRight,
    description: 'Document-wide default behaviors.',
  },
  {
    id: 'fonts',
    label: 'Fonts',
    icon: Type,
    description: 'Site font library.',
  },
  {
    id: 'transfer',
    label: 'Import / Export',
    icon: ArrowDownToLine,
    description: 'Move document JSON.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: SlidersHorizontal,
    description: 'History and reset.',
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    description: 'Keyboard and pointer reference.',
    icon: Keyboard,
  },
];
