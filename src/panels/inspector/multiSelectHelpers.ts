/**
 * Shared helper functions for resolving whether a property is uniform or mixed
 * across a multi-selection of nodes.
 */

export function resolveSharedString(values: string[]) {
  return {
    value: values[0] ?? '',
    mixed: values.some((value) => value !== (values[0] ?? '')),
  };
}

export function resolveSharedNumber(values: number[]) {
  return {
    value: values[0] ?? 0,
    mixed: values.some((value) => value !== (values[0] ?? 0)),
  };
}

export function resolveSharedBoolean(values: boolean[]) {
  return {
    value: values[0] ?? false,
    mixed: values.some((value) => value !== (values[0] ?? false)),
  };
}
