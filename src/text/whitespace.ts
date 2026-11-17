export const whitespace = /\s/;

/** Linear edge trimming of HTML's five collapsible characters only. */
export function trimHtmlWhitespace(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && '\t\n\f\r '.includes(value[start])) start += 1;
  while (end > start && '\t\n\f\r '.includes(value[end - 1])) end -= 1;
  return value.slice(start, end);
}

export function normalizeInlineText(value: string): string {
  // HTML collapses only ASCII whitespace. NBSP, narrow NBSP and other Unicode
  // spaces are content and must never become break opportunities.
  return value.replace(/[\t\n\f\r ]+/g, ' ').replace(/^ | $/g, '');
}

export function trimSurroundingBlankLines(lines: string[]): string[] {
  const trimmedLines = lines.slice();

  while (trimmedLines.length > 0 && trimmedLines[0].trim() === '') {
    trimmedLines.shift();
  }

  while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === '') {
    trimmedLines.pop();
  }

  return trimmedLines;
}

export function stripCommonIndent(lines: string[], startIndex = 0): string[] {
  const indentLines = lines.slice(startIndex).filter((line) => line.trim().length > 0);
  const commonIndent = indentLines.reduce((min, line) => {
    const indentLength = (line.match(/^[ \t]*/) || [''])[0].length;
    return Math.min(min, indentLength);
  }, Number.MAX_SAFE_INTEGER);

  const normalizedIndent = Number.isFinite(commonIndent) ? commonIndent : 0;

  return lines.map((line, index) => {
    if (index < startIndex || line.trim() === '') {
      return line.replace(/[ \t]+$/, '');
    }

    const indentLength = (line.match(/^[ \t]*/) || [''])[0].length;
    return line.slice(Math.min(indentLength, normalizedIndent)).replace(/[ \t]+$/, '');
  });
}
