// Gera os ícones do Tempoa (32/128/256 PNG + icon.ico) sem dependências externas.
// Design: quadrado arredondado com gradiente índigo→ciano e um relógio branco.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../src-tauri/icons");
fs.mkdirSync(outDir, { recursive: true });

// ---------------- PNG encoding ----------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(pngData, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(pngData.length, 8);
  entry.writeUInt32LE(22, 12); // offset
  return Buffer.concat([header, entry, pngData]);
}

// ---------------- drawing ----------------
const SSA = 4; // supersampling
const TOP = [99, 102, 241]; // indigo-500
const BOTTOM = [14, 165, 233]; // sky-500
const WHITE = [255, 255, 255];

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdRing(px, py, cx, cy, r, th) {
  return Math.abs(Math.hypot(px - cx, py - cy) - r) - th / 2;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function cov(d, aa) {
  return Math.max(0, Math.min(1, 0.5 - d / aa));
}

function sampleColor(px, py, S, aa) {
  const cx = S * 0.5;
  const cy = S * 0.46;
  const ringR = S * 0.27;
  const ringTh = S * 0.055;
  const minLen = S * 0.155;
  const hourLen = S * 0.125;
  const minW = S * 0.032;
  const hourW = S * 0.036;

  // fundo (quadrado arredondado)
  const bg = cov(sdRoundRect(px, py, S / 2, S / 2, S * 0.485, S * 0.485, S * 0.22), aa);
  if (bg <= 0) return [0, 0, 0, 0];

  const t = Math.max(0, Math.min(1, (py - S * 0.02) / (S * 0.96)));
  let col = mix(TOP, BOTTOM, t);

  // anel do relógio
  const ringCov = cov(sdRing(px, py, cx, cy, ringR, ringTh), aa);
  if (ringCov > 0) col = mix(col, WHITE, ringCov);

  // ponteiros (10:10)
  const hourTipX = cx + Math.sin(Math.PI / 3) * hourLen;
  const hourTipY = cy - Math.cos(Math.PI / 3) * hourLen;
  const minTipX = cx;
  const minTipY = cy - minLen;
  const hCov = cov(sdSegment(px, py, cx, cy - S * 0.02, hourTipX, hourTipY) - hourW / 2, aa);
  const mCov = cov(sdSegment(px, py, cx, cy - S * 0.02, minTipX, minTipY) - minW / 2, aa);
  const handCov = Math.max(hCov, mCov);
  if (handCov > 0) col = mix(col, WHITE, handCov);

  // ponto central
  const dotCov = cov(sdRing(px, py, cx, cy, S * 0.02, S * 0.028), aa);
  if (dotCov > 0) col = mix(col, WHITE, dotCov);

  return [col[0], col[1], col[2], bg];
}

function render(size) {
  const N = size * SSA;
  const out = Buffer.alloc(size * size * 4);
  const aa = Math.max(1, N / 96);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SSA; sy++) {
        for (let sx = 0; sx < SSA; sx++) {
          const px = (x + (sx + 0.5) / SSA) * SSA;
          const py = (y + (sy + 0.5) / SSA) * SSA;
          const c = sampleColor(px, py, N, aa);
          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const div = SSA * SSA;
      const alpha = a / div;
      const idx = (y * size + x) * 4;
      if (alpha > 0.004) {
        out[idx] = Math.round((r / div) / alpha);
        out[idx + 1] = Math.round((g / div) / alpha);
        out[idx + 2] = Math.round((b / div) / alpha);
        out[idx + 3] = Math.round(alpha * 255);
      } else {
        out[idx + 3] = 0;
      }
    }
  }
  return out;
}

// ---------------- escrever ficheiros ----------------
const png32 = encodePng(32, render(32));
const png128 = encodePng(128, render(128));
const png256 = encodePng(256, render(256));
const ico = encodeIco(png256, 256);

fs.writeFileSync(path.join(outDir, "32x32.png"), png32);
fs.writeFileSync(path.join(outDir, "128x128.png"), png128);
fs.writeFileSync(path.join(outDir, "128x128@2x.png"), png256);
fs.writeFileSync(path.join(outDir, "icon.ico"), ico);
console.log("Ícones gerados em", outDir);