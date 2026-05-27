import sharp from 'sharp';

// SVG 字符串 → 指定边长的 PNG buffer。
// density 拉高让 sharp 以高分辨率栅格化 SVG，再降采样到目标尺寸 → 小图也锐利。
export async function rasterize(svgString, size) {
  const density = Math.max(72, Math.round((size / 1024) * 72 * 4));
  return await sharp(Buffer.from(svgString), { density })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}
