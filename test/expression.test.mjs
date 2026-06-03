import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatTemplateHashPair,
  isTemplateExpressionQuoteStart,
  normalizeTemplateExpression,
  parseTemplateExpression,
  splitTemplateParams,
  tokenizeTemplateExpression,
} from '../dist/template/expression.js';

describe('template expression helpers', () => {
  it('tokenizes nested and quoted params', () => {
    assert.deepEqual(tokenizeTemplateExpression('helper (nested a) name="Ada Lovelace" list=[1, 2]'), [
      'helper',
      '(nested a)',
      'name="Ada Lovelace"',
      'list=[1, 2]',
    ]);
  });

  it('parses path, params, hash, and block params', () => {
    assert.deepEqual(parseTemplateExpression('each users sort="name" as |user index|'), {
      path: 'each',
      params: ['users'],
      hash: [{ key: 'sort', value: '"name"' }],
      blockParams: ['user', 'index'],
    });
  });

  it('splits hash params with separated equals signs', () => {
    assert.deepEqual(splitTemplateParams(['foo', 'bar', '=', 'baz', 'enabled=true']), {
      params: ['foo'],
      hash: [
        { key: 'bar', value: 'baz' },
        { key: 'enabled', value: 'true' },
      ],
    });
  });

  it('normalizes parenthesis spacing and formats hash pairs', () => {
    assert.equal(normalizeTemplateExpression('helper ( nested value )'), 'helper (nested value)');
    assert.equal(formatTemplateHashPair({ key: 'name', value: 'value' }), 'name=value');
  });

  it('detects expression quote starts', () => {
    assert.equal(isTemplateExpressionQuoteStart('a "b"', 2), true);
    assert.equal(isTemplateExpressionQuoteStart('a.b"c"', 3), false);
  });
});
