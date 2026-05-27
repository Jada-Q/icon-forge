import test from 'node:test';
import assert from 'node:assert/strict';
import { phosphorFile, tablerFile } from '../src/glyph.mjs';

test('phosphor 带权重加 -<weight> 后缀', () => {
  assert.match(phosphorFile('globe', 'fill').file, /assets\/fill\/globe-fill\.svg$/);
  assert.match(phosphorFile('moon', 'bold').file, /assets\/bold\/moon-bold\.svg$/);
  assert.match(phosphorFile('moon', 'duotone').file, /assets\/duotone\/moon-duotone\.svg$/);
});

test('phosphor regular 无后缀', () => {
  assert.match(phosphorFile('globe', 'regular').file, /assets\/regular\/globe\.svg$/);
});

test('tabler filled / outline 走对应子目录、文件名无后缀', () => {
  assert.match(tablerFile('globe', 'filled').file, /icons\/filled\/globe\.svg$/);
  assert.match(tablerFile('globe', 'outline').file, /icons\/outline\/globe\.svg$/);
});
