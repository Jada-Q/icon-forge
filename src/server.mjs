import { createServer } from 'node:http';
import {
  readFileSync, existsSync, readdirSync, statSync, copyFileSync, mkdirSync, utimesSync, rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { loadStyle, ROOT } from './style.mjs';
import { resolveGlyph, listGlyphs, listLibraries } from './glyph.mjs';
import { compose } from './compose.mjs';
import { exportAll } from './export.mjs';
import { exportFromImage, composeImagePng } from './image-icon.mjs';

const PORT = 4321;
const style = loadStyle();
const PROJECTS_DIR = join(process.env.HOME, 'Desktop', 'Projects');

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

// 识别项目类型 → 决定图标放哪
function detectType(dir) {
  if (existsSync(join(dir, 'Package.swift'))) return 'mac';
  if (existsSync(join(dir, 'package.json'))) {
    if (
      existsSync(join(dir, 'public')) ||
      existsSync(join(dir, 'app')) ||
      existsSync(join(dir, 'src', 'app'))
    )
      return 'web';
    return 'node';
  }
  return 'other';
}

function listProjects() {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR)
    .filter((n) => !n.startsWith('.'))
    .filter((n) => {
      try { return statSync(join(PROJECTS_DIR, n)).isDirectory(); } catch { return false; }
    })
    .map((n) => ({ name: n, path: join(PROJECTS_DIR, n), type: detectType(join(PROJECTS_DIR, n)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// 把生成好的图标放进目标项目（按类型放对位置）
function placeIntoProject(outDir, project) {
  const placed = [];
  if (project.type === 'mac') {
    const iconDir = join(project.path, 'icon');
    mkdirSync(iconDir, { recursive: true });
    copyFileSync(join(outDir, 'icon.icns'), join(iconDir, 'AppIcon.icns'));
    placed.push('icon/AppIcon.icns');
    const buildDir = join(project.path, 'build');
    if (existsSync(buildDir)) {
      for (const f of readdirSync(buildDir)) {
        if (!f.endsWith('.app')) continue;
        const resDir = join(buildDir, f, 'Contents', 'Resources');
        if (existsSync(resDir)) {
          copyFileSync(join(outDir, 'icon.icns'), join(resDir, 'AppIcon.icns'));
          placed.push(`build/${f} 内 AppIcon.icns`);
        }
        try { const t = new Date(); utimesSync(join(buildDir, f), t, t); } catch {}
      }
    }
  } else if (project.type === 'web') {
    const pub = join(project.path, 'public');
    mkdirSync(pub, { recursive: true });
    const webDir = join(outDir, 'web');
    for (const f of readdirSync(webDir)) copyFileSync(join(webDir, f), join(pub, f));
    copyFileSync(join(outDir, 'icon-1024.png'), join(pub, 'icon-1024.png'));
    placed.push('public/ (favicon.ico + 各尺寸 png)');
  }
  return placed;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === '/' || p === '/index.html') {
      const html = join(ROOT, 'public', 'pick.html');
      if (!existsSync(html)) return send(res, 200, '选择器 HTML 还没建（步骤 2）', 'text/plain; charset=utf-8');
      return send(res, 200, readFileSync(html, 'utf8'), 'text/html; charset=utf-8');
    }

    // 静态伺服生成产物，给页面显示真实结果
    if (p.startsWith('/output/')) {
      const base = join(ROOT, 'output');
      const fp = join(base, p.slice('/output/'.length));
      if (!fp.startsWith(base) || !existsSync(fp) || !statSync(fp).isFile()) {
        return send(res, 404, { error: 'not found' });
      }
      const ext = fp.split('.').pop().toLowerCase();
      const types = { png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon', json: 'application/json' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      return res.end(readFileSync(fp));
    }

    if (p === '/api/config') {
      return send(res, 200, { palette: style.palette, defaults: style.defaults, libraries: listLibraries() });
    }

    if (p === '/api/search') {
      const q = url.searchParams.get('q') || '';
      const weight = url.searchParams.get('weight') || 'fill';
      const lib = url.searchParams.get('lib') || 'phosphor';
      const items = listGlyphs({ library: lib, weight, query: q, limit: 120 }).map((name) => {
        try {
          const g = resolveGlyph(name, { library: lib, weight });
          return { name, svg: `<svg viewBox="0 0 ${g.vbW} ${g.vbH}" fill="#2b2b2b">${g.inner}</svg>` };
        } catch {
          return { name, svg: '' };
        }
      });
      return send(res, 200, items);
    }

    if (p === '/api/preview') {
      const o = Object.fromEntries(url.searchParams);
      const glyph = resolveGlyph(o.glyph, { library: o.lib || 'phosphor', weight: o.weight || 'fill' });
      const svg = compose(style, {
        glyph, bg: o.bg, fg: o.fg, fg2: o.fg2 || null,
        secondaryOpacity: o.secondaryOpacity ? Number(o.secondaryOpacity) : 1,
        variant: o.variant || 'rounded',
      });
      return send(res, 200, svg, 'image/svg+xml');
    }

    // 上传图片的实时预览（真合成，所见即所得）
    if (p === '/api/preview-image' && req.method === 'POST') {
      let body = '';
      for await (const c of req) body += c;
      const o = JSON.parse(body || '{}');
      if (!o.image) return send(res, 400, { error: 'no image' });
      const m = o.image.match(/^data:[^;]+;base64,(.*)$/);
      const imgBuf = Buffer.from(m ? m[1] : o.image, 'base64');
      const png = await composeImagePng(style, {
        imgBuf, bg: o.bg || style.defaults.bg,
        paddingRatio: o.padding != null ? Number(o.padding) : 0.18, fullBleed: !!o.fullBleed,
      });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' });
      return res.end(png);
    }

    if (p === '/api/projects') {
      return send(res, 200, listProjects());
    }

    // 在 Finder 里打开产物文件夹
    if (p === '/api/reveal') {
      const dir = join(ROOT, 'output', url.searchParams.get('app') || '');
      if (!dir.startsWith(join(ROOT, 'output')) || !existsSync(dir)) return send(res, 404, { error: 'no dir' });
      execFile('open', [dir]);
      return send(res, 200, { ok: true });
    }

    // 打包整个产物文件夹为 zip 下载
    if (p === '/api/zip') {
      const app = url.searchParams.get('app') || '';
      const dir = join(ROOT, 'output', app);
      if (!dir.startsWith(join(ROOT, 'output')) || !existsSync(dir)) return send(res, 404, { error: 'no dir' });
      const zipPath = join('/tmp', `iconforge-${app.replace(/[^\w.-]/g, '_')}.zip`);
      if (existsSync(zipPath)) rmSync(zipPath);
      // zip -X 不打包 macOS 扩展属性/._ 文件，cwd 设到 output 让压缩包内是干净的 <app>/ 结构
      execFileSync('zip', ['-r', '-X', '-q', zipPath, app], { cwd: join(ROOT, 'output') });
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${app}-icons.zip"`,
      });
      return res.end(readFileSync(zipPath));
    }

    if (p === '/api/generate' && req.method === 'POST') {
      let body = '';
      for await (const c of req) body += c;
      const o = JSON.parse(body || '{}');
      if (!o.app || !o.glyph) return send(res, 400, { error: '缺 app 或 glyph' });
      const glyph = resolveGlyph(o.glyph, { library: o.lib || 'phosphor', weight: o.weight || 'fill' });
      const outDir = join(ROOT, 'output', o.app);
      await exportAll(
        style,
        { glyph, bg: o.bg, fg: o.fg, fg2: o.fg2 || null, secondaryOpacity: o.secondaryOpacity ?? 1 },
        outDir
      );
      let placed = [];
      if (o.target) {
        const proj = listProjects().find((x) => x.name === o.target);
        if (proj) placed = placeIntoProject(outDir, proj);
      }
      return send(res, 200, { ok: true, outDir, placed });
    }

    // 上传图片模式：base64 图 → 套 tile / 铺满 → 全格式 → 放进项目
    if (p === '/api/generate-image' && req.method === 'POST') {
      let body = '';
      for await (const c of req) body += c;
      const o = JSON.parse(body || '{}');
      if (!o.app || !o.image) return send(res, 400, { error: '缺 app 或 image' });
      const m = o.image.match(/^data:[^;]+;base64,(.*)$/);
      const imgBuf = Buffer.from(m ? m[1] : o.image, 'base64');
      const outDir = join(ROOT, 'output', o.app);
      await exportFromImage(
        style,
        {
          imgBuf,
          bg: o.bg || style.defaults.bg,
          paddingRatio: o.padding != null ? Number(o.padding) : 0.18,
          fullBleed: !!o.fullBleed,
        },
        outDir
      );
      let placed = [];
      if (o.target) {
        const proj = listProjects().find((x) => x.name === o.target);
        if (proj) placed = placeIntoProject(outDir, proj);
      }
      return send(res, 200, { ok: true, outDir, placed });
    }

    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  const u = `http://localhost:${PORT}`;
  console.log(`icon-forge 选择器 → ${u}  (Ctrl+C 关闭)`);
  if (!process.env.NO_OPEN) execFile('open', [u]);
});
