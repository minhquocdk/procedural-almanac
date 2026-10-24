// Live wallpapers: four finished Vietnamese scenes, drawn with procedural-almanac and nothing else.
//
// Where the island film (examples/island) tells one story from a seed, a live scene just *is* a place: Ha Long at
// dawn, flooded rice terraces, Hoi An under its lanterns, a bamboo forest in afternoon rain. Each scene is a pure
// frame(f) over a seamless 60-second loop -- the same picture whether it is played, scrubbed, left running as a
// wallpaper, or filmed in Node (live.mjs) -- and a seed re-grows its layout (other karsts, other terraces, another
// street of houses, another stand of bamboo) without changing what the scene is. Nothing here reads a script or
// takes a visitor's data: the four scenes are the whole menu.
import * as almanac from '../../src/index.js';

/** The scenes on the menu: an id for the URL, a title, and one line saying what the place is. */
export const SCENES = [
  { id: 'ha-long', title: 'Hạ Long · Bình minh', sub: 'Núi đá trên mặt vịnh, thuyền buồm và sương sớm' },
  {
    id: 'ruong-bac-thang',
    title: 'Ruộng bậc thang · Mùa nước đổ',
    sub: 'Nước gương trên từng bậc ruộng, bóng mây đi qua',
  },
  { id: 'hoi-an', title: 'Hội An · Đêm đèn lồng', sub: 'Phố vàng bên sông, đèn lồng và hoa đăng trôi' },
  { id: 'rung-tre', title: 'Rừng tre · Mưa chiều', sub: 'Mưa qua từng đợt, tre lay, suối và một con cò trắng' },
];

/**
 * One live wallpaper, grown from a scene id and a seed.
 * @param {string} [id] one of SCENES' ids (ha-long)
 * @param {string|number} [phrase] the seed, as words or a number (heron-bay-8)
 * @param {{size?: number}} [o] size: the picture's width in pixels (480; the scene is drawn at 480x270 and scaled
 *   up in whole pixels, as pixel art is)
 * @returns {{id: string, title: string, sub: string, W: number, H: number, FPS: number, DUR: number,
 *   frames: number, opening: number, phrase: string, seed: number, used: Set<string>,
 *   frame: function(number): Uint32Array, report: function(): string[]}} frame(f): the picture at frame f, a pure
 *   function of f (wrapping every DUR seconds); opening: where a fresh showing begins, in seconds
 */
