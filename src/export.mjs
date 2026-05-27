import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { compose } from './compose.mjs';
import { rasterize } from './rasterize.mjs';

// macOS .icns 需要的尺寸（name → px）
const ICNS_SIZES = [
  ['icon_16x16', 16], ['icon_16x16@2x', 32],
  ['icon_32x32', 32], ['icon_32x32@2x', 64],
  ['icon_128x128', 128], ['icon_128x128@2x', 256],
  ['icon_256x256', 256], ['icon_256x256@2x', 512],
  ['icon_512x512', 512], ['icon_512x512@2x', 1024],
];
const FAVICON_SIZES = [16, 32, 48, 192, 512];

export async function exportAll(style, opts, outDir) {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const squareSvg = compose(style, { ...opts, variant: 'square' });   // iOS（系统自己加圆角）
  const roundedSvg = compose(style, { ...opts, variant: 'rounded' }); // master / web
  const macSvg = compose(style, { ...opts, variant: 'macos' });       // .icns（带透明边）

  // 1) master
  writeFileSync(join(outDir, 'master.svg'), roundedSvg);
  writeFileSync(join(outDir, 'icon-1024.png'), await rasterize(roundedSvg, 1024));

  // 2) macOS .icns
  const iconset = join(outDir, 'icon.iconset');
  mkdirSync(iconset, { recursive: true });
  for (const [nm, sz] of ICNS_SIZES) {
    writeFileSync(join(iconset, `${nm}.png`), await rasterize(macSvg, sz));
  }
  execFileSync('iconutil', ['--convert', 'icns', '--output', join(outDir, 'icon.icns'), iconset]);
  rmSync(iconset, { recursive: true, force: true });

  // 3) web favicon 套件
  const web = join(outDir, 'web');
  mkdirSync(web, { recursive: true });
  for (const sz of FAVICON_SIZES) {
    writeFileSync(join(web, `icon-${sz}.png`), await rasterize(roundedSvg, sz));
  }
  writeFileSync(join(web, 'apple-touch-icon.png'), await rasterize(roundedSvg, 180));
  execFileSync('magick', [
    join(web, 'icon-16.png'), join(web, 'icon-32.png'), join(web, 'icon-48.png'),
    join(web, 'favicon.ico'),
  ]);

  // 4) iOS AppIcon.appiconset（Xcode 14+ 单尺寸 1024，系统派生其余）
  const ios = join(outDir, 'AppIcon.appiconset');
  mkdirSync(ios, { recursive: true });
  writeFileSync(join(ios, 'icon-1024.png'), await rasterize(squareSvg, 1024));
  writeFileSync(
    join(ios, 'Contents.json'),
    JSON.stringify(
      {
        images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'icon-forge', version: 1 },
      },
      null, 2
    )
  );

  return outDir;
}
