import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doc } from 'prettier';
import { normalizeTemplateExpression, parseTemplateExpression } from '../dist/template/expression.js';
import { normalizeInlineText, trimHtmlWhitespace } from '../dist/text/whitespace.js';
import { sourceSequenceToDoc } from '../dist/prettier/index.js';

test('normalization changes syntax whitespace, never quoted or bracketed data', () => {
  for (const quote of ['"', "'", '`']) {
    const literal = `${quote}a (  b  ) as |x|${quote}`;
    assert.equal(normalizeTemplateExpression(`echo ( echo ${literal} )`), `echo (echo ${literal})`);
    assert.deepEqual(parseTemplateExpression(`echo ${literal}`).params, [literal]);
    assert.equal(parseTemplateExpression(`echo ${literal}`).blockParams, undefined);
  }
  assert.equal(normalizeTemplateExpression('echo [a ( b )]'), 'echo [a ( b )]');
  assert.equal(normalizeTemplateExpression(String.raw`echo "a \" ( b )"`), String.raw`echo "a \" ( b )"`);
});

test('block params are a trailing top-level declaration only', () => {
  const expression = parseTemplateExpression('each (lookup value "as |fake|") label="as |other|" as |item index|');
  assert.deepEqual(expression.blockParams, ['item', 'index']);
  assert.deepEqual(expression.params, ['(lookup value "as |fake|")']);
  assert.deepEqual(expression.hash, [{ key: 'label', value: '"as |other|"' }]);
});

test('only ASCII HTML whitespace is collapsible, using linear edge scans', () => {
  for (const space of ['\u00a0', '\u202f', '\u2003', '\ufeff']) {
    assert.equal(normalizeInlineText(` ${space}A${space}B${space} `), `${space}A${space}B${space}`);
    assert.equal(trimHtmlWhitespace(` \t${space} \n`), space);
  }
  const input = `A${'\t'.repeat(250_000)}B`;
  assert.equal(trimHtmlWhitespace(input), input);
  assert.equal(normalizeInlineText(input), 'A B');
});

const print = (contents, printWidth = 80) => doc.printer.printDocToString(contents, { printWidth }).formatted;
test('literal source composition preserves gaps and never invents one', () => {
  const source = 'a  \nbc\u00a0d\n';
  const items = [
    { range: [0, 1], doc: 'A' }, { range: [4, 5], doc: 'B' },
    { range: [5, 6], doc: 'C' }, { range: [7, 8], doc: 'D' },
  ];
  assert.equal(print(sourceSequenceToDoc(source, [0, source.length], items, 'literal')), 'A  \nBC\u00a0D\n');
});

test('HTML can wrap only at existing ASCII gaps, not adjacency or NBSP', () => {
  const source = 'ab cd\u00a0e';
  const items = [...source].flatMap((char, index) => /[a-e]/.test(char) ? [{ range: [index, index + 1], doc: char.toUpperCase() }] : []);
  // Prettier 3.0.0 consumes fill parts during printing. Like a real format
  // lifecycle, each layout must start with a freshly constructed native Doc.
  const result = () => sourceSequenceToDoc(source, [0, source.length], items, 'html');
  assert.equal(print(result()), 'AB CD\u00a0E');
  assert.equal(print(result(), 2), 'AB\nCD\u00a0E');
});

test('source composition validates ranges rather than losing or duplicating text', () => {
  for (const items of [
    [{ range: [0, 2], doc: 'A' }, { range: [1, 3], doc: 'B' }],
    [{ range: [2, 4], doc: 'A' }],
    [{ range: [-1, 2], doc: 'A' }],
  ]) assert.throws(() => sourceSequenceToDoc('abc', [0, 3], items, 'html'), TypeError);
});
