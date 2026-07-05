// ---------------------------------------------------------------------------
// Two-way CSS gradient parser/serializer.
//
// Gradients are STORED as CSS text on the node; this module converts that text
// into a structured form for edit-time UI and back. Color values are treated
// as opaque tokens so CSS functions — var(), color-mix(), rgba(), oklch() —
// pass through untouched. Parsing splits arguments only on top-level commas.
// ---------------------------------------------------------------------------

export type GradientType = 'linear' | 'radial' | 'conic';

export type GradientStopPosition = {
  value: number;
  unit: '%' | 'px';
};

export type GradientStop = {
  /** Opaque CSS color token: hex, rgb()/rgba(), var(), color-mix(), … */
  color: string;
  position?: GradientStopPosition;
};

export type RadialExtentKeyword = 'closest-side' | 'closest-corner' | 'farthest-side' | 'farthest-corner';

export type GradientPosition = {
  x: { value: number; unit: '%' | 'px' };
  y: { value: number; unit: '%' | 'px' };
};

export type ParsedGradient = {
  type: GradientType;
  repeating: boolean;
  /** linear + conic, degrees. */
  angle?: number;
  /** radial + conic `at x y`. */
  position?: GradientPosition;
  /** radial only. */
  shape?: 'circle' | 'ellipse';
  /** radial only: extent keyword, mutually exclusive with explicit sizes. */
  extent?: RadialExtentKeyword;
  /** radial only: explicit size lengths (1 for circle, 2 for ellipse). */
  sizes?: GradientStopPosition[];
  stops: GradientStop[];
};

