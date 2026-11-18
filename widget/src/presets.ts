/**
 * Preset shapes and stickers. Every preset is drawn in a 100 x 100 box centred
 * on 0,0 (coordinates -50..50), using SVG path data so the same definition
 * renders on canvas (Path2D) and in the UI (inline SVG).
 */

export type ShapeCat = 'lines' | 'circles' | 'abstract' | 'symbols' | 'doodles';

export interface ShapePreset {
  id: string;
  name: string;
  cat: ShapeCat;
  d: string;
  /** 'stroke' presets are always drawn as lines; 'fill' presets can be filled or outlined. */
  kind: 'fill' | 'stroke';
  rule?: CanvasFillRule;
  /** Visual box [w, h] used for the selection frame (default 100 x 100). */
  box?: [number, number];
  /** Default size in nail units when added. */
  defScale: number;
}

type Paint = string | { l: string[] } | { r: string[] };
export interface StickerPart {
  d: string;
  fill?: Paint;
  stroke?: Paint;
  sw?: number;
  alpha?: number;
  rule?: CanvasFillRule;
}
export interface StickerPreset {
  id: string;
  name: string;
  cat: StickerCat;
  parts: StickerPart[];
  box?: [number, number];
}
export type StickerCat = 'gems' | 'cute' | 'nature';

/* ---------------------------------------------------------------- helpers */

const n = (v: number) => +v.toFixed(2);

