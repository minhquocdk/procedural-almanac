// A storybook story, filmed or photographed in Node: the same engine the browser player uses
// (examples/storybook/index.html), so what is written is what is shown.
//
//   node examples/storybook/film.mjs --story stories/ba-chu-heo.json --still 9 shot.png
//   node examples/storybook/film.mjs --story stories/ba-chu-heo.json --sheet sheet.png --at 3,9,18,30,44,58
//   node examples/storybook/film.mjs --story stories/ba-chu-heo.json --check        what a script says, and whether it can be drawn
//   --seed <words>   another telling of the same script          --size <px>   the picture's width (480)
//   --at <seconds>   which moments a sheet shows                 --across <n>   how many to a row (4)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybook, validate } from './story.js';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2),
  opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);

const storyArg = opt('--story', 'stories/ba-chu-heo.json'),
  storyPath = existsSync(resolve(storyArg)) ? resolve(storyArg) : resolve(here, storyArg),
  script = JSON.parse(readFileSync(storyPath, 'utf8'));

if (argv.includes('--check')) {
  const problems = validate(script);
  if (problems.length) {
    process.stderr.write(`${problems.length} problem${problems.length > 1 ? 's' : ''} in ${storyPath}:\n`);
    for (const p of problems) process.stderr.write(`  ${p}\n`);
    process.exit(1);
  }
  const book = storybook(script, { seed: opt('--seed', ''), size: +opt('--size', 0) || undefined });
  process.stderr.write(book.report().join('\n') + '\n');
  process.exit(0);
}

const book = storybook(script, { seed: opt('--seed', ''), size: +opt('--size', 0) || undefined });

// a PNG from packed pixels (the same writer island.mjs uses: no dependency for six hundred bytes of format)
function png(path, w, h, px) {
  const crcT = Array.from({ length: 256 }, (_, k) => {
    let c = k;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b) => {
    let c = 0xffffffff;
    for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const td = Buffer.concat([Buffer.from(type), data]),
      out = Buffer.alloc(td.length + 8);
    out.writeUInt32BE(data.length, 0);
    td.copy(out, 4);
    out.writeUInt32BE(crc(td), td.length + 4);
    return out;
  };
  const raw = Buffer.alloc((w * 4 + 1) * h),
    bytes = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
  for (let y = 0; y < h; y++) bytes.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

if (argv.includes('--still')) {
  const seconds = +opt('--still', 0),
    f = Math.min(book.frames - 1, Math.round(seconds * book.FPS)),
    out = argv[argv.indexOf('--still') + 2] || 'still.png';
  png(out, book.W, book.H, book.frame(f));
  const at = book.sceneAt(seconds);
  process.stderr.write(`${out} · ${seconds}s · ${at.scene.id} · ${at.caption.text || ''}\n`);
} else {
  const times = opt('--at', '')
    .split(',')
    .filter((x) => x !== '')
    .map(Number);
  if (!times.length) for (let i = 0; i < 6; i++) times.push(((i + 0.5) * book.DUR) / 6);
  const shots = times.map((s) => book.frame(Math.min(book.frames - 1, Math.round(s * book.FPS))).slice()),
    across = +opt('--across', 4),
    sheetW = book.W * across,
    sheetH = book.H * Math.ceil(shots.length / across),
    data = new Uint32Array(sheetW * sheetH);
  shots.forEach((px, i) => {
    const ox = (i % across) * book.W,
      oy = Math.floor(i / across) * book.H;
    for (let y = 0; y < book.H; y++)
      for (let x = 0; x < book.W; x++) data[(oy + y) * sheetW + ox + x] = px[y * book.W + x];
  });
  const out = resolve(opt('--sheet', 'sheet.png'));
  png(out, sheetW, sheetH, data);
  process.stderr.write(`${out} · ${shots.length} moments ${times.map((t) => t.toFixed(1)).join(', ')} s\n`);
}
process.stderr.write(book.report().join('\n') + '\n');
