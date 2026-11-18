import { darken, lighten, withAlpha } from './colors';
import {
  FINGERS,
  HAND_H,
  HAND_VIEW,
  HAND_W,
  LENGTHS,
  NAIL_RATIO,
  fingerLocalPath,
  fingerPath,
  nailFrame,
  nailPath,
  palmPath,
} from './geometry';
import { shapeById, stickerById, type StickerPart, type StickerPreset } from './presets';
import type { Base, DesignState, ElementLayer, Finish, Layer, NailDesign, NailShape, StrokeLayer } from './types';

type Ctx = CanvasRenderingContext2D;

/* --------------------------------------------------------------- caches */

const canvasCache = new Map<string, HTMLCanvasElement>();
function offscreen(key: string, w: number, h: number): HTMLCanvasElement {
  let c = canvasCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    canvasCache.set(key, c);
  }
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return c;
}

const path2dCache = new Map<string, Path2D>();
function p2d(d: string): Path2D {
  let p = path2dCache.get(d);
  if (!p) {
    p = new Path2D(d);
    path2dCache.set(d, p);
  }
  return p;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx: Ctx | Path2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------------------------------------------------------- strokes */

export function drawStrokePath(ctx: Ctx, pts: number[], size: number) {
  const count = pts.length / 2;
  if (count === 1) {
    ctx.beginPath();
    ctx.arc(pts[0], pts[1], size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 1; i < count - 1; i++) {
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    ctx.quadraticCurveTo(x, y, (x + pts[i * 2 + 2]) / 2, (y + pts[i * 2 + 3]) / 2);
  }
  ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
  ctx.stroke();
}

function drawStroke(ctx: Ctx, l: StrokeLayer) {
  ctx.save();
  ctx.globalAlpha = l.erase ? 1 : l.opacity;
  ctx.globalCompositeOperation = l.erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = l.erase ? '#000' : l.color;
  ctx.fillStyle = ctx.strokeStyle;
  drawStrokePath(ctx, l.points, l.size);
  ctx.restore();
}

/* -------------------------------------------------------- shapes/stickers */

function paint(ctx: Ctx, p: StickerPart['fill']): string | CanvasGradient {
  if (!p || typeof p === 'string') return p ?? '#000';
  const stops = 'l' in p ? p.l : p.r;
  const g = 'l' in p ? ctx.createLinearGradient(-45, -45, 45, 45) : ctx.createRadialGradient(-16, -18, 2, 0, 0, 58);
  stops.forEach((c, i) => g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), c));
  return g;
}

export function drawStickerParts(ctx: Ctx, st: StickerPreset) {
  for (const part of st.parts) {
    const path = p2d(part.d);
    ctx.save();
    if (part.alpha != null) ctx.globalAlpha *= part.alpha;
    if (part.fill) {
      ctx.fillStyle = paint(ctx, part.fill);
      ctx.fill(path, part.rule ?? 'nonzero');
    }
    if (part.stroke) {
      ctx.strokeStyle = paint(ctx, part.stroke);
      ctx.lineWidth = part.sw ?? 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    }
    ctx.restore();
  }
}

function placeTransform(ctx: Ctx, el: ElementLayer) {
  const s = el.scale / 100;
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot);
  ctx.scale(el.flip ? -s : s, s);
}

function drawElement(ctx: Ctx, el: ElementLayer, k: number) {
  ctx.save();
  placeTransform(ctx, el);
  if (el.type === 'shape') {
    const pr = shapeById(el.preset);
    if (pr) {
      const path = p2d(pr.d);
      if (pr.kind === 'stroke' || el.style === 'outline') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.weight / (el.scale / 100);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path);
      } else {
        ctx.fillStyle = el.color;
        ctx.fill(path, pr.rule ?? 'nonzero');
      }
    }
  } else {
    const st = stickerById(el.preset);
    if (st) {
      ctx.shadowColor = 'rgba(40, 20, 30, 0.28)';
      ctx.shadowBlur = Math.max(1, 0.02 * k);
      ctx.shadowOffsetY = Math.max(0.5, 0.008 * k);
      drawStickerParts(ctx, st);
    }
  }
  ctx.restore();
}


