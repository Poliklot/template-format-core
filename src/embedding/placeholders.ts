/** Dialect adapters supply sorted, non-overlapping substitution spans. */
export interface PlaceholderSpan { start: number; end: number; replacement: string }
export interface PlaceholderPlan { text: string; restore: Map<string, string> }

export function createPlaceholderPlan(text: string, tokens: readonly PlaceholderSpan[]): PlaceholderPlan | null {
  let previous = 0;
  for (const token of tokens) {
    if (!Number.isInteger(token.start) || !Number.isInteger(token.end) ||
        token.start < previous || token.end <= token.start || token.end > text.length) return null;
    previous = token.end;
  }
  // Check both the input and normalized replacements. Lowercase markers without
  // a leading underscore survive CSS normalization; a hyphen keeps dynamic JS keys
  // quoted even with quoteProps: 'as-needed'. Keep widths close to real tokens.
  const reserved = (text + tokens.map(({ replacement }) => replacement).join('')).toLowerCase();
  const usedSalts = new Set([...reserved.matchAll(/m(\d+)_/g)].map((match) => match[1]));
  let salt = 0;
  while (usedSalts.has(String(salt))) {
    salt += 1;
  }
  const restore = new Map<string, string>();
  const parts: string[] = [];
  let position = 0;
  for (const [index, token] of tokens.entries()) {
    const replacement = token.replacement;
    const prefix = `m${salt}_${index.toString(36)}-`;
    const placeholder = `${prefix}${'x'.repeat(Math.max(replacement.length - prefix.length - 1, 0))}z`;
    parts.push(text.slice(position, token.start), placeholder);
    restore.set(placeholder, replacement);
    position = token.end;
  }
  parts.push(text.slice(position));
  return { text: parts.join(''), restore };
}
