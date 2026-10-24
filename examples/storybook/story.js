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

// Every call this file makes into the almanac goes through A, which counts the technique into whichever book is
// being drawn (activeUsed) -- the same ledger the island film keeps, so a book's `used` set and its report() can
// say honestly what the story needed, figures and props included. The wrappers are made once, here, not per book.
let activeUsed = null;
const counted = new Map();
const A = new Proxy(almanac, {
  get(target, name) {
    const f = target[name];
    if (typeof f !== 'function' || typeof name !== 'string') return f;
    if (!counted.has(name))
      counted.set(
        name,
        /^[A-Z]/.test(name)
          ? class extends f {
              constructor(...a) {
                super(...a);
                if (activeUsed) activeUsed.add(name);
              }
            }
          : (...a) => {
              if (activeUsed) activeUsed.add(name);
              return f(...a);
            },
      );
    return counted.get(name);
  },
});

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
    spots: 3,
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
    saddle: true,
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
    belly: true,
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
    spots: 2,
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

const PROP_KINDS = new Set([
  'tree',
  'bush',
  'house',
  'rock',
  'cloud',
  'flower',
  'palm',
  'boat',
  'nest',
  'turtle',
  'sword',
  'islet',
]);
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
const rgbOf = (h) => (typeof h === 'string' ? A.hexToRgb(h) : h);
const pack = (c) => A.packRgb(c[0], c[1], c[2]);
const hex = (h) => pack(rgbOf(h));
const shadeOf = (h, k) => pack(A.shade(rgbOf(h), k));
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
    ell: (x, y, rx, ry, c) => A.fillEllipse(B, X(x), Y(y), Math.max(0.1, rx * k), Math.max(0.1, ry * k), c),
    cap: (x1, y1, r1, x2, y2, r2, c) =>
      A.capsuleSteps(X(x1), Y(y1), Math.max(0.1, r1 * k), X(x2), Y(y2), Math.max(0.1, r2 * k), (px, py, r) =>
        A.fillEllipse(B, px, py, r, r, c),
      ),
    poly: (pts, c) =>
      A.polygonRows(
        pts.map(([x, y]) => [X(x), Y(y)]),
        B.h,
        (y, xa, xb) => {
          if (xb >= xa) B.px.fill(c, y * B.w + Math.max(0, xa), y * B.w + Math.min(B.w - 1, xb) + 1);
        },
      ),
    line: (x1, y1, x2, y2, c) =>
      A.lineCells(X(x1), Y(y1), X(x2), Y(y2), (x, y) => {
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
    T = A.tones(rgbOf(genes.coat)),
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
  const timing = A.gaitTiming(K.gait),
    far = K.stance === 'quad' ? [timing[0].far, timing[1].far] : [timing[0].far],
    near = K.stance === 'quad' ? [timing[0].near, timing[1].near] : [timing[0].near];
  const leg = (hip, off, colour) => {
    const s = A.footStep(phase + off, 0.55 * legLen, 0.34 * legLen);
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
  // its markings: a dark saddle, a pale belly, mud or dappling -- placed by the coat, never by the phase, so a
  // spot does not swim while the legs move
  if (K.saddle) p.ell(-bRx * 0.08, cy + bRy * 0.52, bRx * 0.72, bRy * 0.34, dark);
  if (K.belly) p.ell(bRx * 0.08, cy - bRy * 0.42, bRx * 0.66, bRy * 0.4, shadeOf(genes.coat, 0.55));
  if (K.spots) {
    let sc = 7;
    for (const ch of genes.coat) sc = (sc * 31 + ch.charCodeAt(0)) | 0;
    const spots = A.bodySpots(new A.SeededRandom(sc), 0, 100, K.spots),
      spotCol = A.mixPacked(base, dark, 0.55);
    for (const q of spots)
      p.ell(q.dx * bRx, cy + q.dy * bRy, Math.max(0.3, q.r * bRx * 0.26), Math.max(0.3, q.r * bRy * 0.3), spotCol);
  }
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

  A.outlinePass(B, ink);
  return { w: W, h: H, px: B.px, ax: (W - 1) / 2, ay: H - 2, stride: 0.55 * legLen * k, lift: 0.34 * legLen * k };
}

// A dragon of the east, seen from the side: a long thin serpentine body that ripples through the air, a fan of a tail,
// a horned head with a whisker, four short clawed legs and a ridge of spines along its back. It flies, so its twelve
// pictures are a ripple, not a walk. Everything is sized so the silhouette reads small: a thin wave, a big head, a fan.
function dragonAt(genes, phase, inkHex) {
  const coat = genes.coat,
    T = A.tones(rgbOf(coat)),
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

  A.outlinePass(B, ink);
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
    T = A.tones(rgbOf(coat)),
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

  A.outlinePass(B, ink);
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
  const w = Math.max(13, Math.round(size * 1.05)),
    h = Math.max(16, Math.round(size * 1.28)),
    B = buffer(w, h),
    leaf = [shadeOf(pal.leaf, -0.3), hex(pal.leaf), shadeOf(pal.leaf, 0.14), shadeOf(pal.leaf, 0.34)],
    bark = [shadeOf(pal.bark, -0.22), hex(pal.bark)],
    cx = w >> 1,
    crownY = Math.round(h * 0.36),
    trunkTop = Math.round(h * 0.44);
  A.barkTrunk(B, cx, trunkTop, h - 2, Math.max(2, Math.round(size * 0.09)), bark, Math.round(size * 0.05));
  // branches reaching up into the crown, so the leaves hang on something
  for (const sgn of [-1, 0, 1])
    A.capsuleSteps(
      cx,
      trunkTop + 2,
      Math.max(0.8, size * 0.035),
      cx + sgn * size * 0.18,
      crownY + (sgn ? size * 0.06 : -size * 0.08),
      Math.max(0.5, size * 0.016),
      (x, y, r) => A.fillEllipse(B, x, y, r, r, bark[0]),
    );
  // the crown in three overlapping billows, the way the island stacks its own, rather than one ball
  const billow = (ox, oy, r) =>
    A.leafCrown(B, rng, cx + ox, crownY + oy, Math.max(3.5, r), Math.max(3.5, r * 0.88), leaf, {
      clumps: 5,
      bloom: pal.bloom ? hex(pal.bloom) : undefined,
      bloomEvery: 13,
      seed: rng.int(0, 9999),
    });
  billow(-size * 0.16, size * 0.07, size * 0.24);
  billow(size * 0.16, size * 0.07, size * 0.24);
  billow(0, -size * 0.09, size * 0.28);
  A.outlinePass(B, hex(pal.ink));
  return { w, h, px: B.px, ax: cx, ay: h - 2 };
}

function buildBush(rng, size, pal) {
  const w = Math.max(9, Math.round(size)),
    h = Math.max(7, Math.round(size * 0.72)),
    B = buffer(w, h),
    leaf = [shadeOf(pal.leaf, -0.28), hex(pal.leaf), shadeOf(pal.leaf, 0.12), shadeOf(pal.leaf, 0.3)];
  const hump = (cx, cy, rx, ry) =>
    A.leafCrown(B, rng, cx, cy, rx, ry, leaf, {
      clumps: 4,
      seed: rng.int(0, 9999),
      bloom: pal.bloom ? hex(pal.bloom) : undefined,
      bloomEvery: 9,
    });
  hump(w * 0.34, h * 0.6, w * 0.3, h * 0.38);
  hump(w * 0.66, h * 0.58, w * 0.3, h * 0.4);
  hump(w * 0.5, h * 0.44, w * 0.26, h * 0.34);
  A.outlinePass(B, hex(pal.ink));
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

function buildRock(rng, size, pal) {
  const w = Math.max(8, Math.round(size)),
    h = Math.max(6, Math.round(size * 0.62)),
    B = buffer(w, h),
    grey = shadeOf(pal.stoneRoof, rng.range(-0.1, 0.1));
  A.fillEllipse(B, w / 2, h - h * 0.3, w * 0.46, h * 0.5, grey);
  A.shadeEllipse(B, w / 2, h - h * 0.2, w * 0.44, h * 0.42, 0.82);
  // a face that catches the light, and a crack down from it
  A.fillEllipse(B, w * 0.38, h * 0.42, w * 0.2, h * 0.18, shadeOf(pal.stoneRoof, 0.22));
  A.lineCells(
    Math.round(w * (0.5 + rng.range(-0.08, 0.08))),
    Math.round(h * 0.4),
    Math.round(w * 0.56),
    h - 3,
    (x, y) => {
      if (x >= 0 && y >= 0 && x < w && y < h && B.px[y * w + x]) B.px[y * w + x] = shadeOf(pal.stoneRoof, -0.3);
    },
  );
  A.outlinePass(B, hex(pal.ink));
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

function buildFlower(rng, size, pal) {
  const w = 5,
    h = Math.max(5, Math.round(size * 0.4)),
    B = buffer(w, h),
    stem = shadeOf(pal.ground, -0.34);
  A.lineCells(w >> 1, h - 1, w >> 1, 2, (x, y) => {
    if (x >= 0 && y >= 0 && x < w && y < h) B.px[y * w + x] = stem;
  });
  const petal = hex(pal.bloom || '#f6d1de');
  A.fillEllipse(B, w >> 1, 2, 1.8, 1.8, petal);
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
  // the wall in the roof's shadow at its top, and darker with damp at its foot
  fillRect(B, left, top + 1, right, Math.min(base, top + 2), shadeOf(wall, -0.18));
  fillRect(B, left, Math.max(top, base - 2), right, base, shadeOf(wall, -0.13));
  // the roof: its edge first, in the ink, then the roof inside it (so the silhouette is outlined, not its steps)
  const roofPts = (growY, growX) => [
      [Math.max(0, Math.round(w * 0.02)) - growX, top + 1 + growY],
      [w >> 1, peak - growY],
      [Math.min(w - 1, Math.round(w * 0.98)) + growX, top + 1 + growY],
    ],
    paintPoly = (pts, colour) =>
      A.polygonRows(pts, h, (y, xa, xb) => {
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
  if (style === 'straw')
    // the straws themselves, hanging down the slope
    for (let n = 0; n < s * 0.9; n++) {
      const y = Math.round(peak + 2 + rng.next() * Math.max(1, top - peak - 3)),
        half = halfAt(y);
      if (half < 1.6) continue;
      const x = Math.round(w / 2 + (rng.next() * 2 - 1) * (half - 1));
      fillRect(
        B,
        x,
        y,
        x,
        Math.min(top - 1, y + 1 + (rng.next() > 0.5 ? 1 : 0)),
        shadeOf(roof, rng.next() > 0.5 ? 0.1 : -0.16),
      );
    }
  const chimX = Math.round(w * 0.66),
    chimW = Math.max(2, Math.round(w * 0.075)),
    chimTop = Math.round(peak + (top - peak) * 0.18 - h * 0.1),
    chimY = Math.round(peak + (top - peak) * ((chimX - w / 2) / Math.max(1, w * 0.48)) * -1 + (top - peak) * 0.32);
  fillRect(
    B,
    chimX,
    chimTop,
    chimX + chimW,
    Math.min(top, chimY + Math.round(h * 0.22)),
    hex(style === 'straw' ? pal.wood : pal.stone),
  );
  fillRect(B, chimX - 1, chimTop, chimX + chimW + 1, chimTop + 1, shadeOf(roof, -0.3));
  fillRect(B, left - 1, top, right + 1, top, ink);
  const doorW = Math.max(4, Math.round(w * 0.17)),
    doorX = Math.round(w * 0.3),
    doorTop = base - Math.round(h * 0.26);
  fillRect(B, doorX - 1, doorTop - 1, doorX + doorW + 1, base, shadeOf(wall, -0.34));
  fillRect(B, doorX, doorTop, doorX + doorW, base, shadeOf(roof, -0.4));
  fillRect(B, doorX + 1, doorTop + 2, doorX + 1, base - 2, shadeOf(roof, -0.22));
  B.px[(base - Math.round(h * 0.12)) * w + doorX + doorW - 1] = hex(pal.window);
  fillRect(B, doorX - 1, base - 1, doorX + doorW + 1, base, hex(pal.stoneRoof));
  const win = [Math.round(w * 0.58), Math.round(h * 0.58)];
  fillRect(B, win[0] - 1, win[1] - 1, win[0] + 5, win[1] + 5, shadeOf(wall, -0.34));
  fillRect(B, win[0], win[1], win[0] + 4, win[1] + 4, hex(pal.window));
  fillRect(B, win[0] + 2, win[1], win[0] + 2, win[1] + 4, shadeOf(wall, -0.3));
  fillRect(B, win[0], win[1] + 2, win[0] + 4, win[1] + 2, shadeOf(wall, -0.3));
  A.outlinePass(B, ink);
  return {
    w,
    h,
    px: B.px,
    ax: w >> 1,
    ay: base,
    window: [win[0] + 2 - (w >> 1), win[1] + 2 - base],
    chimney: [chimX + (chimW >> 1) - (w >> 1), chimTop - base],
  };
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
    A.fillEllipse(
      B,
      w * (0.18 + 0.64 * t),
      h * (0.6 - 0.12 * Math.sin(t * Math.PI)),
      w * (0.16 + 0.1 * rng.next()),
      h * (0.3 + 0.1 * rng.next()),
      body,
    );
  }
  A.shadeEllipse(B, w / 2, h * 0.78, w * 0.44, h * 0.24, 0.94);
  A.fillEllipse(B, w / 2, h * 0.9, w * 0.4, h * 0.14, shade);
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
  A.barkTrunk(
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
    A.capsuleSteps(topX, topY, size * 0.075, ex, ey, size * 0.03, (x, y, r) =>
      A.fillEllipse(B, x, y, r, r * 0.8, i % 2 ? leaf : leafDark),
    );
    A.capsuleSteps(
      topX,
      topY - 1,
      size * 0.035,
      ex * 0.92 + topX * 0.08,
      ey * 0.92 + topY * 0.08,
      size * 0.018,
      (x, y, r) => A.fillEllipse(B, x, y, r, r, leafLight),
    );
  }
  for (let i = 0; i < 3; i++)
    A.fillEllipse(
      B,
      topX - 2 + i * 2.4,
      topY + 2.4 + (i % 2) * 1.6,
      size * 0.045,
      size * 0.045,
      shadeOf(pal.bark, 0.1),
    );
  A.outlinePass(B, ink);
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
  A.polygonRows(
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
  A.polygonRows(
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
  A.outlinePass(B, ink);
  return { w, h, px: B.px, ax: Math.round(w * 0.46), ay: deckY + 3 };
}

// a turtle surfaced: a domed shell of plates, flippers out at its sides, and its head craned forward
function buildTurtle(rng, size, pal, p) {
  const w = Math.max(24, Math.round(size * 1.5)),
    h = Math.max(14, Math.round(size * 0.86)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    tint = p.colour || '#d9b558',
    gold = hex(tint),
    goldL = shadeOf(tint, 0.24),
    goldD = shadeOf(tint, -0.26),
    goldRim = shadeOf(tint, -0.42),
    skin = A.mixPacked(hex(pal.leaf), gold, 0.25),
    skinD = shadeOf(pal.leaf, -0.3),
    cx = w * 0.44,
    cy = h * 0.58,
    sw = w * 0.36,
    sh = h * 0.38;
  // the flippers first, so they show beyond the shell, then the tail
  const flipper = (fx, fy, fw, fh, c) => A.fillEllipse(B, w * fx, h * fy, w * fw, h * fh, c);
  flipper(0.14, 0.58, 0.11, 0.09, skinD);
  flipper(0.22, 0.8, 0.12, 0.1, skinD);
  flipper(0.52, 0.22, 0.1, 0.08, skin);
  flipper(0.66, 0.8, 0.12, 0.1, skin);
  A.fillEllipse(B, w * 0.06, h * 0.56, w * 0.05, h * 0.06, skinD);
  // the shell: a rim, the dome, the light on it, and its plates
  A.fillEllipse(B, cx, cy, sw + 1.5, sh + 1.5, goldRim);
  A.fillEllipse(B, cx, cy, sw, sh, gold);
  A.fillEllipse(B, cx - sw * 0.1, cy - sh * 0.28, sw * 0.62, sh * 0.5, goldL);
  const plate = (u, v, r) => A.fillEllipse(B, cx + sw * u, cy + sh * v, sw * r, sh * r * 1.1, goldD);
  plate(0, 0.05, 0.26);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.6;
    plate(Math.cos(a) * 0.62, Math.sin(a) * 0.55 + 0.05, 0.17);
  }
  // the head: a neck out of the shell, a broad head, an eye and the line of its mouth
  fillRect(B, w * 0.66, h * 0.4, w * 0.84, h * 0.56, skinD);
  A.fillEllipse(B, w * 0.86, h * 0.48, w * 0.15, h * 0.19, skin);
  A.fillEllipse(B, w * 0.87, h * 0.56, w * 0.11, h * 0.1, skinD);
  B.px[Math.round(h * 0.42) * w + Math.round(w * 0.92)] = ink;
  B.px[Math.round(h * 0.42) * w + Math.round(w * 0.9)] = shadeOf(tint, 0.55);
  A.outlinePass(B, ink);
  return { w, h, px: B.px, ax: Math.round(w * 0.44), ay: h - 2 };
}

// a little islet: a mound of grass and sand with a stone tower on it, its window the islet's lamp
function buildIslet(rng, size, pal) {
  const w = Math.max(26, Math.round(size * 1.4)),
    h = Math.max(20, Math.round(size * 1.25)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    sand = hex(pal.sand),
    sandD = shadeOf(pal.sand, -0.14),
    grass = hex(pal.ground),
    grassD = hex(pal.groundDark),
    stone = hex(pal.stone),
    stoneD = hex(pal.stoneRoof),
    roof = hex(pal.woodRoof),
    midY = Math.round(h * 0.72),
    tw = Math.max(5, Math.round(w * 0.2)),
    tx = Math.round(w * 0.5 - tw / 2),
    topY = Math.round(h * 0.3);
  // the mound: sand to the water, grass over it
  A.fillEllipse(B, w * 0.5, midY, w * 0.48, h * 0.2, sand);
  A.fillEllipse(B, w * 0.5, midY - h * 0.02, w * 0.44, h * 0.16, sandD);
  A.fillEllipse(B, w * 0.5, midY - h * 0.06, w * 0.44, h * 0.2, grass);
  A.fillEllipse(B, w * 0.48, midY - h * 0.15, w * 0.3, h * 0.1, grassD);
  // the tower: a tapered block, a conical roof, a window, a door
  for (let y = topY; y < midY; y++) {
    const k = (y - topY) / Math.max(1, midY - topY),
      half = Math.round(tw * (0.5 + k * 0.12));
    fillRect(B, tx + tw / 2 - half, y, tx + tw / 2 + half, y, y % 3 === 2 ? stoneD : stone);
  }
  A.polygonRows(
    [
      [w * 0.5, topY - Math.round(h * 0.13)],
      [w * 0.5 + tw * 0.9, topY + 1],
      [w * 0.5 - tw * 0.9, topY + 1],
    ],
    h,
    (y, xa, xb) => {
      if (xb >= xa) B.px.fill(roof, y * B.w + Math.max(0, xa), y * B.w + Math.min(B.w - 1, xb) + 1);
    },
  );
  const winY = topY + Math.round((midY - topY) * 0.4),
    winX = Math.round(tx + tw / 2);
  B.px[winY * w + winX] = hex(pal.window);
  B.px[(winY + 1) * w + winX] = hex(pal.window);
  A.outlinePass(B, ink);
  return { w, h, px: B.px, ax: Math.round(w * 0.5), ay: h - 2, window: [winX - Math.round(w * 0.5), winY - (h - 2)] };
  return s2;
}

// a sword standing in the water: a tapered blade, a crossguard, a grip and a pommel
function buildSword(rng, size, pal, p) {
  const w = Math.max(11, Math.round(size * 0.52)),
    h = Math.max(26, Math.round(size * 1.5)),
    B = buffer(w, h),
    ink = hex(pal.ink),
    steel = hex(p.colour || '#dde8f2'),
    steelD = shadeOf(p.colour || '#dde8f2', -0.24),
    steelL = shadeOf(p.colour || '#dde8f2', 0.5),
    gold = hex('#e8b64a'),
    goldD = shadeOf('#e8b64a', -0.3),
    grip = shadeOf(pal.wood, -0.16),
    cx = w >> 1,
    guard = Math.round(h * 0.66);
  for (let y = 1; y < guard; y++) {
    const half = Math.max(0, Math.round((y / guard) * (w * 0.16)));
    fillRect(B, cx - half, y, cx + half, y, steel);
    B.px[y * w + Math.max(0, cx - half)] = steelD;
    B.px[y * w + Math.min(w - 1, cx + half)] = steelL;
  }
  fillRect(B, cx - Math.round(w * 0.42), guard, cx + Math.round(w * 0.42), guard + 2, gold);
  fillRect(B, cx - Math.round(w * 0.42), guard + 2, cx + Math.round(w * 0.42), guard + 2, goldD);
  fillRect(B, cx - 1, guard + 3, cx + 1, h - 6, grip);
  fillRect(B, cx - 2, h - 5, cx + 2, h - 3, gold);
  A.outlinePass(B, ink);
  return { w, h, px: B.px, ax: cx, ay: h - 2 };
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
      A.fillEllipse(B, x, y, rx + 0.6, ry + 0.6, eggRim);
      A.fillEllipse(B, x, y, rx, ry, eggC);
      A.fillEllipse(B, x - rx * 0.25, y + ry * 0.38, rx * 0.6, ry * 0.42, eggShade);
      A.fillEllipse(B, x + rx * 0.18, y - ry * 0.18, rx * 0.5, ry * 0.42, eggC);
      if (rng.next() > 0.4) B.px[Math.round(y - ry * 0.2) * w + Math.round(x + rx * 0.3)] = eggSpot;
      if (rng.next() > 0.6) B.px[Math.round(y + ry * 0.2) * w + Math.round(x - rx * 0.2)] = eggSpot;
    }
    left -= n;
  }
  // the bowl in front, so the eggs sit in it
  A.fillEllipse(B, w / 2, midY + size * 0.24, size * 0.8, size * 0.3, straw);
  A.fillEllipse(B, w / 2, midY + size * 0.2, size * 0.7, size * 0.18, strawDark);
  for (let x = Math.round(w * 0.16); x < w * 0.84; x += 3) B.px[Math.round(midY + size * 0.3) * w + x] = strawDark;
  A.outlinePass(B, ink);
  return { w, h, px: B.px, ax: w >> 1, ay: h - 2 };
}

// ---------------------------------------------------------------------------------------------- the script
/** Problems a script has, each a sentence with the place in it, so an editor (or the model that wrote it) can fix them. */
export function validate(script) {
  const out = [];
  const bad = (path, msg) => out.push(`${path}: ${msg}`);
  if (!script || typeof script !== 'object') return ['script: a story is a JSON object'];
  if (!script.title) bad('title', 'a story needs a title');
  if (script.view !== undefined && script.view !== 'side' && script.view !== 'island')
    bad('view', '"side", to be watched from the side, or "island", to be looked down on');
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
    const view = sc.view || script.view || 'side';
    if (view !== 'side' && view !== 'island')
      bad(`${at}.view`, '"side", to be watched from the side, or "island", to be looked down on');
    if (sc.island) {
      if (typeof sc.island !== 'object') bad(`${at}.island`, 'an object: how the map is made');
      else {
        const ranges = {
          tiles: [24, 220],
          levels: [2, 9],
          lift: [1, 10],
          land: [0.08, 0.92],
          cell: [2, 16],
          cool: [0.3, 1],
          shear: [-1.2, 1.2],
          seed: [0, 99999],
          rough: [0, 1],
        };
        for (const [k, [lo, hi]] of Object.entries(ranges))
          if (
            sc.island[k] !== undefined &&
            !(typeof sc.island[k] === 'number' && sc.island[k] >= lo && sc.island[k] <= hi)
          )
            bad(`${at}.island.${k}`, `a number, ${lo}..${hi}`);
        for (const k of ['long', 'invert'])
          if (sc.island[k] !== undefined && typeof sc.island[k] !== 'boolean')
            bad(`${at}.island.${k}`, 'true or false');
      }
    }
    for (const p of sc.props || []) {
      if (!PROP_KINDS.has(p.kind)) bad(`${at}.props`, `"${p.kind}" is not a prop (${[...PROP_KINDS].join(', ')})`);
      if (p.kind === 'house' && p.style && !HOUSE_STYLES.has(p.style))
        bad(`${at}.props`, `"${p.style}" is not a house style (${[...HOUSE_STYLES].join(', ')})`);
      if (typeof p.x !== 'number') bad(`${at}.props`, 'a prop needs an x (in picture pixels, 0 at the left)');
      if (view === 'island') {
        if (typeof p.y !== 'number')
          bad(`${at}.props`, "looked down on, a prop needs a y too (both are tiles, 0 at the map's top left)");
        if (p.size !== undefined && typeof p.size !== 'number')
          bad(`${at}.props.${p.kind}`, 'size is a number of pixels, the way the sprite is drawn');
      }
    }
    for (const a of sc.actors || []) {
      if (!cast[a.who]) bad(`${at}.actors`, `"${a.who}" is not in the cast`);
      if (!Array.isArray(a.at) || !a.at.length) bad(`${at}.actors.${a.who}`, 'a path: [{ t, x }, ...]');
      else {
        let last = -Infinity;
        for (const kf of a.at) {
          if (typeof kf.x !== 'number') bad(`${at}.actors.${a.who}.at`, 'each keyframe needs an x');
          if (view === 'island' && kf.y !== undefined && typeof kf.y !== 'number')
            bad(`${at}.actors.${a.who}.at`, "looked down on, a keyframe's y is in tiles as well");
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
    for (const k of sc.camera || []) {
      if (typeof k.t !== 'number') bad(`${at}.camera`, 'each key of the camera path needs a t, in seconds');
      for (const f of ['x', 'y', 'zoom'])
        if (k[f] !== undefined && typeof k[f] !== 'number')
          bad(`${at}.camera.${f}`, 'a number (y only means something looked down on)');
    }
  });
  return out;
}

// the camera at a moment: a keyframe path, eased, each key { t, x, y, zoom } (y only means something in the island
// view, where the camera looks down on tiles)
function cameraAt(list, t) {
  if (!list || !list.length) return { x: 0, y: 0, zoom: 1 };
  if (t <= list[0].t) return { x: list[0].x || 0, y: list[0].y || 0, zoom: list[0].zoom || 1 };
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i],
      b = list[i + 1];
    if (t <= b.t) {
      const u = A.smoothstep(0, 1, (t - a.t) / Math.max(1e-6, b.t - a.t));
      return {
        x: A.lerp(a.x || 0, b.x || 0, u),
        y: A.lerp(a.y || 0, b.y || 0, u),
        zoom: A.lerp(a.zoom || 1, b.zoom || 1, u),
      };
    }
  }
  const last = list[list.length - 1];
  return { x: last.x || 0, y: last.y || 0, zoom: last.zoom || 1 };
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
      return { x: A.lerp(a.x, b.x, u), dist: dist + len * u, dir: Math.sign(b.x - a.x) || 1 };
    }
    dist += len;
  }
  const last = at[at.length - 1];
  return { x: last.x, dist, dir: 1 };
}

// where a walker is on the island at a moment, over tiles: x and y, and how far it has walked (for its legs)
function trackAt2(at, t) {
  const ty = (k) => (k.y === undefined ? 0 : k.y);
  let dist = 0;
  if (t <= at[0].t) return { x: at[0].x, y: ty(at[0]), dist: 0, dir: 1 };
  for (let i = 0; i < at.length - 1; i++) {
    const a = at[i],
      b = at[i + 1],
      len = Math.hypot(b.x - a.x, ty(b) - ty(a));
    if (t <= b.t) {
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return {
        x: A.lerp(a.x, b.x, u),
        y: A.lerp(ty(a), ty(b), u),
        dist: dist + len * u,
        dir: Math.sign(b.x - a.x) || 1,
      };
    }
    dist += len;
  }
  const last = at[at.length - 1];
  return { x: last.x, y: ty(last), dist, dir: 1 };
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

  // every technique the film calls is counted on its way through A, as the island counts its own; from here on
  // this book is the one being drawn, and frame() says so again each time it is called
  const used = new Set();
  activeUsed = used;
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
    islandHeight,
    levelCut,
    terraceLevel,
    chamferDistance,
    wallShade,
    mixColour,
    latticeRandom,
    cloudShadows,
    scatterAlong,
    swayingChain,
    formationSlot,
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
    scenes = script.scenes.map((s, i) => ({
      ...s,
      id: s.id || `scene-${i + 1}`,
      duration: +s.duration,
      view: s.view || script.view || 'side',
    }));

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
    // the key is also the seed a prop's shape grows from, so it keeps its old form unless the prop has a colour
    const key = `${sceneId}|${kind}|${p.style || ''}|${p.size || 32}|${p.seed || 0}|${p.x}${p.colour ? `|${p.colour}` : ''}`;
    if (sprites.has(key)) return sprites.get(key);
    const rng = new SeededRandom(`${seedWords}|${key}`),
      size = (p.size || (kind === 'house' ? 54 : kind === 'turtle' || kind === 'islet' ? 40 : 32)) * SC;
    let s;
    if (kind === 'tree') s = buildTree(rng, size, pal);
    else if (kind === 'bush') s = buildBush(rng, size * 0.8, pal);
    else if (kind === 'rock') s = buildRock(rng, size * 0.7, pal);
    else if (kind === 'flower') s = buildFlower(rng, size, pal);
    else if (kind === 'cloud') s = buildCloud(rng, size, pal);
    else if (kind === 'palm') s = buildPalm(rng, size, pal);
    else if (kind === 'boat') s = buildBoat(rng, size, pal);
    else if (kind === 'nest') s = buildNest(rng, size, pal, p);
    else if (kind === 'turtle') s = buildTurtle(rng, size, pal, p);
    else if (kind === 'sword') s = buildSword(rng, size, pal, p);
    else if (kind === 'islet') s = buildIslet(rng, size, pal);
    else s = buildHouse(p.style || 'straw', rng, size, pal);
    sprites.set(key, s);
    return s;
  }

  function fieldFor(sceneId, kind, count) {
    const key = `${sceneId}|${kind}|${count}`;
    if (!fields.has(key)) fields.set(key, particleField(count, W, H, new SeededRandom(`${seedWords}|${key}`)));
    return fields.get(key);
  }

  // ---------------------------------------------------------------- the set-dressing
  // A script stages only what its story needs -- a house, two trees, the cast -- and leaves the rest of the
  // meadow bare, where the island film's world is grown whole. So the engine dresses every scene itself, from
  // the same seed: a hazy row of trees along the horizon, bushes and rocks in the near grass, reeds at a shore,
  // clouds where the script hung none. None of it is in the script's way: it keeps clear of the script's own
  // props, stands behind the cast, and the same script and seed grow the same dressing at every telling.
  const scenery = new Map();
  function sceneScenery(scene) {
    if (scenery.has(scene.id)) return scenery.get(scene.id);
    let lo = -280,
      hi = 280;
    const see = (x) => {
      if (typeof x === 'number') {
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
    };
    for (const k of scene.camera || []) {
      see((k.x || 0) - 300);
      see((k.x || 0) + 300);
    }
    for (const p of scene.props || []) see(p.x);
    for (const a of scene.actors || []) for (const k of a.at || []) see(k.x);
    const seed = seedOf(`${seedWords}|scenery|${scene.id}`),
      clearOf = (x, gap) => !(scene.props || []).some((p) => p.kind !== 'cloud' && Math.abs((p.x || 0) - x) < gap),
      back = [],
      front = [];
    for (const q of scatterAlong(lo, hi, 47, seed, { chance: 0.62, variants: 4, size: [0.75, 1.25], salt: 1 }))
      if (clearOf(q.x, 30)) back.push({ x: q.x, v: q.variant });
    for (const q of scatterAlong(lo, hi, 55, seed, { chance: 0.45, variants: 4, size: [0.75, 1.2], salt: 2 }))
      if (clearOf(q.x, 24)) front.push({ x: q.x, v: q.variant, row: indexRandom(q.i, seed + 77) });
    const out = { lo, hi, seed, back, front };
    scenery.set(scene.id, out);
    return out;
  }

  // one of a few grown sprites, reused along a scene the way the island reuses its trees; the far row is hazed
  // toward the sky, as the hills are
  function decorSprite(kind, variant, hazed) {
    const key = `decor|${kind}|${variant}|${hazed ? 1 : 0}`;
    if (sprites.has(key)) return sprites.get(key);
    const rng = new SeededRandom(`${seedWords}|${key}`),
      haze = (c) => mixColour(rgbOf(c), rgbOf('#d7e7f0'), 0.26),
      p2 = hazed ? { ...pal, leaf: haze(pal.leaf), bark: haze(pal.bark), ink: haze(pal.ink) } : pal,
      sizes = {
        tree: [26, 34, 30, 38],
        bush: [14, 19, 16, 21],
        rock: [8, 11, 9, 13],
        cloud: [20, 27, 23, 31],
        palm: [28, 34, 30, 36],
      };
    let spr;
    const size = sizes[kind][variant & 3] * SC;
    if (kind === 'tree') spr = buildTree(rng, size, p2);
    else if (kind === 'bush') spr = buildBush(rng, size, p2);
    else if (kind === 'cloud') spr = buildCloud(rng, size, p2);
    else if (kind === 'palm') spr = buildPalm(rng, size, p2);
    else spr = buildRock(rng, size, p2);
    sprites.set(key, spr);
    return spr;
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
  let cloudScratch = null,
    cloudScratchI = null; // the cloud shadows' grids, kept between frames as the island keeps its own
  const FRAME = new Uint32Array(W * H);

  // a moment of the picture, told by whichever view its scene asks for
  function render(t) {
    const { scene, local } = sceneAt(t);
    return scene.view === 'island' ? renderIsland(scene, local, t) : renderSide(scene, local, t);
  }

  // ---------------------------------------------------------------- the sky, and what hangs in it
  // one sky for both views: a gradient down to the horizon, stars, and the sun or the moon
  function paintSky(day, t, groundY, showBody = true) {
    const frame = FRAME,
      top = pack(day.top),
      horiz = pack(day.horizon);
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
    if (showBody && body.p && body.p.y > -0.15) {
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
    return { top, horiz };
  }

  // a storm's lightning: strikes at times of its own, each a flash fading over a third of a second
  function stormStrikes(local) {
    for (let k = 0; k < 40; k++) {
      const strike = 1.2 + k * 5.3 + indexRandom(k, SEED) * 1.6;
      if (local >= strike && local < strike + 0.34) lightningFlash(FRAME, 0.34 - (local - strike));
    }
  }

  // ---------------------------------------------------------------- weather and small things
  // rain, snow, petals, fireflies, sparks: drawn over the picture, the same in either view
  function paintWeather(scene, local, t, camX, lights) {
    const frame = FRAME;
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
          x: camX * 0.6 + local * 7,
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
          q = hover(q0, ageT, { x: [0.7, 10], y: [0.5, 6], camera: camX * 0.2, byDepth: true });
        else if (e.kind === 'bubbles') q = rise(q0, ageT, { speed: 26, spread: 18, sway: [2.2, 5] });
        else if (e.kind === 'sparks') q = rise(q0, ageT, { speed: 34, spread: 30, sway: [3.2, 9] });
        else q = hover(q0, ageT, { x: [0.3, 4], y: [0.25, 3], camera: camX * 0.1 });
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
  }

  function renderSide(scene, local, t) {
    const frame = FRAME;
    frame.fill(0);
    const day = dayCycle(pal.sky, scene.time === undefined ? 0.42 : scene.time);
    const tod = (day.t - 0.25 + 1) % 1; // hourLight's clock: 0.25 noon, 0.75 midnight
    const groundShare = scene.ground === undefined ? 0.74 : scene.ground,
      groundY = Math.round(H * groundShare);
    const cam = cameraAt(scene.camera, local);
    const weatherKind = scene.weather && scene.weather.kind,
      wet = weatherKind === 'rain' || weatherKind === 'storm' ? 0.7 : 0;
    const hour = hourLight(tod, 1, wet);
    const night = hour.night;
    const scen = sceneScenery(scene);
    const { top, horiz } = paintSky(day, t, groundY);

    // clouds, far behind the hills
    for (const p of scene.props || []) {
      if (p.kind !== 'cloud') continue;
      const s = propSprite('cloud', p, scene.id),
        drift = (local * (p.speed === undefined ? 4 : p.speed) + parallax(cam.x, 0.12)) * cam.zoom,
        x = wrap((p.x || 0) * cam.zoom - drift + W * 0.5, W + s.w) - s.w * 0.5,
        y = (p.y === undefined ? 0.18 : p.y) * H;
      blitSprite({ w: W, h: H, px: frame }, s, x, y);
    }

    // a sky is rarely empty: where the script hung no clouds the engine hangs a few of its own, and by day a
    // vee of birds crosses now and then -- each a pure function of the moment, like everything else here
    if (!(scene.props || []).some((p) => p.kind === 'cloud') && day.light > 0.45)
      for (let i = 0; i < 3; i++) {
        const s = decorSprite('cloud', i, false),
          driftC = (local * (2.2 + i * 1.1) + parallax(cam.x, 0.1)) * cam.zoom,
          x = wrap(i * W * 0.36 + indexRandom(i + 5, scen.seed) * 90 - driftC + W * 0.5, W + s.w) - s.w * 0.5,
          y = (0.07 + i * 0.06 + indexRandom(i + 9, scen.seed) * 0.05) * H;
        blitSprite({ w: W, h: H, px: frame }, s, x, y);
      }
    if (day.light > 0.35 && weatherKind !== 'storm' && weatherKind !== 'rain') {
      const period = 27,
        ph = (local + (scen.seed % 9)) % period;
      if (ph < 11) {
        const dirn = scen.seed % 2 ? 1 : -1,
          lx = dirn > 0 ? -50 + (ph / 11) * (W + 100) : W + 50 - (ph / 11) * (W + 100),
          ly = H * (0.13 + (scen.seed % 5) * 0.03) + Math.sin(ph * 0.9) * 4 * SC,
          birdC = mixPacked(hex(pal.ink), horiz, 0.45),
          wing = Math.max(2, Math.round(3 * SC)),
          plot = (x, y) => {
            if (x >= 0 && y >= 0 && x < W && y < H) frame[y * W + x] = birdC;
          };
        for (let i = 0; i < 5; i++) {
          const slot = formationSlot('vee', lx, ly, dirn > 0 ? 0 : Math.PI, i),
            bx = Math.round(lx + (slot.x - lx) * SC),
            by = Math.round(ly + (slot.y - ly) * SC + Math.sin(local * 2 + i) * 1.5 * SC),
            flap = Math.round(Math.sin(local * 9 + i * 1.7) * 1.6 * SC);
          lineCells(bx - wing, by - flap, bx, by, plot);
          lineCells(bx, by, bx + wing, by - flap, plot);
        }
      }
    }

    // ---------------------------------------------------------------- the land, far to near
    const hills = scene.hills || [
      { seed: 3, depth: 0.3, amp: 0.38, freq: 1.5, sharp: 0.4 },
      { seed: 7, depth: 0.58, amp: 0.2, freq: 2.4 },
      { seed: 11, depth: 0.84, amp: 0.08, freq: 4.2 },
    ];
    const ridge = new Int32Array(W);
    let landTop = H; // the highest land in the frame, noted for the cloud shadows to come
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
      // a slope catches the light or turns from it, and the fill darkens toward the hill's foot, so a hill is a
      // relief and not a cut-out -- the island's terraces shaded the same way, face by face
      const smooth = new Int32Array(W);
      for (let sx = 0; sx < W; sx++) {
        let sum = 0;
        for (let d = -8; d <= 8; d++) sum += ridge[Math.min(W - 1, Math.max(0, sx + d))];
        smooth[sx] = sum / 17;
      }
      const faceK = 0.35 + 0.65 * depth, // far slopes are hazier, so their faces differ less
        lit = mixPacked(tinted, hex(pal.sun), 0.09 * faceK),
        shaded = mixPacked(tinted, hex(pal.ink), 0.1 * faceK),
        footC = mixPacked(tinted, hex(pal.groundDark), 0.28),
        speck = mixPacked(tinted, hex(pal.ink), 0.22),
        speckL = mixPacked(tinted, hex(pal.sun), 0.16),
        litMid = mixPacked(lit, footC, 0.5),
        shadedMid = mixPacked(shaded, footC, 0.5),
        tintedMid = mixPacked(tinted, footC, 0.5);
      for (let sx = 0; sx < W; sx++) {
        const y = ridge[sx];
        if (y >= H) continue;
        if (li === hills.length - 1 && y < landTop) landTop = Math.max(0, y);
        const slope = smooth[Math.min(W - 1, sx + 8)] - smooth[Math.max(0, sx - 8)],
          face = slope < -3 ? lit : slope > 3 ? shaded : tinted,
          soft = Math.abs(slope) > 2 && Math.abs(slope) <= 4, // at a face's edge, let the two tones dither into each other
          mid = y + Math.round((H - y) * 0.42),
          low = y + Math.round((H - y) * 0.72),
          midTone = face === lit ? litMid : face === shaded ? shadedMid : tintedMid;
        for (let yy = Math.max(0, y + 1); yy < H; yy++)
          frame[yy * W + sx] = yy < mid ? (soft && (sx + yy) & 1 ? tinted : face) : yy < low ? midTone : footC;
        if (y >= 0) frame[y * W + sx] = slope < 0 ? mixPacked(rim, hex(pal.sun), 0.25) : rim;
      }
      // a speckle of far trees and scrub over the face, the nearer the hill the plainer each mark
      const nDots = Math.round(W * (0.5 + depth));
      for (let i = 0; i < nDots; i++) {
        const sx = Math.floor(indexRandom(i + li * 733, SEED + seed) * W),
          y = ridge[sx] + 2 + Math.floor(indexRandom(i + li * 389, SEED + seed) * Math.max(1, H - ridge[sx] - 3));
        if (y < 0 || y >= H) continue;
        frame[y * W + sx] = i % 3 ? speck : speckL;
        if (depth > 0.55 && sx + 1 < W) frame[y * W + sx + 1] = speck;
      }
      // a broken treeline standing on the two nearer ridges
      if (depth >= 0.5)
        for (const q of scatterAlong(shift - W / (2 * cam.zoom), shift + W / (2 * cam.zoom), 13, SEED + seed, {
          chance: 0.42,
          salt: li + 3,
          size: [0.8, 1.3],
        })) {
          const sx = Math.round((q.x - shift) * cam.zoom + W / 2);
          if (sx < 1 || sx >= W - 1) continue;
          const y = ridge[sx],
            th = 2 + Math.round(q.size * 2 * SC);
          if (y < th || y >= H) continue;
          for (let yy = y - th; yy < y; yy++) frame[yy * W + sx] = speck;
          frame[(y - 2) * W + sx - 1] = speck;
          frame[(y - 2) * W + sx + 1] = speck;
        }
    });

    // ---------------------------------------------------------------- the ground, or the water
    const seaPalette = seaColours();
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
      // the shore: dry sand above, a wet band at the water, and foam that comes and goes along it
      const sandL = mixPacked(hex(pal.sand), horiz, 0.15),
        sandW = mixPacked(hex(pal.sand), hex(pal.sea), 0.3),
        foam = hex('#f2fbfd');
      fillRect(buf, 0, groundY - 3, W - 1, groundY - 1, sandL);
      fillRect(buf, 0, groundY, W - 1, Math.min(H - 1, groundY + 1), sandW);
      if (groundY + 1 < H)
        for (let x = 0; x < W; x++) {
          const wx = x + Math.round(cam.x),
            ph = Math.sin(wx * 0.07 + local * 1.9) + Math.sin(wx * 0.023 - local * 1.1);
          if (ph > 0.9) frame[(groundY + 1) * W + x] = foam;
          else if (ph > 0.55 && (x + groundY) & 1)
            frame[(groundY + 1) * W + x] = mixPacked(frame[(groundY + 1) * W + x], foam, 0.6);
          if (ph > 1.45 && groundY + 2 < H)
            frame[(groundY + 2) * W + x] = mixPacked(frame[(groundY + 2) * W + x], foam, 0.5);
        }
    } else {
      const grass = mixPacked(hex(pal.ground), horiz, 0.06 + day.night * 0.25),
        dark = mixPacked(hex(pal.groundDark), horiz, 0.1 + day.night * 0.25);
      // the meadow in patches, read cell by cell of the world the way the island reads its land tile by tile:
      // four tones, cooler and darker as they come toward the viewer, instead of one flat green
      const meadow = [
          mixPacked(grass, dark, 0.5),
          mixPacked(grass, dark, 0.24),
          grass,
          mixPacked(grass, hex(pal.sun), 0.07),
        ],
        cellW = Math.max(3, Math.round(5 * SC)),
        cellH = Math.max(3, Math.round(4 * SC)),
        wFrom = cam.x - W / 2 / cam.zoom - cellW,
        wTo = cam.x + W / 2 / cam.zoom + cellW,
        meadowBuf = { w: W, h: H, px: frame },
        rowsDown = Math.ceil((H - groundY) / cellH);
      for (let r = 0; r < rowsDown; r++) {
        const yA = groundY + r * cellH,
          yB = Math.min(H - 1, yA + cellH - 1),
          nearK = (r / Math.max(1, rowsDown)) * 0.34;
        const off = (r % 2) * cellW * 0.5; // alternate rows offset half a cell, so no straight seams run down
        for (let c = Math.floor(wFrom / cellW) - 1; c * cellW < wTo; c++) {
          const n =
              latticeRandom(Math.floor(c / 4), Math.floor(r / 3), scen.seed) * 0.65 +
              latticeRandom(c, r * 3 + 11, scen.seed) * 0.35,
            tone = meadow[n < 0.26 ? 0 : n < 0.58 ? 1 : n < 0.86 ? 2 : 3],
            xa = Math.round((c * cellW - off - cam.x) * cam.zoom + W / 2),
            xb = Math.round(((c + 1) * cellW - off - cam.x) * cam.zoom + W / 2);
          fillRect(meadowBuf, xa, yA, xb, yB, nearK > 0.01 ? mixPacked(tone, dark, nearK) : tone);
        }
      }
      // a worn path along the ground line, where the feet of the story go, its edges soft in dither
      const soil = mixPacked(hex(pal.sand), hex(pal.bark), 0.32),
        soilD = mixPacked(soil, dark, 0.35),
        pathH = Math.max(3, Math.round(6.5 * SC * cam.zoom)),
        walkers = (scene.actors || []).length || (scene.props || []).some((p) => p.kind === 'house');
      if (walkers)
        for (let sx = 0; sx < W; sx++) {
          const wx = (sx - W / 2) / cam.zoom + cam.x,
            wob = Math.round((Math.sin(wx * 0.021 + 1.7) * 1.6 + Math.sin(wx * 0.11) * 0.7) * SC),
            yA = groundY + 1 + wob,
            yB = Math.min(H - 1, yA + pathH);
          for (let y = yA; y <= yB; y++) {
            const edge = y === yA || y === yB;
            if (edge && (sx + y) & 1) continue;
            frame[y * W + sx] = mixPacked(frame[y * W + sx], (y - yA) % 3 === 2 ? soilD : soil, edge ? 0.5 : 0.8);
          }
        }
      // tufts, flowers and pebbles through the near grass, larger as they come forward
      const tuftD = mixPacked(dark, hex(pal.ink), 0.14),
        tuftL = mixPacked(grass, hex(pal.sun), 0.28),
        bloomC = hex(pal.bloom || '#f6d1de'),
        pebble = mixPacked(hex(pal.stoneRoof), dark, 0.3);
      for (let rowI = 0; rowI < 4; rowI++) {
        const yBase = groundY + Math.round((0.18 + rowI * 0.2) * (H - groundY));
        for (const q of scatterAlong(wFrom, wTo, 12 - rowI, scen.seed, {
          chance: 0.82,
          variants: 5,
          size: [0.8, 1.3],
          salt: 10 + rowI,
        })) {
          const sx = Math.round((q.x - cam.x) * cam.zoom + W / 2),
            sy = yBase + Math.round((indexRandom(q.i + rowI * 57, scen.seed) - 0.5) * 5 * SC);
          if (sx < 1 || sx >= W - 1 || sy < groundY + 2 || sy >= H) continue;
          if (q.variant === 0) {
            frame[sy * W + sx] = bloomC;
            frame[sy * W + sx + 1] = mixPacked(bloomC, grass, 0.4);
            if (sy + 1 < H) frame[(sy + 1) * W + sx] = tuftD;
          } else if (q.variant === 1) {
            frame[sy * W + sx] = pebble;
            frame[sy * W + sx + 1] = mixPacked(pebble, grass, 0.35);
          } else {
            const blades = Math.max(1, Math.round(SC * q.size * (0.9 + rowI * 0.35)));
            for (let b = -1; b <= 1; b++)
              for (let yy = 0; yy <= blades - Math.abs(b); yy++) {
                const y2 = sy - yy;
                if (y2 >= 0) frame[y2 * W + sx + b] = b === 0 ? tuftL : tuftD;
              }
          }
        }
      }
      const shore = mixPacked(hex(pal.ground), hex(pal.groundDark), 0.35);
      fillRect({ w: W, h: H, px: frame }, 0, groundY - 1, W - 1, groundY, shore);
    }

    // ---------------------------------------------------------------- the dressing the engine grows
    {
      const view0 = { w: W, h: H, px: frame },
        shiftBack = parallax(cam.x, 0.86),
        wFrom = cam.x - W / 2 / cam.zoom - 40,
        wTo = cam.x + W / 2 / cam.zoom + 40,
        shadeK = lerp(0.96, 0.84, clamp(day.light, 0, 1));
      // the horizon's own row, hazed, a little behind the story's ground line
      for (const it of scen.back) {
        const s = decorSprite(it.v < 2 ? 'tree' : 'bush', it.v, true),
          x = (it.x - shiftBack) * cam.zoom + W / 2,
          y = groundY + 2 * SC * cam.zoom;
        if (x < -s.w || x > W + s.w) continue;
        if (day.light > 0.1) shadeEllipse(view0, x + 2 * SC, y, Math.max(2, s.w * 0.3), Math.max(1, s.w * 0.1), shadeK);
        blitSway(view0, s, x, y, (h) => Math.round(Math.sin(t * 1.1 + it.x * 0.13) * (h / Math.max(1, s.h)) * 1.2));
      }
      // bushes and rocks in the near grass -- in the shallows, rocks -- each with the ground's shade under it
      for (const it of scen.front) {
        const inWater = !!scene.water,
          s = decorSprite(inWater || it.v % 2 ? 'rock' : 'bush', it.v, false),
          x = (it.x - cam.x) * cam.zoom + W / 2,
          y = groundY + Math.round((inWater ? 0.1 + it.row * 0.3 : 0.32 + it.row * 0.55) * (H - groundY));
        if (x < -s.w || x > W + s.w) continue;
        if (day.light > 0.1)
          shadeEllipse(view0, x + 2 * SC, y, Math.max(2, s.w * 0.32), Math.max(1, s.w * 0.11), shadeK);
        blitSprite(view0, s, x, y);
      }
      // reeds where the land meets the water, swaying as the island's do
      if (scene.water) {
        const reed = mixPacked(hex(pal.groundDark), hex(pal.ink), 0.15),
          reedHead = hex(pal.bark),
          plotR = (c) => (x, y) => {
            if (x >= 0 && y >= 0 && x < W && y < H) frame[y * W + x] = c;
          };
        for (const q of scatterAlong(wFrom, wTo, 26, scen.seed, { chance: 0.4, salt: 21, size: [0.8, 1.25] })) {
          const sx = Math.round((q.x - cam.x) * cam.zoom + W / 2);
          if (sx < 0 || sx >= W) continue;
          const pts = swayingChain(
            sx,
            groundY + 3,
            { segments: 3, length: 11 * SC * q.size, sway: 0.3, speed: 2.2 },
            1,
            t,
            q.i,
          );
          for (let i = 1; i < pts.length; i++)
            lineCells(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], plotR(reed));
          const topPt = pts[pts.length - 1];
          plotR(reedHead)(Math.round(topPt[0]), Math.round(topPt[1]));
        }
      }
    }

    // ---------------------------------------------------------------- what stands on it, far to near
    const drawn = [],
      lights = [],
      view = { w: W, h: H, px: frame };
    // the ground's shade under a thing that stands on it: the light is from the upper left, so it falls a
    // little to the right; it deepens with the day and is gone by night
    const shadowFor = (wPx, x, y, k = 0.8) => {
      if (day.light < 0.08) return;
      const rx = Math.max(1.5, wPx * 0.34);
      shadeEllipse(view, x + 2 * SC * cam.zoom, y, rx, Math.max(1, rx * 0.3), lerp(0.94, k, clamp(day.light, 0, 1)));
    };
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
        draw: () => {
          shadowFor(s.w, x, y);
          if (p.kind === 'tree' || p.kind === 'bush') blitSway(view, s, x, y, wind);
          else blitSprite(view, s, x, y, p.flip);
        },
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
          draw: () => {
            if (air) {
              // a flyer's shadow stays on the ground under it, the smaller and fainter the higher it flies
              const gy = groundShare * H + (a.lane || 0) * cam.zoom,
                high = clamp(1 - Math.max(0, gy - y) / (H * 1.1), 0.3, 1);
              shadowFor(sprite.w * high, x, gy, lerp(0.96, 0.86, high));
            } else shadowFor(sprite.w, x, y);
            blitSprite(view, sprite, x, y, track.dir < 0);
          },
        });
        if (a.glow)
          lights.push({ x, y: y - sprite.h * 0.55, r: a.glow * cam.zoom, k: 0.42 + 0.12 * Math.sin(local * 1.6 + i) });
      }
    }
    drawn.sort((p, q) => p.y - q.y);
    for (const d of drawn) d.draw();

    // smoke from the houses' chimneys, in see-through puffs the way the island draws its own
    for (const p of scene.props || []) {
      if (p.kind !== 'house') continue;
      const s = propSprite('house', p, scene.id);
      if (!s.chimney) continue;
      const cx0 = (p.x - cam.x) * cam.zoom + W / 2 + s.chimney[0] * cam.zoom,
        cy0 = groundShare * H + (p.lift || 0) * cam.zoom + s.chimney[1] * cam.zoom;
      if (cx0 < -40 || cx0 > W + 80) continue;
      for (let i = 0; i < 6; i++) {
        const age = (local * 0.22 + i / 6 + indexRandom(i, SEED + Math.round(p.x)) * 0.05) % 1,
          px2 = cx0 + age * age * 22 * SC * cam.zoom + Math.sin(local * 1.3 + i * 2.1) * 1.5 * SC,
          py2 = cy0 - 2 - age * 30 * SC * cam.zoom,
          r = (1.2 + age * 3.6) * SC * cam.zoom;
        ditherEllipse(
          view,
          px2,
          py2,
          r,
          r * 0.8,
          mixPacked(hex(pal.cloud), horiz, 0.25 + age * 0.5),
          clamp(0.55 * (1 - age) + 0.08),
        );
      }
    }

    // the shadows of clouds crossing the land, as they cross the island; the sky keeps its own colour
    if (day.light > 0.18 && landTop < H) {
      const band = frame.slice(landTop * W);
      cloudScratch = cloudShadows(frame.subarray(landTop * W), W, H - landTop, {
        x: cam.x + local * 9,
        y: local * 3,
        seed: SEED,
        cover: weatherKind === 'storm' || weatherKind === 'rain' ? 0.5 : 0.22,
        strong: day.light > 0.65,
        scratch: cloudScratch,
      });
      for (let y = landTop; y < groundY; y++) {
        const sky = skyRows[y] >>> 0, // skyRows keeps the same bits signed; the frame reads them unsigned
          row = y * W,
          brow = (y - landTop) * W;
        for (let x = 0; x < W; x++) if (band[brow + x] === sky) frame[row + x] = sky;
      }
    }

    // ---------------------------------------------------------------- weather and small things
    paintWeather(scene, local, t, cam.x, lights);

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
    gradeFrame(frame, W, H, hourTables(hour.night, hour.dusk, hour.morning, 1, wet), { night: hour.night, lights });

    if (weatherKind === 'storm') stormStrikes(local);
    return frame;
  }

  // ---------------------------------------------------------------- the island view
  // `view: "island"` tells a scene from above: a map of tiles, the land terraced as it rises out of the water,
  // people and things placed on it by tile, drawn far to near. The sky, the weather, the hour and every sprite are
  // the side view's; only the ground is drawn differently -- so the same cast can be seen either way.
  const ISLAND = {
    tiles: 104, // the map's width, and its depth, in tiles
    levels: 5, // terraces, from the water to the top of the land
    lift: 4, // pixels a terrace stands above the one below (at 480 wide)
    land: 0.34, // how much of the map is land
    seed: 9, // the map's own shape: the same in every telling, so a script's tiles keep their ground
    rough: 0.55,
    long: false, // stretched along x, like a spit of land, or round like a headland
    invert: false, // land round the edge and water in the middle: a lake, not an island
    shear: 0.45, // how far a row back leans aside
    cool: 0.72, // how much shorter a row back is than a row across
    cell: 6, // pixels across a tile (at 480 wide)
  };

  const grids = new Map();
  // the map itself: heights, terraces, and how far every tile is from the water. Made once for a scene.
  function islandGrid(scene) {
    const o = { ...ISLAND, ...(scene.island || {}) };
    const key = `${scene.id}|${JSON.stringify(o)}`;
    if (grids.has(key)) return grids.get(key);
    const N = Math.round(clamp(o.tiles, 24, 220)),
      GH = N;
    const E = new Float32Array(N * GH);
    for (let ty = 0; ty < GH; ty++)
      for (let tx = 0; tx < N; tx++) E[ty * N + tx] = islandHeight(tx, ty, N, o.seed, { long: o.long, rough: o.rough });
    // a 3x3 smoothing, a few times over: terraces want broad shoulders, not the noise's own speckle
    for (let pass = 0; pass < 3; pass++) {
      const S = Float32Array.from(E);
      for (let ty = 1; ty < GH - 1; ty++)
        for (let tx = 1; tx < N - 1; tx++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += S[(ty + dy) * N + tx + dx];
          E[ty * N + tx] = sum / 9;
        }
    }
    // the water's height is set by how much of the map it covers, not by a height that means nothing alone
    const sorted = Float32Array.from(E).sort(),
      CUT = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * (1 - o.land)))];
    // how far above the water a tile stands: the height over the cut, or under it for a lake
    const lift = (e) => (o.invert ? CUT - e : e - CUT);
    const above = [];
    for (let i = 0; i < E.length; i++) if (o.invert ? E[i] < CUT : E[i] >= CUT) above.push(lift(E[i]));
    above.sort((a, b) => a - b);
    const STEP = Math.max(1e-5, (above[Math.floor(above.length * 0.97)] || 1) / (o.levels - 1));
    const LEV = new Int8Array(N * GH),
      LIFT = new Float32Array(N * GH),
      land = new Uint8Array(N * GH),
      water = new Uint8Array(N * GH);
    for (let i = 0; i < E.length; i++) {
      const on = o.invert ? E[i] < CUT : E[i] >= CUT;
      land[i] = on ? 1 : 0;
      water[i] = on ? 0 : 1;
      LEV[i] = on ? terraceLevel(lift(E[i]), STEP, o.levels) : -1;
      LIFT[i] = Math.max(0, LEV[i]); // how many steps up it stands; the pixels come from `rise`
    }
    // where the land is, so the camera can open on it when the script does not say where to look
    let x0 = N,
      x1 = 0,
      y0 = GH,
      y1 = 0;
    for (let ty = 0; ty < GH; ty++)
      for (let tx = 0; tx < N; tx++)
        if (LEV[ty * N + tx] >= 0) {
          x0 = Math.min(x0, tx);
          x1 = Math.max(x1, tx);
          y0 = Math.min(y0, ty);
          y1 = Math.max(y1, ty);
        }
    const grid = {
      N,
      GH,
      LEV,
      LIFT,
      cx: x1 > x0 ? (x0 + x1) / 2 : N / 2,
      cy: y1 > y0 ? (y0 + y1) / 2 : GH / 2,
      D: chamferDistance(land, N, GH), // how far a tile of land is from the water, in thirds of a tile
      DW: chamferDistance(water, N, GH), // and a tile of water from the land
      o,
    };
    grids.set(key, grid);
    return grid;
  }

  const dressed = new Map();
  // where the engine plants, on a scene's map: shore tiles get palms, the open land its trees, and nothing
  // stands where the script put a thing or sends its cast
  function islandDressing(scene, g) {
    if (dressed.has(scene.id)) return dressed.get(scene.id);
    const { N, GH, LEV, D } = g,
      seed = seedOf(`${seedWords}|island-dressing|${scene.id}`),
      busy = [];
    for (const p of scene.props || [])
      if (p.kind !== 'cloud') busy.push([p.x || 0, p.y === undefined ? GH * 0.6 : p.y, 2.2]);
    for (const a of scene.actors || []) for (const k of a.at || []) busy.push([k.x || 0, k.y || 0, 2]);
    const out = [];
    for (let ty = 1; ty < GH - 1; ty++)
      for (let tx = 1; tx < N - 1; tx++) {
        const i = ty * N + tx,
          lev = LEV[i];
        if (lev < 0) continue;
        const n = latticeRandom(tx, ty, seed),
          shore = D[i] / 3;
        let kind = null;
        if (lev === 0 && shore < 1.6 && n > 0.965) kind = 'palm';
        else if (lev >= 1 && n > 0.975) kind = 'tree';
        else if (lev >= 1 && n > 0.962) kind = 'bush';
        else if (lev >= 1 && n < 0.006) kind = 'rock';
        if (!kind) continue;
        if (busy.some(([bx, by, r]) => Math.abs(bx - tx) <= r && Math.abs(by - ty) <= r)) continue;
        out.push({ tx, ty, kind, v: Math.floor(latticeRandom(tx + 31, ty + 7, seed) * 4) });
      }
    // a cap, thinned evenly over the whole map rather than filled from its top corner
    const thinned = out.length > 160 ? out.filter((_, i) => i % Math.ceil(out.length / 160) === 0) : out;
    dressed.set(scene.id, thinned);
    return thinned;
  }

  const SEA = new Map();
  // the sea's colours, from the palette: seven shades of it, foam, glints, weed and the sand under the shallows
  function seaColours() {
    if (SEA.has('p')) return SEA.get('p');
    const sea = rgbOf(pal.sea),
      P = {
        LV: [0, 1, 2, 3, 4, 5, 6].map((i) => pack(shade(sea, 0.16 - i * 0.07))),
        FOAM: hex('#f2fbfd'),
        FOAM2: mixPacked(hex('#f2fbfd'), hex(pal.sea), 0.35),
        GLINT: hex('#ffffff'),
        GLINT2: mixPacked(hex('#ffffff'), hex(pal.sea), 0.45),
        WEED: pack(shade(rgbOf('#2f6a45'), 0)),
        WEED2: pack(shade(rgbOf('#2f6a45'), 0.14)),
        SAND: [0, 1, 2].map((i) => pack(shade(rgbOf(pal.sand), 0.04 - i * 0.06))),
      };
    SEA.set('p', P);
    return P;
  }

  function renderIsland(scene, local, t) {
    const frame = FRAME;
    frame.fill(0);
    const day = dayCycle(pal.sky, scene.time === undefined ? 0.42 : scene.time);
    const tod = (day.t - 0.25 + 1) % 1; // hourLight's clock: 0.25 noon, 0.75 midnight
    const weatherKind = scene.weather && scene.weather.kind,
      wet = weatherKind === 'rain' || weatherKind === 'storm' ? 0.7 : 0;
    const hour = hourLight(tod, 1, wet),
      night = hour.night,
      horiz = pack(day.horizon);

    const g = islandGrid(scene),
      { N, GH, LEV, LIFT, D, DW } = g,
      o = g.o;
    const cam = cameraAt(scene.camera, local),
      camX = cam.x === undefined || cam.x === 0 ? g.cx : cam.x,
      camY = cam.y === undefined || cam.y === 0 ? g.cy : cam.y,
      zoom = cam.zoom || 1,
      cell = Math.max(1.5, o.cell * SC * zoom),
      cellY = cell * o.cool,
      rise = o.lift * SC * zoom, // a terrace's height, in pixels
      shear = o.shear * cellY;
    const rowY = (ty) => (ty - camY) * cellY + H * 0.52,
      rowX = (ty) => -camX * cell + shear * (ty - camY) + W / 2;
    const tileAt = (tx, ty) => Math.round(clamp(ty, 0, GH - 1)) * N + Math.round(clamp(tx, 0, N - 1));
    const liftAt = (tx, ty) => LIFT[tileAt(tx, ty)] * rise;

    // the ground's shade under a thing, as in the side view and on the island
    const shadowOn = (sx, sy, wPx, k = 0.8) => {
      if (day.light < 0.08) return;
      const rx = Math.max(1.5, wPx * 0.34);
      shadeEllipse(view, sx + 2 * SC, sy, rx, Math.max(1, rx * 0.3), lerp(0.94, k, clamp(day.light, 0, 1)));
    };
    const C = {
      grass: hex(pal.ground),
      grassD: hex(pal.groundDark),
      sand: hex(pal.sand),
      sandD: shadeOf(pal.sand, -0.09),
      soil: mixPacked(shadeOf(pal.bark, 0.04), hex(pal.sand), 0.28),
      soilD: mixPacked(shadeOf(pal.bark, -0.2), hex(pal.sand), 0.18),
      rock: hex(pal.stoneRoof),
      foam: hex('#f2fbfd'),
      sun: hex(pal.sun),
    };
    // the island's own sea: the same water, its weed softened so it does not read as reefs from above
    const plain = seaColours(),
      seaP = {
        ...plain,
        WEED: mixPacked(plain.WEED, plain.LV[3], 0.72),
        WEED2: mixPacked(plain.WEED2, plain.LV[3], 0.66),
      },
      view = { w: W, h: H, px: frame },
      lights = [];
    const T = waterTime(local, Math.floor(local * 15)),
      waterOx = Math.round(camX * cell),
      waterOy = Math.round(camY * cellY);

    // ---------------------------------------------------------------- what stands on the map, by row
    const rows = new Map(),
      flying = [];
    const put = (ty, item) => {
      const k = clamp(Math.round(ty), 0, GH - 1);
      let list = rows.get(k);
      if (!list) rows.set(k, (list = []));
      list.push(item);
    };

    // the planting the engine does itself: trees, palms by the shore, bushes and rocks over the bare land,
    // keeping clear of what the script placed and where its cast walks
    for (const d of islandDressing(scene, g))
      put(d.ty, {
        x: d.tx,
        draw: () => {
          const s = decorSprite(d.kind, d.v, false),
            sx = rowX(d.ty) + d.tx * cell,
            sy = rowY(d.ty) - liftAt(d.tx, d.ty);
          if (sx < -s.w || sx > W + s.w || sy < -s.h || sy > H + s.h) return;
          shadowOn(sx, sy, s.w);
          if (d.kind === 'rock') blitSprite(view, s, sx, sy);
          else
            blitSway(view, s, sx, sy, (h) =>
              Math.round(Math.sin(t * 1.1 + d.tx * 0.7 + d.ty) * (h / Math.max(1, s.h)) * 1.2),
            );
        },
      });

    for (const p of scene.props || []) {
      if (p.kind === 'cloud') continue;
      const s = propSprite(p.kind, p, scene.id),
        tx = p.x,
        ty = p.y === undefined ? GH * 0.6 : p.y,
        bob = p.kind === 'boat' ? Math.sin(local * 1.5 + (p.seed || 0) * 3) * 1.2 * SC : 0;
      put(ty, {
        x: tx,
        draw: () => {
          const sx = rowX(ty) + tx * cell,
            sy = rowY(ty) - liftAt(tx, ty) + (p.lift || 0) * SC + bob;
          shadowOn(sx, sy, s.w);
          if (p.kind === 'tree' || p.kind === 'palm' || p.kind === 'bush')
            blitSway(view, s, sx, sy, (h) =>
              Math.round(
                Math.sin(t * 1.1 + (p.seed || 0)) * (h / Math.max(1, s.h)) * (p.sway === undefined ? 1.4 : p.sway),
              ),
            );
          else blitSprite(view, s, sx, sy, p.flip);
          if (s.window && night > 0.12)
            // a house's window, or the islet's tower
            lights.push({ x: sx + s.window[0], y: sy + s.window[1], r: 20 * SC, k: 0.5 + 0.1 * twinkle(t, p.x) });
        },
      });
    }

    for (const a of scene.actors || []) {
      const coats = a.coats && a.coats.length ? a.coats : null,
        sheet = sheetFor(a.who, a.size, coats && coats[0]),
        air = !!sheet.frames[0].air, // wings beat with the clock; feet step with the distance walked
        track = trackAt2(a.at, local),
        n = Math.max(1, Math.min(24, Math.round(a.crowd || 1))),
        spread = a.spread === undefined ? 1.1 : a.spread,
        stridePx = track.dist * cell;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread,
          tx = track.x + off,
          ty = track.y + ((i % 2) - 0.5) * 0.6,
          phase = air ? local * 2.1 + i * 0.9 + (a.phase || 0) : stridePx * strideRate(sheet.stride) + i * 2.1,
          idx = ((Math.round((phase / TAU) * PHASES) % PHASES) + PHASES) % PHASES,
          own = coats ? sheetFor(a.who, a.size, coats[i % coats.length]) : sheet,
          sprite = own.frames[idx],
          bob = air
            ? Math.sin(local * 2.1 + i) * 2 * SC
            : a.hover
              ? Math.sin(local * 1.7 + i * 1.3 + (a.phase || 0)) * a.hover * SC
              : 0,
          item = {
            x: tx,
            glow: a.glow,
            draw: () => {
              const sx = rowX(ty) + tx * cell,
                sy = rowY(ty) - liftAt(tx, ty) + (a.lane || 0) * SC + bob;
              if (air) shadowOn(sx, sy - bob, sprite.w * 0.6, 0.9);
              else shadowOn(sx, sy, sprite.w);
              blitSprite(view, sprite, sx, sy, track.dir < 0);
              if (a.glow)
                lights.push({
                  x: sx,
                  y: sy - sprite.h * 0.55,
                  r: a.glow * SC,
                  k: 0.42 + 0.12 * Math.sin(local * 1.6 + i),
                });
            },
          };
        // a thing in the air is over the land, not behind it; `layer` orders one flyer against another
        if (air) flying.push({ ...item, y: (a.layer || 0) * 1000 + ty });
        else put(ty, item);
      }
    }

    // ---------------------------------------------------------------- the map, far to near
    // a margin of rows and columns past the map's own edge, where its edge tile simply goes on, so that no
    // straight line of the map's end ever shows inside the picture
    const topRows = Math.max(1, Math.round(cellY * 0.72)),
      M = 30,
      left = new Int32Array(H).fill(W), // the sea goes in afterwards, where the map left room for it
      right = new Int32Array(H).fill(-1),
      cover = (ya, yb, xa, xb) => {
        for (let y = ya; y < yb; y++) {
          if (xa < left[y]) left[y] = xa;
          if (xb > right[y]) right[y] = xb;
        }
      };
    for (let ty = -M; ty < GH + M; ty++) {
      const ry = rowY(ty),
        rx = rowX(ty);
      if (ry - 8 * rise > H + cellY) break; // everything nearer is under the picture
      for (let tx = -M; tx < N + M; tx++) {
        const x0 = Math.round(rx + tx * cell),
          x1 = Math.round(rx + (tx + 1) * cell),
          xa = Math.max(0, x0),
          xb = Math.min(W, x1);
        if (xb <= xa) continue;
        const i = tileAt(tx, ty),
          lev = LEV[i],
          yTop = Math.round(ry - LIFT[i] * rise),
          frontLift = LIFT[tileAt(tx, ty + 1)] * rise,
          yBot = Math.round(ry + cellY - frontLift),
          ya = Math.max(0, yTop),
          yb = Math.min(H, yBot);
        if (yb <= ya) continue;

        if (lev < 0) {
          // water: as deep as it is far from the shore, with foam by a beach
          const far = (DW[i] / 3) * cell,
            d = Math.min(40, far * 0.4),
            near = far < 9,
            wob = Math.round(Math.sin(ry * 0.4 + local * 2.2)),
            fade = clamp(0.4 - ty / GH, 0, 0.32);
          for (let y = ya; y < yb; y++)
            for (let x = xa; x < xb; x++) {
              const c = waterPixel(x + waterOx, y + waterOy, d, near, 0, T, wob, seaP);
              frame[y * W + x] = fade > 0.02 ? mixPacked(c, horiz, fade) : c;
            }
          cover(ya, yb, xa, xb);
          continue;
        }

        // land: a terrace top, its edge catching the light, and the earth wall down to the terrace in front
        const n = latticeRandom(tx, ty, o.seed + 7),
          shore = D[i] / 3, // tiles to the water
          beach = shore < 2.4,
          top = o.levels - 1;
        let surf;
        if (beach) surf = lev === 0 ? (n < 0.45 ? C.sand : C.sandD) : mixPacked(C.sand, C.grass, 0.3 + n * 0.2);
        else if (lev >= top) surf = mixPacked(C.grass, C.rock, 0.3 + n * 0.25);
        else {
          // meadow in patches, as the side view now reads its own ground: a broad tone under the tile's own
          surf = mixPacked(C.grass, C.sand, Math.min(0.35, (lev - 1) * 0.05 + (n < 0.14 ? 0.12 : 0)));
          const patch = latticeRandom(tx >> 2, ty >> 2, o.seed + 21);
          if (patch < 0.32) surf = mixPacked(surf, C.grassD, 0.3);
          else if (patch > 0.86) surf = mixPacked(surf, hex(pal.sun), 0.07);
          if (latticeRandom(tx, ty, o.seed + 13) > 0.985) surf = mixPacked(surf, hex(pal.bloom || '#f6d1de'), 0.4);
        }
        if (n > 0.94 && !beach) surf = C.grassD;
        const rim = mixPacked(surf, C.sun, 0.24),
          // the wall under the edge: the tile's own earth, textured by the way it is lit, in one colour a tile
          wall = mixPacked(
            mixPacked(
              mixPacked(surf, C.soil, 0.42),
              mixPacked(surf, C.soilD, 0.5),
              clamp((wallShade('earth', tx & 15, 3) - 0.45) / 0.55),
            ),
            surf,
            0.18,
          ),
          foot = mixPacked(surf, C.soilD, 0.55);
        for (let y = ya; y < yb; y++) {
          const c = y - yTop < topRows ? (y === yTop ? rim : surf) : wall;
          frame.fill(c, y * W + xa, y * W + xb);
        }
        if (yBot - 1 >= ya && yBot - 1 < yb) frame.fill(foot, (yBot - 1) * W + xa, (yBot - 1) * W + xb);
        cover(ya, yb, xa, xb);
        // the sea at its foot: a line of foam, on the sand of a beach
        if (LEV[tileAt(tx, ty + 1)] < 0 && yBot - 1 < H && yBot - 1 >= 0)
          frame.fill(lev === 0 ? C.foam : mixPacked(C.sand, C.foam, 0.5), (yBot - 1) * W + xa, (yBot - 1) * W + xb);
      }

      const list = rows.get(ty);
      if (list && ty >= 0 && ty < GH) {
        list.sort((p, q) => p.x - q.x);
        for (const it of list) it.draw();
      }
    }

    // the seams: now and then a step's edge rounds past its neighbour and leaves a pixel no tile reached, so
    // each one takes the colour of the pixel beside it, and the land never shows a hole
    for (let y = 0; y < H; y++) {
      if (right[y] < 0) continue;
      const row = y * W,
        from = Math.max(0, left[y]),
        to = Math.min(W, right[y]);
      let last = 0;
      for (let x = from; x < to; x++) {
        const i = row + x;
        if (frame[i] === 0) frame[i] = last;
        else last = frame[i];
      }
      let next = 0;
      for (let x = to - 1; x >= from; x--) {
        const i = row + x;
        if (frame[i] === 0) frame[i] = next;
        else next = frame[i];
      }
    }

    // the open sea: whatever the map left uncovered is still water, so the picture has no edge
    const seaRow = (y, from, to) => {
      const fade = clamp(0.34 * (1 - y / (H * 0.62)), 0, 0.34); // far water takes the sky's colour
      for (let x = from; x < to; x++) {
        const c = waterPixel(x + waterOx, y + waterOy, 90, false, 0, T, 0, seaP);
        frame[y * W + x] = fade > 0.01 ? mixPacked(c, horiz, fade) : c;
      }
    };
    for (let y = 0; y < H; y++) {
      if (right[y] < 0) seaRow(y, 0, W);
      else {
        if (left[y] > 0) seaRow(y, 0, left[y]);
        if (right[y] < W) seaRow(y, right[y], W);
      }
    }

    // birds, and anything else in the air, over it all
    flying.sort((p, q) => p.y - q.y);
    for (const it of flying) it.draw();

    // smoke from the houses, and the shadows of clouds crossing the map, as on the island itself
    for (const p of scene.props || []) {
      if (p.kind !== 'house') continue;
      const s = propSprite('house', p, scene.id);
      if (!s.chimney) continue;
      const ty = p.y === undefined ? GH * 0.6 : p.y,
        cx0 = rowX(ty) + p.x * cell + s.chimney[0],
        cy0 = rowY(ty) - liftAt(p.x, ty) + (p.lift || 0) * SC + s.chimney[1];
      if (cx0 < -40 || cx0 > W + 80) continue;
      for (let i = 0; i < 6; i++) {
        const age = (local * 0.22 + i / 6 + indexRandom(i, SEED + Math.round(p.x)) * 0.05) % 1,
          px2 = cx0 + age * age * 20 * SC + Math.sin(local * 1.3 + i * 2.1) * 1.5 * SC,
          py2 = cy0 - 2 - age * 26 * SC,
          r = (1.2 + age * 3.4) * SC;
        ditherEllipse(
          view,
          px2,
          py2,
          r,
          r * 0.8,
          mixPacked(hex(pal.cloud), horiz, 0.25 + age * 0.5),
          clamp(0.55 * (1 - age) + 0.08),
        );
      }
    }
    if (day.light > 0.18)
      cloudScratchI = cloudShadows(frame, W, H, {
        x: camX * cell + local * 9,
        y: camY * cellY + local * 3,
        seed: SEED,
        cover: weatherKind === 'storm' || weatherKind === 'rain' ? 0.5 : 0.22,
        strong: day.light > 0.65,
        scratch: cloudScratchI,
      });

    // ---------------------------------------------------------------- weather and small things
    paintWeather(scene, local, t, camX * cell, lights);

    // ---------------------------------------------------------------- the hour, over all of it
    gradeFrame(frame, W, H, hourTables(hour.night, hour.dusk, hour.morning, 1, wet), { night: hour.night, lights });

    if (weatherKind === 'storm') stormStrikes(local);
    return frame;
  }

  function frame(f) {
    activeUsed = used; // this book is the one being drawn, whichever book was drawn last
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
