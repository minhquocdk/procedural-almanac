// A live wallpaper, photographed or checked in Node: the same scenes the browser player uses
// (examples/live/index.html), so what is written is what is shown.
//
//   node examples/live/live.mjs --scene hoi-an --still 9 shot.png
//   node examples/live/live.mjs --scene rung-tre --sheet sheet.png --at 3,12,30,55
//   node examples/live/live.mjs --check        every scene: does the loop close, and how dear is a frame
//   --seed <words>   another layout of the same scene          --size <px>   the picture's width (480)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { live, SCENES } from './scenes.js';

const argv = process.argv.slice(2),
  opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);

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
const scaleUp = (px, w, h, s) => {
  const out = new Uint32Array(w * s * h * s);
  for (let y = 0; y < h * s; y++)
    for (let x = 0; x < w * s; x++) out[y * w * s + x] = px[((y / s) | 0) * w + ((x / s) | 0)];
  return out;
};
const make = (id) => live(id, opt('--seed', 'heron-bay-8'), { size: +opt('--size', 0) || undefined });

if (argv.includes('--check')) {
  let bad = 0;
  for (const meta of SCENES) {
    const scene = make(meta.id),
      first = scene.frame(0).slice(),
      again = scene.frame(scene.frames); // one whole loop on: the joint must meet itself exactly
    let seam = 0;
    for (let i = 0; i < first.length; i++) if (first[i] !== again[i]) seam++;
    const t0 = performance.now();
    for (let s = 0; s < scene.DUR; s += 3) scene.frame(Math.round(s * scene.FPS));
    const per = (performance.now() - t0) / 20;
    process.stderr.write(`${meta.id} · seam ${seam} px · ${per.toFixed(1)} ms a frame at ${scene.W}x${scene.H}\n`);
    process.stderr.write(scene.report().join('\n') + '\n');
    if (seam) bad = 1;
  }
  process.exit(bad);
}

const scene = make(opt('--scene', 'ha-long'));
if (argv.includes('--still')) {
  const seconds = +opt('--still', scene.opening),
    out = resolve(argv[argv.indexOf('--still') + 2] || 'still.png'),
    px = scene.frame(Math.round(seconds * scene.FPS));
  png(out, scene.W * 2, scene.H * 2, scaleUp(px, scene.W, scene.H, 2));
  process.stderr.write(`${out} · ${scene.id} · ${seconds} s\n`);
} else {
  const times = opt('--at', '')
    .split(',')
    .filter((x) => x !== '')
    .map(Number);
  if (!times.length) for (let i = 0; i < 6; i++) times.push(((i + 0.5) * scene.DUR) / 6);
  const shots = times.map((s) => scene.frame(Math.round(s * scene.FPS)).slice()),
    across = +opt('--across', 3),
    sheetW = scene.W * across,
    sheetH = scene.H * Math.ceil(shots.length / across),
    data = new Uint32Array(sheetW * sheetH);
  shots.forEach((px, i) => {
    const ox = (i % across) * scene.W,
      oy = Math.floor(i / across) * scene.H;
    for (let y = 0; y < scene.H; y++)
      for (let x = 0; x < scene.W; x++) data[(oy + y) * sheetW + ox + x] = px[y * scene.W + x];
  });
  const out = resolve(opt('--sheet', 'sheet.png'));
  png(out, sheetW, sheetH, data);
  process.stderr.write(
    `${out} · ${scene.id} · ${shots.length} moments ${times.map((t) => t.toFixed(1)).join(', ')} s\n`,
  );
}
process.stderr.write(scene.report().join('\n') + '\n');