/* ------------------------------------------------------------------ nails */

function paintBase(ctx: Ctx, b: Base, L: number) {
  const [c0, c1, c2] = b.colors;
  const box: [number, number, number, number] = [-0.7, -L - 0.2, 1.4, L + 0.5];
  const stops = (g: CanvasGradient, cols: string[]) => cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
  const cols = b.count === 3 ? [c0, c1, c2] : [c0, c1];
  switch (b.type) {
    case 'solid':
      ctx.fillStyle = c0;
      break;
    case 'linear': {
      const a = (b.angle * Math.PI) / 180;
      const dx = Math.sin(a);
      const dy = -Math.cos(a);
      const half = 0.5 * Math.abs(dx) + (L / 2) * Math.abs(dy);
      const cy = -L / 2;
      const g = ctx.createLinearGradient(-dx * half, cy - dy * half, dx * half, cy + dy * half);
      stops(g, cols);
      ctx.fillStyle = g;
      break;
    }
    case 'radial': {
      const cy = -L * 0.5;
      const g = ctx.createRadialGradient(0, cy, 0, 0, cy, Math.max(0.6, L * 0.62));
      stops(g, cols);
      ctx.fillStyle = g;
      break;
    }
    case 'ombre': {
      const g = ctx.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, c0);
      g.addColorStop(0.22, c0);
      g.addColorStop(0.88, c1);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      break;
    }
    case 'french':
      ctx.fillStyle = c0;
      break;
  }
  ctx.fillRect(...box);
  if (b.type === 'french') {
    const t = -L;
    const d = Math.max(0.24, L * 0.26);
    ctx.beginPath();
    ctx.moveTo(-0.7, t - 0.3);
    ctx.lineTo(0.7, t - 0.3);
    ctx.lineTo(0.7, t + d * 1.75);
    ctx.lineTo(0.5, t + d * 1.7);
    ctx.quadraticCurveTo(0, t + d * 0.3, -0.5, t + d * 1.7);
    ctx.lineTo(-0.7, t + d * 1.75);
    ctx.closePath();
    ctx.fillStyle = c1;
    ctx.fill();
  }
}