function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)} A${r} ${r} 0 1 0 ${n(cx + r)} ${n(cy)} A${r} ${r} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${n(cx - rx)} ${n(cy)} A${rx} ${ry} 0 1 0 ${n(cx + rx)} ${n(cy)} A${rx} ${ry} 0 1 0 ${n(cx - rx)} ${n(cy)}Z`;
}

function star(points: number, R: number, r: number, cx = 0, cy = 0): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? r : R;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    d += `${i ? 'L' : 'M'}${n(cx + Math.cos(a) * rad)} ${n(cy + Math.sin(a) * rad)} `;
  }
  return d + 'Z';
}

type Seg = [string, ...number[]];
/** Scale, offset (before rotation), rotate (deg), then translate a segment list. */
function tf(segs: Seg[], o: { s?: number; px?: number; py?: number; r?: number; x?: number; y?: number } = {}): string {
  const s = o.s ?? 1;
  const r = ((o.r ?? 0) * Math.PI) / 180;
  const c = Math.cos(r);
  const si = Math.sin(r);
  return segs
    .map(([cmd, ...nums]) => {
      const out: number[] = [];
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i] * s + (o.px ?? 0);
        const y = nums[i + 1] * s + (o.py ?? 0);
        out.push(n(x * c - y * si + (o.x ?? 0)), n(x * si + y * c + (o.y ?? 0)));
      }
      return cmd + out.join(' ');
    })
    .join(' ');
}

const HEART: Seg[] = [
  ['M', 0, 45],
  ['C', -55, 5, -50, -45, -22, -45],
  ['C', -8, -45, 0, -32, 0, -24],
  ['C', 0, -32, 8, -45, 22, -45],
  ['C', 50, -45, 55, 5, 0, 45],
  ['Z'],
];
const SPARKLE: Seg[] = [
  ['M', 0, -50],
  ['C', 5, -12, 12, -5, 50, 0],
  ['C', 12, 5, 5, 12, 0, 50],
  ['C', -5, 12, -12, 5, -50, 0],
  ['C', -12, -5, -5, -12, 0, -50],
  ['Z'],
];
const PETAL: Seg[] = [['M', 0, 0], ['C', -18, -15, -16, -45, 0, -48], ['C', 16, -45, 18, -15, 0, 0], ['Z']];
const THIN_PETAL: Seg[] = [['M', 0, -15], ['C', -8, -22, -7, -46, 0, -48], ['C', 7, -46, 8, -22, 0, -15], ['Z']];
const LEAF: Seg[] = [['M', 0, 50], ['C', -40, 20, -35, -30, 0, -50], ['C', 35, -30, 40, 20, 0, 50], ['Z']];

const range = (count: number, fn: (i: number) => string) => Array.from({ length: count }, (_, i) => fn(i)).join(' ');

const HEART_D = tf(HEART);
const STAR_D = star(5, 50, 21);
const MOON_D = 'M14 -47 A48 48 0 1 0 14 47 A50 50 0 0 1 14 -47Z';
const BOW_D =
  'M0 0 C-20 -28 -50 -32 -50 0 C-50 32 -20 28 0 0Z M0 0 C20 -28 50 -32 50 0 C50 32 20 28 0 0Z ' + circle(0, 0, 10);

function spiral(): string {
  let d = '';
  const turns = 2.6;
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const r = 3 + t * 45;
    d += `${i ? 'L' : 'M'}${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)} `;
  }
  return d;
}

function snowflake(): string {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 - Math.PI / 2;
    const p = (r: number, off = 0) => `${n(Math.cos(a + off) * r)} ${n(Math.sin(a + off) * r)}`;
    d += `M0 0 L${p(48)} `;
    const bx = Math.cos(a) * 28;
    const by = Math.sin(a) * 28;
    for (const side of [-1, 1]) {
      const b = a + side * 0.75;
      d += `M${n(bx)} ${n(by)} L${n(bx + Math.cos(b) * 14)} ${n(by + Math.sin(b) * 14)} `;
    }
  }
  return d;
}

function sun(): string {
  const rays = range(12, (i) => {
    const a = (i * Math.PI) / 6;
    const pt = (r: number, o: number) => `${n(Math.cos(a + o) * r)} ${n(Math.sin(a + o) * r)}`;
    return `M${pt(30, -0.13)} L${pt(50, 0)} L${pt(30, 0.13)}Z`;
  });
  return circle(0, 0, 24) + ' ' + rays;
}

/* ----------------------------------------------------------------- shapes */

export const SHAPE_CATS: { id: ShapeCat; label: string }[] = [
  { id: 'lines', label: 'Lines' },
  { id: 'circles', label: 'Circles' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'doodles', label: 'Doodles' },
];

const LINE = { cat: 'lines' as const, kind: 'stroke' as const, defScale: 0.95 };
const CIRC = { cat: 'circles' as const, kind: 'fill' as const, defScale: 0.42 };
const ABS = { cat: 'abstract' as const, kind: 'fill' as const, defScale: 0.7 };
const SYM = { cat: 'symbols' as const, kind: 'fill' as const, defScale: 0.38 };
const DOO = { cat: 'doodles' as const, kind: 'fill' as const, defScale: 0.45 };

export const SHAPES: ShapePreset[] = [
  // Lines
  { ...LINE, id: 'line-straight', name: 'Straight line', d: 'M-50 0 L50 0', box: [100, 12] },
  { ...LINE, id: 'line-wavy', name: 'Wavy line', d: 'M-50 0 Q-37.5 -16 -25 0 T0 0 T25 0 T50 0', box: [100, 22] },
  { ...LINE, id: 'line-zigzag', name: 'Zigzag', d: 'M-50 8 ' + range(8, (i) => `L${n(-37.5 + i * 12.5)} ${i % 2 ? 8 : -8}`), box: [100, 24] },
  { ...LINE, id: 'line-dashed', name: 'Dashed line', d: range(5, (i) => `M${-50 + i * 22} 0 L${-38 + i * 22} 0`), box: [100, 12] },
  { ...LINE, id: 'line-dotted', name: 'Dotted line', kind: 'fill', d: range(7, (i) => circle(-45 + i * 15, 0, 4.5)), box: [100, 12] },
  { ...LINE, id: 'line-double', name: 'Double line', d: 'M-50 -7 L50 -7 M-50 7 L50 7', box: [100, 26] },
  { ...LINE, id: 'line-scallop', name: 'Scallops', d: 'M-50 -6 ' + range(4, (i) => `A12.5 12.5 0 0 0 ${-25 + i * 25} -6`), box: [100, 26] },
  { ...LINE, id: 'line-smile', name: 'French curve', d: 'M-50 -18 Q0 38 50 -18', box: [100, 42] },
  { ...LINE, id: 'line-chevron', name: 'Chevron', d: 'M-50 -20 L0 20 L50 -20', box: [100, 44] },
  { ...LINE, id: 'line-squiggle', name: 'Squiggle', d: 'M-50 6 C-42 -22 -26 -22 -22 0 S-6 24 0 0 S20 -22 26 0 S44 22 50 -4', box: [100, 34] },

  // Circles
  { ...CIRC, id: 'circle-solid', name: 'Circle', d: circle(0, 0, 50) },
  { ...CIRC, id: 'circle-ring', name: 'Ring', d: circle(0, 0, 50) + ' ' + circle(0, 0, 37), rule: 'evenodd' },
  { ...CIRC, id: 'circle-target', name: 'Rings', d: [50, 40, 30, 20, 10].map((r) => circle(0, 0, r)).join(' '), rule: 'evenodd' },
  { ...CIRC, id: 'circle-half', name: 'Half circle', d: 'M-50 25 A50 50 0 0 1 50 25Z', box: [100, 52] },
  { ...CIRC, id: 'circle-oval', name: 'Oval', d: ellipse(0, 0, 50, 30), box: [100, 60] },
  {
    ...CIRC,
    id: 'circle-cluster',
    name: 'Dot cluster',
    d: [circle(-20, -18, 14), circle(20, -24, 9), circle(22, 14, 17), circle(-20, 24, 9), circle(-2, 2, 5), circle(-38, 4, 5)].join(' '),
  },
  { ...CIRC, id: 'circle-polka', name: 'Polka dots', d: range(9, (i) => circle(-34 + (i % 3) * 34, -34 + Math.floor(i / 3) * 34, 10)) },
  {
    ...CIRC,
    id: 'circle-bubbles',
    name: 'Bubbles',
    d: [
      [-18, -14, 22],
      [22, -26, 13],
      [20, 22, 16],
      [-28, 30, 9],
    ]
      .map(([x, y, r]) => circle(x, y, r) + ' ' + circle(x, y, r - 5))
      .join(' '),
    rule: 'evenodd',
  },

  // Abstract
  { ...ABS, id: 'abs-blob', name: 'Blob', d: 'M-30 -40 C0 -60 45 -40 40 -5 C36 30 10 50 -20 40 C-50 30 -55 -20 -30 -40Z' },
  { ...ABS, id: 'abs-swoosh', name: 'Swoosh', d: 'M-50 22 C-22 -30 30 -42 50 -30 C22 -18 -8 2 -50 22Z', box: [100, 60] },
  { ...ABS, id: 'abs-brush', name: 'Brush stroke', d: 'M-48 8 C-30 -16 10 -18 48 -8 C47 -2 45 3 42 5 C10 -4 -20 2 -46 18Z', box: [100, 40] },
  { ...ABS, id: 'abs-wave', name: 'Wave tip', d: 'M-50 0 C-30 -22 -12 18 10 0 C26 -14 40 -12 50 -6 L50 50 L-50 50Z', defScale: 1.1 },
  { ...ABS, id: 'abs-split', name: 'Half & half', d: 'M-50 -50 L50 50 L-50 50Z', defScale: 1.3 },
  { ...ABS, id: 'abs-vtip', name: 'V tip', d: 'M-50 -50 L0 0 L50 -50 L50 -20 L0 30 L-50 -20Z', defScale: 1.05, box: [100, 80] },
  { ...ABS, id: 'abs-drop', name: 'Drop', d: 'M0 -50 C20 -20 35 -2 35 15 A35 35 0 0 1 -35 15 C-35 -2 -20 -20 0 -50Z', defScale: 0.4 },
  { ...ABS, id: 'abs-triangle', name: 'Triangle', d: 'M0 -45 L50 40 L-50 40Z', defScale: 0.45 },
  { ...ABS, id: 'abs-swirl', name: 'Swirl', kind: 'stroke', d: spiral(), defScale: 0.55 },
  { ...ABS, id: 'abs-marble', name: 'Marble vein', kind: 'stroke', d: 'M-40 -50 C-20 -25 -38 -5 -10 5 S18 20 8 50 M-10 5 C10 -5 30 -2 45 -18', defScale: 0.9 },

  // Symbols
  { ...SYM, id: 'sym-heart', name: 'Heart', d: HEART_D },
  { ...SYM, id: 'sym-star', name: 'Star', d: STAR_D },
  { ...SYM, id: 'sym-sparkle', name: 'Sparkle', d: tf(SPARKLE) },
  { ...SYM, id: 'sym-moon', name: 'Moon', d: MOON_D },
  { ...SYM, id: 'sym-bolt', name: 'Lightning', d: 'M10 -50 L-30 8 L-4 8 L-14 50 L30 -10 L4 -10Z' },
  { ...SYM, id: 'sym-diamond', name: 'Diamond', d: 'M0 -50 L36 0 L0 50 L-36 0Z' },
  { ...SYM, id: 'sym-plus', name: 'Cross', d: 'M-9 -50 H9 V-9 H50 V9 H9 V50 H-9 V9 H-50 V-9 H-9Z' },
  { ...SYM, id: 'sym-infinity', name: 'Infinity', kind: 'stroke', d: 'M0 0 C-15 -25 -46 -25 -46 0 C-46 25 -15 25 0 0 C15 -25 46 -25 46 0 C46 25 15 25 0 0Z', box: [100, 56] },
  {
    ...SYM,
    id: 'sym-smiley',
    name: 'Smiley',
    d: circle(0, 0, 50) + ' ' + circle(-17, -12, 7) + ' ' + circle(17, -12, 7) + ' M-27 8 Q0 42 27 8 Q0 26 -27 8Z',
    rule: 'evenodd',
  },
  { ...SYM, id: 'sym-heart-outline', name: 'Heart outline', kind: 'stroke', d: tf(HEART, { s: 0.92 }) },

  // Doodles
  { ...DOO, id: 'doo-flower', name: 'Flower', d: range(5, (i) => tf(PETAL, { r: i * 72 })) + ' ' + circle(0, 0, 11) },
  { ...DOO, id: 'doo-daisy', name: 'Daisy', d: range(10, (i) => tf(THIN_PETAL, { r: i * 36 })) + ' ' + circle(0, 0, 11) },
  { ...DOO, id: 'doo-leaf', name: 'Leaf', d: tf(LEAF) + ' M0 44 C-2 10 -2 -20 0 -40 C2 -20 2 10 0 44Z', rule: 'evenodd' },
  {
    ...DOO,
    id: 'doo-branch',
    name: 'Branch',
    kind: 'stroke',
    d: 'M0 50 L0 -48 M0 26 Q-20 16 -26 0 M0 0 Q20 -10 26 -26 M0 34 Q20 24 26 8 M0 -20 Q-20 -30 -24 -46',
  },
  {
    ...DOO,
    id: 'doo-butterfly',
    name: 'Butterfly',
    d:
      'M0 -4 C-20 -50 -56 -42 -46 -10 C-40 6 -16 6 0 0 C16 6 40 6 46 -10 C56 -42 20 -50 0 -4Z ' +
      'M0 4 C-15 10 -40 15 -35 35 C-30 50 -8 35 0 10 C8 35 30 50 35 35 C40 15 15 10 0 4Z ' +
      ellipse(0, 2, 4, 26),
  },
  { ...DOO, id: 'doo-cloud', name: 'Cloud', d: 'M-38 26 C-56 26 -56 0 -38 -2 C-38 -24 -12 -32 0 -16 C10 -34 42 -28 40 -4 C58 -2 56 26 38 26Z', box: [100, 62] },
  { ...DOO, id: 'doo-sun', name: 'Sun', d: sun() },
  { ...DOO, id: 'doo-snow', name: 'Snowflake', kind: 'stroke', d: snowflake() },
  {
    ...DOO,
    id: 'doo-clover',
    name: 'Clover',
    d: range(4, (i) => tf(HEART, { s: 0.5, py: -22.5, r: i * 90 + 45 })),
  },
  { ...DOO, id: 'doo-bow', name: 'Bow', d: BOW_D, box: [100, 64] },
];

const shapeMap = new Map(SHAPES.map((s) => [s.id, s]));
export const shapeById = (id: string) => shapeMap.get(id);

/* --------------------------------------------------------------- stickers */

export const STICKER_CATS: { id: StickerCat; label: string }[] = [
  { id: 'gems', label: 'Gems & metal' },
  { id: 'cute', label: 'Cute' },
  { id: 'nature', label: 'Nature' },
];

const SHINE = (x: number, y: number, r = 8): StickerPart => ({ d: ellipse(x, y, r, r * 0.7), fill: '#ffffff', alpha: 0.85 });
const FACETS =
  'M0 -46 L0 -24 M0 46 L0 24 M-46 0 L-24 0 M46 0 L24 0 M-32.5 -32.5 L-17 -17 M32.5 32.5 L17 17 M32.5 -32.5 L17 -17 M-32.5 32.5 L-17 17';

function gem(id: string, name: string, light: string, dark: string): StickerPreset {
  return {
    id,
    name,
    cat: 'gems',
    parts: [
      { d: circle(0, 0, 47), fill: { r: [light, dark] }, stroke: dark, sw: 2 },
      { d: star(8, 26, 22), fill: '#ffffff', alpha: 0.28 },
      { d: FACETS, stroke: '#ffffff', sw: 2, alpha: 0.45 },
      SHINE(-16, -20, 9),
    ],
  };
}

export const STICKERS: StickerPreset[] = [
  gem('gem-rose', 'Pink rhinestone', '#ffd6e6', '#e2457d'),
  gem('gem-crystal', 'Crystal', '#ffffff', '#aab8cc'),
  gem('gem-sapphire', 'Sapphire', '#d4e6ff', '#2f63cf'),
  gem('gem-emerald', 'Emerald', '#d6ffe9', '#1c8a5a'),
  {
    id: 'pearl',
    name: 'Pearl',
    cat: 'gems',
    parts: [{ d: circle(0, 0, 47), fill: { r: ['#ffffff', '#f3ebe4', '#d9c8bb'] } }, SHINE(-14, -18, 11)],
  },
  {
    id: 'gold-star',
    name: 'Gold star',
    cat: 'gems',
    parts: [{ d: STAR_D, fill: { l: ['#fff3b8', '#e0b53f', '#a87f17'] }, stroke: '#9c7414', sw: 1.5 }, SHINE(-10, -16, 6)],
  },
  {
    id: 'chrome-heart',
    name: 'Chrome heart',
    cat: 'gems',
    parts: [{ d: HEART_D, fill: { l: ['#ffffff', '#b9bdc7', '#6f7480', '#eef0f4'] }, stroke: '#7c818c', sw: 1.5 }, SHINE(-20, -26, 7)],
  },
  {
    id: 'gold-sparkles',
    name: 'Sparkles',
    cat: 'gems',
    parts: [
      { d: tf(SPARKLE, { s: 0.72, x: -8, y: 4 }), fill: { l: ['#fff3b8', '#d9a82b'] } },
      { d: tf(SPARKLE, { s: 0.32, x: 30, y: -32 }), fill: { l: ['#fff3b8', '#d9a82b'] } },
      { d: tf(SPARKLE, { s: 0.24, x: 30, y: 32 }), fill: { l: ['#fff3b8', '#d9a82b'] } },
    ],
  },
  {
    id: 'gold-moon',
    name: 'Moon & star',
    cat: 'gems',
    parts: [
      { d: MOON_D, fill: { l: ['#fff0b0', '#d9a82b', '#a87f17'] } },
      { d: star(5, 14, 6, 24, -18), fill: { l: ['#fff3b8', '#d9a82b'] } },
    ],
  },

  {
    id: 'red-heart',
    name: 'Glossy heart',
    cat: 'cute',
    parts: [{ d: HEART_D, fill: { l: ['#ff7a8e', '#d4163c'] } }, { d: ellipse(-22, -26, 10, 6), fill: '#ffffff', alpha: 0.7 }],
  },
  {
    id: 'smiley',
    name: 'Smiley',
    cat: 'cute',
    parts: [
      { d: circle(0, 0, 47), fill: '#ffd84d', stroke: '#e9b500', sw: 2 },
      { d: ellipse(-16, -12, 5.5, 8) + ' ' + ellipse(16, -12, 5.5, 8), fill: '#3a2a1a' },
      { d: 'M-24 10 Q0 34 24 10', stroke: '#3a2a1a', sw: 5 },
      { d: ellipse(-30, 10, 7, 5) + ' ' + ellipse(30, 10, 7, 5), fill: '#ff8fa3', alpha: 0.6 },
    ],
  },
  {
    id: 'bow',
    name: 'Pink bow',
    cat: 'cute',
    parts: [
      { d: 'M-4 6 L-20 46 L-8 40 L-2 48 L4 8Z M4 6 L20 46 L8 40 L2 48 L-4 8Z', fill: '#e2457d' },
      { d: BOW_D, fill: { l: ['#ffc6da', '#e75a8c'] }, stroke: '#c93a6c', sw: 1.5 },
      SHINE(-30, -10, 5),
    ],
    box: [100, 96],
  },
  {
    id: 'evil-eye',
    name: 'Evil eye',
    cat: 'cute',
    parts: [
      { d: circle(0, 0, 47), fill: '#1d4ed8' },
      { d: circle(0, 0, 35), fill: '#ffffff' },
      { d: circle(0, 0, 23), fill: '#60a5fa' },
      { d: circle(0, 0, 11), fill: '#0b1b3f' },
      SHINE(-6, -6, 4),
    ],
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    cat: 'cute',
    parts: [
      { d: 'M-42 26 A42 42 0 0 1 42 26', stroke: '#ff6b81', sw: 9 },
      { d: 'M-32 26 A32 32 0 0 1 32 26', stroke: '#ffb347', sw: 9 },
      { d: 'M-22 26 A22 22 0 0 1 22 26', stroke: '#7ed6a5', sw: 9 },
      { d: 'M-12 26 A12 12 0 0 1 12 26', stroke: '#7ab8ff', sw: 9 },
    ],
    box: [100, 70],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    cat: 'cute',
    parts: [
      {
        d: 'M0 -4 C-20 -50 -56 -42 -46 -10 C-40 6 -16 6 0 0 C16 6 40 6 46 -10 C56 -42 20 -50 0 -4Z M0 4 C-15 10 -40 15 -35 35 C-30 50 -8 35 0 10 C8 35 30 50 35 35 C40 15 15 10 0 4Z',
        fill: { l: ['#ffb3d1', '#9c7ade'] },
        stroke: '#7b56c2',
        sw: 1.5,
      },
      { d: circle(-28, -18, 6) + ' ' + circle(28, -18, 6) + ' ' + circle(-20, 26, 4) + ' ' + circle(20, 26, 4), fill: '#ffffff', alpha: 0.7 },
      { d: ellipse(0, 2, 4, 26), fill: '#3b2a3f' },
    ],
  },

  {
    id: 'daisy',
    name: 'Daisy',
    cat: 'nature',
    parts: [
      { d: range(10, (i) => tf(THIN_PETAL, { r: i * 36 })), fill: '#ffffff', stroke: '#e5dadb', sw: 1.5 },
      { d: circle(0, 0, 13), fill: { r: ['#ffe27a', '#f0a90f'] } },
    ],
  },
  {
    id: 'cherry',
    name: 'Cherries',
    cat: 'nature',
    parts: [
      { d: 'M-16 18 Q-10 -18 8 -42 M16 20 Q16 -10 8 -42', stroke: '#4e7d3a', sw: 4 },
      { d: 'M8 -42 C20 -52 38 -46 42 -34 C30 -30 18 -32 8 -42Z', fill: '#6aa84f' },
      { d: circle(-17, 28, 17), fill: { r: ['#ff7b7b', '#b3122e'] } },
      { d: circle(17, 30, 17), fill: { r: ['#ff7b7b', '#b3122e'] } },
      SHINE(-23, 21, 4),
      SHINE(11, 23, 4),
    ],
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    cat: 'nature',
    parts: [
      { d: 'M0 48 C-30 30 -42 0 -36 -14 C-30 -28 -12 -26 0 -22 C12 -26 30 -28 36 -14 C42 0 30 30 0 48Z', fill: { r: ['#ff7a8a', '#d6233f'] } },
      { d: star(6, 26, 9, 0, -26), fill: '#4caf50' },
      {
        d: [
          [-18, -4],
          [0, -6],
          [18, -4],
          [-10, 12],
          [10, 12],
          [0, 28],
          [-22, 14],
          [22, 14],
        ]
          .map(([x, y]) => ellipse(x, y, 2.2, 3.2))
          .join(' '),
        fill: '#ffe08a',
      },
    ],
  },
  {
    id: 'green-leaf',
    name: 'Leaf',
    cat: 'nature',
    parts: [
      { d: tf(LEAF), fill: { l: ['#a5d98a', '#3f8f4a'] } },
      { d: 'M0 44 L0 -40 M0 10 L-16 -6 M0 -10 L14 -24 M0 26 L14 12', stroke: '#2f6e37', sw: 2, alpha: 0.6 },
    ],
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    cat: 'nature',
    parts: [
      { d: range(12, (i) => tf(THIN_PETAL, { r: i * 30, s: 1.05 })), fill: { r: ['#ffe680', '#ffb703'] } },
      { d: circle(0, 0, 18), fill: { r: ['#8a5a2b', '#4a2e14'] } },
    ],
  },
  {
    id: 'tulip',
    name: 'Tulip',
    cat: 'nature',
    parts: [
      { d: 'M0 50 L0 4', stroke: '#4e7d3a', sw: 4 },
      { d: 'M0 36 C-14 30 -22 20 -24 8 C-12 12 -4 22 0 36Z', fill: '#6aa84f' },
      { d: 'M-24 -36 C-26 -8 -14 8 0 8 C14 8 26 -8 24 -36 L12 -22 L0 -44 L-12 -22Z', fill: { l: ['#ff9fbf', '#e2457d'] } },
    ],
  },
];

const stickerMap = new Map(STICKERS.map((s) => [s.id, s]));
export const stickerById = (id: string) => stickerMap.get(id);
