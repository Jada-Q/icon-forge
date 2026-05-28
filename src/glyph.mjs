import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './style.mjs';

const PHOSPHOR = join(ROOT, 'node_modules/@phosphor-icons/core/assets');
const TABLER = join(ROOT, 'node_modules/@tabler/icons/icons');
const FLATCOLOR = join(ROOT, 'node_modules/flat-color-icons/svg');

// phosphor: assets/<weight>/<name>-<weight>.svg（regular 无后缀）
export function phosphorFile(name, weight) {
  const suffix = weight === 'regular' ? '' : `-${weight}`;
  return { dir: join(PHOSPHOR, weight), file: join(PHOSPHOR, weight, `${name}${suffix}.svg`) };
}
// tabler: icons/<filled|outline>/<name>.svg
export function tablerFile(name, weight) {
  const sub = weight === 'filled' ? 'filled' : 'outline';
  return { dir: join(TABLER, sub), file: join(TABLER, sub, `${name}.svg`) };
}
// flat-color-icons: svg/<name>.svg（多色，无 weight）
export function flatColorFile(name) {
  return { dir: FLATCOLOR, file: join(FLATCOLOR, `${name}.svg`) };
}

// ── 库注册表 ──────────────────────────────────────────────
// kind:'mono' 按用户调色板重新上色；kind:'color' 保留原色直接放 tile。
// 加新库 = 装好 SVG（npm 或文件夹）+ 在这里加一条。
const LIBRARIES = {
  phosphor: {
    label: 'Phosphor', kind: 'mono', weights: ['fill', 'duotone', 'bold', 'regular'], defaultWeight: 'fill',
    locate: (name, w) => phosphorFile(name, w),
    strip: (w) => (w === 'regular' ? '' : `-${w}`),
  },
  tabler: {
    label: 'Tabler', kind: 'mono', weights: ['filled', 'outline'], defaultWeight: 'filled',
    locate: (name, w) => tablerFile(name, w),
    strip: () => '',
  },
  flatcolor: {
    label: 'Flat Color', kind: 'color', weights: ['color'], defaultWeight: 'color',
    locate: (name) => flatColorFile(name),
    strip: () => '',
  },
};

export function listLibraries() {
  return Object.entries(LIBRARIES).map(([id, l]) => ({
    id, label: l.label, kind: l.kind, weights: l.weights, defaultWeight: l.defaultWeight,
  }));
}

function lib(library) {
  const l = LIBRARIES[library];
  if (!l) throw new Error(`未知图标库 "${library}"，支持: ${Object.keys(LIBRARIES).join(' / ')}`);
  return l;
}

export function resolveGlyph(name, { library, weight }) {
  const l = lib(library);
  const { dir, file } = l.locate(name, weight);
  if (!existsSync(file)) {
    const sugg = suggest(dir, name, l.strip(weight));
    throw new Error(
      `找不到字形 "${name}" (${library}/${weight})。\n` +
      `相近的有: ${sugg.length ? sugg.join(', ') : '无'}\n` +
      `浏览全部: https://phosphoricons.com  或  https://tabler.io/icons`
    );
  }
  return { ...parseSvg(readFileSync(file, 'utf8'), file), kind: l.kind };
}

export function listGlyphs({ library, weight, query = '', limit = 120 }) {
  const l = lib(library);
  const { dir } = l.locate('_', weight);
  if (!existsSync(dir)) return [];
  const sfx = l.strip(weight);
  const q = query.toLowerCase().trim();
  const names = readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace('.svg', '').replace(new RegExp(`${sfx}$`), ''))
    .filter((n) => !q || n.includes(q));
  return [...new Set(names)]
    .sort(
      (a, b) =>
        (a.startsWith(q) ? 0 : 1) - (b.startsWith(q) ? 0 : 1) ||
        a.length - b.length ||
        a.localeCompare(b)
    )
    .slice(0, limit);
}

function suggest(dir, name, sfx) {
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.replace('.svg', '').replace(new RegExp(`${sfx}$`), ''));
  return [...new Set(names.filter((n) => n.includes(name) || name.includes(n)))].slice(0, 8);
}

// 抽 viewBox + 内部 markup，外层 svg 标签丢掉
function parseSvg(raw, file) {
  const vb = raw.match(/viewBox="([^"]+)"/);
  if (!vb) throw new Error(`SVG 无 viewBox: ${file}`);
  const p = vb[1].trim().split(/\s+/).map(Number);
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
  return { vbW: p[2], vbH: p[3], inner };
}
