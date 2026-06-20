import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconDir = resolve(rootDir, 'public', 'icons');

mkdirSync(iconDir, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const payload = Buffer.concat([typeBuffer, data]);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(payload), output.length - 4);
  return output;
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function roundedAlpha(x, y, size, radius) {
  const edge = radius;
  const nx = x < edge ? edge - x : x > size - edge ? x - (size - edge) : 0;
  const ny = y < edge ? edge - y : y > size - edge ? y - (size - edge) : 0;
  const distance = Math.sqrt(nx * nx + ny * ny);
  if (distance <= radius) return 255;
  if (distance > radius + 2) return 0;
  return Math.max(0, Math.round(255 * (1 - (distance - radius) / 2)));
}

function inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function inCircle(px, py, cx, cy, r) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
}

function truckPixel(px, py, s) {
  return (
    inRect(px, py, 0.25 * s, 0.48 * s, 0.29 * s, 0.15 * s) ||
    inRect(px, py, 0.54 * s, 0.52 * s, 0.14 * s, 0.11 * s) ||
    inRect(px, py, 0.63 * s, 0.57 * s, 0.06 * s, 0.06 * s) ||
    inRect(px, py, 0.21 * s, 0.63 * s, 0.52 * s, 0.04 * s) ||
    inCircle(px, py, 0.33 * s, 0.7 * s, 0.055 * s) ||
    inCircle(px, py, 0.62 * s, 0.7 * s, 0.055 * s)
  );
}

function textPixel(px, py, s) {
  return (
    inRect(px, py, 0.27 * s, 0.22 * s, 0.055 * s, 0.21 * s) ||
    inRect(px, py, 0.27 * s, 0.38 * s, 0.18 * s, 0.055 * s) ||
    inRect(px, py, 0.53 * s, 0.22 * s, 0.055 * s, 0.21 * s) ||
    inRect(px, py, 0.71 * s, 0.22 * s, 0.055 * s, 0.21 * s) ||
    inRect(px, py, 0.53 * s, 0.31 * s, 0.235 * s, 0.055 * s)
  );
}

function createIcon(size, { maskable = false } = {}) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const purple = [109, 93, 246];
  const magenta = [157, 78, 255];
  const green = [37, 211, 102];
  const radius = maskable ? size / 2 : size * 0.22;

  for (let y = 0; y < size; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const p = row + 1 + x * 4;
      const t = (x + y) / (size * 2);
      const color = t < 0.6 ? mix(purple, magenta, t / 0.6) : mix(magenta, green, (t - 0.6) / 0.4);
      const highlight = Math.max(0, 1 - Math.hypot(x - size * 0.32, y - size * 0.2) / (size * 0.48));
      raw[p] = Math.min(255, color[0] + highlight * 42);
      raw[p + 1] = Math.min(255, color[1] + highlight * 42);
      raw[p + 2] = Math.min(255, color[2] + highlight * 42);
      raw[p + 3] = maskable ? 255 : roundedAlpha(x, y, size, radius);

      if (textPixel(x, y, size) || truckPixel(x, y, size)) {
        raw[p] = 255;
        raw[p + 1] = 255;
        raw[p + 2] = 255;
        raw[p + 3] = 255;
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

writeFileSync(resolve(iconDir, 'icon-192.png'), createIcon(192));
writeFileSync(resolve(iconDir, 'icon-512.png'), createIcon(512));
writeFileSync(resolve(iconDir, 'maskable-512.png'), createIcon(512, { maskable: true }));
