/**
 * Genera iconos PWA de MiHucha a partir del logo fuente.
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "scripts", "assets", "pwa-source.jpg");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

/** Fondo del logo (blanco) para maskable / apple. */
const BG = "#ffffff";

async function loadSource() {
  // Normaliza a PNG cuadrado con fondo blanco (por si el JPG trae bordes irregulares).
  return sharp(sourcePath).ensureAlpha().flatten({ background: BG }).png().toBuffer();
}

async function resizeContain(sourceBuf, size) {
  return sharp(sourceBuf)
    .resize(size, size, {
      fit: "contain",
      background: BG,
    })
    .png()
    .toBuffer();
}

/** Maskable: logo dentro del safe zone (~80% central). */
async function resizeMaskable(sourceBuf, size) {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(sourceBuf)
    .resize(inner, inner, {
      fit: "contain",
      background: BG,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function writePng(name, buf) {
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log("wrote", name, buf.length, "bytes");
}

const source = await loadSource();

await writePng("icon-192.png", await resizeContain(source, 192));
await writePng("icon-512.png", await resizeContain(source, 512));
await writePng("icon-512-maskable.png", await resizeMaskable(source, 512));
await writePng("apple-touch-icon.png", await resizeContain(source, 180));
await writePng("icon-32.png", await resizeContain(source, 32));

console.log("done", outDir);
