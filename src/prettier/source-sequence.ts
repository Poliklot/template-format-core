import { doc } from 'prettier';
import type { Doc } from 'prettier';
import { sourceToDoc } from './embedded';

export interface SourceDoc {
  range: readonly [number, number];
  doc: Doc;
}

/** Compose printed nodes without inventing or discarding their source gaps.
 * Callers own dialect/content classification. HTML may collapse existing ASCII
 * whitespace and wrap there; literal text must retain every byte of its gaps.
 * A missing gap is never a break opportunity, even if one node is a comment.
 */
export function sourceSequenceToDoc(
  source: string,
  range: readonly [number, number],
  items: readonly SourceDoc[],
  mode: 'literal' | 'html',
  maxEmptyLines = 1,
): Doc {
  let position = range[0];
  let lineStart = position === 0 ? 0 : source.lastIndexOf('\n', position - 1) + 1;
  const parts: Doc[] = [];
  const append = (value: Doc) => {
    const chunks = mode === 'html' && typeof value === 'object' && value !== null &&
      !Array.isArray(value) && value.type === 'fill' ? value.parts : [value];
    // Keep one fill stream. Adjacent node Docs belong to the same content
    // chunk, not two independently breakable groups.
    if (parts.length === 0) parts.push(...chunks);
    else {
      parts[parts.length - 1] = [parts[parts.length - 1], chunks[0] ?? ''];
      parts.push(...chunks.slice(1));
    }
  };
  const gap = (end: number) => {
    const text = source.slice(position, end);
    const lastLine = text.lastIndexOf('\n');
    if (lastLine >= 0) lineStart = position + lastLine + 1;
    if (mode === 'html' && /^[\t\n\f\r ]+$/.test(text)) {
      if (parts.length === 0) parts.push('');
      const blankLines = Math.min(Math.max(0, text.split('\n').length - 2), maxEmptyLines);
      const separator = blankLines > 0
        ? Array.from({ length: blankLines + 1 }, () => doc.builders.hardline)
        : doc.builders.line;
      parts.push(separator, '');
    } else if (text) append(sourceToDoc(text));
    position = end;
  };
  if (!range.every(Number.isInteger) || position < 0 || range[1] < position || range[1] > source.length ||
      !Number.isInteger(maxEmptyLines) || maxEmptyLines < 0) {
    throw new TypeError('Invalid source sequence range');
  }
  for (const item of items) {
    if (!item.range.every(Number.isInteger) || item.range[0] < position || item.range[1] < item.range[0] || item.range[1] > range[1]) {
      throw new TypeError('Invalid source sequence item');
    }
    gap(item.range[0]);
    let contents = item.doc;
    if (mode === 'literal') {
      const prefix = source.slice(lineStart, item.range[0]);
      if (/^[\t ]*$/.test(prefix)) {
        // Literal gaps already emitted this indentation. Only continuation
        // lines of the child Doc need alignment to its actual source column.
        contents = doc.builders.dedentToRoot(doc.builders.align(prefix, contents));
      }
    }
    append(contents);
    const lastLine = source.slice(item.range[0], item.range[1]).lastIndexOf('\n');
    if (lastLine >= 0) lineStart = item.range[0] + lastLine + 1;
    position = item.range[1];
  }
  gap(range[1]);
  return mode === 'html' ? doc.builders.fill(parts) : parts;
}