export function live(id = 'ha-long', phrase = 'heron-bay-8', o = {}) {
  const meta = SCENES.find((s) => s.id === id) || SCENES[0];

  // every technique the scene calls is counted on its way through, the ledger the island film keeps
  const used = new Set();
  const A = {};
  for (const [name, f] of Object.entries(almanac))
    A[name] =
      typeof f !== 'function'
        ? f
        : /^[A-Z]/.test(name)
          ? class extends f {
              constructor(...a) {
                super(...a);
                used.add(name);
              }
            }
          : (...a) => {
              used.add(name);
              return f(...a);
            };
  // prettier-ignore
  const {
    clamp, lerp, smoothstep, wrap, indexRandom, SeededRandom, latticeHash, latticeRandom, fractalNoise, noiseLine,
    packRgb, mixPacked, hueShiftTone, bayerThreshold, scalePacked, waterTime, waterPixel, hexToRgb, mixColour,
    gradeColour, dayCycle, aerialPerspective, twinkle, hourLight, hourTables, gradeFrame, hillLine, scatterAlong,
    windowLit, blink, formationSlot, particleField, swayingChain, stampCache, footStep, strideRate, gaitTiming,
    seedOf, ellipseRows, fillEllipse, lineCells, ditherEllipse, shadeEllipse, blitSprite, outlinePass, cutSprite,
    drawnBounds, spriteFromRows, leafCrown, barkTrunk, floatHeight, cloudShadows, fogBanks, frontStrength,
    roofTexel,
  } = A;

  const W = 480, // the picture the scene is drawn in, whatever size it is shown at
    H = 270,
    FPS = 20,
    DUR = 60,
    FRAMES = DUR * FPS;
  const OUTW = Math.max(160, Math.round(o.size || 480)),
    OUTH = Math.round((OUTW * H) / W);
  const PHRASE = String(phrase).trim() || 'heron-bay-8',
    SEED = seedOf(`${meta.id}:${PHRASE}`); // the same words grow a different layout in each scene

  // -------------------------------------------------------------------------------------------------- the paintbox
  const LOOK = { sat: 1.07, warm: 0.04, contrast: 1.03 }; // one grade over every palette, as the island does
  const hex = (s) => packRgb(...hexToRgb(gradeColour(s, LOOK)));
  const RAMPS = new Map();
  const tone = (c, k) => {
    let r = RAMPS.get(c);
    if (!r) RAMPS.set(c, (r = [-1.7, -0.85, 0, 0.75, 1.5].map((s) => (s ? hueShiftTone(c, s) : c))));
    return r[clamp(k, -2, 2) + 2];
  };
  const INK = hex('#22301f');

  const FRAME = new Uint32Array(W * H),
    OUT = { w: W, h: H, px: FRAME };
  const buffer = (w, h) => ({ w, h, px: new Uint32Array(w * h) });
  const plot = (r, x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < r.w && y < r.h) r.px[y * r.w + x] = c;
  };
  const rect = (r, x, y, w, h, c) => {
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(r.h, Math.round(y + h)); yy++)
      for (let xx = Math.max(0, Math.round(x)); xx < Math.min(r.w, Math.round(x + w)); xx++) r.px[yy * r.w + xx] = c;
  };
  const line = (r, x0, y0, x1, y1, c) => lineCells(x0, y0, x1, y1, (x, y) => plot(r, x, y, c));

  // a sky (or any tall wash) between colour stops, in dithered steps so it stays pixel art, not a gradient photo
  function wash(r, stops, y0, y1, steps = 26) {
    const cols = stops.map(([at, s]) => [at, hexToRgb(gradeColour(s, LOOK))]);
    for (let y = y0; y < y1; y++) {
      const v = (y - y0) / Math.max(1, y1 - y0 - 1);
      let k = 0;
      while (k < cols.length - 2 && v > cols[k + 1][0]) k++;
      const u = clamp((v - cols[k][0]) / Math.max(1e-6, cols[k + 1][0] - cols[k][0])),
        c = packRgb(...mixColour(cols[k][1], cols[k + 1][1], u)),
        c2 = packRgb(...mixColour(cols[k][1], cols[k + 1][1], clamp(u + 1 / steps))),
        frac = v * steps - Math.floor(v * steps);
      // on the row where one step hands over to the next, the Bayer pattern decides pixel by pixel
      for (let x = 0; x < r.w; x++) r.px[y * r.w + x] = bayerThreshold(x, y) < frac ? c2 : c;
    }
  }

  // the water palettes waterPixel asks for: seven levels light to deep, foam, glints, weed, sand in the shallows
  const water = (lv, extra = {}) => ({
    LV: lv.map(hex),
    FOAM: hex(extra.foam || '#f6fdff'),
    FOAM2: hex(extra.foam2 || '#c4ecf2'),
    GLINT: hex(extra.glint || '#ffffff'),
    GLINT2: hex(extra.glint2 || '#dff8ff'),
    WEED: hex(extra.weed || '#2f7db0'),
    WEED2: hex(extra.weed2 || '#3487b6'),
    SAND: (extra.sand || ['#e2d3a0', '#bfd0a6', '#8cc2b4']).map(hex),
  });

  // what hangs in every sky: gulls in a vee (formationSlot), crossing now and then, and slow clouds
  const GULL = [
    spriteFromRows(['#...#', '.#.#.', '..#..'], () => hex('#fbfbf6'), { outline: false }),
    spriteFromRows(['.....', '##.##', '..#..'], () => hex('#fbfbf6'), { outline: false }),
  ];
  function drawBirds(t, o) {
    const every = o.every || 26,
      cross = every * 0.6,
      local = (t + (o.offset || 0)) % every;
    if (local > cross) return;
    const u = local / cross,
      x = lerp(-46, W + 46, o.flip ? 1 - u : u),
      y = o.y + Math.sin(u * Math.PI * 2.2) * 5,
      la = o.flip ? Math.PI - 0.04 : 0.04,
      n = o.n || 7,
      fr = Math.round(t * FPS);
    for (let k = 0; k < n; k++) {
      const p = k ? formationSlot('vee', x, y, la, k - 1) : { x, y };
      if (o.shadowY) shadeEllipse(OUT, p.x + 10, o.shadowY + (p.y - o.y) * 0.4, 2, 1, 0.78);
      blitSprite(OUT, GULL[(fr + k) % 6 < 3 ? 0 : 1], p.x, p.y, !!o.flip);
    }
  }
  function cloudSprite(rng, cols) {
    const r = buffer(62, 22),
      n = rng.int(5, 8);
    for (let k = 0; k < n; k++) {
      const cx = 10 + (k / Math.max(1, n - 1)) * 42 + rng.range(-3, 3),
        cy = 12 + rng.range(-2, 2),
        rx = rng.range(7, 13);
      fillEllipse(r, cx, cy, rx, rx * 0.42, cols[1]);
      fillEllipse(r, cx - rx * 0.2, cy - rx * 0.16, rx * 0.7, rx * 0.3, cols[0]);
    }
    for (let x = 0; x < r.w; x++)
      // a shaded belly, one row under each column of cloud
      for (let y = r.h - 1; y > 0; y--)
        if (r.px[y * r.w + x]) {
          r.px[y * r.w + x] = cols[2];
          break;
        }
    const b = drawnBounds(r);
    return b ? cutSprite(r, b[0], b[1], b[2], b[3], b[2] / 2, b[3] / 2) : { ...r, ax: 31, ay: 11 };
  }
  function drawClouds(t, clouds) {
    for (const c of clouds) {
      const x = wrap(c.x + t * c.speed, W + 150) - 75;
      blitSprite(OUT, c.sp, x, c.y);
    }
  }
  // a round tree, the island's way: a bark trunk and a crown of clumps (leafCrown), inked round (outlinePass)
  const treeCache = stampCache(400);
  function tree(key, seed, leaf, size = 1) {
    return treeCache.get(key, () => {
      const r = buffer(34, 40),
        rng = new SeededRandom(seed),
        ax = 17,
        ay = 37,
        rx = (5 + rng.range(0, 2)) * size,
        th = Math.max(2, Math.round(5 * size));
      barkTrunk(r, ax, ay - th - rx * 0.5, ay, size > 0.9 ? 2 : 1, [hex('#5b3b26'), hex('#87593a')], rng.int(-1, 1));
      leafCrown(r, rng, ax, ay - th - rx * 0.7, rx, rx * 0.82, leaf.map(hex), {});
      outlinePass(r, INK);
      const b = drawnBounds(r);
      return b ? cutSprite(r, b[0], b[1], b[2], b[3], ax, ay) : { ...r, ax, ay };
    });
  }

  // a strip of the finished picture mirrored into the water under it, wobbling a pixel each way as the rows go down
  function reflect(waterY, depth, t, amount = 0.34, squash = 0.72) {
    for (let dy = 1; dy <= depth && waterY + dy < H; dy++) {
      const srcY = Math.round(waterY - 1 - dy * squash);
      if (srcY < 0) break;
      const shift = Math.round(Math.sin((waterY + dy) * 0.35 + t * 2.2)),
        fade = amount * (1 - (dy / depth) * 0.65);
      for (let x = 0; x < W; x++) {
        const sx = clamp(x + shift, 0, W - 1),
          i = (waterY + dy) * W + x;
        FRAME[i] = mixPacked(FRAME[i], FRAME[srcY * W + sx], fade);
      }
    }
  }

  // hourTables are dear to make and a scene reuses the same few (the island's key, hourLight)
  const TABLES = new Map();
  let gradeScratch;
  function grade(tod, dim, wet, lights = []) {
    const hl = hourLight(tod, dim, wet);
    if (hl.plain && !lights.length) return;
    if (!TABLES.has(hl.key)) TABLES.set(hl.key, hourTables(hl.night, hl.dusk, hl.morning, dim, wet));
    gradeScratch = gradeFrame(FRAME, W, H, TABLES.get(hl.key), { night: hl.night, lights, scratch: gradeScratch });
  }

  // ============================================================================ one scene each, a renderer apiece
  const scenes = { 'ha-long': haLong, 'ruong-bac-thang': terraces, 'hoi-an': hoiAn, 'rung-tre': bamboo };
  const render = scenes[meta.id](SEED);

  // ------------------------------------------------------------------------------- Ha Long at dawn
  function haLong(seed) {
    const rng = new SeededRandom(seed + 11),
      horizon = 172,
      sunX = Math.round(W * rng.range(0.3, 0.42)),
      P = water(['#93bfca', '#7daec0', '#699db4', '#568aa6', '#467794', '#386582', '#2d5472'], {
        glint: '#ffe9b8',
        glint2: '#fff7dd',
        weed: '#3d6f8d',
        weed2: '#467b9a',
      });
    // limestone karsts: each layer a row of humps, their tops bitten by noise; the nearer, the darker and lower
    const layer = (n, hMin, hMax, wMin, wMax, salt) =>
      Array.from({ length: n }, (_, k) => ({
        c: -30 + ((k + rng.range(0.15, 0.85)) / n) * (W + 60),
        h: rng.range(hMin, hMax),
        w: rng.range(wMin, wMax),
        salt: salt + k * 7,
      }));
    const heightAt = (peaks, x) => {
      let h = 0;
      for (const p of peaks) {
        const d = Math.abs(x - p.c) / p.w;
        if (d >= 1) continue;
        const shape = Math.pow(Math.max(0, 1 - d * d), 0.38) * (0.86 + 0.26 * noiseLine(x * 0.06, seed + p.salt)),
          cand = p.h * shape;
        if (cand > 5) h = Math.max(h, cand); // below a ledge's height the sea keeps the gap between karsts
      }
      return h;
    };
    const layers = [
      { peaks: layer(7, 24, 50, 20, 38, 3), base: horizon - 1, rock: hex('#7d9db4'), green: hex('#7ba492') },
      { peaks: layer(5, 38, 76, 26, 48, 31), base: horizon + 2, rock: hex('#4c7484'), green: hex('#4d8a68') },
      { peaks: layer(4, 52, 98, 34, 60, 67), base: horizon + 5, rock: hex('#31586a'), green: hex('#35704e') },
    ];
    const clouds = Array.from({ length: 4 }, (_, k) => ({
      sp: cloudSprite(new SeededRandom(seed + 200 + k), [hex('#fff6e8'), hex('#f7ddba'), hex('#d9ae8e')]),
      x: rng.range(0, W),
      y: rng.range(16, 62),
      speed: rng.range(1.2, 2.4),
    }));
    // a junk with bat-wing sails, drawn into a buffer: hull, mast, two sails ruled by their battens
    const junk = (sail, hull, ink) => {
      const r = buffer(46, 32),
        ax = 23,
        ay = 29;
      line(r, 24, 4, 24, 24, ink);
      for (let i = 0; i <= 8; i++) {
        // the great sail, a fan from the masthead down to the stern quarter
        const y = 6 + i * 2,
          x1 = 25 + Math.round(Math.sin((i / 8) * 1.9) * 13),
          x0 = 25 - Math.round(i * 0.7);
        for (let x = x0; x <= x1; x++) plot(r, x, y, sail);
        for (let x = x0; x <= x1; x++) plot(r, x, y + 1, i % 2 ? tone(sail, -1) : sail);
        plot(r, x0, y, ink);
        plot(r, x1, y, ink);
      }
      for (let i = 0; i <= 5; i++) for (let x = 15 - i; x <= 22; x++) plot(r, x, 11 + i * 2, tone(sail, -1)); // foresail
      for (let y = 24; y <= 28; y++) {
        const inset = y - 24 === 4 ? 5 : y - 24 === 3 ? 2 : 0;
        for (let x = 6 + inset; x <= 40 - inset; x++) plot(r, x, y, y === 24 ? tone(hull, 1) : hull);
      }
      plot(r, 6, 23, hull);
      plot(r, 40, 23, hull);
      plot(r, 5, 22, hull);
      plot(r, 41, 22, hull);
      plot(r, 24, 3, hex('#d8402e'));
      plot(r, 25, 3, hex('#d8402e'));
      outlinePass(r, ink);
      const b = drawnBounds(r);
      return b ? cutSprite(r, b[0], b[1], b[2], b[3], ax, ay) : { ...r, ax, ay };
    };
    const NEAR_BOAT = junk(hex('#e8d3a0'), hex('#7a4a2e'), hex('#3a2a1e')),
      FAR_BOAT = junk(hex('#93a9b8'), hex('#4c6070'), hex('#42586a'));
    // the still part: sky and karsts, with green on the ledges and light along the tops
    const BASE = new Uint32Array(W * H),
      base = { w: W, h: H, px: BASE };
    wash(
      base,
      [
        [0, '#33507e'],
        [0.45, '#7fa6c4'],
        [0.78, '#e9bd8d'],
        [1, '#f9d9a4'],
      ],
      0,
      horizon + 2,
    );
    rect(base, 0, horizon + 2, W, H - horizon, P.LV[3]);
    const KARST = { ...buffer(W, H), ax: 0, ay: 0 };
    for (const L of layers) {
      for (let x = 0; x < W; x++) {
        const h = heightAt(L.peaks, x);
        if (h < 2) continue;
        const top = Math.round(L.base - h),
          facing = heightAt(L.peaks, x + 2) > h; // a slope climbing away from the sun is the darker one
        for (let y = top; y <= L.base; y++) {
          const ledge = y - top < 2 + h * 0.16 && latticeRandom(x, y * 3, seed) > 0.55,
            shadeRock = (y - top) % 7 === 6 || latticeRandom(x * 2, y, seed + 5) > 0.93;
          KARST.px[y * W + x] = ledge ? L.green : shadeRock || !facing ? tone(L.rock, -1) : L.rock;
        }
        KARST.px[top * W + x] = tone(L.rock, 1);
      }
    }
    // the shore the picture is seen from: dark headlands in the two near corners, in front of the sea
    const ISLE_D = hex('#24483e'),
      ISLE_L = hex('#2e5c4a'),
      FORE = { ...buffer(W, H), ax: 0, ay: 0 };
    for (let x = 0; x < W; x++) {
      let top = -1;
      if (x < 132) top = horizon + 48 + x * 0.3 + (noiseLine(x * 0.05, seed + 41) - 0.5) * 5;
      else if (x > W - 142) top = horizon + 86 - (x - (W - 142)) * 0.26 + (noiseLine(x * 0.05, seed + 43) - 0.5) * 5;
      if (top < 0) continue;
      for (let y = Math.round(top); y < H; y++)
        FORE.px[y * W + x] = y - top < 4 ? ISLE_L : latticeRandom(x, y, seed + 6) > 0.86 ? ISLE_L : ISLE_D;
    }
    blitSprite(FORE, tree('hl', seed + 9, ['#1d4433', '#2e6444', '#468556', '#6aa874'], 1.7), 26, horizon + 60);
    blitSprite(FORE, tree('hl2', seed + 19, ['#1d4433', '#2e6444', '#468556', '#6aa874'], 1.4), W - 22, horizon + 58);
    const BEFORE_FOG = new Uint32Array(W * H);
    let fogScratch;
    const GOLD = hex('#ffd98a');

    return (t) => {
      FRAME.set(BASE);
      const WT = waterTime(t, Math.floor(t * 15)),
        sunY = horizon - 58 - Math.sin((t / DUR) * Math.PI * 2) * 8; // the sun climbs a little and settles back
      fillEllipse(OUT, sunX, sunY, 16, 14, hex('#f9cf8d'));
      fillEllipse(OUT, sunX, sunY, 12, 11, hex('#ffd98a'));
      fillEllipse(OUT, sunX - 2, sunY - 2, 8, 7, hex('#fff3c0'));
      drawClouds(t, clouds);
      // the sea, a pixel at a time (waterPixel), with the sun's road of glints running down it
      for (let y = horizon; y < H; y++) {
        const wob = Math.round(Math.sin(y * 0.35 + t * 2.2)),
          halfRoad = 5 + (y - horizon) * 0.42;
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          let c = waterPixel(x, y, (y - horizon) * 1.7 + 2, false, 0, WT, wob, P);
          const off = Math.abs(x - sunX + wob * 2);
          if (off < halfRoad && indexRandom((x >> 2) + y * 131, Math.floor(t * 3) + seed) < 0.4)
            c = mixPacked(c, GOLD, 0.62 * (1 - off / halfRoad));
          FRAME[i] = c;
        }
      }
      blitSprite(OUT, KARST, 0, 0); // in front of the sun, behind nothing else
      reflect(horizon + 4, 40, t, 0.3);
      const farX = wrap(t * 5 + W * 0.3, W + 140) - 70,
        farBob = Math.round(floatHeight(0, 2, 2, 1, 5, true, t * 0.8, 1) * 2 - 5);
      blitSprite(OUT, FAR_BOAT, farX, horizon + 16 + farBob, false);
      // mist on the water at the karsts' feet (fogBanks): laid over everything, then the sky and the peaks are
      // given back from before it, feathered over a few rows, so the fog stays where mist belongs
      BEFORE_FOG.set(FRAME);
      fogScratch = fogBanks(FRAME, W, H, {
        x: t * 6,
        y: t * 1.5,
        density: 0.4,
        colour: hex('#f7e3c2'),
        seed: seed + 9,
        scratch: fogScratch,
      });
      FRAME.set(BEFORE_FOG.subarray(0, (horizon - 24) * W), 0);
      for (let y = horizon - 24; y < horizon - 4; y++) {
        const keep = 1 - (y - (horizon - 24)) / 20;
        for (let x = 0; x < W; x++) FRAME[y * W + x] = mixPacked(FRAME[y * W + x], BEFORE_FOG[y * W + x], keep);
      }
      blitSprite(OUT, FORE, 0, 0);
      const nearX = wrap(-t * 8 + W * 0.75, W + 160) - 80,
        nearBob = Math.round(floatHeight(0, 2, 2, 1, 5, true, t + 2, 1) * 2 - 5),
        nearY = horizon + 52 + nearBob;
      shadeEllipse(OUT, nearX, nearY + 2, 18, 2, 0.7);
      for (let k = 1; k < 10; k++)
        // its wake, foam dashes astern
        if ((k + Math.round(t * FPS)) % 3) plot(OUT, nearX + 20 + k * 3, nearY + 2 + (k % 2), P.FOAM2);
      blitSprite(OUT, NEAR_BOAT, nearX, nearY, true);
      drawBirds(t, { y: 54, every: 30, offset: 7, n: 7 });
    };
  }

  // ------------------------------------------------------------------------------- flooded rice terraces
  function terraces(seed) {
    const rng = new SeededRandom(seed + 23),
      SKY_H = 60,
      BANDS = 9,
      P = water(['#bcdcf0', '#a5cbe8', '#8fb9dd', '#79a6cf', '#6593c0', '#5481ae', '#46719d'], {
        glint: '#ffffff',
        glint2: '#ffeec2',
        weed: '#7fb0d2',
        weed2: '#92c0dd',
        sand: ['#c8e2f0', '#a9cbe2', '#8db2d0'],
      });
    // each terrace's top edge, a slow noise curve; the bands grow taller toward the viewer
    const edges = [];
    {
      let y = SKY_H + 4;
      for (let i = 0; i < BANDS; i++) {
        const h = 8 + i * 3.4,
          tilt = rng.range(-0.012, 0.012),
          amp = 3.5 + i * 0.5,
          top = new Float32Array(W);
        for (let x = 0; x < W; x++)
          top[x] =
            y +
            (noiseLine(x * 0.008 + i * 9.7, seed + i * 3) - 0.5) * 2 * amp +
            x * tilt +
            Math.pow(Math.abs(x - W * 0.46) / (W * 0.54), 2) * 16; // every terrace contours the same round hill
        edges.push({ top, h });
        y += h;
      }
    }
    const kinds = ['water', 'water', 'rice', 'water', 'rice', 'water', 'water', 'rice', 'water'];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    const bandAt = (x, y) => {
      for (let i = BANDS - 1; i >= 0; i--) if (y >= edges[i].top[x]) return i;
      return -1;
    };
    const clouds = Array.from({ length: 3 }, (_, k) => ({
      sp: cloudSprite(new SeededRandom(seed + 300 + k), [hex('#ffffff'), hex('#f4f8fb'), hex('#cfdde8')]),
      x: rng.range(0, W),
      y: rng.range(10, 34),
      speed: rng.range(2, 3.6),
    }));
    const BASE = new Uint32Array(W * H),
      base = { w: W, h: H, px: BASE };
    rect(base, 0, 0, W, H, hex('#6d9478')); // hillside under everything, so no seed leaves an unpainted gap
    wash(
      base,
      [
        [0, '#5f96c8'],
        [0.6, '#a8cbe6'],
        [1, '#e8f0e4'],
      ],
      0,
      SKY_H + 16,
    );
    // the far ranges over the top of the valley (hillLine, sharp and then rounder)
    for (const [hill, col] of [
      [{ freq: 2.4, seed: seed % 997, base: 0.24, height: 0.11, sharp: 0.65 }, hex('#8aa8c4')],
      [{ freq: 3.1, seed: (seed % 997) + 40, base: 0.27, height: 0.09, sharp: 0.35 }, hex('#6d9478')],
    ])
      for (let x = 0; x < W; x++) {
        const y = Math.round(hillLine(x, hill, W, H));
        for (let yy = y; yy < SKY_H + 18; yy++)
          BASE[yy * W + x] = latticeRandom(x, yy, seed) > 0.9 ? tone(col, -1) : col;
      }
    // the terraces themselves: planted bands are still, so they are painted once; water waits for each frame
    const BANK = hex('#7a5c3d'),
      BANK_L = hex('#9a7a50');
    for (let y = SKY_H; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = bandAt(x, y);
        if (i < 0) continue;
        const bottom = i === BANDS - 1 ? 1e9 : edges[i + 1].top[x],
          toBottom = bottom - y;
        let c;
        if (toBottom <= 2)
          c = toBottom <= 1 ? BANK_L : BANK; // the bund between two fields, catching the light
        else if (kinds[i] === 'water') c = P.LV[2];
        else {
          const g = latticeRandom(Math.floor(x / 3), Math.floor(y / 3), seed + i),
            sprout = x % 3 === 1 && y % 4 === 2;
          c = sprout ? hex('#74bd5c') : g > 0.75 ? hex('#5da84c') : g > 0.4 ? hex('#519a44') : hex('#46853c');
          if ((y >> 2) % 2 === 0) c = tone(c, -1); // the planting rows, one shaded in two
          if (y - edges[i].top[x] < 2) c = hex('#7cc468');
        }
        BASE[y * W + x] = c;
      }
    // forested spurs in the near corners, the hut and the lone trees: an overlay, so the terraces' water,
    // painted afresh each frame, runs behind them instead of over them
    const SIDE = { ...buffer(W, H), ax: 0, ay: 0 };
    for (let x = 0; x < W; x++) {
      let edge = -1;
      if (x < 140) edge = 172 + x * 0.57 + (noiseLine(x * 0.035, seed + 51) - 0.5) * 16;
      else if (x > W - 122) edge = 242 - (x - (W - 122)) * 0.68 + (noiseLine(x * 0.035, seed + 53) - 0.5) * 16;
      if (edge < 0) continue;
      for (let y = Math.round(edge); y < H; y++) {
        const g = latticeRandom(Math.floor(x / 2), Math.floor(y / 2), seed + 8);
        SIDE.px[y * W + x] =
          y - edge < 3
            ? hex('#5d9458')
            : y - edge > 26 && g > 0.5
              ? hex('#335e38')
              : g > 0.82
                ? hex('#4d8549')
                : g > 0.45
                  ? hex('#3f7042')
                  : hex('#335e38');
      }
    }
    {
      const hx = Math.round(W * rng.range(0.64, 0.72)),
        hy = Math.round(edges[4].top[hx]) - 1;
      for (let k = 0; k < 4; k++) rect(SIDE, hx - 11 + k * 7, hy - 4, 2, 5, hex('#5b3b26'));
      rect(SIDE, hx - 13, hy - 13, 27, 9, hex('#a9763f'));
      rect(SIDE, hx - 13, hy - 13, 27, 2, tone(hex('#a9763f'), -1));
      rect(SIDE, hx - 3, hy - 10, 6, 6, hex('#4a3220'));
      rect(SIDE, hx + 7, hy - 10, 4, 4, hex('#33496c'));
      for (let y = 0; y < 7; y++)
        for (let x = -8 - Math.floor(y * 1.5); x <= 8 + Math.floor(y * 1.5); x++) {
          const tex = roofTexel('thatch', hx + x, hy - 20 + y, hx - 17, hy - 20);
          plot(SIDE, hx + x, hy - 20 + y, tex === 'seam' || tex === 'deep' ? hex('#9a7a3e') : hex('#c9a656'));
        }
      blitSprite(SIDE, tree('rt1', seed + 5, ['#24532f', '#3b7d3c', '#5aa148', '#86c767'], 1.2), 26, 192);
      blitSprite(SIDE, tree('rt4', seed + 35, ['#24532f', '#3b7d3c', '#5aa148', '#86c767'], 0.9), 64, 216);
      blitSprite(SIDE, tree('rt2', seed + 15, ['#24532f', '#3b7d3c', '#5aa148', '#86c767'], 1), W - 30, 168);
      blitSprite(SIDE, tree('rt5', seed + 45, ['#24532f', '#3b7d3c', '#5aa148', '#86c767'], 0.8), W - 66, 196);
      blitSprite(
        SIDE,
        tree('rt3', seed + 25, ['#24532f', '#3b7d3c', '#5aa148', '#86c767'], 0.7),
        Math.round(W * 0.3),
        Math.round(edges[6].top[Math.round(W * 0.3)]),
      );
    }
    // where the water is let down from one terrace to the next: three falls, their paths fixed by the seed
    const FALLS = [0.3, 0.62].map((fx, fi) =>
      edges.map((e, i) => clamp(Math.round(W * fx + (noiseLine(i * 1.7, seed + 60 + fi) - 0.5) * 8), 4, W - 5)),
    );
    const FALL_C = hex('#cfe8fa');
    // the farmer and the buffalo: small walking figures, legs by footStep in their gaits (stride, walk)
    const cache = stampCache(200);
    function farmerSprite(phase) {
      const a = footStep(phase, 1, 1).y > 0.4 ? 1 : 0,
        b = footStep(phase + Math.PI, 1, 1).y > 0.4 ? 1 : 0;
      return cache.get(`farmer:${a}${b}`, () => {
        const r = buffer(9, 13);
        for (const [x, lift] of [
          [3, a],
          [5, b],
        ])
          for (let y = 8; y <= 10 - lift; y++) r.px[y * r.w + x] = hex('#4a3a2c');
        rect(r, 3, 5, 3, 3, hex('#7a5a9a'));
        r.px[4 * r.w + 4] = hex('#e8b88a');
        for (let x = 1; x <= 7; x++) r.px[3 * r.w + x] = hex('#e2c98f'); // the conical hat
        r.px[2 * r.w + 4] = hex('#e2c98f');
        outlinePass(r, hex('#2c2118'));
        return { ...r, ax: 4, ay: 11 };
      });
    }
    function buffaloSprite(phase) {
      const bin = Math.round(((phase % 6.283) / 6.283) * 8) % 8;
      return cache.get(`buffalo:${bin}`, () => {
        const r = buffer(24, 15),
          body = hex('#5a5c60'),
          timing = gaitTiming('walk');
        [
          [6, timing[1]],
          [17, timing[0]],
        ].forEach(([hx, pair]) =>
          [pair.far, pair.near].forEach((off, side) => {
            const st = footStep((bin / 8) * 6.283 + off, 1.1, 1),
              x = Math.round(hx + st.x + side - 0.5);
            for (let y = 9; y <= 12 - (st.y > 0.5 ? 1 : 0); y++)
              if (x >= 0 && x < r.w) r.px[y * r.w + x] = side ? body : tone(body, -1);
          }),
        );
        fillEllipse(r, 12, 6.5, 6.4, 2.9, body);
        fillEllipse(r, 18.5, 7.6, 2.1, 1.8, tone(body, 1)); // the head, low
        r.px[5 * r.w + 17] = hex('#e8e0cc'); // horns
        r.px[4 * r.w + 16] = hex('#e8e0cc');
        r.px[5 * r.w + 20] = hex('#e8e0cc');
        r.px[4 * r.w + 21] = hex('#e8e0cc');
        r.px[7 * r.w + 5] = tone(body, -1); // tail
        r.px[8 * r.w + 5] = tone(body, -1);
        outlinePass(r, hex('#26281e'));
        return { ...r, ax: 12, ay: 13 };
      });
    }
    let cloudScratch;
    const WALK_BAND = 5;

    return (t) => {
      FRAME.set(BASE);
      const WT = waterTime(t, Math.floor(t * 15));
      for (let x = 0; x < W; x++)
        // column by column, each terrace's water under its own top edge
        for (let i = 0; i < BANDS; i++) {
          if (kinds[i] !== 'water') continue;
          const top = Math.ceil(edges[i].top[x]),
            bottom = i === BANDS - 1 ? H : Math.floor(edges[i + 1].top[x]) - 2;
          for (let y = Math.max(SKY_H, top); y < bottom; y++)
            FRAME[y * W + x] = waterPixel(
              x,
              y,
              (y - top) * 2.1 + 7,
              false,
              0,
              WT,
              Math.round(Math.sin(y * 0.35 + t * 2.2)),
              P,
            );
        }
      blitSprite(OUT, SIDE, 0, 0);
      for (const fall of FALLS)
        for (let i = 1; i < BANDS; i++) {
          if (kinds[i - 1] !== 'water') continue; // water is only let down out of a flooded terrace
          const fx = fall[i],
            yEdge = edges[i].top[fx];
          for (let yy = Math.round(yEdge) - 2; yy < yEdge + 4; yy++)
            if ((yy + Math.floor(t * 16)) % 4 < 2) plot(OUT, fx, yy, FALL_C);
        }
      // the farmer crosses a bund with the buffalo and comes back, once a loop, feet on the edge's curve
      const u2 = (t / DUR) * 2,
        tri = u2 < 1 ? u2 : 2 - u2,
        dir = u2 < 1 ? 1 : -1,
        bx = lerp(150, W - 150, tri),
        by = edges[WALK_BAND].top[clamp(Math.round(bx), 0, W - 1)] - 2,
        walked = tri * (W - 300),
        phase = walked * strideRate(1.1);
      shadeEllipse(OUT, bx, by + 2, 10, 1.6, 0.75);
      blitSprite(OUT, buffaloSprite(phase), bx, by, dir < 0);
      const fx = bx - dir * 17;
      shadeEllipse(OUT, fx, by + 2, 4, 1.2, 0.75);
      blitSprite(
        OUT,
        farmerSprite(walked * strideRate(1)),
        fx,
        edges[WALK_BAND].top[clamp(Math.round(fx), 0, W - 1)] - 2,
        dir < 0,
      );
      cloudScratch = cloudShadows(FRAME, W, H, {
        x: t * 8,
        y: t * 2.5,
        seed: seed,
        cover: 0.42,
        strong: true,
        scratch: cloudScratch,
      });
      FRAME.set(BASE.subarray(0, (SKY_H + 18) * W), 0); // the shadows cross the land, never the sky itself
      fillEllipse(OUT, W * 0.78, 24, 13, 11, hex('#f8e7b2'));
      fillEllipse(OUT, W * 0.78, 24, 9, 8, hex('#fff7d8'));
      drawClouds(t, clouds);
      drawBirds(t, { y: 38, every: 34, offset: 16, n: 5, flip: true });
    };
  }

  // ------------------------------------------------------------------------------- Hoi An by lantern light
  function hoiAn(seed) {
    const rng = new SeededRandom(seed + 37),
      riverY = 196,
      townBase = 186,
      P = water(['#5d84a8', '#4d7396', '#3f6486', '#335576', '#2a4766', '#223a56', '#1b2e46'], {
        glint: '#ffd98a',
        glint2: '#ffb04a',
        foam: '#9ab8cc',
        foam2: '#7598b2',
        weed: '#26435e',
        weed2: '#2c4c6a',
        sand: ['#6d94b4', '#557e9e', '#426a88'],
      });
    const LANTERN_COLS = ['#e8483c', '#ffb04a', '#ff8ab8', '#7adbc8', '#c9a9ff', '#ffe9a0'].map(hex);
    // the street: houses shoulder to shoulder, mustard walls, tiled roofs, each with its windows remembered
    const houses = [];
    {
      let x = -6;
      const walls = ['#eac95e', '#dfa83e', '#f2e2ac', '#d99a52', '#ecd27a', '#e0b95e'],
        roofs = ['#a34d34', '#8a3f30', '#b8623a', '#94452e'];
      while (x < W + 8) {
        const w = rng.int(32, 56),
          h = rng.int(48, 76),
          roofH = rng.int(11, 17);
        houses.push({
          x,
          w,
          h,
          roofH,
          wall: hex(rng.pick(walls)),
          roof: hex(rng.pick(roofs)),
          win: [],
          door: rng.int(6, w - 12),
          id: houses.length,
        });
        x += w + rng.int(1, 3);
      }
    }
    const BASE = new Uint32Array(W * H),
      base = { w: W, h: H, px: BASE };
    wash(
      base,
      [
        [0, '#31497a'],
        [0.55, '#47608e'],
        [1, '#6d81a4'],
      ],
      0,
      townBase,
    );
    for (let x = 0; x < W; x++) {
      // a low far bank behind the rooftops
      const y = Math.round(hillLine(x, { freq: 2, seed: seed % 997, base: 0.42, height: 0.05 }, W, H));
      for (let yy = y; yy < townBase; yy++) BASE[yy * W + x] = hex('#3d5272');
    }
    const TEX = { seam: -1, mortar: 1, lit: 1, shaded: -1, edge: -1, deep: -2, glow: 1, dim: -1 };
    for (const hs of houses) {
      const top = townBase - hs.h;
      rect(base, hs.x, top, hs.w, hs.h, hs.wall);
      rect(base, hs.x + hs.w - 2, top, 2, hs.h, tone(hs.wall, -1));
      rect(base, hs.x, top, hs.w, 2, tone(hs.wall, -1)); // in the eaves' shade
      for (let y = 0; y < hs.roofH; y++) {
        const inset = Math.round(lerp(hs.w * 0.28, -2, y / Math.max(1, hs.roofH - 1)));
        for (let x = inset; x < hs.w - inset; x++) {
          const tex = roofTexel('tile', hs.x + x, top - hs.roofH + y, hs.x, top - hs.roofH);
          plot(base, hs.x + x, top - hs.roofH + y, tone(hs.roof, clamp((tex && TEX[tex]) || 0, -2, 2)));
        }
      }
      rect(base, hs.x - 2, top - 1, hs.w + 4, 2, tone(hs.roof, -2)); // the eave line
      rect(base, hs.x + Math.floor(hs.w / 2) - 3, top - hs.roofH - 2, 7, 2, tone(hs.roof, 1)); // the ridge
      // windows on a grid, the shopfront below; which are lit is asked every frame (windowLit)
      const cols = Math.max(2, Math.floor(hs.w / 11)),
        rows = hs.h > 62 ? 2 : 1;
      for (let rI = 0; rI < rows; rI++)
        for (let cI = 0; cI < cols; cI++)
          hs.win.push({ x: hs.x + 5 + cI * Math.floor((hs.w - 8) / cols), y: top + 8 + rI * 15, row: rI, col: cI });
      rect(base, hs.x + hs.door, townBase - 13, 7, 13, hex('#5d3b25'));
    }
    rect(base, 0, townBase, W, riverY - townBase, hex('#8f8c87')); // the quay
    for (let x = 0; x < W; x += 3) if (latticeRandom(x, 7, seed) > 0.5) plot(base, x, townBase + 5, hex('#76726c'));
    rect(base, 0, riverY, W, H - riverY, P.LV[4]);
    // strings of lanterns: across the street between rooftops, and along the quay between lamp posts
    const lanterns = [];
    const string = (x0, y0, x1, y1, sag, every) => {
      const pts = [];
      for (let s = 0; s <= 1.001; s += 0.04) pts.push([lerp(x0, x1, s), lerp(y0, y1, s) + Math.sin(s * Math.PI) * sag]);
      for (let s = every / Math.hypot(x1 - x0, 1); s < 0.99; s += every / Math.hypot(x1 - x0, 1))
        lanterns.push({
          x: lerp(x0, x1, s),
          y: lerp(y0, y1, s) + Math.sin(s * Math.PI) * sag + 2,
          c: rng.pick(LANTERN_COLS),
          ph: rng.range(0, 6.28),
          wire: pts,
        });
      return pts;
    };
    const wires = [];
    for (let k = 0; k < 5; k++) {
      const a = houses[rng.int(0, houses.length - 2)];
      wires.push(
        string(a.x + 4, townBase - a.h + 4, a.x + a.w + rng.int(18, 40), townBase - a.h - rng.int(0, 10), 7, 10),
      );
    }
    const posts = scatterAlong(14, W - 10, 64, seed + 3, { chance: 0.95 }).map((s) => Math.round(s.x));
    for (let k = 0; k + 1 < posts.length; k++)
      wires.push(string(posts[k], townBase - 16, posts[k + 1], townBase - 16, 6, 12));
    for (const hs of houses)
      // lanterns under the eaves, a short row each (scatterAlong keeps them uneven)
      for (const s of scatterAlong(hs.x + 5, hs.x + hs.w - 6, 11, seed + hs.id * 17, { chance: 0.5 }))
        lanterns.push({ x: Math.round(s.x), y: townBase - hs.h + 5, c: LANTERN_COLS[s.variant], ph: s.i * 1.7 });
    // flower lanterns on the river, each on its own slow drift downstream
    const floats = Array.from({ length: 24 }, () => ({
      x: rng.range(0, W),
      y: rng.range(riverY + 8, H - 10),
      speed: rng.range(1.6, 3.4),
      c: rng.pick(LANTERN_COLS),
      ph: rng.range(0, 6.28),
    }));
    const stars = Array.from({ length: 110 }, (_, k) => ({
      x: Math.floor(indexRandom(k, seed + 1) * W),
      y: Math.floor(indexRandom(k, seed + 2) * 96),
      ph: indexRandom(k, seed + 3) * 6.28,
    }));
    // the river boat: a long hull, a canopy, the boatman standing with his pole, one great lantern at the bow
    const BOAT = (() => {
      const r = buffer(58, 20);
      for (let y = 14; y <= 17; y++) {
        const inset = y === 17 ? 7 : y === 16 ? 3 : 0;
        for (let x = 3 + inset; x <= 54 - inset; x++) plot(r, x, y, y === 14 ? hex('#a9763f') : hex('#7a4a2e'));
      }
      for (let i = 0; i < 4; i++) plot(r, 2 - 0 + i, 13 - i, hex('#7a4a2e'));
      for (let y = 8; y <= 13; y++)
        for (let x = 22; x <= 36; x++) plot(r, x, y, y === 8 ? hex('#e0bc76') : hex('#b08a4c')); // canopy
      rect(r, 22, 10, 2, 4, hex('#5d3b25'));
      rect(r, 34, 10, 2, 4, hex('#5d3b25'));
      rect(r, 44, 7, 2, 7, hex('#2c2118')); // the boatman
      r.px[6 * r.w + 45] = hex('#e2c98f');
      line(r, 47, 9, 52, 16, hex('#5d3b25'));
      outlinePass(r, hex('#1c1824'));
      const b = drawnBounds(r);
      return b ? cutSprite(r, b[0], b[1], b[2], b[3], 29, 17) : { ...r, ax: 29, ay: 17 };
    })();
    const drawLantern = (r, x, y, c, t, ph, coreOnly = false) => {
      const glowC = scalePacked(c, 0.85 + 0.3 * twinkle(t, ph, 0.3));
      if (!coreOnly) {
        fillEllipse(r, x, y, 2.2, 2.8, glowC);
        plot(r, x, y - 4, hex('#2c2118'));
        plot(r, x, y + 3, tone(c, -1));
      }
      plot(r, x, y, hex('#fff6da'));
      plot(r, x, y - 1, mixPacked(c, hex('#ffffff'), 0.55));
    };

    return (t) => {
      FRAME.set(BASE);
      const lights = [],
        share = 0.72;
      for (const hs of houses) {
        // the shopfront: most open and lit all evening, one now and then dark (windowLit keeps the pattern)
        if (windowLit(hs.id, 9, 0, seed, t, 0.8)) {
          rect(OUT, hs.x + 5, townBase - 12, hs.w - 10, 12, hex('#ffd98a'));
          for (let px = hs.x + 5; px < hs.x + hs.w - 6; px += 9) rect(OUT, px, townBase - 12, 2, 12, hex('#5d3b25'));
          lights.push({ x: hs.x + hs.w / 2, y: townBase - 7, r: 24 + hs.w * 0.35, k: 0.95 });
        } else rect(OUT, hs.x + 5, townBase - 12, hs.w - 10, 12, hex('#33495e'));
        rect(OUT, hs.x + hs.door, townBase - 13, 7, 13, hex('#5d3b25'));
        for (const wn of hs.win) {
          const lit = windowLit(hs.id, wn.row, wn.col, seed, t, share);
          rect(OUT, wn.x, wn.y, 4, 5, lit ? hex('#ffd98a') : hex('#33496c'));
          if (lit) lights.push({ x: wn.x + 2, y: wn.y + 2, r: 12, k: 0.7 });
        }
      }
      for (const pts of wires)
        for (let k = 1; k < pts.length; k++)
          line(OUT, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], hex('#1c1824'));
      for (const px of posts) rect(OUT, px, townBase - 16, 1, 16, hex('#3b2f2c'));
      lanterns.forEach((l, k) => {
        drawLantern(OUT, Math.round(l.x), Math.round(l.y), l.c, t, l.ph);
        if (k % 2 === 0) lights.push({ x: l.x, y: l.y, r: 13, k: 0.8 });
      });
      // the river, then the town mirrored in it while the lanterns still burn ungraded
      const WT = waterTime(t, Math.floor(t * 15));
      for (let y = riverY; y < H; y++) {
        const wob = Math.round(Math.sin(y * 0.35 + t * 2.2));
        for (let x = 0; x < W; x++)
          FRAME[y * W + x] = waterPixel(x, y, (y - riverY) * 1.8 + 2, y < riverY + 3, 0, WT, wob, P);
      }
      reflect(riverY + 1, 46, t, 0.26, 0.55);
      // the boat crosses once a loop, off-screen at both ends of it so the loop has no seam
      const boatX = W + 44 - (t / DUR) * (W + 88),
        boatY = riverY + 34 + Math.round(floatHeight(0, 2, 2, 1, 5, true, t, 1) * 2 - 5);
      shadeEllipse(OUT, boatX, boatY + 3, 24, 2, 0.65);
      blitSprite(OUT, BOAT, boatX, boatY, true);
      lights.push({ x: boatX - 24, y: boatY - 8, r: 22, k: 0.95 });
      // night falls over it all (hourLight-graded), the lamps holding pools of evening back
      grade(0.78, 1, 0, lights);
      // and what glows is drawn again over the dark, as the island draws its lamps after grading
      for (const s of stars)
        if (twinkle(t, s.ph, 0.6) > 0.55)
          plot(OUT, s.x, s.y, mixPacked(FRAME[s.y * W + s.x], hex('#e6eeff'), twinkle(t, s.ph, 0.6)));
      fillEllipse(OUT, W - 58, 30, 9, 8, hex('#f2ecd8')); // the moon, a crescent bitten by the sky's own colour
      fillEllipse(OUT, W - 54, 27, 8, 7, FRAME[20 * W + (W - 54)]);
      for (const hs of houses)
        for (const wn of hs.win)
          if (windowLit(hs.id, wn.row, wn.col, seed, t, share)) rect(OUT, wn.x + 1, wn.y + 1, 2, 3, hex('#ffe9ae'));
      lanterns.forEach((l) => drawLantern(OUT, Math.round(l.x), Math.round(l.y), l.c, t, l.ph, true));
      drawLantern(OUT, Math.round(boatX - 24), Math.round(boatY - 8), hex('#ffb04a'), t, 1.3);
      drawLantern(OUT, Math.round(boatX + 20), Math.round(boatY - 6), hex('#e8483c'), t, 2.6);
      for (const f of floats) {
        const x = wrap(f.x + t * f.speed, W + 16) - 8,
          y = f.y + Math.sin(t * 1.4 + f.ph) * 1.2,
          flick = blink(t, 2.1, f.ph, -0.7);
        plot(OUT, x - 2, y, f.c);
        plot(OUT, x + 2, y, f.c);
        plot(OUT, x - 1, y + 1, tone(f.c, 1));
        plot(OUT, x + 1, y + 1, tone(f.c, 1));
        plot(OUT, x, y, flick ? hex('#fff6da') : hex('#ffd98a'));
        plot(
          OUT,
          x,
          y + 3,
          mixPacked(FRAME[clamp(Math.round(y + 3), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)], f.c, 0.4),
        );
      }
    };
  }

  // ------------------------------------------------------------------------------- bamboo in afternoon rain
  function bamboo(seed) {
    const rng = new SeededRandom(seed + 53),
      groundY = 204,
      streamY = 238,
      P = water(['#a8c4ae', '#94b39c', '#7ea28c', '#6a917c', '#59806c', '#4a6f5e', '#3d5f50'], {
        glint: '#eef6ea',
        glint2: '#dcead8',
        weed: '#527a62',
        weed2: '#5d876e',
        sand: ['#b8cfba', '#a4bfa6', '#8fae94'],
      });
    // the afternoon's light (dayCycle), and the layers' colours faded by their depth (aerialPerspective)
    const sky = {
        night: ['#243428', '#3d5242'],
        dawn: ['#7d9a84', '#b8c8ae'],
        day: ['#93b29a', '#ccd8bc'],
        dusk: ['#6d8a72', '#aebfa2'],
      },
      day = dayCycle(sky, 0.62),
      atDepth = (hexS, depth) => packRgb(...aerialPerspective(hexToRgb(hexS), day, depth, 0.75));
    const stalk = (layerI, depth) => ({
      x: rng.range(-8, W + 8),
      w: layerI === 2 ? rng.range(3.6, 5.4) : layerI === 1 ? rng.range(2, 3) : rng.range(1.2, 1.8),
      lean: rng.range(-9, 9),
      gap: rng.range(24, 38),
      phaseY: rng.range(0, 30),
      c: atDepth(rng.pick(['#4d7a58', '#55855f', '#43704f', '#6a9468']), depth),
      node: atDepth('#cfe0c2', depth),
      ph: rng.range(0, 6.28),
      leaves: Array.from({ length: rng.int(3, 6) }, () => ({
        at: rng.range(0.55, 0.97), // how far up the stalk the spray branches
        side: rng.sign(),
        len: rng.range(12, 22) * (layerI === 2 ? 1.35 : 1),
        ph: rng.range(0, 6.28),
      })),
    });
    // bamboo stands in clumps, with misty clearings between them, not in a fence
    const clump = (list, n, spread) => {
      const centres = Array.from({ length: n }, () => rng.range(0, W));
      list.forEach((st, k) => (st.x = centres[k % n] + rng.range(-spread, spread)));
    };
    const FAR = Array.from({ length: 26 }, () => stalk(0, 0.12)),
      MID = Array.from({ length: 19 }, () => stalk(1, 0.55)),
      NEAR = Array.from({ length: 9 }, (_, k) => {
        const s = stalk(2, 1);
        if (k < 3) s.x = rng.range(-4, 46); // a few great culms close by, framing the view
        if (k > 6) s.x = rng.range(W - 52, W + 4);
        return s;
      });
    clump(FAR, 6, 30);
    clump(MID, 5, 26);
    NEAR[0].x = 7;
    NEAR[0].w = 6.6;
    NEAR[1].x = W - 9;
    NEAR[1].w = 6.2;
    function drawStalk(r, s, t, gust, withLeaves) {
      const swayTop = Math.sin(t * 0.9 + s.ph) * (1 + gust * 3.2),
        xAt = (y) => {
          const u = clamp((groundY + 20 - y) / (groundY + 30)); // 0 at the foot, 1 at the top
          return s.x + (s.lean + swayTop) * u * u;
        };
      for (let y = -6; y < groundY + 18; y++) {
        const x = xAt(y),
          hw = s.w / 2,
          onNode = (((y + s.phaseY) % s.gap) + s.gap) % s.gap < 1.4;
        for (let dx = -hw; dx <= hw; dx++) {
          const edge = Math.abs(dx) > hw - 0.7;
          plot(
            r,
            x + dx,
            y,
            onNode ? mixPacked(s.c, s.node, 0.6) : dx < -hw + 1 ? tone(s.c, 1) : edge ? tone(s.c, -1) : s.c,
          );
        }
        if ((((y + s.phaseY) % s.gap) + s.gap) % s.gap >= 1.4 && (((y + s.phaseY) % s.gap) + s.gap) % s.gap < 2.6)
          for (let dx = -hw; dx <= hw; dx++) plot(r, x + dx, y, tone(s.c, -1)); // the node's shadow below it
      }
      if (!withLeaves) return;
      s.leaves.forEach((lf, li) => {
        const y = (groundY + 10) * (1 - lf.at) - 6,
          x = xAt(y),
          pts = swayingChain(
            x,
            y,
            { segments: 4, length: lf.len, sway: 0.22 + gust * 0.3, speed: 2.3, lean: lf.side * 2.4 },
            1,
            t,
            li + s.ph,
          );
        for (let k = 1; k < pts.length; k++) line(r, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], tone(s.c, -1));
        // blades along the spray, angled down and out, two tones by the light
        for (let k = 1; k < pts.length; k++)
          for (let b = -2; b <= 2; b++) {
            const bx = pts[k][0] + lf.side * (2.5 + k * 0.9 + rngBlade(li, k, b)) + b * 1.8,
              by = pts[k][1] + 4.5 + Math.abs(b) * 1.6 + k * 0.5; // the blades droop, as bamboo leaves do
            line(r, pts[k][0], pts[k][1], bx, by, b > 0 ? tone(s.c, 1) : tone(s.c, -1));
          }
      });
    }
    // a blade's reach, fixed per leaf so the sprays shiver in the sway and do not boil
    const rngBlade = (li, k, dir) => 4 + (latticeHash(li * 7 + k, dir + 3, seed) % 40) / 10;
    const BASE = new Uint32Array(W * H),
      base = { w: W, h: H, px: BASE };
    wash(
      base,
      [
        [0, '#7f9f88'],
        [0.55, '#a9bf9f'],
        [1, '#cbd8bc'],
      ],
      0,
      groundY + 8,
    );
    for (const s of FAR) drawStalk(base, s, 0, 0, false); // the far stand never moves: it is the mist's business
    for (let y = groundY; y < H; y++)
      for (let x = 0; x < W; x++) {
        const g = latticeRandom(Math.floor(x / 2), Math.floor(y / 2), seed + 4);
        BASE[y * W + x] =
          y >= streamY ? P.LV[3] : g > 0.8 ? hex('#5b7050') : g > 0.45 ? hex('#4d6246') : hex('#40523e');
        if (y < streamY && g > 0.993) BASE[y * W + x] = hex('#c9b468'); // fallen leaves in the litter
      }
    const puddles = Array.from({ length: 4 }, () => ({
      x: rng.range(30, W - 30),
      y: rng.range(groundY + 8, streamY - 4),
      rx: rng.range(8, 18),
    }));
    for (const p of puddles) {
      fillEllipse(base, p.x, p.y, p.rx, p.rx * 0.2, hex('#8ba889'));
      fillEllipse(base, p.x - p.rx * 0.15, p.y - 0.5, p.rx * 0.55, p.rx * 0.1, hex('#a4bda0'));
    }
    // undergrowth along the bank, so the ground does not start on a ruler's line
    for (const s of scatterAlong(6, W - 6, 34, seed + 12, { chance: 0.85 }))
      fillEllipse(base, s.x, groundY + 1, 7 + s.variant * 2, 3.4, hex('#3f5c40'));
    // ferns at the culms' feet and stones in the litter (scatterAlong), still enough for the still layer
    for (const s of scatterAlong(10, W - 10, 26, seed + 8, { chance: 0.8 })) {
      const fx = Math.round(s.x),
        fy = groundY + 14 + (Math.abs(s.i) % 3) * 6;
      for (let b = -2; b <= 2; b++)
        line(base, fx, fy, fx + b * 3, fy - 5 - Math.abs(b), b ? hex('#4d7a4c') : hex('#639354'));
    }
    for (let k = 0; k < 10; k++)
      fillEllipse(
        base,
        rng.range(14, W - 14),
        rng.range(groundY + 8, streamY - 4),
        rng.range(2, 4),
        rng.range(1, 1.6),
        hex('#6d7868'),
      );
    const ripples = Array.from({ length: 14 }, () => ({
      x: rng.range(16, W - 16),
      y: rng.chance(0.5) ? rng.range(streamY + 4, H - 6) : rng.pick(puddles).y + rng.range(-1, 1),
      dur: rng.range(1.5, 2.6),
      ph: rng.range(0, 3),
      max: rng.range(4, 8),
    }));
    const RAIN_C = hex('#d7e7dc');
    const rain = particleField(280, W, H, new SeededRandom(seed + 71)),
      leavesFall = Array.from({ length: 7 }, () => ({
        x: rng.range(0, W),
        y: rng.range(0, H),
        ph: rng.range(0, 6.28),
        speed: rng.range(7, 12),
      }));
    // the egret in the shallows: standing, and now and then dipping for something
    const egret = (dip) => {
      const r = buffer(30, 38),
        wc = hex('#f4f6ee');
      line(r, 12, 22, 11, 35, hex('#2c2118'));
      line(r, 16, 22, 17, 35, hex('#2c2118'));
      fillEllipse(r, 14, 18, 7.5, 4.2, wc);
      fillEllipse(r, 7, 15.5, 4, 2.2, tone(wc, -1)); // the tail
      if (!dip) {
        line(r, 20, 17, 23, 7, wc);
        line(r, 21, 17, 24, 8, wc);
        fillEllipse(r, 24, 6, 2, 1.6, wc);
        line(r, 26, 6, 29, 7, hex('#e8a03a'));
      } else {
        line(r, 20, 17, 26, 20, wc);
        line(r, 21, 18, 26, 21, wc);
        line(r, 27, 21, 29, 25, hex('#e8a03a'));
      }
      outlinePass(r, hex('#5a6656'));
      const b = drawnBounds(r);
      return b ? cutSprite(r, b[0], b[1], b[2], b[3], 14, 36) : { ...r, ax: 14, ay: 36 };
    };
    const EGRETS = [egret(false), egret(true)];
    let fogScratch;

    return (t) => {
      // rain comes in two fronts a loop (frontStrength), each building, holding, and easing off
      const front = frontStrength(t % 30, 30),
        gust = 0.35 + front * 0.85;
      FRAME.set(BASE);
      fogScratch = fogBanks(FRAME, W, H, {
        x: t * 5,
        y: t * 1.2,
        density: 0.2 + front * 0.22,
        colour: hex('#e2ebda'),
        seed: seed + 9,
        scratch: fogScratch,
      });
      for (const s of MID) drawStalk(OUT, s, t, gust, true);
      for (const s of NEAR) drawStalk(OUT, s, t, gust, true);
      const WT = waterTime(t, Math.floor(t * 15));
      for (let y = streamY; y < H; y++) {
        const wob = Math.round(Math.sin(y * 0.35 + t * 2.6));
        for (let x = 0; x < W; x++) FRAME[y * W + x] = waterPixel(x, y, (y - streamY) * 1.6 + 2, false, 0, WT, wob, P);
      }
      const ex = W * 0.63,
        dip = (t + 4) % 11 < 1.4;
      shadeEllipse(OUT, ex, streamY + 12, 7, 1.4, 0.7);
      blitSprite(OUT, EGRETS[dip ? 1 : 0], ex, streamY + 11, false);
      grade(0.38, 1 - front * 0.16, front * 0.75); // the light goes grey and wet as a front passes (hourLight wet)
      // rings where the rain lands, each growing and going on its own clock
      for (const rp of ripples) {
        const u = ((t + rp.ph) % rp.dur) / rp.dur;
        if (front < 0.05 && rp.y < streamY) continue;
        ellipseRows(rp.x, rp.y, Math.max(0.6, rp.max * u), Math.max(0.4, rp.max * u * 0.26), (y, xa, xb) => {
          for (const x of [xa, xb])
            if (x >= 0 && y >= 0 && x < W && y < H)
              FRAME[y * W + x] = mixPacked(FRAME[y * W + x], hex('#e6f0e0'), 0.55 * (1 - u));
        });
      }
      for (const lf of leavesFall) {
        const y = wrap(lf.y + t * lf.speed, H + 10) - 5,
          x = lf.x + Math.sin(t * 1.6 + lf.ph) * 8 + t * 0; // falling straight down its own column, swinging
        plot(OUT, x, y, hex('#7fae62'));
        plot(OUT, x + 1, y, hex('#5d8a4c'));
      }
      // the rain itself: a field of drops (particleField) read at the moment, slanted by the wind
      const slant = 2.5 + front * 2,
        show = 0.12 + front * 0.88;
      for (const q of rain) {
        if (q.s >= show) continue;
        const y = wrap(q.y + t * (165 + q.s * 95), H + 16) - 8,
          x = wrap(q.x + (y - q.y) * 0.06 - t * 9 * front, W + 16) - 8;
        lineCells(x, y, x - slant, y - (4 + front * 3), (px, py) => {
          if (px >= 0 && py >= 0 && px < W && py < H) FRAME[py * W + px] = mixPacked(FRAME[py * W + px], RAIN_C, 0.55);
        });
      }
    };
  }

  // --------------------------------------------------------------------------------------------------- the loop
  const SCALED = OUTW !== W ? new Uint32Array(OUTW * OUTH) : null;
  function frame(f) {
    const t = (((Math.round(f) % FRAMES) + FRAMES) % FRAMES) / FPS;
    render(t);
    if (!SCALED) return FRAME;
    for (let y = 0; y < OUTH; y++) {
      const sy = Math.floor((y * H) / OUTH) * W;
      for (let x = 0; x < OUTW; x++) SCALED[y * OUTW + x] = FRAME[sy + Math.floor((x * W) / OUTW)];
    }
    return SCALED;
  }
  function report() {
    return [
      `${meta.title} · seed ${SEED} (${PHRASE}) · ${OUTW}x${OUTH} · a ${DUR} s loop at ${FPS} frames a second`,
      `${used.size} techniques of ${Object.keys(almanac).length} used: ${[...used].sort().join(', ')}`,
    ];
  }
  return {
    id: meta.id,
    title: meta.title,
    sub: meta.sub,
    W: OUTW,
    H: OUTH,
    FPS,
    DUR,
    frames: FRAMES,
    opening: 8, // where a fresh showing begins: the place already alive, not the loop's joint
    phrase: PHRASE,
    seed: SEED,
    used,
    frame,
    report,
  };
}
