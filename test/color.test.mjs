import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveColor } from '../src/style.mjs';

const style = { palette: { sky: '#48C2F9', black: '#060606' } };

test('palette key 解析成 hex', () => {
  assert.equal(resolveColor(style, 'sky'), '#48C2F9');
  assert.equal(resolveColor(style, 'black'), '#060606');
});

test('合法 hex 原样透传（3 位 / 6 位 / 任意大小写）', () => {
  assert.equal(resolveColor(style, '#abc'), '#abc');
  assert.equal(resolveColor(style, '#AABBCC'), '#AABBCC');
  assert.equal(resolveColor(style, '#48c2f9'), '#48c2f9');
});

test('未知 palette key 抛错', () => {
  assert.throws(() => resolveColor(style, 'turquoise'), /未知颜色/);
});

test('畸形 hex 抛错（不能静默透传）', () => {
  assert.throws(() => resolveColor(style, '#ZZZ'), /颜色格式/);
  assert.throws(() => resolveColor(style, '#12'), /颜色格式/);
  assert.throws(() => resolveColor(style, '#12345'), /颜色格式/);
});
