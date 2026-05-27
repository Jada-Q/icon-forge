import { resolveColor } from './style.mjs';

// 超椭圆（squircle）路径，n≈5 接近 Apple 图标形状
export function squirclePath(cx, cy, R, n = 5, pts = 240) {
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

// 纯几何：给定 style + glyph viewBox + variant，算出 tile 半径、字形缩放与居中坐标。
// 抽成纯函数便于单测——错位/缩放错肉眼难精确察觉，必须用数字断言锁住。
// variant: 'square'（iOS，系统自动加圆角）| 'rounded'（满幅 squircle，web/master）| 'macos'（squircle + 透明边）
export function placement(style, glyph, variant = 'rounded') {
  const S = style.canvas.size;
  const cx = S / 2, cy = S / 2;
  const inset = variant === 'macos' ? style.tile.macInsetRatio * S : 0;
  const tileR = S / 2 - inset;
  const glyphBox = 2 * tileR * (1 - 2 * style.glyph.paddingRatio); // 字形框边长
  const scale = glyphBox / glyph.vbW;
  const gx = cx - (glyph.vbW * scale) / 2;
  const gy = cy - (glyph.vbH * scale) / 2;
  return { size: S, cx, cy, tileR, scale, gx, gy };
}

// 在一个 SVG 元素串里插入/覆盖某个属性
function setAttr(el, name, value) {
  const re = new RegExp(`\\s${name}\\s*=\\s*"[^"]*"`);
  const attr = ` ${name}="${value}"`;
  if (re.test(el)) return el.replace(re, attr);
  return el.replace(/\s*\/?>$/, (m) => attr + m); // 插在自闭合 /> 或 > 前
}

// 按 opacity 存在与否分层上色：
//   有 opacity 属性的 path = duotone 背景层 → secondary（给了就拉满不透明，否则退回 primary 浓淡）
//   无 opacity 的 path     = 主细节层       → primary
//   fill="none" 的 path    = 包围框/透明层  → 不动
export function recolorGlyph(inner, { primary, secondary, secondaryOpacity = 1 }) {
  return inner.replace(/<(?:path|circle|rect|ellipse|polygon|polyline|line)\b[^>]*>/g, (el) => {
    if (/fill\s*=\s*"none"/i.test(el)) return el;
    const isBackgroundLayer = /\bopacity\s*=/.test(el);
    if (isBackgroundLayer) {
      el = setAttr(el, 'fill', secondary || primary);
      if (secondary) el = setAttr(el, 'opacity', String(secondaryOpacity));
      return el;
    }
    return setAttr(el, 'fill', primary);
  });
}

export function compose(style, { glyph, bg, fg, fg2, secondaryOpacity, variant = 'rounded' }) {
  const bgHex = resolveColor(style, bg);
  const primary = resolveColor(style, fg);
  const secondary = fg2 ? resolveColor(style, fg2) : null;
  const { size: S, cx, cy, tileR, scale, gx, gy } = placement(style, glyph, variant);

  const tileShape =
    variant === 'square'
      ? `<rect x="0" y="0" width="${S}" height="${S}" fill="${bgHex}"/>`
      : `<path d="${squirclePath(cx, cy, tileR)}" fill="${bgHex}"/>`;

  const recolored = recolorGlyph(glyph.inner, { primary, secondary, secondaryOpacity });
  const glyphLayer =
    `<g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale.toFixed(4)})">` +
    `${recolored}</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    tileShape + glyphLayer + `</svg>`
  );
}
