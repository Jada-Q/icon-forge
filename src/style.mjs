import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadStyle(path = join(ROOT, 'icon-style.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// 把 palette key（如 "sky"）或裸 hex（如 "#48C2F9"）解析成 hex
export function resolveColor(style, keyOrHex) {
  if (!keyOrHex) return null;
  if (keyOrHex.startsWith('#')) return keyOrHex;
  const hex = style.palette[keyOrHex];
  if (!hex) {
    throw new Error(
      `未知颜色 "${keyOrHex}"。可用: ${Object.keys(style.palette).join(', ')} 或 #RRGGBB`
    );
  }
  return hex;
}
