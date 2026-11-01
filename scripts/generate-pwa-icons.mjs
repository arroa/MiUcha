/**
 * Genera iconos PWA de MiUcha (Soft Quest) a partir de un SVG propio.
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const ACCENT = "#6d4cff";
const BG = "#f4f0ff";
const CARD = "#ffffff";

/** Icono "any": marca a casi todo el lienzo. */
function svgAny(size) {
  const r = Math.round(size * 0.22);
  const pad = Math.round(size * 0.1);
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const coinR = inner * 0.36;
  const fontSize = Math.round(size * 0.28);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR * 1.18}" fill="${CARD}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR}" fill="${ACCENT}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR * 0.78}" fill="none" stroke="${CARD}" stroke-width="${Math.max(2, size * 0.018)}" opacity="0.55"/>
  <text x="${cx}" y="${cy + fontSize * 0.36}" text-anchor="middle" font-family="Nunito, Segoe UI, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="${CARD}">M</text>
  <circle cx="${cx + coinR * 0.72}" cy="${cy - coinR * 0.72}" r="${coinR * 0.16}" fill="#a78bfa" opacity="0.9"/>
</svg>`;
}

/** Maskable: contenido dentro del safe zone (~80% central). */
function svgMaskable(size) {
  const cx = size / 2;
  const cy = size / 2;
  const coinR = size * 0.28;
  const fontSize = Math.round(size * 0.22);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR * 1.2}" fill="${CARD}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR}" fill="${ACCENT}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR * 0.78}" fill="none" stroke="${CARD}" stroke-width="${Math.max(2, size * 0.016)}" opacity="0.55"/>
  <text x="${cx}" y="${cy + fontSize * 0.36}" text-anchor="middle" font-family="Nunito, Segoe UI, Arial, sans-serif" font-weight="800" font-size="${fontSize}" fill="${CARD}">M</text>
  <circle cx="${cx + coinR * 0.72}" cy="${cy - coinR * 0.72}" r="${coinR * 0.16}" fill="#a78bfa" opacity="0.9"/>
</svg>`;
}

/** Apple touch: sin transparencia, esquinas las redondea iOS. */
function svgApple(size) {
  const cx = size / 2;
  const cy = size / 2;
  const coinR = size * 0.34;
  const fontSize = Math.round(size * 0.26);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR * 1.15}" fill="${CARD}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR}" fill="${ACCENT}"/>
  <circle cx="${cx}" cy="${cy}" r="${coinR * 0.78}" fill="none" stroke="${CARD}" stroke-width="${Math.max(2, size * 0.016)}" opacity="0.55"/>
  <text x="${cx}" y="${cy + fontSize * 0.36}" text-anchor="middle" font-family="Nunito, Segoe UI, Arial, sans-serif" font-weight="800" font-size="${fontSize}" fill="${CARD}">M</text>
  <circle cx="${cx + coinR * 0.72}" cy="${cy - coinR * 0.72}" r="${coinR * 0.16}" fill="#a78bfa" opacity="0.9"/>
</svg>`;
}

async function writePng(name, svg) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log("wrote", name, buf.length, "bytes");
}

await writePng("icon-192.png", svgAny(192));
await writePng("icon-512.png", svgAny(512));
await writePng("icon-512-maskable.png", svgMaskable(512));
await writePng("apple-touch-icon.png", svgApple(180));

// Favicon pequeño para pestaña (opcional, desde el same mark).
await writePng("icon-32.png", svgAny(32));

writeFileSync(join(outDir, "icon.svg"), svgAny(512));
console.log("done", outDir);
