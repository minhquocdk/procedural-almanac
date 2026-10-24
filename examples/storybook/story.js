// Storybook: a written story drawn as pixels, frame by frame, with the almanac and nothing else.
//
// A story is plain data (JSON): a cast of animals with genes, a list of scenes, and a caption for each scene. The engine
// reads that data, refuses what it cannot draw and says why, and gives back frame(f) -- a pure function of the frame
// number, so the film can be scrubbed, looped, played as a live wallpaper, or rendered in Node.
//
// No story data ever becomes code: the cast's look is drawn by this file, and a script that asks for a kind of animal or
// a prop that does not exist gets a sentence saying so, not a stack trace.
import * as almanac from '../../src/index.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------- the cast's body plans
// Every animal is the same figure, parameterised: a body, a head, a snout, ears, a tail and legs that step. A kind
// gives the defaults; genes (drawn from the seed with genomeFrom) vary size, coat and legs within the kind's ranges.
const KINDS = {
  pig: {
    stance: 'quad',
    body: [4.4, 3.2],
    leg: 3.4,
    head: 2.8,
    snout: 1.9,
    ear: 'flop',
    earLen: 1.7,
    tail: 'curl',
    gait: 'walk',
    coat: '#eda6a6',
    genes: { size: [30, 38], coat: ['#eda6a6', '#e29494', '#f2b8b2'], legs: [3.1, 3.8] },
  },
  wolf: {
    stance: 'quad',
    body: [5.2, 3.0],
    leg: 3.6,
    head: 2.6,
    snout: 2.6,
    ear: 'point',
    earLen: 2.1,
    tail: 'bushy',
    gait: 'trot',
    coat: '#8d93a3',
    genes: { size: [36, 46], coat: ['#8d93a3', '#7a8090', '#a0a5b3'], legs: [3.3, 4.0] },
  },
  fox: {
    stance: 'quad',
    body: [4.6, 2.8],
    leg: 3.0,
    head: 2.4,
    snout: 2.3,
    ear: 'point',
    earLen: 2.3,
    tail: 'bushy',
    gait: 'trot',
    coat: '#d9784a',
    genes: { size: [28, 36], coat: ['#d9784a', '#c9683c', '#e68a5c'], legs: [2.8, 3.4] },
  },
  mouse: {
    stance: 'quad',
    body: [3.0, 2.3],
    leg: 1.7,
    head: 1.9,
    snout: 1.2,
    ear: 'round',
    earLen: 1.8,
    tail: 'thin',
    gait: 'walk',
    coat: '#b8a89a',
    genes: { size: [14, 20], coat: ['#b8a89a', '#a8988a', '#c8b8a8'], legs: [1.5, 2.0] },
  },
  bird: {
    stance: 'biped',
    body: [2.5, 2.6],
    leg: 2.3,
    head: 1.9,
    snout: 0,
    beak: 1.7,
    ear: 'none',
    tail: 'feather',
    wing: true,
    gait: 'stride',
    coat: '#e8c15a',
    genes: { size: [16, 24], coat: ['#e8c15a', '#d9b04a', '#f0d07a'], legs: [2.1, 2.6] },
  },
  dragon: {
    stance: 'air',
    body: [10.5, 1],
    leg: 0,
    head: 1.5,
    snout: 0,
    ear: 'none',
    tail: 'none',
    coat: '#e2b04a',
    genes: { size: [44, 70], body: [0.85, 1.3], coat: ['#e2b04a', '#d9a03c', '#f0c264', '#cf9440'] },
  },
  fairy: {
    stance: 'air',
    body: [1, 1],
    leg: 0,
    head: 0.8,
    snout: 0,
    ear: 'none',
    tail: 'none',
    skin: '#f6d9b8',
    hair: '#2c2233',
    wing: '#efe9ff',
    coat: '#f4e0f0',
    genes: { size: [32, 50], coat: ['#f4e0f0', '#e7d2f0', '#f9ebd6', '#d8e8f6'], skin: ['#f6d9b8', '#eccda9'] },
  },
  kid: {
    stance: 'biped',
    body: [2.6, 3.4],
    leg: 4.4,
    head: 2.7,
    snout: 0.9,
    ear: 'round',
    earLen: 1.2,
    tail: 'none',
    hair: true,
    gait: 'stride',
    coat: '#f0c9a5',
    genes: { size: [34, 40], coat: ['#f0c9a5', '#e5b892', '#d9a980'], legs: [4.0, 4.8] },
  },
};

const PHASES = 12; // a walk cycle kept as twelve pictures, the way a sprite sheet keeps it

// ---------------------------------------------------------------------------------------------- the palette
const DEFAULT_PALETTE = {
  sky: {
    night: ['#0d1430', '#243057'],
    dawn: ['#4a4f8c', '#f0a884'],
    day: ['#5ba6e0', '#cde8f6'],
    dusk: ['#4b3f7a', '#f2a26c'],
  },
  hill: ['#9dc6a6', '#83b18c', '#689b76'],
  ground: '#8fbf72',
  groundDark: '#79a862',
  sea: '#2f7fb3',
  sand: '#e6d59a',
  leaf: '#5f9c56',
  bark: '#7a5636',
  bloom: '#f6d1de',
  ink: '#20222e',
  straw: '#e3cd93',
  strawRoof: '#d4b370',
  wood: '#b98a5e',
  woodRoof: '#8f5f3c',
  stone: '#b9bcc4',
  stoneRoof: '#8b8f99',
  window: '#ffe6a3',
  cloud: '#f4f7fb',
  sun: '#ffe9a8',
  moon: '#eef2ff',
  petal: '#f4c0d2',
  star: '#e8eefc',
};

const PROP_KINDS = new Set(['tree', 'bush', 'house', 'rock', 'cloud', 'flower', 'palm', 'boat', 'nest']);
const EFFECT_KINDS = new Set([
  'rain',
  'snow',
  'petals',
  'fireflies',
  'dust',
  'leaves',
  'fog',
  'lightning',
  'bubbles',
  'sparks',
]);
const HOUSE_STYLES = new Set(['straw', 'wood', 'stone']);

// ---------------------------------------------------------------------------------------------- colours, buffers
const rgbOf = (h) => (typeof h === 'string' ? almanac.hexToRgb(h) : h);
const pack = (c) => almanac.packRgb(c[0], c[1], c[2]);
const hex = (h) => pack(rgbOf(h));
const shadeOf = (h, k) => pack(almanac.shade(rgbOf(h), k));
const buffer = (w, h) => ({
  w: Math.max(1, w | 0),
  h: Math.max(1, h | 0),
  px: new Uint32Array(Math.max(1, w | 0) * Math.max(1, h | 0)),
});

function fillRect(B, xa, ya, xb, yb, c) {
  const x0 = Math.max(0, Math.round(xa)),
    x1 = Math.min(B.w - 1, Math.round(xb)),
    y0 = Math.max(0, Math.round(ya)),
    y1 = Math.min(B.h - 1, Math.round(yb));
  if (x1 < x0) return;
  for (let y = y0; y <= y1; y++) B.px.fill(c, y * B.w + x0, y * B.w + x1 + 1);
}

// a tiny painter: units in the figure's own space (x forward, y up from the ground), pixels on the buffer
function painter(B, k, ax, ay) {
  const X = (x) => ax + x * k,
    Y = (y) => ay - y * k,
    P = (x, y, c) => {
      const px = Math.round(X(x)),
        py = Math.round(Y(y));
      if (px >= 0 && py >= 0 && px < B.w && py < B.h) B.px[py * B.w + px] = c;
    };
  return {
    ell: (x, y, rx, ry, c) => almanac.fillEllipse(B, X(x), Y(y), Math.max(0.1, rx * k), Math.max(0.1, ry * k), c),
    cap: (x1, y1, r1, x2, y2, r2, c) =>
      almanac.capsuleSteps(X(x1), Y(y1), Math.max(0.1, r1 * k), X(x2), Y(y2), Math.max(0.1, r2 * k), (px, py, r) =>
        almanac.fillEllipse(B, px, py, r, r, c),
      ),
    poly: (pts, c) =>
      almanac.polygonRows(
        pts.map(([x, y]) => [X(x), Y(y)]),
        B.h,
        (y, xa, xb) => {
          if (xb >= xa) B.px.fill(c, y * B.w + Math.max(0, xa), y * B.w + Math.min(B.w - 1, xb) + 1);
        },
      ),
    line: (x1, y1, x2, y2, c) =>
      almanac.lineCells(X(x1), Y(y1), X(x2), Y(y2), (x, y) => {
        if (x >= 0 && y >= 0 && x < B.w && y < B.h) B.px[y * B.w + x] = c;
      }),
    px: P,
    X,
    Y,
  };
}

