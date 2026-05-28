import sharp from 'sharp';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { squirclePath } from './compose.mjs';
import { resolveColor } from './style.mjs';

const ICNS_SIZES = [
  ['icon_16x16', 16], ['icon_16x16@2x', 32],
  ['icon_32x32', 32], ['icon_32x32@2x', 64],
  ['icon_128x128', 128], ['icon_128x128@2x', 256],
  ['icon_256x256', 256], ['icon_256x256@2x', 512],
  ['icon_512x512', 512], ['icon_512x512@2x', 1024],
];
const FAVICON_SIZES = [16, 32, 48, 192, 512];

function shapeSvg(style, variant, fill) {
  const S = style.canvas.size;
  if (variant === 'square') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="${fill}"/></svg>`;
  }
  const inset = variant === 'macos' ? style.tile.macInsetRatio * S : 0;
  const R = S / 2 - inset;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><path d="${squirclePath(S / 2, S / 2, R)}" fill="${fill}"/></svg>`;
}

// 把上传图片合成成 1024 master PNG。
//   tile 模式：彩色 squircle 底 + 图片居中留白（图片当 logo/字形）
//   fullBleed：图片铺满，用 squircle 当 alpha 遮罩圆角（图片本身就是成品图）
async function buildMaster(style, imgBuf, { bg, paddingRatio, fullBleed }, variant) {
  const S = style.canvas.size;
  const inset = variant === 'macos' ? style.tile.macInsetRatio * S : 0;
  const tileR = S / 2 - inset;

  if (fullBleed) {
    const cover = Math.round(tileR * 2);
    const off = Math.round((S - cover) / 2);
    const img = await sharp(imgBuf).resize(cover, cover, { fit: 'cover' }).toBuffer();
    const placed = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: img, left: off, top: off }])
      .png()
      .toBuffer();
    if (variant === 'square') return placed;
    const mask = await sharp(Buffer.from(shapeSvg(style, variant, '#fff'))).resize(S, S).png().toBuffer();
    return sharp(placed).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  }

  const bgHex = resolveColor(style, bg);
  const box = Math.round(2 * tileR * (1 - 2 * paddingRatio));
  const off = Math.round((S - box) / 2);
  const img = await sharp(imgBuf)
    .resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp(Buffer.from(shapeSvg(style, variant, bgHex)))
    .resize(S, S)
    .composite([{ input: img, left: off, top: off }])
    .png()
    .toBuffer();
}

// 单张合成（给选择器实时预览用，所见即所得）
export function composeImagePng(style, opts, variant = 'rounded') {
  return buildMaster(style, opts.imgBuf, opts, variant);
}

export async function exportFromImage(style, opts, outDir) {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const rounded = await buildMaster(style, opts.imgBuf, opts, 'rounded');
  const macos = await buildMaster(style, opts.imgBuf, opts, 'macos');
  const square = await buildMaster(style, opts.imgBuf, opts, 'square');
  const rs = (buf, sz) => sharp(buf).resize(sz, sz).png().toBuffer();

  writeFileSync(join(outDir, 'icon-1024.png'), rounded);

  const iconset = join(outDir, 'icon.iconset');
  mkdirSync(iconset, { recursive: true });
  for (const [nm, sz] of ICNS_SIZES) writeFileSync(join(iconset, `${nm}.png`), await rs(macos, sz));
  execFileSync('iconutil', ['--convert', 'icns', '--output', join(outDir, 'icon.icns'), iconset]);
  rmSync(iconset, { recursive: true, force: true });

  const web = join(outDir, 'web');
  mkdirSync(web, { recursive: true });
  for (const sz of FAVICON_SIZES) writeFileSync(join(web, `icon-${sz}.png`), await rs(rounded, sz));
  writeFileSync(join(web, 'apple-touch-icon.png'), await rs(rounded, 180));
  execFileSync('magick', [
    join(web, 'icon-16.png'), join(web, 'icon-32.png'), join(web, 'icon-48.png'),
    join(web, 'favicon.ico'),
  ]);

  const ios = join(outDir, 'AppIcon.appiconset');
  mkdirSync(ios, { recursive: true });
  writeFileSync(join(ios, 'icon-1024.png'), await rs(square, 1024));
  writeFileSync(
    join(ios, 'Contents.json'),
    JSON.stringify(
      { images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'icon-forge', version: 1 } },
      null, 2
    )
  );

  return outDir;
}
