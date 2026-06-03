import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeInlineText, stripCommonIndent, trimSurroundingBlankLines } from '../dist/text/whitespace.js';

describe('whitespace helpers', () => {
  it('normalizes inline text', () => {
    assert.equal(normalizeInlineText('  hello\n\tworld  '), 'hello world');
  });

  it('trims surrounding blank lines', () => {
    assert.deepEqual(trimSurroundingBlankLines(['', '  ', 'a', '', 'b', '']), ['a', '', 'b']);
  });

  it('strips common indentation', () => {
    assert.deepEqual(stripCommonIndent(['    a', '      b', '']), ['a', '  b', '']);
  });
});
