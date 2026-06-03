import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { locEnd, locStart, normalizeInput, withOptionalRange, withRange } from '../dist/source.js';

describe('source helpers', () => {
  it('normalizes BOM and CRLF line endings', () => {
    assert.equal(normalizeInput('\uFEFFa\r\nb\rc'), 'a\nb\nc');
  });

  it('stores non-enumerable source ranges', () => {
    const node = withRange({ type: 'Node' }, 2, 7);

    assert.equal(locStart(node), 2);
    assert.equal(locEnd(node), 7);
    assert.deepEqual(Object.keys(node), ['type']);
  });

  it('adds optional ranges only when both offsets exist', () => {
    assert.equal(locStart(withOptionalRange({ type: 'Node' }, 1)), 0);
    assert.equal(locEnd(withOptionalRange({ type: 'Node' }, 1, 3)), 3);
  });
});