const GRADIENT_HEAD_PATTERN = /^(repeating-)?(linear|radial|conic)-gradient\(/i;
const EXTENT_KEYWORDS: readonly RadialExtentKeyword[] = [
  'closest-side',
  'closest-corner',
  'farthest-side',
  'farthest-corner',
];

/** Split a CSS argument list on commas that are not nested inside parentheses. */
export function splitTopLevelArgs(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function parseLength(token: string): GradientStopPosition | null {
  const match = token.match(/^(-?\d+(?:\.\d+)?)(%|px)$/);
  if (!match) {
    return null;
  }
  return { value: Number.parseFloat(match[1]), unit: match[2] as '%' | 'px' };
}

function parseAngle(token: string): number | null {
  const match = token.match(/^(-?\d+(?:\.\d+)?)deg$/);
  return match ? Number.parseFloat(match[1]) : null;
}

function parsePosition(tokens: string[]): GradientPosition | null {
  if (tokens.length !== 2) {
    return null;
  }
  const x = parseLength(tokens[0]);
  const y = parseLength(tokens[1]);
  return x && y ? { x, y } : null;
}

/**
 * Parse one stop argument. The color may be any CSS expression; a trailing
 * top-level length token (`30%`, `120px`) is treated as the stop position.
 */
function parseStop(arg: string): GradientStop | null {
  const trimmed = arg.trim();
  if (!trimmed) {
    return null;
  }
  // Split on top-level whitespace (outside parentheses) from the right.
  const tokens = splitTopLevelWhitespace(trimmed);
  const last = tokens[tokens.length - 1];
  const position = tokens.length > 1 ? parseLength(last) : null;
  const color = position ? tokens.slice(0, -1).join(' ') : trimmed;
  if (!color) {
    return null;
  }
  return { color, ...(position ? { position } : {}) };
}

function splitTopLevelWhitespace(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (/\s/.test(char) && depth === 0) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

/**
 * Parse a CSS gradient string into its structured form. Returns null when the
 * input is not a single supported gradient function. Unknown leading params
 * cause a null result rather than silent data loss — the UI then treats the
 * value as hand-authored text.
 */
export function parseGradient(input: string): ParsedGradient | null {
  const trimmed = input.trim();
  const head = trimmed.match(GRADIENT_HEAD_PATTERN);
  if (!head || !trimmed.endsWith(')')) {
    return null;
  }

  const repeating = Boolean(head[1]);
  const type = head[2].toLowerCase() as GradientType;
  const body = trimmed.slice(head[0].length, -1);
  const args = splitTopLevelArgs(body);
  if (args.length === 0) {
    return null;
  }

  const result: ParsedGradient = { type, repeating, stops: [] };
  let stopArgs = args;

  const leading = args[0];
  const leadingTokens = splitTopLevelWhitespace(leading);

  if (type === 'linear') {
    const angle = leadingTokens.length === 1 ? parseAngle(leadingTokens[0]) : null;
    if (angle !== null) {
      result.angle = angle;
      stopArgs = args.slice(1);
    } else if (leadingTokens[0] === 'to') {
      // `to <side>` syntax is valid CSS but not produced by this editor;
      // treat as hand-authored.
      return null;
    }
  } else if (type === 'conic') {
    let consumed = false;
    const fromIndex = leadingTokens.indexOf('from');
    const atIndex = leadingTokens.indexOf('at');
    if (fromIndex === 0) {
      const angle = parseAngle(leadingTokens[1] ?? '');
      if (angle === null) {
        return null;
      }
      result.angle = angle;
      consumed = true;
    }
    if (atIndex >= 0) {
      const position = parsePosition(leadingTokens.slice(atIndex + 1));
      if (!position) {
        return null;
      }
      result.position = position;
      consumed = true;
    }
    if (consumed) {
      stopArgs = args.slice(1);
    }
  } else {
    // radial: [shape] [extent | sizes] [at x y]
    let consumed = false;
    const atIndex = leadingTokens.indexOf('at');
    const paramTokens = atIndex >= 0 ? leadingTokens.slice(0, atIndex) : leadingTokens;
    const positionTokens = atIndex >= 0 ? leadingTokens.slice(atIndex + 1) : [];
    let recognized = atIndex >= 0;

    for (const token of paramTokens) {
      if (token === 'circle' || token === 'ellipse') {
        result.shape = token;
        recognized = true;
      } else if ((EXTENT_KEYWORDS as readonly string[]).includes(token)) {
        result.extent = token as RadialExtentKeyword;
        recognized = true;
      } else {
        const length = parseLength(token);
        if (length) {
          result.sizes = [...(result.sizes ?? []), length];
          recognized = true;
        } else {
          recognized = false;
          break;
        }
      }
    }

    if (recognized) {
      if (positionTokens.length > 0) {
        const position = parsePosition(positionTokens);
        if (!position) {
          return null;
        }
        result.position = position;
      }
      consumed = true;
    }
    if (consumed) {
      stopArgs = args.slice(1);
    }
  }

  for (const arg of stopArgs) {
    const stop = parseStop(arg);
    if (!stop) {
      return null;
    }
    result.stops.push(stop);
  }

  if (result.stops.length < 2) {
    return null;
  }

  return result;
}

function formatLength(length: GradientStopPosition): string {
  return `${length.value}${length.unit}`;
}

/** Serialize the structured form back to a CSS gradient string. */
export function serializeGradient(gradient: ParsedGradient): string {
  const name = `${gradient.repeating ? 'repeating-' : ''}${gradient.type}-gradient`;
  const args: string[] = [];

  if (gradient.type === 'linear') {
    if (gradient.angle !== undefined) {
      args.push(`${gradient.angle}deg`);
    }
  } else if (gradient.type === 'conic') {
    const parts: string[] = [];
    if (gradient.angle !== undefined) {
      parts.push(`from ${gradient.angle}deg`);
    }
    if (gradient.position) {
      parts.push(`at ${formatLength(gradient.position.x)} ${formatLength(gradient.position.y)}`);
    }
    if (parts.length > 0) {
      args.push(parts.join(' '));
    }
  } else {
    const parts: string[] = [];
    if (gradient.shape) {
      parts.push(gradient.shape);
    }
    if (gradient.extent) {
      parts.push(gradient.extent);
    } else if (gradient.sizes?.length) {
      parts.push(gradient.sizes.map(formatLength).join(' '));
    }
    if (gradient.position) {
      parts.push(`at ${formatLength(gradient.position.x)} ${formatLength(gradient.position.y)}`);
    }
    if (parts.length > 0) {
      args.push(parts.join(' '));
    }
  }

  for (const stop of gradient.stops) {
    args.push(stop.position ? `${stop.color} ${formatLength(stop.position)}` : stop.color);
  }

  return `${name}(${args.join(', ')})`;
}

/** A minimal starter gradient for newly enabled gradient backgrounds. */
export function createDefaultGradient(): ParsedGradient {
  return {
    type: 'linear',
    repeating: false,
    angle: 180,
    stops: [
      { color: 'rgba(79, 70, 229, 0.9)', position: { value: 0, unit: '%' } },
      { color: 'rgba(14, 165, 233, 0.9)', position: { value: 100, unit: '%' } },
    ],
  };
}

/** Quick syntactic check used by validation and the inspector. */
export function isGradientText(value: string): boolean {
  return GRADIENT_HEAD_PATTERN.test(value.trim()) && value.trim().endsWith(')');
}