// ---------------------------------------------------------------------------------------------- figures
// One animal at one moment of its walk, facing right, its feet on (ax, ay). Built as a sprite (drawn once, blitted per
// frame, flipped when walking left) -- the picture is the same whether it is played, scrubbed or filmed.
function figureAt(kind, genes, phase, inkHex) {
  if (kind === 'dragon') return dragonAt(genes, phase, inkHex);
  if (kind === 'fairy') return fairyAt(genes, phase, inkHex);
  const K = KINDS[kind],
    T = almanac.tones(rgbOf(genes.coat)),
    base = pack(T.base),
    light = pack(T.light),
    dark = pack(T.dark),
    ink = hex(inkHex),
    bm = genes.body || 1,
    [bRx, bRy] = [K.body[0] * bm, K.body[1] * bm],
    legLen = genes.legs || K.leg,
    headR = K.head,
    snout = K.snout || 0,
    earLen = K.ear === 'none' ? 0 : K.earLen || 1.6,
    bodyCy = legLen + bRy * 0.85,
    headC = K.stance === 'quad' ? [bRx * 0.8, bodyCy + bRy * 0.5] : [0.2, bodyCy + bRy + headR * 0.8],
    tailOut = K.tail === 'none' ? 0.6 : K.tail === 'feather' ? 2.6 : 2.4,
    halfW = Math.max(bRx + tailOut, Math.abs(headC[0]) + headR + snout + 1.2) + 1.2,
    topY = headC[1] + headR + earLen + 1.4,
    k = genes.size / topY;
  let W = Math.ceil(halfW * 2 * k) + 1;
  if (W % 2 === 0) W++;
  const H = Math.ceil(topY * k) + 3,
    B = buffer(W, H),
    ax = (W - 1) / 2,
    ay = H - 2,
    p = painter(B, k, ax, ay),
    legR = Math.max(0.55, bRy * 0.24),
    bob = 0.12 + 0.16 * Math.abs(Math.sin(phase)),
    cy = bodyCy - bob;

  const hips =
    K.stance === 'quad'
      ? [
          [bRx * 0.62, legLen * 0.95],
          [-bRx * 0.62, legLen * 0.95],
        ]
      : [
          [bRy * 0.4, legLen * 0.9],
          [-bRy * 0.4, legLen * 0.9],
        ];
  const timing = almanac.gaitTiming(K.gait),
    far = K.stance === 'quad' ? [timing[0].far, timing[1].far] : [timing[0].far],
    near = K.stance === 'quad' ? [timing[0].near, timing[1].near] : [timing[0].near];
  const leg = (hip, off, colour) => {
    const s = almanac.footStep(phase + off, 0.55 * legLen, 0.34 * legLen);
    p.cap(hip[0], hip[1], legR, hip[0] + s.x, s.y + 0.2, legR * 0.85, colour);
    p.ell(hip[0] + s.x + 0.15, s.y + 0.15, legR * 1.05, legR * 0.72, colour);
  };

  // the far legs first, so the body and the near legs fall over them
  for (let i = 0; i < far.length; i++) leg(hips[K.stance === 'quad' ? i : 1], far[i], shadeOf(genes.coat, -0.34));

  // the tail, behind the body
  if (K.tail === 'bushy') {
    p.cap(-bRx * 0.9, cy + bRy * 0.25, bRy * 0.62, -bRx - 1.9, cy + bRy * 1.25, bRy * 0.3, dark);
    p.ell(-bRx - 2.0, cy + bRy * 1.32, bRy * 0.34, bRy * 0.34, light);
  } else if (K.tail === 'curl') {
    for (let i = 0; i < 4; i++)
      p.ell(-bRx - 0.35 - Math.sin(i * 1.1) * 0.5, cy + bRy * 0.35 + i * 0.42, 0.46, 0.46, dark);
  } else if (K.tail === 'thin') {
    p.cap(-bRx * 0.95, cy, 0.32, -bRx - 2.4, cy + 0.9, 0.16, dark);
  } else if (K.tail === 'feather') {
    p.poly(
      [
        [-bRx * 0.7, cy + bRy * 0.4],
        [-bRx - 2.4, cy + bRy * 1.1],
        [-bRx - 2.1, cy + bRy * 0.1],
      ],
      dark,
    );
  }

  // the body and its light side
  p.ell(0, cy, bRx, bRy, base);
  p.ell(-bRx * 0.22, cy + bRy * 0.34, bRx * 0.62, bRy * 0.42, light);
  if (K.wing) p.ell(-bRx * 0.1, cy - bRy * 0.15, bRx * 0.72, bRy * 0.5, dark);

  // the head, ears, snout and eye
  p.ell(headC[0], headC[1] - bob, headR, headR * 0.96, base);
  p.ell(headC[0] - headR * 0.2, headC[1] - bob + headR * 0.34, headR * 0.6, headR * 0.4, light);
  if (K.ear === 'flop') p.ell(headC[0] - headR * 0.3, headC[1] - bob + headR * 0.62, earLen * 0.5, earLen * 0.85, dark);
  else if (K.ear === 'point')
    p.poly(
      [
        [headC[0] - headR * 0.55, headC[1] - bob + headR * 0.35],
        [headC[0] - headR * 0.1, headC[1] - bob + headR * 0.4 + earLen],
        [headC[0] + headR * 0.3, headC[1] - bob + headR * 0.3],
      ],
      dark,
    );
  else if (K.ear === 'round')
    p.ell(headC[0] - headR * 0.15, headC[1] - bob + headR * 0.72, earLen * 0.6, earLen * 0.6, dark);
  else if (K.ear === 'long')
    p.ell(headC[0] - headR * 0.25, headC[1] - bob + headR * 0.5 + earLen * 0.6, earLen * 0.3, earLen, dark);
  if (K.hair)
    p.ell(
      headC[0] - headR * 0.05,
      headC[1] - bob + headR * 0.62,
      headR * 0.85,
      headR * 0.5,
      shadeOf(genes.coat, -0.72),
    );
  if (snout) {
    p.cap(
      headC[0] + headR * 0.6,
      headC[1] - bob - headR * 0.12,
      headR * 0.46,
      headC[0] + headR * 0.6 + snout,
      headC[1] - bob - headR * 0.2,
      headR * 0.34,
      light,
    );
    p.px(headC[0] + headR * 0.6 + snout, headC[1] - bob - headR * 0.2, shadeOf(genes.coat, -0.66));
  }
  if (K.beak)
    p.poly(
      [
        [headC[0] + headR * 0.5, headC[1] - bob + 0.25],
        [headC[0] + headR * 0.5 + K.beak, headC[1] - bob - 0.1],
        [headC[0] + headR * 0.5, headC[1] - bob - 0.45],
      ],
      shadeOf(genes.coat, -0.5),
    );
  p.px(headC[0] + headR * 0.36, headC[1] - bob + headR * 0.2, ink);
  p.px(headC[0] + headR * 0.36, headC[1] - bob + headR * 0.2 + 0.55, ink);
  p.px(headC[0] + headR * 0.42, headC[1] - bob + headR * 0.2, 0xfff8f2e8);

  // the near legs, over the body
  for (let i = 0; i < near.length; i++) leg(hips[K.stance === 'quad' ? i : 0], near[i], shadeOf(genes.coat, -0.1));

  almanac.outlinePass(B, ink);
  return { w: W, h: H, px: B.px, ax: (W - 1) / 2, ay: H - 2, stride: 0.55 * legLen * k, lift: 0.34 * legLen * k };
}

