import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared dark tooltip class used across editor UI for hover hints and labels. */
export const DARK_TOOLTIP_CLASS = 'rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white';
