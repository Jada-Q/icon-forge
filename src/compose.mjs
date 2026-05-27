import { resolveColor } from './style.mjs';

// 超椭圆（squircle）路径，n≈5 接近 Apple 图标形状
function squirclePath(cx, cy, R, n = 5, pts = 240) {
  const sgn = (v) => (v < 0 ? -1 : 1);
  let d = '';
  for (let i = 0; i <= pts; i++) {
    const t = (i / pts) * 2 * Math.PI;
    const ct = Math.cos(t), st = Math.sin(t);
    const x = cx + R * sgn(ct) * Math.pow(Math.abs(ct), 2 / n);
    const y = cy + R * sgn(st) * Math.pow(Math.abs(st), 2 / n);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
  }
  return d + 'Z';
}

// variant: 'square'（iOS，系统自动加圆角）| 'rounded'（满幅 squircle，web/master）| 'macos'（squircle + 10% 透明边）
export function compose(style, { glyph, bg, fg, variant = 'rounded' }) {
  const S = style.canvas.size;
  const bgHex = resolveColor(style, bg);
  const fgHex = resolveColor(style, fg);
  const cx = S / 2, cy = S / 2;

  let tileR, tileShape;
  if (variant === 'square') {
    tileShape = `<rect x="0" y="0" width="${S}" height="${S}" fill="${bgHex}"/>`;
    tileR = S / 2;
  } else {
    const inset = variant === 'macos' ? style.tile.macInsetRatio * S : 0;
    tileR = S / 2 - inset;
    tileShape = `<path d="${squirclePath(cx, cy, tileR)}" fill="${bgHex}"/>`;
  }

  // 字形框 = tile 内边长 × (1 - 2×padding)
  const glyphBox = 2 * tileR * (1 - 2 * style.glyph.paddingRatio);
  const scale = glyphBox / glyph.vbW;
  const gx = cx - (glyph.vbW * scale) / 2;
  const gy = cy - (glyph.vbH * scale) / 2;

  // currentColor + fill 双写，覆盖 phosphor(currentColor) 和 tabler(无显式 fill) 两种
  const glyphLayer =
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale.toFixed(4)})" ` +
    `fill="${fgHex}" color="${fgHex}">${glyph.inner}</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    tileShape + glyphLayer + `</svg>`
  );
}
