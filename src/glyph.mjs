import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './style.mjs';

const PHOSPHOR = join(ROOT, 'node_modules/@phosphor-icons/core/assets');
const TABLER = join(ROOT, 'node_modules/@tabler/icons/icons');

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

export function resolveGlyph(name, { library, weight }) {
  let loc;
  if (library === 'phosphor') loc = phosphorFile(name, weight);
  else if (library === 'tabler') loc = tablerFile(name, weight);
  else throw new Error(`未知图标库 "${library}"，支持 phosphor | tabler`);

  if (!existsSync(loc.file)) {
    const sugg = suggest(loc.dir, name, library, weight);
    throw new Error(
      `找不到字形 "${name}" (${library}/${weight})。\n` +
      `相近的有: ${sugg.length ? sugg.join(', ') : '无'}\n` +
      `浏览全部: https://phosphoricons.com  或  https://tabler.io/icons`
    );
  }
  return parseSvg(readFileSync(loc.file, 'utf8'), loc.file);
}

function suggest(dir, name, library, weight) {
  if (!existsSync(dir)) return [];
  const sfx = library === 'phosphor' && weight !== 'regular' ? `-${weight}` : '';
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
