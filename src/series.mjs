import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './style.mjs';
import { resolveGlyph } from './glyph.mjs';
import { exportAll } from './export.mjs';
import { resolveColor } from './style.mjs';

export function loadSeries(path = join(ROOT, 'series.json')) {
  if (!existsSync(path)) throw new Error(`没有 series.json：${path}`);
  return JSON.parse(readFileSync(path, 'utf8')).apps || [];
}

// 批量生成全系列 + 写一个 HTML 预览页
export async function buildSeries(style) {
  const apps = loadSeries();
  const results = [];
  for (const app of apps) {
    const library = app.lib || style.glyph.library;
    const weight = app.weight || style.glyph.weight;
    const bg = app.bg || style.defaults.bg;
    const fg = app.fg || style.defaults.fg;
    const fg2 = app.fg2 || null;
    const secondaryOpacity = app.secondaryOpacity ?? 1;
    try {
      const glyph = resolveGlyph(app.glyph, { library, weight });
      const outDir = join(ROOT, 'output', app.name);
      await exportAll(style, { glyph, bg, fg, fg2, secondaryOpacity }, outDir);
      results.push({ ...app, ok: true, bg, fg });
    } catch (e) {
      results.push({ ...app, ok: false, err: e.message.split('\n')[0] });
    }
  }
  writeFileSync(join(ROOT, 'output', 'index.html'), contactSheet(style, results));
  return results;
}

function contactSheet(style, results) {
  const cards = results
    .map((r) => {
      if (!r.ok) {
        return `<div class="card err"><div class="x">✗</div><div class="nm">${r.name}</div>
          <div class="e">${r.err}</div></div>`;
      }
      const bgHex = resolveColor(style, r.bg);
      return `<div class="card">
        <img src="${r.name}/icon-1024.png" alt="${r.name}">
        <div class="nm">${r.name}</div>
        <div class="meta">${r.glyph} · <span class="sw" style="background:${bgHex}"></span>${r.bg}</div>
      </div>`;
    })
    .join('\n');

  const swatches = Object.entries(style.palette)
    .map(([k, v]) => `<span class="pal" style="background:${v}" title="${k} ${v}"></span><code>${k}</code>`)
    .join('');

  return `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>icon-forge — ${style.name}</title>
<style>
  body{font:14px -apple-system,system-ui,sans-serif;margin:0;padding:40px;background:#f5f5f7;color:#1d1d1f}
  h1{font-size:22px;margin:0 0 4px}.sub{color:#86868b;margin:0 0 24px}
  .palette{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 28px;font-size:12px}
  .pal{width:18px;height:18px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
  .palette code{margin-right:14px;color:#6e6e73}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:24px}
  .card{background:#fff;border-radius:14px;padding:18px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .card img{width:96px;height:96px;display:block;margin:0 auto 10px}
  .nm{font-weight:600}.meta{color:#86868b;font-size:12px;margin-top:3px}
  .sw{display:inline-block;width:9px;height:9px;border-radius:2px;vertical-align:middle;margin-right:3px}
  .err{display:flex;flex-direction:column;justify-content:center}
  .err .x{font-size:28px;color:#ff3b30}.err .e{font-size:11px;color:#ff3b30;margin-top:6px}
</style></head><body>
<h1>${style.name}</h1>
<p class="sub">icon-forge 系列预览 · 共 ${results.length} 个 · 改 icon-style.json 后重跑 <code>--all</code> 全部刷新</p>
<div class="palette">调色板：${swatches}</div>
<div class="grid">${cards}</div>
</body></html>`;
}
