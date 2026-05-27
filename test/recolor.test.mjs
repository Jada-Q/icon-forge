import test from 'node:test';
import assert from 'node:assert/strict';
import { recolorGlyph } from '../src/compose.mjs';

const paths = (svg) => svg.match(/<path[^>]*>/g);

test('单色填充：每个 path 上 primary 色', () => {
  const out = recolorGlyph('<path d="A"/>', { primary: '#111111' });
  assert.match(out, /fill="#111111"/);
});

test('fill="none" 的包围框不动（tabler 那条）', () => {
  const out = recolorGlyph('<path d="box" fill="none"/><path d="B"/>', { primary: '#111111' });
  const p = paths(out);
  assert.match(p[0], /fill="none"/);
  assert.doesNotMatch(p[0], /#111111/);
  assert.match(p[1], /fill="#111111"/);
});

test('duotone 真双色：opacity 层→secondary 满不透明，主层→primary', () => {
  const out = recolorGlyph('<path d="bg" opacity="0.2"/><path d="fg"/>', {
    primary: '#111111',
    secondary: '#ff0000',
  });
  const p = paths(out);
  assert.match(p[0], /fill="#ff0000"/);   // 背景层 = secondary
  assert.match(p[0], /opacity="1"/);       // 拉满，不再是 0.2 浓淡
  assert.doesNotMatch(p[0], /opacity="0\.2"/);
  assert.match(p[1], /fill="#111111"/);   // 主层 = primary
  assert.doesNotMatch(p[1], /opacity=/);   // 主层无 opacity
});

test('不给 secondary：退回同色调浓淡（opacity 层保留 0.2 + primary 色）', () => {
  const out = recolorGlyph('<path d="bg" opacity="0.2"/>', { primary: '#111111' });
  const p = paths(out)[0];
  assert.match(p, /fill="#111111"/);
  assert.match(p, /opacity="0.2"/);        // 保留
});

test('secondaryOpacity 可自定义（要柔和 duotone 时）', () => {
  const out = recolorGlyph('<path d="bg" opacity="0.2"/>', {
    primary: '#111111',
    secondary: '#ff0000',
    secondaryOpacity: 0.35,
  });
  assert.match(paths(out)[0], /opacity="0.35"/);
});