// A dragon of the east, seen from the side: a long thin serpentine body that ripples through the air, a fan of a tail,
// a horned head with a whisker, four short clawed legs and a ridge of spines along its back. It flies, so its twelve
// pictures are a ripple, not a walk. Everything is sized so the silhouette reads small: a thin wave, a big head, a fan.
function dragonAt(genes, phase, inkHex) {
  const coat = genes.coat,
    T = almanac.tones(rgbOf(coat)),
    base = pack(T.base),
    light = pack(T.light),
    dark = pack(T.dark),
    belly = shadeOf(coat, 0.28),
    ink = hex(inkHex),
    len = 13 * (genes.body || 1),
    amp = 1.15,
    headR = 1.1,
    reach = 3.9, // the snout, the whisker and the tail's fan stand past the body's own ends
    unitsH = 2 * (0.85 + amp) + 1.1,
    half = len / 2 + reach,
    k = genes.size / unitsH,
    W = Math.ceil(half * 2 * k) + 3,
    H = Math.ceil(unitsH * k) + 3,
    B = buffer(W, H),
    p = painter(B, k, W >> 1, H - 2),
    cy = unitsH * 0.46,
    N = 30,
    spine = [];

  // the body, from tail to head: a wave that settles toward the head, thinning to the tail and thick to the chest
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    spine.push({
      x: -len / 2 + u * len,
      y: cy + Math.sin(u * 7 + phase) * amp * (1 - 0.62 * u) + u * 0.5,
      r: 0.28 + 0.42 * Math.sin(Math.PI * Math.min(1, 0.1 + u * 0.94)),
    });
  }
  const head = spine[N],
    tail = spine[0],
    along = (u) => spine[Math.round(u * N)];

  // the tail's fan: three pointed fins, pale, spread like a fish's
  for (let f = -1; f <= 1; f++)
    p.poly(
      [
        [tail.x + 0.1, tail.y + tail.r * 0.6],
        [tail.x - 2.2, tail.y + f * 1.35 + 0.2],
        [tail.x - 0.1, tail.y - tail.r * 0.6],
      ],
      f ? light : base,
    );

  // the far legs, then the body over them
  const leg = (at, colour) => {
    p.cap(at.x, at.y - at.r * 0.5, 0.22, at.x - 0.1, at.y - at.r - 0.95, 0.17, colour);
    for (let c = -1; c <= 1; c++)
      p.line(at.x - 0.1, at.y - at.r - 0.95, at.x + 0.35 + c * 0.1, at.y - at.r - 1.15 + c * 0.12, colour);
  };
  leg(along(0.3), dark);
  leg(along(0.72), dark);

  for (const q of spine) p.ell(q.x, q.y, q.r, q.r, base);
  // a pale belly along the body's underside, and a lighter ridge along its top
  for (const q of spine) p.ell(q.x, q.y - q.r * 0.55, q.r * 0.55, q.r * 0.3, belly);
  for (const q of spine) p.ell(q.x, q.y + q.r * 0.6, q.r * 0.4, q.r * 0.2, light);

  // the ridge of spines: small, and getting smaller toward the tail
  for (let i = 3; i < N - 4; i += 2) {
    const q = spine[i],
      sh = 0.5 + 0.45 * (i / N);
    p.poly(
      [
        [q.x - q.r * 0.35, q.y + q.r * 0.7],
        [q.x - q.r * 0.55, q.y + q.r + sh],
        [q.x + q.r * 0.25, q.y + q.r * 0.7],
      ],
      dark,
    );
  }

  // the head: a jaw, a snout, a horn swept back, a whisker, an eye, and a mouth line
  const hy = head.y,
    hx = head.x;
  p.ell(hx + 0.1, hy + 0.05, headR * 1.1, headR * 0.95, base);
  p.cap(hx + headR * 0.6, hy - 0.05, headR * 0.62, hx + headR * 2.1, hy - 0.3, headR * 0.36, base);
  p.cap(hx + headR * 0.7, hy - 0.35, headR * 0.3, hx + headR * 2.0, hy - 0.55, headR * 0.22, belly);
  // horn, and a smaller one behind it
  p.poly(
    [
      [hx - headR * 0.35, hy + headR * 0.55],
      [hx - headR * 0.55, hy + headR * 1.35],
      [hx + headR * 0.15, hy + headR * 0.6],
    ],
    shadeOf(coat, -0.45),
  );
  p.poly(
    [
      [hx - headR * 0.95, hy + headR * 0.3],
      [hx - headR * 1.3, hy + headR * 1.0],
      [hx - headR * 0.5, hy + headR * 0.45],
    ],
    shadeOf(coat, -0.45),
  );
  // the whisker, curling forward off the snout
  p.line(hx + headR * 1.9, hy - headR * 0.2, hx + headR * 2.6, hy + headR * 0.9, dark);
  p.line(hx + headR * 2.6, hy + headR * 0.9, hx + headR * 3.4, hy + headR * 0.7, dark);
  // a beard under the jaw, a mouth line, and an eye with a catchlight
  p.poly(
    [
      [hx + headR * 0.3, hy - headR * 0.4],
      [hx - headR * 0.2, hy - headR * 1.25],
      [hx + headR * 0.75, hy - headR * 0.55],
    ],
    shadeOf(coat, -0.3),
  );
  p.line(hx + headR * 0.8, hy - headR * 0.42, hx + headR * 1.95, hy - headR * 0.5, ink);
  p.ell(hx + headR * 0.62, hy + headR * 0.3, 0.22, 0.22, ink);
  p.px(hx + headR * 0.7, hy + headR * 0.38, 0xfff8f2e8);

  // the near legs, over the body
  leg(along(0.36), shadeOf(coat, -0.06));
  leg(along(0.78), shadeOf(coat, -0.06));

  almanac.outlinePass(B, ink);
  // (an anchor has to be a whole pixel: a stamp at a fractional one lands between pixels and draws nothing)
  return { w: W, h: H, px: B.px, ax: W >> 1, ay: H - 2, stride: 1, air: true };
}

// A fairy, seen from the side: two pale wings behind her that beat (dithered, so they read as thin), a long dress that
// widens to a scalloped hem, long hair to her waist, and a face. She floats, so her twelve pictures are a beat of wings.
function fairyAt(genes, phase, inkHex) {
  const coat = genes.coat,
    skin = genes.skin || KINDS.fairy.skin,
    hair = genes.hair || KINDS.fairy.hair,
    wing = genes.wing || KINDS.fairy.wing,
    T = almanac.tones(rgbOf(coat)),
    base = pack(T.base),
    light = pack(T.light),
    dark = pack(T.dark),
    skinC = hex(skin),
    skinDark = shadeOf(skin, -0.16),
    hairC = hex(hair),
    hairLight = shadeOf(hair, 0.16),
    wingC = hex(wing),
    ink = hex(inkHex),
    unitsH = 6.1,
    k = genes.size / unitsH,
    W = Math.ceil(4.4 * k) + 5,
    H = Math.ceil(unitsH * k) + 3,
    B = buffer(W, H),
    p = painter(B, k, W / 2, H - 2),
    beat = Math.sin(phase),
    hem = 0.85 + beat * 0.05,
    waist = 2.75,
    headY = 4.75,
    headR = 0.7;

  // the wings: two pale butterfly wings behind her, beating, drawn solid and outlined like everything else here (a
  // dithered wing turns to grey wool at forty pixels tall). Each is an upper and a lower lobe with a notch between them,
  // the upper one lighter where the light catches it.
  const wingSolid = hex(genes.wing || KINDS.fairy.wing),
    wingLight = shadeOf(genes.wing || KINDS.fairy.wing, 0.4),
    wingDark = shadeOf(genes.wing || KINDS.fairy.wing, -0.24),
    spread = 0.75 + 0.22 * beat,
    root = [-0.1, 3.55];
  p.poly(
    [
      [root[0], root[1] + 0.15],
      [root[0] - 1.9 * spread, root[1] + 1.75 * spread],
      [root[0] - 2.5 * spread, root[1] + 0.55 * spread],
      [root[0] - 0.9 * spread, root[1] - 0.15],
    ],
    wingSolid,
  );
  p.poly(
    [
      [root[0] - 0.75 * spread, root[1] - 0.1],
      [root[0] - 2.1 * spread, root[1] - 0.95 * spread],
      [root[0] - 1.55 * spread, root[1] - 2.05 * spread],
      [root[0] - 0.35 * spread, root[1] - 1.0],
    ],
    wingSolid,
  );
  p.poly(
    [
      [root[0] - 0.2, root[1] + 0.7],
      [root[0] - 1.35 * spread, root[1] + 1.45 * spread],
      [root[0] - 1.45 * spread, root[1] + 0.8 * spread],
      [root[0] - 0.5 * spread, root[1] + 0.25],
    ],
    wingLight,
  );
  p.cap(root[0] - 0.05, root[1] + 0.4, 0.1, root[0] - 0.6 * spread, root[1] + 1.9 * spread, 0.07, wingDark);
  p.cap(root[0] - 0.05, root[1] - 0.2, 0.1, root[0] - 0.55 * spread, root[1] - 1.9 * spread, 0.07, wingDark);

  // the long hair behind the head and down her back
  p.cap(0.1, headY + headR * 0.2, headR * 0.92, -0.5, waist - 0.1, headR * 0.5, hairC);
  p.cap(-0.5, waist - 0.1, headR * 0.5, -0.85, hem + 0.45, headR * 0.28, hairC);
  p.cap(-0.2, waist + 0.4, headR * 0.2, -0.55, hem + 0.1, headR * 0.12, hairLight);

  // the dress: a wide skirt with a scalloped hem, a lighter panel on the lit side, folds in shadow
  p.poly(
    [
      [-0.5, waist + 0.15],
      [0.5, waist + 0.15],
      [1.4, hem],
      [-1.4, hem],
    ],
    base,
  );
  for (let i = -1; i <= 1; i++) p.ell(i * 0.9, hem, 0.48, 0.2, base);
  p.poly(
    [
      [-0.48, waist + 0.1],
      [-0.05, waist + 0.1],
      [-0.32, hem - 0.05],
      [-1.28, hem - 0.05],
    ],
    light,
  );
  p.line(-0.15, waist, -0.7, hem - 0.15, dark);
  p.line(0.28, waist, 0.72, hem - 0.15, dark);

  // the sash, and the body above it
  p.cap(-0.5, waist + 0.12, 0.2, 0.55, waist + 0.12, 0.2, dark);
  p.cap(0, waist, 0.32, 0.05, waist + 1.1, 0.28, base);

  // the arms: one down, one raised a little, as if greeting the sea
  p.cap(0.32, waist + 0.95, 0.14, 0.9, waist + 0.4, 0.12, skinC);
  p.cap(-0.28, waist + 0.95, 0.14, -0.85, waist + 1.4, 0.12, skinDark);
  p.ell(0.93, waist + 0.37, 0.14, 0.14, skinC);
  p.ell(-0.89, waist + 1.42, 0.13, 0.13, skinDark);

  // the head, the hair over it, and the face
  p.ell(0.08, headY, headR, headR * 1.05, skinC);
  p.ell(-0.16, headY + headR * 0.4, headR * 1.16, headR * 0.8, hairC);
  p.ell(-0.62, headY + headR * 0.55, headR * 0.5, headR * 0.42, hairC);
  p.cap(-0.46, headY + headR * 0.3, headR * 0.5, -0.62, headY - headR * 1.0, headR * 0.3, hairC);
  p.px(0.32, headY + 0.1, ink);
  p.px(0.4, headY + 0.06, 0xfff8f2e8);
  p.px(0.36, headY - 0.05, ink);
  p.px(0.5, headY - 0.34, shadeOf(skin, -0.32));

  almanac.outlinePass(B, ink);
  // (an anchor has to be a whole pixel: a stamp at a fractional one lands between pixels and draws nothing)
  return { w: W, h: H, px: B.px, ax: W >> 1, ay: H - 2, stride: 1, air: true };
}