function glossStreak(ctx: Ctx, L: number, strength: number) {
  const x = -0.31;
  const w = 0.11;
  const y0 = -L + 0.24;
  const y1 = -0.3;
  if (y1 - y0 > 0.1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.12, `rgba(255,255,255,${0.55 * strength})`);
    g.addColorStop(0.65, `rgba(255,255,255,${0.22 * strength})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    roundRect(ctx, x, y0, w, y1 - y0, w / 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(255,255,255,${0.45 * strength})`;
  ctx.beginPath();
  ctx.ellipse(0.2, -L + 0.36, 0.035, 0.06, 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function paintFinish(ctx: Ctx, finish: Finish, L: number, seed: number) {
  const box: [number, number, number, number] = [-0.7, -L - 0.2, 1.4, L + 0.5];
  // Curvature: darker side walls make the nail look rounded.
  const edge = ctx.createLinearGradient(-0.5, 0, 0.5, 0);
  const e = finish === 'matte' ? 0.08 : 0.14;
  edge.addColorStop(0, `rgba(40,10,20,${e})`);
  edge.addColorStop(0.2, 'rgba(40,10,20,0)');
  edge.addColorStop(0.8, 'rgba(40,10,20,0)');
  edge.addColorStop(1, `rgba(40,10,20,${e + 0.02})`);
  ctx.fillStyle = edge;
  ctx.fillRect(...box);

  if (finish === 'matte') {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(...box);
    return;
  }
  if (finish === 'glitter') {
    const rnd = mulberry32(seed * 9973);
    const count = Math.round(110 * L);
    const tones = ['255,255,255', '255,226,150', '255,190,215', '220,230,255'];
    for (let i = 0; i < count; i++) {
      const x = rnd() - 0.5;
      const y = -rnd() * L;
      const r = 0.006 + rnd() * 0.016;
      ctx.fillStyle = `rgba(${tones[i % tones.length]},${0.55 + rnd() * 0.4})`;
      if (i % 9 === 0) {
        const s = r * 2.6;
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.quadraticCurveTo(x, y, x + s, y);
        ctx.quadraticCurveTo(x, y, x, y + s);
        ctx.quadraticCurveTo(x, y, x - s, y);
        ctx.quadraticCurveTo(x, y, x, y - s);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (finish === 'chrome') {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(-0.5, -L, 0.5, 0);
    g.addColorStop(0, '#222');
    g.addColorStop(0.25, '#fff');
    g.addColorStop(0.45, '#555');
    g.addColorStop(0.62, '#fff');
    g.addColorStop(0.85, '#333');
    g.addColorStop(1, '#ddd');
    ctx.fillStyle = g;
    ctx.fillRect(...box);
    ctx.restore();
    glossStreak(ctx, L, 1.5);
    return;
  }
  glossStreak(ctx, L, 1);
}

export interface NailRenderOpts {
  /** Device pixels per nail unit (controls the art layer resolution). */
  k: number;
  cacheKey: string;
  seed: number;
  draft?: StrokeLayer | null;
}

/** Draws one nail in nail units at the current transform. */
export function renderNail(ctx: Ctx, d: NailDesign, shape: NailShape, L: number, o: NailRenderOpts) {
  const path = nailPath(shape, L);

  ctx.save();
  ctx.shadowColor = 'rgba(60, 20, 30, 0.22)';
  ctx.shadowBlur = Math.max(1, 0.05 * o.k);
  ctx.shadowOffsetY = Math.max(0.5, 0.015 * o.k);
  ctx.fillStyle = d.base.colors[0];
  ctx.fill(path);
  ctx.restore();

  ctx.save();
  ctx.clip(path);
  paintBase(ctx, d.base, L);

  const layers: Layer[] = o.draft ? [...d.layers, o.draft] : d.layers;
  const strokes = layers.filter((l): l is StrokeLayer => l.type === 'stroke');
  // Brush strokes (and eraser strokes, which only cut brush strokes) go on their own layer.
  if (strokes.length) {
    const bx = -0.6;
    const by = -L - 0.15;
    const bw = 1.2;
    const bh = L + 0.3;
    const k = Math.min(o.k, 1400);
    const off = offscreen(o.cacheKey, Math.max(1, Math.ceil(bw * k)), Math.max(1, Math.ceil(bh * k)));
    const octx = off.getContext('2d')!;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, off.width, off.height);
    octx.setTransform(k, 0, 0, k, -bx * k, -by * k);
    for (const l of strokes) drawStroke(octx, l);
    ctx.drawImage(off, bx, by, bw, bh);
  }
  // Shapes and stickers sit on top of the drawing.
  for (const l of layers) if (l.type !== 'stroke') drawElement(ctx, l, o.k);

  paintFinish(ctx, d.finish, L, o.seed);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 1.2 / o.k;
  ctx.strokeStyle = 'rgba(70, 30, 40, 0.2)';
  ctx.stroke(path);
  ctx.restore();
}

/* ------------------------------------------------------------------- hand */

function skinShading(ctx: Ctx, skin: string, w: number, top: number, h: number) {
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, darken(skin, 0.35, 0.2));
  g.addColorStop(0.22, darken(skin, 0.35, 0));
  g.addColorStop(0.5, lighten(skin, 0.5, 0.12));
  g.addColorStop(0.78, darken(skin, 0.35, 0));
  g.addColorStop(1, darken(skin, 0.35, 0.24));
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2 - 4, top, w + 8, h);
}

function nailFold(ctx: Ctx, skin: string, shape: NailShape, L: number) {
  ctx.save();
  ctx.lineWidth = 0.09;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = darken(skin, 0.3, 0.25);
  ctx.stroke(nailPath(shape, L));
  ctx.restore();
}

/** Draws the hand (no nails) in hand coordinates. `k` = device px per hand unit. */
function drawHandBody(ctx: Ctx, skin: string, k: number) {
  const palm = palmPath();
  const fingers = FINGERS.map(fingerPath);
  const pieces = [palm, ...fingers];
  const union = new Path2D();
  pieces.forEach((p) => union.addPath(p));

  ctx.save();
  ctx.shadowColor = 'rgba(90, 45, 35, 0.2)';
  ctx.shadowBlur = 34 * k;
  ctx.shadowOffsetY = 12 * k;
  ctx.fillStyle = skin;
  ctx.fill(union);
  ctx.restore();

  // Outline trick: stroke every piece, then fill on top — only the silhouette edge stays visible.
  ctx.save();
  ctx.strokeStyle = darken(skin, 0.32, 0.6);
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  pieces.forEach((p) => ctx.stroke(p));
  ctx.restore();

  const g = ctx.createLinearGradient(0, 150, 0, HAND_H);
  g.addColorStop(0, lighten(skin, 0.08));
  g.addColorStop(0.55, skin);
  g.addColorStop(1, darken(skin, 0.07));
  ctx.fillStyle = g;
  ctx.fill(union);

  const outsidePalm = new Path2D();
  outsidePalm.rect(-300, -300, HAND_W + 600, HAND_H + 600);
  outsidePalm.addPath(palm);

  FINGERS.forEach((f, i) => {
    ctx.save();
    ctx.clip(outsidePalm, 'evenodd');
    ctx.clip(fingers[i]);
    ctx.translate(f.bx, f.by);
    ctx.rotate((f.angle * Math.PI) / 180);
    skinShading(ctx, skin, f.w, -f.len - 4, f.len + 100);
    ctx.strokeStyle = darken(skin, 0.4, 0.16);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const joints = i === 0 ? [0.42] : [0.36, 0.64];
    for (const j of joints) {
      const y = -f.len * j;
      const hw = f.w * 0.17;
      ctx.beginPath();
      ctx.moveTo(-hw, y);
      ctx.quadraticCurveTo(0, y + 7, hw, y);
      ctx.moveTo(-hw * 0.6, y + 8);
      ctx.quadraticCurveTo(0, y + 13, hw * 0.6, y + 8);
      ctx.stroke();
    }
    ctx.restore();
  });

  // Subtle knuckle highlights on the back of the hand.
  ctx.save();
  ctx.clip(palm);
  for (const f of FINGERS.slice(1)) {
    const rg = ctx.createRadialGradient(f.bx, f.by + 30, 0, f.bx, f.by + 30, 48);
    rg.addColorStop(0, lighten(skin, 0.5, 0.18));
    rg.addColorStop(1, lighten(skin, 0.5, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(f.bx - 50, f.by - 20, 100, 100);
  }
  ctx.restore();
}

export interface HandRenderOpts {
  k: number;
  cachePrefix: string;
  active: number;
  highlightAll: boolean;
  accent: string;
  /** Color the wrist fades into at the bottom. */
  fade?: string;
  draft?: StrokeLayer | null;
  draftNails?: number[];
}

const BODY_PAD = 80;
let bodyCache: { key: string; canvas: HTMLCanvasElement } | null = null;

/** The hand body only changes with skin tone and scale, so it is drawn once and reused. */
function cachedHandBody(ctx: Ctx, skin: string, k: number) {
  const key = `${skin}|${k.toFixed(4)}`;
  if (bodyCache?.key !== key) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((HAND_W + BODY_PAD * 2) * k);
    c.height = Math.ceil((HAND_H + BODY_PAD * 2) * k);
    const bctx = c.getContext('2d')!;
    bctx.setTransform(k, 0, 0, k, BODY_PAD * k, BODY_PAD * k);
    drawHandBody(bctx, skin, k);
    bodyCache = { key, canvas: c };
  }
  ctx.drawImage(bodyCache.canvas, -BODY_PAD, -BODY_PAD, HAND_W + BODY_PAD * 2, HAND_H + BODY_PAD * 2);
}

export function renderHand(ctx: Ctx, s: DesignState, o: HandRenderOpts) {
  const L = LENGTHS[s.length];
  cachedHandBody(ctx, s.skin, o.k);
  FINGERS.forEach((f, i) => {
    const fr = nailFrame(f);
    ctx.save();
    ctx.translate(fr.x, fr.y);
    ctx.rotate(fr.rot);
    ctx.scale(fr.nw, fr.nw);
    const unitK = o.k * fr.nw;
    nailFold(ctx, s.skin, s.shape, L);
    renderNail(ctx, s.nails[i], s.shape, L, {
      k: unitK,
      cacheKey: o.cachePrefix + i,
      seed: i + 1,
      draft: o.draft && o.draftNails?.includes(i) ? o.draft : null,
    });
    if (i === o.active || o.highlightAll) {
      ctx.save();
      ctx.strokeStyle = o.accent;
      ctx.globalAlpha = i === o.active ? 1 : 0.55;
      ctx.lineWidth = (i === o.active ? 3.2 : 2.2) / fr.nw;
      ctx.shadowColor = o.accent;
      ctx.shadowBlur = 10 * o.k;
      const outer = 0.06;
      ctx.translate(0, -L / 2);
      ctx.scale(1 + outer * 2, 1 + (outer * 2) / L);
      ctx.translate(0, L / 2);
      ctx.stroke(nailPath(s.shape, L));
      ctx.restore();
    }
    ctx.restore();
  });
  if (o.fade) {
    const g = ctx.createLinearGradient(0, HAND_H - 230, 0, HAND_H);
    g.addColorStop(0, withAlpha(o.fade, 0));
    g.addColorStop(1, withAlpha(o.fade, 1));
    ctx.fillStyle = g;
    ctx.fillRect(-10, HAND_H - 230, HAND_W + 20, 231);
    // Solid below the wrist so the hand's drop shadow never peeks out.
    ctx.fillStyle = withAlpha(o.fade, 1);
    ctx.fillRect(-300, HAND_H, HAND_W + 600, 200);
  }
}

/** Fingertip under the big editor nail, drawn in nail units. */
export function drawFingerTip(ctx: Ctx, skin: string, shape: NailShape, L: number, k: number) {
  const w = 1 / NAIL_RATIO;
  const top = -1;
  const path = fingerLocalPath(w, top, 6);
  ctx.save();
  ctx.shadowColor = 'rgba(90, 45, 35, 0.22)';
  ctx.shadowBlur = 0.12 * k;
  ctx.shadowOffsetY = 0.03 * k;
  ctx.fillStyle = skin;
  ctx.fill(path);
  ctx.restore();
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(0, top, 0, 3);
  g.addColorStop(0, lighten(skin, 0.08));
  g.addColorStop(1, darken(skin, 0.06));
  ctx.fillStyle = g;
  ctx.fillRect(-w, top, w * 2, 8);
  skinShading(ctx, skin, w, top, 8);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = darken(skin, 0.32, 0.55);
  ctx.lineWidth = 2.5 / k;
  ctx.stroke(path);
  ctx.restore();
  nailFold(ctx, skin, shape, L);
}

/* -------------------------------------------------------------- selection */

/** Half width / height of an element's frame in nail units. */
export function elementHalfSize(el: ElementLayer): [number, number] {
  const box = (el.type === 'shape' ? shapeById(el.preset)?.box : stickerById(el.preset)?.box) ?? [100, 100];
  const s = el.scale / 100;
  return [(box[0] * s) / 2, (box[1] * s) / 2];
}

/** Handle positions in nail units; `px` = CSS px per nail unit. */
export function handlePoints(el: ElementLayer, px: number) {
  const [w, h] = elementHalfSize(el);
  const pad = 8 / px;
  const hw = Math.max(w, 10 / px) + pad;
  const hh = Math.max(h, 10 / px) + pad;
  const c = Math.cos(el.rot);
  const s = Math.sin(el.rot);
  const loc = (x: number, y: number) => ({ x: el.x + x * c - y * s, y: el.y + x * s + y * c });
  return { rotate: loc(hw, -hh), remove: loc(-hw, -hh), hw, hh };
}

export function hitElement(el: ElementLayer, x: number, y: number, px: number): boolean {
  const [w, h] = elementHalfSize(el);
  const min = 16 / px;
  const dx = x - el.x;
  const dy = y - el.y;
  const c = Math.cos(el.rot);
  const s = Math.sin(el.rot);
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  return Math.abs(lx) <= Math.max(w, min) && Math.abs(ly) <= Math.max(h, min);
}

export function drawSelection(ctx: Ctx, el: ElementLayer, px: number, accent: string) {
  const hp = handlePoints(el, px);
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate(el.rot);
  ctx.setLineDash([5 / px, 4 / px]);
  ctx.lineWidth = 1.5 / px;
  ctx.strokeStyle = accent;
  ctx.strokeRect(-hp.hw, -hp.hh, hp.hw * 2, hp.hh * 2);
  ctx.restore();

  const r = 12 / px;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(hp.rotate.x, hp.rotate.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hp.remove.x, hp.remove.y, r, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 1.8 / px;
  ctx.lineCap = 'round';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5 / px;
  ctx.beginPath();
  ctx.arc(hp.rotate.x, hp.rotate.y, r, 0, Math.PI * 2);
  ctx.stroke();
  // rotate/resize glyph
  ctx.lineWidth = 1.8 / px;
  const q = 5.5 / px;
  ctx.beginPath();
  ctx.arc(hp.rotate.x, hp.rotate.y, q, -Math.PI * 0.9, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  const ax = hp.rotate.x;
  const ay = hp.rotate.y + q;
  ctx.moveTo(ax + 2.8 / px, ay - 2.4 / px);
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax + 2.8 / px, ay + 2.6 / px);
  ctx.stroke();
  // × glyph
  ctx.strokeStyle = '#fff';
  const xq = 4.5 / px;
  ctx.beginPath();
  ctx.moveTo(hp.remove.x - xq, hp.remove.y - xq);
  ctx.lineTo(hp.remove.x + xq, hp.remove.y + xq);
  ctx.moveTo(hp.remove.x + xq, hp.remove.y - xq);
  ctx.lineTo(hp.remove.x - xq, hp.remove.y + xq);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------- thumbnails */

/**
 * Renders a single nail into a data URL. With `unit` set, the nail is drawn at that
 * fixed scale (so different lengths compare), anchored to the bottom.
 */
export function nailThumb(d: NailDesign, shape: NailShape, L: number, w: number, h: number, unit?: number): string {
  const c = offscreen('thumb-out', w, h);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const px = unit ?? Math.min(w * 0.5, (h - 16) / (L + 0.12));
  const oy = unit ? h - 8 - 0.05 * px : h / 2 + (L / 2) * px;
  ctx.translate(w / 2, oy);
  ctx.scale(px, px);
  renderNail(ctx, d, shape, L, { k: px, cacheKey: 'thumb', seed: 3 });
  return c.toDataURL();
}

const stickerThumbCache = new Map<string, string>();
export function stickerThumb(id: string, size: number): string {
  const key = id + size;
  const hit = stickerThumbCache.get(key);
  if (hit) return hit;
  const st = stickerById(id);
  const c = offscreen('sticker-thumb', size, size);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  if (st) {
    ctx.translate(size / 2, size / 2);
    const s = (size * 0.78) / 100;
    ctx.scale(s, s);
    drawStickerParts(ctx, st);
  }
  const url = c.toDataURL();
  stickerThumbCache.set(key, url);
  return url;
}

/* ----------------------------------------------------------------- export */

/** A single nail on a transparent background (product-shot style). */
export function nailCloseup(d: NailDesign, shape: NailShape, L: number, w: number, h: number, seed: number): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const unit = Math.min(w * 0.82, (h * 0.9) / (L + 0.1));
  ctx.translate(w / 2, h / 2 + ((L - 0.05) / 2) * unit);
  ctx.scale(unit, unit);
  renderNail(ctx, d, shape, L, { k: unit, cacheKey: 'closeup', seed });
  return c.toDataURL('image/png');
}

/** A hand-only picture of a design, e.g. for galleries or a hero image. */
export function handPreview(s: DesignState, w: number, h: number, background: string): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  // Framed on the fingers and nails; the wrist fades out at the bottom.
  const V = { x: HAND_VIEW.x + 20, y: HAND_VIEW.y - 10, w: HAND_VIEW.w - 40, h: 900 };
  const sc = Math.min(w / V.w, h / V.h);
  ctx.translate((w - V.w * sc) / 2 - V.x * sc, (h - V.h * sc) / 2 - V.y * sc);
  ctx.scale(sc, sc);
  renderHand(ctx, s, { k: sc, cachePrefix: 'preview', active: -1, highlightAll: false, accent: '#000', fade: background });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fade = ctx.createLinearGradient(0, h * 0.72, 0, h);
  fade.addColorStop(0, withAlpha(background, 0));
  fade.addColorStop(1, withAlpha(background, 1));
  ctx.fillStyle = fade;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  return c.toDataURL('image/png');
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface ExportLabels {
  shape: string;
  length: string;
  fingers: string[];
  footer: string;
}

export function exportImage(s: DesignState, opts: { title: string; accent: string; labels: ExportLabels }): HTMLCanvasElement {
  const W = 1200;
  const H = 1660;
  const bg = '#faf4f1';
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 640, 50, W / 2, 640, 640);
  glow.addColorStop(0, withAlpha(opts.accent, 0.1));
  glow.addColorStop(1, withAlpha(opts.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2b2326';
  ctx.font = `650 46px ${FONT}`;
  ctx.fillText(opts.title, W / 2, 92);
  ctx.fillStyle = '#8b7c80';
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText(`${opts.labels.shape} · ${opts.labels.length}`, W / 2, 134);

  const hs = 0.95;
  ctx.save();
  ctx.translate((W - HAND_VIEW.w * hs) / 2 - HAND_VIEW.x * hs, 150 - HAND_VIEW.y * hs);
  ctx.scale(hs, hs);
  renderHand(ctx, s, { k: hs, cachePrefix: 'export', active: -1, highlightAll: false, accent: opts.accent, fade: bg });
  ctx.restore();

  // Close-ups of every nail.
  const L = LENGTHS[s.length];
  const cardY = 1220;
  const cardH = 360;
  ctx.save();
  ctx.shadowColor = 'rgba(80, 40, 50, 0.12)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, 60, cardY, W - 120, cardH, 28);
  ctx.fill();
  ctx.restore();

  const colW = (W - 120) / 5;
  const unit = Math.min(110, 240 / (L + 0.1));
  // Vertically centre the nails in the card, above the labels.
  const cuticleY = cardY + 28 + (cardH - 90) / 2 + (L * unit) / 2;
  s.nails.forEach((nail, i) => {
    const cx = 60 + colW * (i + 0.5);
    ctx.save();
    ctx.translate(cx, cuticleY);
    ctx.scale(unit, unit);
    renderNail(ctx, nail, s.shape, L, { k: unit, cacheKey: 'export-close', seed: i + 1 });
    ctx.restore();
    ctx.fillStyle = '#8b7c80';
    ctx.font = `500 22px ${FONT}`;
    ctx.fillText(opts.labels.fingers[i] ?? '', cx, cardY + 330);
  });

  ctx.fillStyle = '#b3a5a9';
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText(opts.labels.footer, W / 2, H - 30);
  return c;
}
