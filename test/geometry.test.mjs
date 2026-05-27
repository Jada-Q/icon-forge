import test from 'node:test';
import assert from 'node:assert/strict';
import { placement, squirclePath } from '../src/compose.mjs';

const style = {
  canvas: { size: 1024 },
  tile: { macInsetRatio: 0.10 },
  glyph: { paddingRatio: 0.24 },
};
const glyph = { vbW: 256, vbH: 256 };
const NEAR = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test('rounded / square tile 半径 = 画布一半', () => {
  NEAR(placement(style, glyph, 'rounded').tileR, 512);
  NEAR(placement(style, glyph, 'square').tileR, 512);
});

test('macos tile 半径扣掉透明边 inset', () => {
  NEAR(placement(style, glyph, 'macos').tileR, 512 - 0.10 * 1024); // 409.6
});

test('scale = 字形框 / glyph viewBox 宽', () => {
  const p = placement(style, glyph, 'rounded');
  const glyphBox = 2 * 512 * (1 - 2 * 0.24); // 532.48
  NEAR(p.scale, glyphBox / 256);
});

test('字形在 tile 中心居中（关键：错位肉眼难精确察觉）', () => {
  for (const v of ['rounded', 'macos', 'square']) {
    const p = placement(style, glyph, v);
    NEAR(p.gx + (glyph.vbW * p.scale) / 2, p.cx); // 水平中心
    NEAR(p.gy + (glyph.vbH * p.scale) / 2, p.cy); // 垂直中心
  }
});

test('非正方字形按宽缩放仍垂直居中', () => {
  const tall = { vbW: 256, vbH: 320 };
  const p = placement(style, tall, 'rounded');
  NEAR(p.gx + (tall.vbW * p.scale) / 2, p.cx);
  NEAR(p.gy + (tall.vbH * p.scale) / 2, p.cy);
});

test('squirclePath 闭合且所有点落在画布内', () => {
  const d = squirclePath(512, 512, 512);
  assert.match(d, /^M/);
  assert.match(d, /Z\s*$/);
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  const max = Math.max(...nums), min = Math.min(...nums);
  assert.ok(min >= -0.5 && max <= 1024.5, `bounds [${min}, ${max}]`);
});
