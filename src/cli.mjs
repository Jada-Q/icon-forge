#!/usr/bin/env node
import { join } from 'node:path';
import { loadStyle, ROOT } from './style.mjs';
import { resolveGlyph } from './glyph.mjs';
import { exportAll } from './export.mjs';
import { buildSeries } from './series.mjs';

function parseArgs(argv) {
  const a = argv.slice(2);
  const app = a[0] && !a[0].startsWith('--') ? a[0] : null;
  const opt = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) { opt[a[i].slice(2)] = a[i + 1]; i++; }
  }
  return { app, opt };
}

const USAGE =
  '用法: icon-forge <app名> --glyph <字形名> [选项]\n' +
  '  --bg <色>       tile 背景色（palette key 或 #hex），默认走 style.json\n' +
  '  --fg <色>       字形颜色，默认走 style.json\n' +
  '  --lib <库>      phosphor | tabler，默认 style.json\n' +
  '  --weight <权重> phosphor: fill|duotone|bold / tabler: filled，默认 style.json\n' +
  '例: icon-forge quake-globe --glyph globe --bg sky --fg white';

async function main() {
  const { app, opt } = parseArgs(process.argv);
  const style = loadStyle();

  // 批量：读 series.json 重生全系列 + 写 output/index.html 预览
  if (process.argv.includes('--all')) {
    const results = await buildSeries(style);
    const ok = results.filter((r) => r.ok);
    console.log(`✓ 全系列：${ok.length}/${results.length} 成功`);
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.name}: ${r.err}`));
    console.log(`  预览: ${join(ROOT, 'output', 'index.html')}`);
    return;
  }

  if (!app || !opt.glyph) {
    console.error(USAGE);
    process.exit(1);
  }
  const library = opt.lib || style.glyph.library;
  const weight = opt.weight || style.glyph.weight;
  const bg = opt.bg || style.defaults.bg;
  const fg = opt.fg || style.defaults.fg;

  const glyph = resolveGlyph(opt.glyph, { library, weight });
  const outDir = join(ROOT, 'output', app);
  await exportAll(style, { glyph, bg, fg }, outDir);

  console.log(`✓ ${app}  (${library}/${weight} ${opt.glyph}, bg=${bg} fg=${fg})`);
  console.log(`  ${outDir}`);
  console.log('    icon.icns            → macOS app');
  console.log('    web/favicon.ico + png→ 网站');
  console.log('    AppIcon.appiconset   → iOS（拖进 Xcode）');
  console.log('    icon-1024.png        → 通用 / 商店');
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