// a kind's twelve pictures at one pair of genes, each facing right
function figureSheet(kind, genes, inkHex) {
  const frames = [];
  let stride = 1;
  for (let i = 0; i < PHASES; i++) {
    const s = figureAt(kind, genes, (i / PHASES) * TAU, inkHex);
    stride = s.stride;
    frames.push(s);
  }
  return { frames, stride };
}

// ---------------------------------------------------------------------------------------------- props
function buildTree(rng, size, pal) {
  const w = Math.max(11, Math.round(size * 0.95)),
    h = Math.max(14, Math.round(size * 1.2)),
    B = buffer(w, h),
    leaf = [shadeOf(pal.leaf, -0.3), hex(pal.leaf), shadeOf(pal.leaf, 0.14), shadeOf(pal.leaf, 0.34)];
  almanac.barkTrunk(
    B,
    w >> 1,
    Math.round(h * 0.42),
    h - 2,
    Math.max(2, Math.round(size * 0.09)),
    [shadeOf(pal.bark, -0.22), hex(pal.bark)],
    Math.round(size * 0.05),
  );
  almanac.leafCrown(B, rng, w >> 1, Math.round(h * 0.34), Math.max(4, size * 0.33), Math.max(4, size * 0.3), leaf, {
    bloom: pal.bloom ? hex(pal.bloom) : undefined,
    bloomEvery: 13,
    seed: rng.int(0, 9999),
  });
  almanac.outlinePass(B, hex(pal.ink));
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

function buildBush(rng, size, pal) {
  const w = Math.max(9, Math.round(size)),
    h = Math.max(7, Math.round(size * 0.72)),
    B = buffer(w, h),
    leaf = [shadeOf(pal.leaf, -0.28), hex(pal.leaf), shadeOf(pal.leaf, 0.12), shadeOf(pal.leaf, 0.3)];
  almanac.leafCrown(B, rng, w >> 1, h * 0.56, w * 0.42, h * 0.42, leaf, {
    seed: rng.int(0, 9999),
    bloom: pal.bloom ? hex(pal.bloom) : undefined,
    bloomEvery: 9,
  });
  almanac.outlinePass(B, hex(pal.ink));
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

function buildRock(rng, size, pal) {
  const w = Math.max(8, Math.round(size)),
    h = Math.max(6, Math.round(size * 0.62)),
    B = buffer(w, h),
    grey = shadeOf(pal.stoneRoof, rng.range(-0.1, 0.1));
  almanac.fillEllipse(B, w / 2, h - h * 0.3, w * 0.46, h * 0.5, grey);
  almanac.shadeEllipse(B, w / 2, h - h * 0.2, w * 0.44, h * 0.42, 0.82);
  almanac.outlinePass(B, hex(pal.ink));
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

function buildFlower(rng, size, pal) {
  const w = 5,
    h = Math.max(5, Math.round(size * 0.4)),
    B = buffer(w, h),
    stem = shadeOf(pal.ground, -0.34);
  almanac.lineCells(w >> 1, h - 1, w >> 1, 2, (x, y) => {
    if (x >= 0 && y >= 0 && x < w && y < h) B.px[y * w + x] = stem;
  });
  const petal = hex(pal.bloom || '#f6d1de');
  almanac.fillEllipse(B, w >> 1, 2, 1.8, 1.8, petal);
  B.px[2 * w + (w >> 1)] = 0xff8fd0e0;
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

const HOUSE_SIZES = { straw: 0.82, wood: 0.95, stone: 1.05 };

function buildHouse(style, rng, size, pal) {
  const s = Math.round(size * (HOUSE_SIZES[style] || 1)),
    w = Math.max(18, s),
    h = Math.max(16, Math.round(s * 0.86)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    wall = { straw: pal.straw, wood: pal.wood, stone: pal.stone }[style] || pal.straw,
    roof = { straw: pal.strawRoof, wood: pal.woodRoof, stone: pal.stoneRoof }[style] || pal.strawRoof,
    left = Math.round(w * 0.16),
    right = Math.round(w * 0.84),
    base = h - 2,
    top = Math.round(h * (style === 'straw' ? 0.52 : 0.48)),
    peak = Math.round(h * (style === 'straw' ? 0.06 : style === 'stone' ? 0.18 : 0.12));

  fillRect(B, left, top, right, base, hex(wall));
  if (style === 'wood') for (let y = top + 3; y < base; y += 4) fillRect(B, left, y, right, y, shadeOf(wall, -0.12));
  if (style === 'stone')
    for (let y = top + 2; y < base; y += 4)
      for (let x = left + ((y >> 2) % 2 ? 2 : 4); x < right; x += 5) fillRect(B, x, y, x + 1, y, shadeOf(wall, -0.14));
  // the roof: its edge first, in the ink, then the roof inside it (so the silhouette is outlined, not its steps)
  const roofPts = (growY, growX) => [
      [Math.max(0, Math.round(w * 0.02)) - growX, top + 1 + growY],
      [w >> 1, peak - growY],
      [Math.min(w - 1, Math.round(w * 0.98)) + growX, top + 1 + growY],
    ],
    paintPoly = (pts, colour) =>
      almanac.polygonRows(pts, h, (y, xa, xb) => {
        if (xb >= xa) B.px.fill(colour, y * B.w + Math.max(0, xa), y * B.w + Math.min(B.w - 1, xb) + 1);
      });
  paintPoly(roofPts(1, 1), ink);
  paintPoly(roofPts(0, -1), hex(roof));
  // thatch or slates, in their own steps, laid row by row inside the roof
  const halfAt = (y) => ((y - peak) / Math.max(1, top - peak)) * (w * 0.48);
  for (let y = peak + 2; y < top; y += style === 'straw' ? 3 : 2) {
    const half = halfAt(y);
    if (half > 1.2) fillRect(B, w / 2 - half + 1, y, w / 2 + half - 1, y, shadeOf(roof, -0.08));
  }
  fillRect(B, left - 1, top, right + 1, top, ink);
  const doorW = Math.max(4, Math.round(w * 0.17)),
    doorX = Math.round(w * 0.3);
  fillRect(B, doorX, base - Math.round(h * 0.26), doorX + doorW, base, shadeOf(roof, -0.4));
  const win = [Math.round(w * 0.58), Math.round(h * 0.58)];
  fillRect(B, win[0], win[1], win[0] + 4, win[1] + 4, hex(pal.window));
  fillRect(
    B,
    win[0] + (style === 'stone' ? 2 : 0),
    win[1],
    win[0] + (style === 'stone' ? 2 : 0),
    win[1] + 4,
    shadeOf(wall, -0.3),
  );
  almanac.outlinePass(B, ink);
  return { w, h, px: B.px, ax: w >> 1, ay: base, window: [win[0] + 2 - (w >> 1), win[1] + 2 - base] };
}

function buildCloud(rng, size, pal) {
  const w = Math.max(16, Math.round(size * 1.8)),
    h = Math.max(8, Math.round(size * 0.72)),
    B = buffer(w, h),
    body = hex(pal.cloud),
    shade = shadeOf(pal.cloud, -0.16);
  const n = 3 + (rng.next() > 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    almanac.fillEllipse(
      B,
      w * (0.18 + 0.64 * t),
      h * (0.6 - 0.12 * Math.sin(t * Math.PI)),
      w * (0.16 + 0.1 * rng.next()),
      h * (0.3 + 0.1 * rng.next()),
      body,
    );
  }
  almanac.shadeEllipse(B, w / 2, h * 0.78, w * 0.44, h * 0.24, 0.94);
  almanac.fillEllipse(B, w / 2, h * 0.9, w * 0.4, h * 0.14, shade);
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

// a coconut palm: a trunk that leans out over the sand, a crown of fronds that droop, a few coconuts
function buildPalm(rng, size, pal) {
  const w = Math.max(16, Math.round(size * 0.9)),
    h = Math.max(22, Math.round(size * 1.35)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    leaf = hex(pal.leaf),
    leafLight = shadeOf(pal.leaf, 0.16),
    leafDark = shadeOf(pal.leaf, -0.28),
    lean = Math.round(size * (0.16 + rng.next() * 0.1)),
    topX = w * 0.42 + lean,
    topY = Math.round(h * 0.24),
    footY = h - 2;
  almanac.barkTrunk(
    B,
    w * 0.42,
    topY,
    footY,
    Math.max(2, Math.round(size * 0.075)),
    [shadeOf(pal.bark, -0.25), hex(pal.bark)],
    lean,
  );
  // fronds: six tapered arms from the crown, drooping as they go
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * 0.92 + (i / 5) * Math.PI * 0.84,
      len = size * (0.42 + rng.next() * 0.14),
      ex = topX + Math.cos(a) * len,
      ey = topY + Math.sin(a) * len * 0.55 + len * 0.28;
    almanac.capsuleSteps(topX, topY, size * 0.075, ex, ey, size * 0.03, (x, y, r) =>
      almanac.fillEllipse(B, x, y, r, r * 0.8, i % 2 ? leaf : leafDark),
    );
    almanac.capsuleSteps(
      topX,
      topY - 1,
      size * 0.035,
      ex * 0.92 + topX * 0.08,
      ey * 0.92 + topY * 0.08,
      size * 0.018,
      (x, y, r) => almanac.fillEllipse(B, x, y, r, r, leafLight),
    );
  }
  for (let i = 0; i < 3; i++)
    almanac.fillEllipse(
      B,
      topX - 2 + i * 2.4,
      topY + 2.4 + (i % 2) * 1.6,
      size * 0.045,
      size * 0.045,
      shadeOf(pal.bark, 0.1),
    );
  almanac.outlinePass(B, ink);
  return { w, h, px: B.px, ax: Math.round(w * 0.34), ay: h - 2 };
}

// a boat: a hull with a raised prow, a mast and a sail, seen from the side on the water
function buildBoat(rng, size, pal) {
  const w = Math.max(28, Math.round(size * 1.7)),
    h = Math.max(20, Math.round(size * 1.05)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    hull = hex(pal.wood),
    hullDark = shadeOf(pal.wood, -0.28),
    sailC = hex(pal.cloud),
    sailShade = shadeOf(pal.cloud, -0.12),
    deckY = Math.round(h * 0.62),
    prow = w - 2,
    stern = 3;
  // the hull: a shallow bowl with a prow that lifts
  almanac.polygonRows(
    [
      [stern, deckY],
      [w * 0.34, deckY - 2],
      [prow - 2, deckY - 5],
      [prow, deckY - 1],
      [w * 0.5, deckY + Math.round(h * 0.2)],
      [stern + 2, deckY + Math.round(h * 0.16)],
    ],
    h,
    (y, xa, xb) => {
      if (xb >= xa) B.px.fill(hull, y * B.w + Math.max(0, xa), y * B.w + Math.min(B.w - 1, xb) + 1);
    },
  );
  fillRect(B, Math.round(w * 0.1), deckY + 2, Math.round(w * 0.62), deckY + 3, hullDark);
  fillRect(B, 2, deckY, prow - 2, deckY, ink);
  // the mast and the sail
  const mastX = Math.round(w * 0.52),
    mastTop = Math.round(h * 0.08);
  fillRect(B, mastX, mastTop, mastX + Math.max(1, Math.round(size * 0.04)), deckY, hullDark);
  almanac.polygonRows(
    [
      [mastX + 1, mastTop + 2],
      [w * 0.9, deckY - 4],
      [mastX + 1, deckY - 3],
    ],
    h,
    (y, xa, xb) => {
      if (xb >= xa) B.px.fill(sailC, y * B.w + Math.max(0, xa), y * B.w + Math.min(B.w - 1, xb) + 1);
    },
  );
  for (let y = mastTop + 4; y < deckY - 4; y += 3) fillRect(B, mastX + 2, y, Math.round(w * 0.9) - 2, y, sailShade);
  almanac.outlinePass(B, ink);
  return { w, h, px: B.px, ax: Math.round(w * 0.46), ay: deckY + 3 };
}

// a nest of eggs: a bowl of woven straw with the eggs standing in it, the back row first
function buildNest(rng, size, pal, p) {
  const eggs = Math.max(1, Math.min(24, Math.round(p.eggs || 9))),
    w = Math.max(22, Math.round(size * 1.75)),
    h = Math.max(14, Math.round(size * 0.95)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    straw = hex(pal.straw),
    strawDark = shadeOf(pal.straw, -0.2),
    eggC = hex(p.egg || '#fdf3dd'),
    eggRim = shadeOf(p.egg || '#fdf3dd', -0.3),
    eggShade = shadeOf(p.egg || '#fdf3dd', -0.14),
    eggSpot = shadeOf(p.egg || '#fdf3dd', -0.42),
    rx = size * 0.17,
    ry = size * 0.22,
    midY = Math.round(h * 0.5),
    rows = eggs > 8 ? 3 : eggs > 4 ? 2 : 1;
  let left = eggs;
  for (let row = 0; row < rows; row++) {
    const n = Math.ceil(left / (rows - row)),
      y = midY - row * size * 0.19,
      spreadX = size * 0.52 * (1 - row * 0.2);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1),
        x = w / 2 + (t - 0.5) * 2 * spreadX;
      // each egg its own rim, so a clutch of them reads as eggs and not as one white lump
      almanac.fillEllipse(B, x, y, rx + 0.6, ry + 0.6, eggRim);
      almanac.fillEllipse(B, x, y, rx, ry, eggC);
      almanac.fillEllipse(B, x - rx * 0.25, y + ry * 0.38, rx * 0.6, ry * 0.42, eggShade);
      almanac.fillEllipse(B, x + rx * 0.18, y - ry * 0.18, rx * 0.5, ry * 0.42, eggC);
      if (rng.next() > 0.4) B.px[Math.round(y - ry * 0.2) * w + Math.round(x + rx * 0.3)] = eggSpot;
      if (rng.next() > 0.6) B.px[Math.round(y + ry * 0.2) * w + Math.round(x - rx * 0.2)] = eggSpot;
    }
    left -= n;
  }
  // the bowl in front, so the eggs sit in it
  almanac.fillEllipse(B, w / 2, midY + size * 0.24, size * 0.8, size * 0.3, straw);
  almanac.fillEllipse(B, w / 2, midY + size * 0.2, size * 0.7, size * 0.18, strawDark);
  for (let x = Math.round(w * 0.16); x < w * 0.84; x += 3) B.px[Math.round(midY + size * 0.3) * w + x] = strawDark;
  almanac.outlinePass(B, ink);
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

// ---------------------------------------------------------------------------------------------- the script
/** Problems a script has, each a sentence with the place in it, so an editor (or the model that wrote it) can fix them. */
export function validate(script) {
  const out = [];
  const bad = (path, msg) => out.push(`${path}: ${msg}`);
  if (!script || typeof script !== 'object') return ['script: a story is a JSON object'];
  if (!script.title) bad('title', 'a story needs a title');
  if (!script.scenes || !Array.isArray(script.scenes) || !script.scenes.length)
    return out.concat(['scenes: a list of at least one scene']);
  const cast = script.cast || {};
  for (const [name, who] of Object.entries(cast)) {
    if (!who || typeof who !== 'object') bad(`cast.${name}`, 'a character is an object');
    else if (!KINDS[who.kind])
      bad(`cast.${name}.kind`, `"${who.kind}" is not a kind of animal (${Object.keys(KINDS).join(', ')})`);
  }
  const pal = script.palette || {};
  for (const key of Object.keys(pal))
    if (key !== 'sky' && key !== 'hill') {
      if (typeof pal[key] !== 'string') bad(`palette.${key}`, 'a colour, as "#rrggbb"');
    } else if (key === 'hill') {
      if (!Array.isArray(pal.hill) || pal.hill.some((c) => typeof c !== 'string'))
        bad('palette.hill', 'one colour a hill layer, far to near, as ["#rrggbb", ...]');
    }
  if (pal.sky)
    for (const k of ['night', 'dawn', 'day', 'dusk'])
      if (pal.sky[k] && !(Array.isArray(pal.sky[k]) && pal.sky[k].length === 2))
        bad(`palette.sky.${k}`, 'two colours, [top, horizon]');

  script.scenes.forEach((sc, i) => {
    const at = `scenes[${i}]`;
    if (!sc || typeof sc !== 'object') return bad(at, 'a scene is an object');
    if (!(sc.duration > 0)) bad(`${at}.duration`, 'how long the scene lasts, in seconds (more than 0)');
    if (sc.time !== undefined && !(sc.time >= 0 && sc.time <= 1))
      bad(`${at}.time`, 'the time of day, 0..1 (0 midnight, 0.25 dawn, 0.5 noon, 0.75 dusk)');
    if (sc.ground !== undefined && !(sc.ground > 0.15 && sc.ground < 0.98))
      bad(`${at}.ground`, 'where the ground line is, as a share of the height (0.15..0.98)');
    if (sc.caption && typeof sc.caption !== 'object') bad(`${at}.caption`, 'an object { text, sub }');
    if (sc.caption && typeof sc.caption.text !== 'string')
      bad(`${at}.caption.text`, 'the words on screen, as a string');
    for (const layer of sc.hills || []) {
      if (layer.depth !== undefined && !(layer.depth >= 0 && layer.depth <= 1))
        bad(`${at}.hills`, 'depth is 0 (far) .. 1 (near)');
    }
    for (const p of sc.props || []) {
      if (!PROP_KINDS.has(p.kind)) bad(`${at}.props`, `"${p.kind}" is not a prop (${[...PROP_KINDS].join(', ')})`);
      if (p.kind === 'house' && p.style && !HOUSE_STYLES.has(p.style))
        bad(`${at}.props`, `"${p.style}" is not a house style (${[...HOUSE_STYLES].join(', ')})`);
      if (typeof p.x !== 'number') bad(`${at}.props`, 'a prop needs an x (in picture pixels, 0 at the left)');
    }
    for (const a of sc.actors || []) {
      if (!cast[a.who]) bad(`${at}.actors`, `"${a.who}" is not in the cast`);
      if (!Array.isArray(a.at) || !a.at.length) bad(`${at}.actors.${a.who}`, 'a path: [{ t, x }, ...]');
      else {
        let last = -Infinity;
        for (const kf of a.at) {
          if (typeof kf.x !== 'number') bad(`${at}.actors.${a.who}.at`, 'each keyframe needs an x');
          if (!(kf.t >= last)) bad(`${at}.actors.${a.who}.at`, 'keyframe times must go up');
          last = kf.t;
        }
      }
    }
    for (const e of sc.effects || [])
      if (!EFFECT_KINDS.has(e.kind))
        bad(`${at}.effects`, `"${e.kind}" is not an effect (${[...EFFECT_KINDS].join(', ')})`);
    if (sc.weather && !['clear', 'rain', 'snow', 'storm', 'fog'].includes(sc.weather.kind))
      bad(`${at}.weather.kind`, '"clear", "rain", "snow", "storm" or "fog"');
  });
  return out;
}

// the camera at a moment: a keyframe path, eased, each key { t, x, zoom }
function cameraAt(list, t) {
  if (!list || !list.length) return { x: 0, zoom: 1 };
  if (t <= list[0].t) return { x: list[0].x || 0, zoom: list[0].zoom || 1 };
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i],
      b = list[i + 1];
    if (t <= b.t) {
      const u = almanac.smoothstep(0, 1, (t - a.t) / Math.max(1e-6, b.t - a.t));
      return { x: almanac.lerp(a.x || 0, b.x || 0, u), zoom: almanac.lerp(a.zoom || 1, b.zoom || 1, u) };
    }
  }
  const last = list[list.length - 1];
  return { x: last.x || 0, zoom: last.zoom || 1 };
}

// where a walker is at a moment, and how far it has walked (which is what turns its legs)
function trackAt(at, t) {
  let dist = 0;
  if (t <= at[0].t) return { x: at[0].x, dist: 0, dir: 1 };
  for (let i = 0; i < at.length - 1; i++) {
    const a = at[i],
      b = at[i + 1],
      len = Math.abs(b.x - a.x);
    if (t <= b.t) {
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return { x: almanac.lerp(a.x, b.x, u), dist: dist + len * u, dir: Math.sign(b.x - a.x) || 1 };
    }
    dist += len;
  }
  const last = at[at.length - 1];
  return { x: last.x, dist, dir: 1 };
}

// ---------------------------------------------------------------------------------------------- the film
/**
 * A story, grown from its script.
 * @param {object} script the story (see examples/storybook/format.md)
 * @param {{seed?: string, size?: number, fps?: number}} [o] seed: another telling of the same script; size: the
 *   picture's width (the height follows, 9:16, 4:3 or 16:9 asked for by nothing but this number); fps
 * @returns {{W, H, FPS, DUR, frames, title, scenes, sceneAt, frame, used, report}}
 */
export function storybook(script, o = {}) {
  const problems = validate(script);
  if (problems.length) throw new Error(`this story cannot be drawn as written:\n  ${problems.join('\n  ')}`);

  // every technique the film calls is counted on its way through, as the island counts its own
  const used = new Set(),
    A = {};
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
  const {
    clamp,
    lerp,
    smoothstep,
    wrap,
    packRgb,
    mixPacked,
    hexToRgb,
    shade,
    aerialPerspective,
    dayCycle,
    hourLight,
    hourTables,
    gradeFrame,
    twinkle,
    hillLine,
    parallax,
    indexRandom,
    SeededRandom,
    genomeFrom,
    seedOf,
    tones,
    fillEllipse,
    capsuleSteps,
    lineCells,
    polygonRows,
    shadeEllipse,
    ditherEllipse,
    blitSprite,
    blitSway,
    outlinePass,
    leafCrown,
    barkTrunk,
    footStep,
    strideRate,
    gaitTiming,
    particleField,
    fall,
    hover,
    rise,
    wrapAround,
    fogBanks,
    lightningFlash,
    waterTime,
    waterPixel,
  } = A;

  const W = Math.round(o.size || script.size || 480),
    H = Math.round(W * 0.5625),
    FPS = Math.round(o.fps || script.fps || 20),
    seedWords = `${script.seed || script.title || 'a story'}|${o.seed || ''}`,
    SEED = seedOf(seedWords),
    pal = {
      ...DEFAULT_PALETTE,
      ...(script.palette || {}),
      sky: { ...DEFAULT_PALETTE.sky, ...((script.palette || {}).sky || {}) },
    },
    inkHex = pal.ink,
    cast = script.cast || {},
    scenes = script.scenes.map((s, i) => ({ ...s, id: s.id || `scene-${i + 1}`, duration: +s.duration }));

  const DUR = scenes.reduce((a, s) => a + s.duration, 0),
    frames = Math.max(1, Math.round(DUR * FPS));

  // the things that are built once: each character's twelve pictures, each prop, each effect's field
  const sheets = new Map(); // `${who}|${size}` -> { frames, stride }
  const sprites = new Map(); // key -> sprite
  const fields = new Map(); // seed -> particles

  const SC = W / 480; // the script's sizes are written at 480 wide; a bigger picture is the same picture, larger

  function sheetFor(who, size, coat) {
    const key = `${who}|${size || ''}|${coat || ''}`;
    if (sheets.has(key)) return sheets.get(key);
    const spec = cast[who],
      kind = spec.kind,
      rng = new SeededRandom(`${seedWords}|cast|${who}`),
      genes = {
        size: (size || 30) * SC,
        coat: KINDS[kind].coat,
        ...genomeFrom(KINDS[kind].genes, rng),
        ...(spec.genes || {}),
        ...(spec.genes && spec.genes.size ? { size: spec.genes.size * SC } : {}),
        ...(size ? { size: size * SC } : {}),
        ...(coat ? { coat } : {}),
      };
    const sheet = figureSheet(kind, genes, inkHex);
    sheets.set(key, { ...sheet, genes, kind });
    return sheets.get(key);
  }

  function propSprite(kind, p, sceneId) {
    const key = `${sceneId}|${kind}|${p.style || ''}|${p.size || 32}|${p.seed || 0}|${p.x}`;
    if (sprites.has(key)) return sprites.get(key);
    const rng = new SeededRandom(`${seedWords}|${key}`),
      size = (p.size || (kind === 'house' ? 54 : 32)) * SC;
    let s;
    if (kind === 'tree') s = buildTree(rng, size, pal);
    else if (kind === 'bush') s = buildBush(rng, size * 0.8, pal);
    else if (kind === 'rock') s = buildRock(rng, size * 0.7, pal);
    else if (kind === 'flower') s = buildFlower(rng, size, pal);
    else if (kind === 'cloud') s = buildCloud(rng, size, pal);
    else if (kind === 'palm') s = buildPalm(rng, size, pal);
    else if (kind === 'boat') s = buildBoat(rng, size, pal);
    else if (kind === 'nest') s = buildNest(rng, size, pal, p);
    else s = buildHouse(p.style || 'straw', rng, size, pal);
    sprites.set(key, s);
    return s;
  }

  function fieldFor(sceneId, kind, count) {
    const key = `${sceneId}|${kind}|${count}`;
    if (!fields.has(key)) fields.set(key, particleField(count, W, H, new SeededRandom(`${seedWords}|${key}`)));
    return fields.get(key);
  }

  // the scene a moment falls in, for captions and for the player's timeline
  function sceneAt(t) {
    let start = 0;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      if (t < start + s.duration || i === scenes.length - 1)
        return { index: i, scene: s, local: clamp(t - start, 0, s.duration), start, caption: s.caption || {} };
      start += s.duration;
    }
    return { index: 0, scene: scenes[0], local: 0, start: 0, caption: scenes[0].caption || {} };
  }

  const skyRows = new Int32Array(H); // a packed colour a row, rebuilt per frame
  const FRAME = new Uint32Array(W * H);

  function render(t) {
    const frame = FRAME;
    frame.fill(0);
    const { index, scene, local } = sceneAt(t);
    const day = dayCycle(pal.sky, scene.time === undefined ? 0.42 : scene.time);
    const tod = (day.t - 0.25 + 1) % 1; // hourLight's clock: 0.25 noon, 0.75 midnight
    const groundShare = scene.ground === undefined ? 0.74 : scene.ground,
      groundY = Math.round(H * groundShare);
    const cam = cameraAt(scene.camera, local);
    const wet = scene.weather && (scene.weather.kind === 'rain' || scene.weather.kind === 'storm') ? 0.7 : 0;
    const hour = hourLight(tod, 1, wet);
    const night = hour.night;
    const top = pack(day.top),
      horiz = pack(day.horizon);

    // ---------------------------------------------------------------- the sky
    for (let y = 0; y < groundY; y++) {
      const u = Math.pow(clamp(y / Math.max(1, groundY - 1)), 1.35);
      skyRows[y] = mixPacked(top, horiz, u * 0.9);
      frame.fill(skyRows[y], y * W, y * W + W);
    }

    // stars, and the sun or the moon
    if (day.light < 0.5) {
      const starInk = hex(pal.star);
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(indexRandom(i, SEED) * W),
          y = Math.floor(indexRandom(i + 313, SEED) * groundY * 0.78),
          b = twinkle(t * 0.8, indexRandom(i + 71, SEED) * TAU, 0.55);
        if (b > 0.55) frame[y * W + x] = mixPacked(skyRows[y] || top, starInk, clamp((b - 0.55) * 3));
      }
    }
    const body = day.light > 0.12 ? { p: day.sun, c: hex(pal.sun) } : { p: day.moon, c: hex(pal.moon) };
    if (body.p && body.p.y > -0.15) {
      const cx = Math.round((body.p.x / 2) * W),
        cy = Math.round(groundY * 0.92 - body.p.y * groundY * 0.85);
      const halo = 10 * SC;
      ditherEllipse(
        { w: W, h: H, px: frame },
        cx,
        cy,
        halo,
        halo,
        mixPacked(skyRows[Math.max(0, cy)] || top, body.c, 0.5),
        0.5,
      );
      fillEllipse({ w: W, h: H, px: frame }, cx, cy, 5 * SC, 5 * SC, body.c);
    }

    // clouds, far behind the hills
    for (const p of scene.props || []) {
      if (p.kind !== 'cloud') continue;
      const s = propSprite('cloud', p, scene.id),
        drift = (local * (p.speed === undefined ? 4 : p.speed) + parallax(cam.x, 0.12)) * cam.zoom,
        x = wrap((p.x || 0) * cam.zoom - drift + W * 0.5, W + s.w) - s.w * 0.5,
        y = (p.y === undefined ? 0.18 : p.y) * H;
      blitSprite({ w: W, h: H, px: frame }, s, x, y);
    }

    // ---------------------------------------------------------------- the land, far to near
    const hills = scene.hills || [
      { seed: 3, depth: 0.3, amp: 0.38, freq: 1.5, sharp: 0.4 },
      { seed: 7, depth: 0.58, amp: 0.2, freq: 2.4 },
      { seed: 11, depth: 0.84, amp: 0.08, freq: 4.2 },
    ];
    const ridge = new Int32Array(W);
    hills.forEach((h, li) => {
      const depth = h.depth === undefined ? 0.4 + li * 0.2 : h.depth,
        colour = hex(h.colour || pal.hill[Math.min(pal.hill.length - 1, li)] || pal.hill[pal.hill.length - 1]),
        // far land fades toward the horizon, the more so at night: aerial perspective
        tinted = mixPacked(colour, horiz, clamp(Math.pow(1 - depth, 1.8) * (0.46 + day.night * 0.28), 0, 0.78)),
        rim = mixPacked(tinted, hex(pal.ink), 0.14),
        shift = parallax(cam.x, depth),
        amp = h.amp === undefined ? 0.12 : h.amp,
        base = h.base === undefined ? groundShare : h.base,
        seed = h.seed === undefined ? 3 + li * 4 : h.seed,
        hill = {
          freq: (h.freq || 2.6) / cam.zoom,
          seed,
          base,
          height: amp,
          sharp: h.sharp === undefined ? 0.35 : h.sharp,
          rough: 0.5,
          terrace: h.terrace,
        };
      // where the ridge is at each column, once: one hillLine a column, and the fill and the lit edge share it
      for (let sx = 0; sx < W; sx++) ridge[sx] = Math.round(hillLine((sx - W / 2) / cam.zoom + shift, hill, W, H));
      for (let sx = 0; sx < W; sx++) {
        const y = ridge[sx];
        if (y >= H) continue;
        for (let yy = Math.max(0, y + 1); yy < H; yy++) frame[yy * W + sx] = tinted;
        if (y >= 0) frame[y * W + sx] = rim;
      }
    });

    // ---------------------------------------------------------------- the ground, or the water
    const seaPalette = (() => {
      const sea = rgbOf(pal.sea);
      return {
        LV: [0, 1, 2, 3, 4, 5, 6].map((i) => pack(shade(sea, 0.16 - i * 0.07))),
        FOAM: hex('#f2fbfd'),
        FOAM2: mixPacked(hex('#f2fbfd'), hex(pal.sea), 0.35),
        GLINT: hex('#ffffff'),
        GLINT2: mixPacked(hex('#ffffff'), hex(pal.sea), 0.45),
        WEED: pack(shade(rgbOf('#2f6a45'), 0)),
        WEED2: pack(shade(rgbOf('#2f6a45'), 0.14)),
        SAND: [0, 1, 2].map((i) => pack(shade(rgbOf(pal.sand), 0.04 - i * 0.06))),
      };
    })();
    if (scene.water) {
      const T = waterTime(local, Math.floor(local * 15)),
        buf = { w: W, h: H, px: frame };
      for (let y = groundY; y < H; y++) {
        const d = y - groundY,
          wob = Math.round(Math.sin(y * 0.35 + local * 2.2)),
          near = scene.beach !== false;
        for (let x = 0; x < W; x++)
          buf.px[y * W + x] = waterPixel(x + Math.round(cam.x), y, d, near, 0, T, wob, seaPalette);
      }
      fillRect({ w: W, h: H, px: frame }, 0, groundY - 1, W - 1, groundY, mixPacked(hex(pal.sand), horiz, 0.2));
    } else {
      const grass = mixPacked(hex(pal.ground), horiz, 0.06 + day.night * 0.25),
        dark = mixPacked(hex(pal.groundDark), horiz, 0.1 + day.night * 0.25);
      frame.fill(dark, groundY * W);
      for (let y = groundY + 1; y < H; y++) {
        const band = (y - groundY) / Math.max(1, H - groundY);
        frame.fill(mixPacked(grass, dark, band * 0.55), y * W, y * W + W);
      }
      // a few tufts and stones, placed by their number so they never move
      for (let i = 0; i < 46; i++) {
        const x = Math.floor(indexRandom(i, SEED) * (W + 40) - 20 - cam.x * 0.9) % (W + 40);
        const px0 = ((x + W + 40) % (W + 40)) - 20,
          y = groundY + 3 + Math.floor(indexRandom(i + 501, SEED) * (H - groundY - 4));
        if (y < H && px0 >= 0 && px0 < W) {
          frame[y * W + px0] = mixPacked(frame[y * W + px0], hex(pal.groundDark), 0.5);
          frame[y * W + px0 + 1] = mixPacked(frame[y * W + px0 + 1], hex(pal.groundDark), 0.3);
        }
      }
      const shore = mixPacked(hex(pal.ground), hex(pal.groundDark), 0.35);
      fillRect({ w: W, h: H, px: frame }, 0, groundY - 1, W - 1, groundY, shore);
    }

    // ---------------------------------------------------------------- what stands on it, far to near
    const drawn = [],
      lights = [],
      view = { w: W, h: H, px: frame };
    for (const p of scene.props || []) {
      if (p.kind === 'cloud') continue;
      const s = propSprite(p.kind, p, scene.id),
        x = (p.x - cam.x) * cam.zoom + W / 2,
        y = groundShare * H + (p.lift || 0) * cam.zoom,
        wind = (h) =>
          Math.round(
            Math.sin(t * 1.1 + (p.seed || 0)) * (h / Math.max(1, s.h)) * (p.sway === undefined ? 1.4 : p.sway),
          );
      drawn.push({
        y,
        draw: () =>
          p.kind === 'tree' || p.kind === 'bush' ? blitSway(view, s, x, y, wind) : blitSprite(view, s, x, y, p.flip),
      });
    }
    for (const a of scene.actors || []) {
      const coats = a.coats && a.coats.length ? a.coats : null,
        sheet = sheetFor(a.who, a.size, coats && coats[0]),
        track = trackAt(a.at, local),
        air = !!sheet.frames[0].air, // wings beat with the clock; feet step with the distance walked
        n = Math.max(1, Math.min(24, Math.round(a.crowd || 1))),
        spread = (a.spread === undefined ? 14 : a.spread) * cam.zoom,
        baseX = (track.x - cam.x) * cam.zoom + W / 2,
        baseY = groundShare * H + (a.lane || 0) * cam.zoom;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread,
          hover = a.hover ? Math.sin(local * 1.7 + i * 1.3 + (a.phase || 0)) * a.hover * cam.zoom : 0,
          phase = air ? local * 2.1 + i * 0.9 + (a.phase || 0) : track.dist * strideRate(sheet.stride) + i * 2.1,
          idx = ((Math.round((phase / TAU) * PHASES) % PHASES) + PHASES) % PHASES,
          own = coats ? sheetFor(a.who, a.size, coats[i % coats.length]) : sheet,
          sprite = own.frames[idx],
          x = baseX + off,
          y = baseY + hover - (i % 2) * 1.2 * cam.zoom;
        drawn.push({
          // a thing in the air is over the land, not behind it; `layer` orders one flyer against another
          y: (air ? 1e6 : 0) + (a.layer || 0) * 1000 + y,
          draw: () => blitSprite(view, sprite, x, y, track.dir < 0),
        });
        if (a.glow)
          lights.push({ x, y: y - sprite.h * 0.55, r: a.glow * cam.zoom, k: 0.42 + 0.12 * Math.sin(local * 1.6 + i) });
      }
    }
    drawn.sort((p, q) => p.y - q.y);
    for (const d of drawn) d.draw();

    // ---------------------------------------------------------------- weather and small things
    const effects = [...(scene.effects || [])];
    const weatherKind = scene.weather && scene.weather.kind,
      strength = scene.weather && scene.weather.strength !== undefined ? scene.weather.strength : 1;
    if (weatherKind === 'rain' || weatherKind === 'storm')
      effects.push({ kind: 'rain', count: Math.round(150 * strength) });
    if (weatherKind === 'snow') effects.push({ kind: 'snow', count: Math.round(90 * strength) });
    if (weatherKind === 'fog') effects.push({ kind: 'fog' });
    const buf = { w: W, h: H, px: frame };

    for (const e of effects) {
      if (e.kind === 'fog') {
        fogBanks(buf, W, H, {
          x: cam.x * 0.6 + local * 7,
          y: 0,
          density: (e.density === undefined ? 0.45 : e.density) * strength,
          seed: SEED,
        });
        continue;
      }
      if (e.kind === 'lightning') continue; // struck below, over everything
      const count = e.count || (e.kind === 'rain' ? 150 : e.kind === 'snow' ? 90 : 40),
        field = fieldFor(scene.id, e.kind, count),
        petal = hex(e.colour || pal.petal),
        ageT = local * (weatherKind === 'storm' ? 1.25 : 1);
      for (const q0 of field) {
        let q;
        if (e.kind === 'rain') q = fall(q0, ageT, { speed: 330 * strength, wind: 45 * strength, sway: [0.6, 1.5] });
        else if (e.kind === 'snow')
          q = fall(q0, ageT, { speed: 26 * strength, wind: 9, sway: [1.4, 8], bob: [0.8, 3] });
        else if (e.kind === 'petals') q = fall(q0, ageT, { speed: 22, wind: 13, sway: [0.9, 12] });
        else if (e.kind === 'leaves') q = fall(q0, ageT, { speed: 34, wind: 20, sway: [1.1, 16] });
        else if (e.kind === 'fireflies')
          q = hover(q0, ageT, { x: [0.7, 10], y: [0.5, 6], camera: cam.x * 0.2, byDepth: true });
        else if (e.kind === 'bubbles') q = rise(q0, ageT, { speed: 26, spread: 18, sway: [2.2, 5] });
        else if (e.kind === 'sparks') q = rise(q0, ageT, { speed: 34, spread: 30, sway: [3.2, 9] });
        else q = hover(q0, ageT, { x: [0.3, 4], y: [0.25, 3], camera: cam.x * 0.1 });
        // a particle law is linear in dt, so a moment can be reached in one step -- and one step may be many
        // screens' worth of falling: wrapping it by modulo keeps it in view however far it has come
        const x = Math.round(wrap(q.x + 24, W + 48) - 24),
          y = Math.round(wrap(q.y + 24, H + 48) - 24);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (e.kind === 'rain') {
          const c = mixPacked(frame[y * W + x], hex('#eaf6ff'), 0.72);
          frame[y * W + x] = c;
          if (y + 1 < H) frame[(y + 1) * W + x] = mixPacked(frame[(y + 1) * W + x], hex('#eaf6ff'), 0.45);
          if (y + 2 < H) frame[(y + 2) * W + x] = mixPacked(frame[(y + 2) * W + x], hex('#eaf6ff'), 0.2);
        } else if (e.kind === 'fireflies') {
          const b = twinkle(t * 1.6, q0.p, 0.5);
          if (b > 0.35) {
            frame[y * W + x] = mixPacked(frame[y * W + x], hex('#fff0a8'), clamp(b));
            lights.push({ x, y, r: 16, k: 0.45 * b });
          }
        } else if (e.kind === 'bubbles') {
          frame[y * W + x] = mixPacked(frame[y * W + x], hex('#cdeaf7'), 0.7);
          if (x + 1 < W && q0.s > 0.55) frame[y * W + x + 1] = mixPacked(frame[y * W + x + 1], hex('#f2fbff'), 0.55);
        } else if (e.kind === 'sparks') {
          const b = twinkle(t * 5, q0.p, 0.6);
          if (b > 0.25) {
            frame[y * W + x] = mixPacked(frame[y * W + x], hex(e.colour || '#ffd98a'), clamp(0.4 + b));
            if (b > 0.8) lights.push({ x, y, r: 10, k: 0.3 });
          }
        } else {
          frame[y * W + x] = mixPacked(frame[y * W + x], e.kind === 'snow' ? hex('#ffffff') : petal, 0.85);
        }
      }
    }

    // the windows of the houses, lit after dark
    if (night > 0.12)
      for (const p of scene.props || []) {
        if (p.kind !== 'house') continue;
        const s = propSprite('house', p, scene.id),
          x = (p.x - cam.x) * cam.zoom + W / 2,
          y = groundShare * H + (p.lift || 0) * cam.zoom;
        if (s.window)
          lights.push({
            x: x + s.window[0] * cam.zoom,
            y: y + s.window[1] * cam.zoom,
            r: 20 * cam.zoom,
            k: 0.55 + 0.1 * twinkle(t, p.x),
          });
      }

    // ---------------------------------------------------------------- the hour, over all of it
    gradeFrame(buf, W, H, hourTables(hour.night, hour.dusk, hour.morning, 1, wet), { night: hour.night, lights });

    if (weatherKind === 'storm') {
      for (let k = 0; k < 40; k++) {
        const strike = 1.2 + k * 5.3 + indexRandom(k, SEED) * 1.6;
        if (local >= strike && local < strike + 0.34) lightningFlash(frame, 0.34 - (local - strike));
      }
    }
    return frame;
  }

  function frame(f) {
    const n = ((Math.round(f) % frames) + frames) % frames;
    return render(n / FPS);
  }

  function report() {
    const lines = [
      `${script.title || 'a story'} · ${scenes.length} scenes · ${DUR.toFixed(1)} s · ${W}x${H} at ${FPS} fps · seed ${SEED}`,
    ];
    lines.push(`${used.size} techniques used: ${[...used].sort().join(', ')}`);
    return lines;
  }

  return { W, H, FPS, DUR, frames, title: script.title || 'a story', scenes, sceneAt, frame, used, report, seed: SEED };
}
